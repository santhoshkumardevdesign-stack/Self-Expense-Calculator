export interface Transaction {
  id: string;
  userId: string;
  type: 'expense' | 'income';
  amount: number;
  description: string;
  category: string;
  date: string; // YYYY-MM-DD format
  createdAt: number;
  updatedAt: number;
  // Split expense fields
  isSplit?: boolean;
  splitWith?: string;
  splitAmount?: number;
  splitStatus?: 'pending' | 'received';
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Drinks', icon: '🍔', color: '#fff3e0' },
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#e3f2fd' },
  { id: 'shopping', name: 'Shopping', icon: '🛒', color: '#fce4ec' },
  { id: 'bills', name: 'Bills & Utilities', icon: '💡', color: '#f3e5f5' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#e8f5e9' },
  { id: 'health', name: 'Health', icon: '🏥', color: '#e0f7fa' },
  { id: 'education', name: 'Education', icon: '📚', color: '#fff8e1' },
  { id: 'other', name: 'Other', icon: '📦', color: '#f5f5f5' },
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
