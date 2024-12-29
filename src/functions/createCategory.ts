import { llm } from '@livekit/agents';
import OpenAI from 'openai';
import { z } from 'zod';
import { TaskContext } from '../agent.js';
import { supabase } from '../config/supabase.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const createCategoryFunction = (taskContext: TaskContext): llm.CallableFunction => ({
  description:
    'Create a new category for tasks with automatic or explicit visual identifiers. If color or icon are not provided, they will be automatically suggested based on the category name.',
  parameters: z.object({
    name: z.string().describe('The category name'),
    color: z.string().optional().describe('Optional hex color code (e.g., "#FF0000")'),
    icon: z.string().optional().describe('Optional emoji icon'),
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
});
