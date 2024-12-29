import { Database } from './supabase';

export const DEFAULT_CATEGORIES = [
  'work',
  'personal',
  'shopping',
  'health',
  'uncategorized',
] as const;

export type CategoryName = (typeof DEFAULT_CATEGORIES)[number];

export const getDefaultCategoryNames = (): CategoryName[] => [...DEFAULT_CATEGORIES];

export type Category = Database['public']['Tables']['categories']['Row'];
