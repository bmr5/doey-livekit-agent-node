import { llm } from '@livekit/agents';
import OpenAI from 'openai';
import { z } from 'zod';
import { TaskContext } from '../agent.js';
import { supabase } from '../config/supabase.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const parameters = z.object({
  title: z.string().describe('The task title'),
  description: z.string().optional().describe('Optional task description'),
  category: z.string().optional().describe('Task category - will be auto-assigned if not provided'),
  priority: z
    .enum(['Low', 'Medium', 'High'])
    .optional()
    .describe('Task priority - will be auto-assigned if not provided'),
});

export const createTaskFunction = (taskContext: TaskContext): llm.CallableFunction => ({
  description:
    'Create a new task with optional category and priority. If category or priority are not provided, they will be automatically determined based on the task description.',
  parameters,
  execute: async ({ title, description, category, priority }: z.infer<typeof parameters>) => {
    console.log({ title, description, category, priority });
    let suggestedCategoryId: string | undefined;
    let suggestedCategoryName: string | undefined;
    let suggestedPriority: 'Low' | 'Medium' | 'High' | undefined;

    // Get category and priority suggestions if not provided
    // if (!category || !priority) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Based on this task title: "${title}" ${description ? `and description: "${description}"` : ''}, 
              ${category ? `and suggested category: "${category}"` : ''}
              ${priority ? `and suggested priority: "${priority}"` : ''}
              ${!category || !priority ? 'suggest a' : 'validate and/or adjust the'} category and priority level.
              When choosing a category please respond with the category id and name.
              Response format: {"category_id": "id", "category_name": "string", "priority": "Low" | "Medium" | "High"}
              Available categories must be one of: ${taskContext.userCategories.map((cat) => `${cat.id}: ${cat.name}`).join(', ')}
              ${category ? `\nPrefer to use the suggested category if it's reasonable.` : ''}
              ${priority ? `\nPrefer to keep the suggested priority unless the content strongly indicates otherwise.` : ''}`,
        },
      ],
      temperature: 0.3,
    });
    console.log('completion', completion);
    const content = completion.choices[0].message.content;
    console.log({ content });
    if (!content) throw new Error('No content in completion response');

    const suggestions = JSON.parse(content);
    suggestedCategoryId = suggestions.category_id;
    suggestedCategoryName = suggestions.category_name;
    suggestedPriority = suggestions.priority;

    // Validate category exists
    if (!taskContext.userCategories.some((cat) => cat.id === suggestedCategoryId)) {
      console.error(
        `Invalid category: ${suggestedCategoryName} ${suggestedCategoryId}. Available categories: ${taskContext.userCategories.map((cat) => cat.name).join(', ')}`,
      );
      return 'Sorry I had issues placing this into a category. Please try again.';
    }
    // }

    console.log({ suggestedCategoryId, suggestedCategoryName, priority });

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        category_id: suggestedCategoryId,
        priority: suggestedPriority || 'Medium',
        is_completed: false,
        is_recurring: false,
        user_id: taskContext.userId,
      })
      .select()
      .single();

    if (error) throw error;
    return `Created task "${title}" with category "${category}" and priority ${priority} for user ${taskContext.userId}`;
  },
});
