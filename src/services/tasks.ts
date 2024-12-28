import { supabase } from '../config/supabase';
import type { Database } from '../types/supabase';

type Task = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
type PriorityLevel = Database['public']['Enums']['priority_level'];

export class TaskService {
  async createTask(task: TaskInsert) {
    const { data, error } = await supabase.from('tasks').insert(task).select().single();

    if (error) throw error;
    return data;
  }

  async getTask(taskId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, category:categories(*)')
      .eq('id', taskId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateTask(taskId: string, updates: TaskUpdate) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTask(taskId: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);

    if (error) throw error;
    return true;
  }

  async listTasks(filters?: {
    userId?: string;
    categoryId?: string;
    isCompleted?: boolean;
    priority?: PriorityLevel;
  }) {
    let query = supabase.from('tasks').select('*, category:categories(*)');

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters?.isCompleted !== undefined) {
      query = query.eq('is_completed', filters.isCompleted);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
