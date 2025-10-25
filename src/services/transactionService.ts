import { mapPbToTransaction } from '../lib/mappers';
import type { Transaction } from '../types';
import { createPocketBaseService } from './genericService';

// Typ pre vytvorenie transakcie
type TransactionCreationData = Omit<Transaction, 'id' | 'workspaceId'> & { workspace: string };

// Typ pre aktualizáciu transakcie
type TransactionUpdateData = Partial<Omit<Transaction, 'id'>>;

const transactionService = createPocketBaseService<Transaction, TransactionCreationData, TransactionUpdateData>(
  'transactions',
  mapPbToTransaction,
  // Hook na odstránenie 'workspaceId' pred odoslaním na server
  (data) => {
    const { workspaceId, ...payload } = data;
    return payload;
  }
);

export { transactionService };










export { transactionService };

