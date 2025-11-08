export type SystemEvent = {
  id: string;
  workspace: string;
  type: string;
  details: any;
  created: string;
};
export type TransactionType = 'income' | 'expense' | 'transfer';
export type AccountType = 'Štandardný účet';
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
  order: number;
  isDefault?: boolean;
  totalBalance?: number;
  savedAmount?: number;
  availableForBudget?: number;
}

export interface Category {
  id:string;
  name: string;
  parentId: string | null;
  type: TransactionType;
  workspaceId: string;
  order: number;
  validFrom: string; // YYYY-MM
  archivedFrom?: string | null; // YYYY-MM
  status: 'active' | 'archived';
  isSaving?: boolean;
  savingAccount?: string | null;
}

export interface Transaction {
  id: string;
  transactionDate: string; // YYYY-MM-DD
  notes: string;
  amount: number;
  type: TransactionType;
  categoryId: string | null; // Can be null for transfers
  accountId: string; // Source account
  destinationAccountId?: string | null; // Destination account for transfers
  workspaceId: string;
  onBudget?: boolean; // True if transaction should be included in budgets/stats
  created: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  month: string; // YYYY-MM
  workspaceId: string;
  note?: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
