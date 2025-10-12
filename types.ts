export type TransactionType = 'income' | 'expense';

export interface BudgetProfile {
  id: string;
  name: string;
}

export interface Account {
  id: string;
  name: string;
  initialBalance: number;
  profileId: string;
  currency: 'EUR' | 'USD' | 'CZK';
  type: 'Bankový účet';
}

export interface Category {
  id:string;
  name: string;
  parentId: string | null;
  type: TransactionType;
  profileId: string;
  order: number;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  profileId: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  month: string; // YYYY-MM
  profileId: string;
}