import { supabase } from '../config/supabase.js';
import { Category } from '../types/categories.js';

export const categoryService = {
  async getUserCategories(userId: string): Promise<Category[]> {
    // First get user's selected category IDs
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('selected_category_ids')
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      throw userError;
    }

    const selectedCategoryIds = user.selected_category_ids || [];
    console.log('selectedCategoryIds', selectedCategoryIds);

    // Then get the categories that match these IDs
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .in('id', selectedCategoryIds);

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      throw categoriesError;
    }

    return categories || [];
  },

  async createCategory(
    categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      throw error;
    }

    return data;
  },

  async updateCategory(
    categoryId: string,
    userId: string,
    updates: Partial<Category>,
  ): Promise<Category> {
    // First verify this is a user-created category
    const { data: category, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !category) {
      throw new Error("Category not found or you don't have permission to edit it");
    }

    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', categoryId)
      .eq('user_id', userId) // Extra safety check
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      throw error;
    }

    return data;
  },

  async deleteCategory(categoryId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId); // Only delete if it belongs to the user

    if (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },
};
