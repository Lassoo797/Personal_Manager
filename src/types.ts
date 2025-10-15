export type TransactionType = 'income' | 'expense';
export type AccountType = 'Štandardný účet' | 'Sporiaci účet';
export type AccountSubtype = 'Bankový účet' | 'Hotovosť';

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
  accountType: AccountType;
  type: AccountSubtype;
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

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
