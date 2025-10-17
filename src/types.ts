export type TransactionType = 'income' | 'expense' | 'transfer';
export type AccountType = 'Štandardný účet' | 'Sporiaci účet';
export type AccountSubtype = 'Bankový účet' | 'Hotovosť';

export interface Workspace {
  id: string;
  name: string;
}

export interface Account {
  id: string;
  name: string;
  workspaceId: string;
  currency: 'EUR' | 'USD' | 'CZK';
  accountType: AccountType;
  type: AccountSubtype;
}

export interface Category {
  id:string;
  name: string;
  parentId: string | null;
  type: TransactionType;
  workspaceId: string;
  order: number;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string | null; // Can be null for transfers
  accountId: string; // Source account
  destinationAccountId?: string | null; // Destination account for transfers
  workspaceId: string;
  systemType?: 'initial_balance' | null;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  month: string; // YYYY-MM
  workspaceId: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
