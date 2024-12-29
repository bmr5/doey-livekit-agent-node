export interface Category {
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { name: 'work', color: '#FF0000', icon: '💼', isDefault: true },
  { name: 'personal', color: '#00FF00', icon: '👤', isDefault: true },
  { name: 'shopping', color: '#0000FF', icon: '🛒', isDefault: true },
  { name: 'health', color: '#FFA500', icon: '🏥', isDefault: true },
  { name: 'uncategorized', color: '#808080', icon: '📋', isDefault: true },
];

export const getDefaultCategoryNames = (): string[] =>
  DEFAULT_CATEGORIES.map((cat) => cat.name.toLowerCase());
