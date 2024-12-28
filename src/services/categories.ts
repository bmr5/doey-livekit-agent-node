import { supabase } from '../config/supabase';
import type { Database } from '../types/supabase';

type Category = Database['public']['Tables']['categories']['Row'];
type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

export class CategoryService {
  async createCategory(category: CategoryInsert) {
    const { data, error } = await supabase.from('categories').insert(category).select().single();

    if (error) throw error;
    return data;
  }

  async getCategory(categoryId: string) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateCategory(categoryId: string, updates: CategoryUpdate) {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCategory(categoryId: string) {
    const { error } = await supabase.from('categories').delete().eq('id', categoryId);

    if (error) throw error;
    return true;
  }

  async listCategories(userId?: string) {
    let query = supabase.from('categories').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;
    return data;
  }

  async getUserCategories(userId: string) {
    const { data, error } = await supabase
      .from('user_categories')
      .select('category:categories(*)')
      .eq('user_id', userId);

    if (error) throw error;
    return data.map((row) => row.category);
  }
}
