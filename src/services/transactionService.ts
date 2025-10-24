// src/services/transactionService.ts
import pb from '../lib/pocketbase';
import { mapPbToTransaction } from '../lib/mappers';
import type { Transaction } from '../types';

// Opaque type for PocketBase options to avoid importing pocketbase everywhere
type PocketBaseOptions = { [key: string]: any };

// Define a type for the data needed to create a transaction, 
// matching the structure expected by AppContext
type TransactionCreationData = Omit<Transaction, 'id' | 'workspaceId'> & { workspace: string };


const collection = pb.collection('transactions');

export const transactionService = {
  /**
   * Fetches a full list of transactions based on a filter.
   * @param filter The PocketBase filter string.
   * @returns A promise that resolves to an array of transactions.
   */
  getAll: async (filter: string): Promise<Transaction[]> => {
    const records = await collection.getFullList({ filter });
    return records.map(mapPbToTransaction);
  },

  /**
   * Creates a new transaction record.
   * @param data The data for the new transaction.
   * @param options Optional PocketBase request options.
   * @returns A promise that resolves to the newly created transaction.
   */
  create: async (data: TransactionCreationData, options: PocketBaseOptions = {}): Promise<Transaction> => {
    const record = await collection.create(data, options);
    return mapPbToTransaction(record);
  },

  /**
   * Updates an existing transaction record.
   * @param id The ID of the transaction to update.
   * @param data The partial data to update.
   * @param options Optional PocketBase request options.
   * @returns A promise that resolves to the updated transaction.
   */
  update: async (id: string, data: Partial<Transaction>, options: PocketBaseOptions = {}): Promise<Transaction> => {
    // We remove properties that should not be sent in the update payload
    const { workspaceId, ...payload } = data;
    const record = await collection.update(id, payload, options);
    return mapPbToTransaction(record);
  },

  /**
   * Deletes a transaction record.
   * @param id The ID of the transaction to delete.
   * @param options Optional PocketBase request options.
   * @returns A promise that resolves when the deletion is complete.
   */
  delete: async (id: string, options: PocketBaseOptions = {}): Promise<void> => {
    await collection.delete(id, options);
  },
};
