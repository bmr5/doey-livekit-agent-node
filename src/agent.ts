// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0
import { type JobContext, WorkerOptions, cli, defineAgent, llm, multimodal } from '@livekit/agents';
import * as openaiPlugin from '@livekit/agents-plugin-openai';
import { config } from 'dotenv';
import http from 'http';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import path from 'path';
import { z } from 'zod';
import { supabase } from './config/supabase.js';
import { createTaskFunction } from './functions/createTask.js';
import { listTasksFunction } from './functions/listTasks.js';
import { categoryService } from './services/categories.js';
import { Category, getDefaultCategoryNames } from './types/categories.js';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

export interface TaskContext {
  userId: string;
  userCategories: Category[];
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    const participant = await ctx.waitForParticipant();
    const userId = participant.identity.replace('user_', '');

    // Query user's categories
    const categories = await categoryService.getUserCategories(userId);

    console.log('Categories:', categories);

    const taskContext: TaskContext = {
      userId,
      userCategories: categories ?? [],
    };

    let model: openaiPlugin.realtime.RealtimeModel;

    if (process.env.AZURE_OPENAI_ENDPOINT) {
      model = openaiPlugin.realtime.RealtimeModel.withAzure({
        baseURL: process.env.AZURE_OPENAI_ENDPOINT,
        azureDeployment: process.env.AZURE_OPENAI_DEPLOYMENT || '',
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        entraToken: process.env.AZURE_OPENAI_ENTRA_TOKEN,
        instructions: 'You are a helpful assistant.',
      });
    } else {
      model = new openaiPlugin.realtime.RealtimeModel({
        instructions: `You are an AI assistant for a voice-controlled todo app. You help users manage their tasks through natural conversation.

You can perform the following actions:
- Create new tasks (with automatic category and priority assignment)
- List existing tasks (with optional status filters)
- Create new categories for task organization

When users speak to you:
1. Listen for their intent
2. Use the appropriate function to help them
3. Respond naturally about what you've done

Available priorities are: Low, Medium, High
Default categories are: ${taskContext.userCategories.join(', ')}

Always confirm actions you've taken and ask if there's anything else you can help with.`,
      });
    }

    const fncCtx: llm.FunctionContext = {
      createTask: createTaskFunction(taskContext),
      listTasks: listTasksFunction(taskContext),
      createCategory: {
        description:
          'Create a new category for tasks with automatic or explicit visual identifiers',
        parameters: z.object({
          name: z.string().describe('The category name'),
          color: z.string().optional().describe('Optional color code for the category'),
          icon: z.string().optional().describe('Optional icon identifier'),
        }),
        execute: async ({ name, color, icon }) => {
          console.log('Creating category', name, color, icon);
          // Get suggestions from OpenAI if needed
          if (!color || !icon) {
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'user',
                  content: `Suggest a color (as hex code) and emoji icon for a category named "${name}". 
                         Common emojis: 🛒 (shopping), 💼 (work), 🏠 (home), 📚 (school), 🏃 (fitness), 
                         ❤️ (health), 👨‍👩‍👧‍👦 (family), ✈️ (travel), 💰 (finance), 👤 (personal).
                         Response format: {"color": "#HEXCODE", "icon": "emoji"}`,
                },
              ],
              temperature: 0.3,
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error('No content in completion response');

            const suggestions = JSON.parse(content);
            color = color || suggestions.color;
            icon = icon || suggestions.icon;
          }

          // Create category in database
          const { data, error } = await supabase
            .from('categories')
            .insert({
              name: name.toLowerCase(),
              color,
              icon,
              user_id: taskContext.userId,
            })
            .select()
            .single();

          if (error) {
            if (error.code === '23505') {
              return `Category "${name}" already exists for this user`;
            }
            throw error;
          }

          return `Created category "${name}" with ${color} color and ${icon} icon`;
        },
      },
    };

    const agent = new multimodal.MultimodalAgent({
      model,
      fncCtx,
    });

    const session = await agent
      .start(ctx.room, participant)
      .then((session) => session as openaiPlugin.realtime.RealtimeSession);

    session.conversation.item.create(
      llm.ChatMessage.create({
        role: llm.ChatRole.USER,
        text: 'Say "How can I help you today?"',
      }),
    );
    session.response.create();
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
