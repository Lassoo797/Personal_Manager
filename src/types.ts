export type SystemEvent = {
  id: string;
  workspace: string;
  type: string;
  details: any;
  created: string;
};
export type TransactionType = 'income' | 'expense' | 'transfer';
export type AccountType = 'Štandardný účet' | 'Sporiaci účet';
export type AccountSubtype = 'Bankový účet' | 'Hotovosť';

export interface Workspace {
  id: string;
  name: string;
}

export type AccountStatus = 'active' | 'archived';

export interface Account {
  id: string;
  name: string;
  workspaceId: string;
  currency: 'EUR' | 'USD' | 'CZK';
  accountType: AccountType;
  type: AccountSubtype;
  initialBalance: number;
  initialBalanceDate: string;
  status: AccountStatus;
}

export interface Category {
  id:string;
  name: string;
  parentId: string | null;
  type: TransactionType;
  workspaceId: string;
  order: number;
  validFrom: string; // YYYY-MM
  dedicatedAccount?: string | null;
  status: 'active' | 'archived';
}

export interface Transaction {
  id: string;
  transactionDate: string; // YYYY-MM-DD
  notes: string;
  amount: number;
  type: TransactionType;
  categoryId: string | null; // Can be null for transfers
  account: string; // Source account
  destinationAccount?: string | null; // Destination account for transfers
  workspaceId: string;
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
