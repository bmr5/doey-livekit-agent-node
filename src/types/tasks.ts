import { Database } from './supabase';

export const PRIORITY_LEVELS = ['Low', 'Medium', 'High'] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const TASK_STATUS = ['pending', 'completed', 'cancelled'] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

export type Task = Database['public']['Tables']['tasks']['Row'];
