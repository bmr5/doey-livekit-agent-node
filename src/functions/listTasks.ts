import { llm } from '@livekit/agents';
import { z } from 'zod';
import { TaskContext } from '../agent.js';
import { supabase } from '../config/supabase.js';

const parameters = z.object({
  status: z.string().optional().describe('Filter tasks by status (e.g., "pending", "completed")'),
  category: z.string().optional().describe('Filter tasks by category'),
  priority: z.enum(['Low', 'Medium', 'High']).optional().describe('Filter tasks by priority level'),
  dueBefore: z.string().optional().describe('Show tasks due before this date (ISO format)'),
  dueAfter: z.string().optional().describe('Show tasks due after this date (ISO format)'),
  dueToday: z.boolean().optional().describe('Show tasks due today'),
  overdue: z.boolean().optional().describe('Show overdue tasks'),
});

export const listTasksFunction = (taskContext: TaskContext): llm.CallableFunction => ({
  description:
    'List all tasks for the current user with optional filtering by status, category, priority, or due date',
  parameters,
  execute: async ({
    status,
    category,
    priority,
    dueBefore,
    dueAfter,
    dueToday,
    overdue,
  }: z.infer<typeof parameters>) => {
    console.log('Listing tasks with filters:', {
      status,
      category,
      priority,
      dueBefore,
      dueAfter,
      dueToday,
      overdue,
    });

    let query = supabase
      .from('tasks')
      .select('*, categories(name)')
      .eq('user_id', taskContext.userId);

    if (status) {
      query = query.eq('is_completed', status === 'completed');
    }
    if (category) {
      query = query.eq('category_id', category);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }

    // Date filtering
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dueBefore) {
      query = query.lt('due_date', dueBefore);
    }
    if (dueAfter) {
      query = query.gt('due_date', dueAfter);
    }
    if (dueToday) {
      query = query
        .gte('due_date', today.toISOString())
        .lt('due_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());
    }
    if (overdue) {
      query = query.lt('due_date', now.toISOString()).eq('is_completed', false);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data.length === 0) {
      return 'No tasks found matching your criteria.';
    }

    const taskList = data
      .map((task) => {
        const categoryName = task.categories?.name || 'uncategorized';
        const dueDate = task.due_date
          ? ` (Due: ${new Date(task.due_date).toLocaleDateString()})`
          : '';
        return `- ${task.title} (${categoryName}, ${task.priority} priority)${dueDate}${
          task.is_completed ? ' ✓' : ''
        }`;
      })
      .join('\n');

    return `Found ${data.length} task(s):\n${taskList}`;
  },
});
