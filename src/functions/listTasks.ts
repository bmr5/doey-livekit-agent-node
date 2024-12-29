import { llm } from '@livekit/agents';
import { z } from 'zod';
import { TaskContext } from '../agent.js';
import { supabase } from '../config/supabase.js';

export const listTasksFunction = (taskContext: TaskContext): llm.CallableFunction => ({
  description: 'List all tasks for the current user with optional status filtering',
  parameters: z.object({
    status: z.string().optional().describe('Filter tasks by status (e.g., "pending", "completed")'),
  }),
  execute: async ({ status }) => {
    const query = supabase.from('tasks').select('*').eq('user_id', taskContext.userId);

    if (status) {
      query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return `Found ${data.length} tasks for user ${taskContext.userId}`;
  },
});
