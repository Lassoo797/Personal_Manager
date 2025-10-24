// src/services/accountService.ts
import pb from '../lib/pocketbase';
import { mapPbToAccount } from '../lib/mappers';
import type { Account } from '../types';

type PocketBaseOptions = { [key: string]: any };

// This type is based on what the createAccount function in AppContext expects
type AccountCreationData = Omit<Account, 'id' | 'workspaceId' | 'status'> & { workspace: string, status: 'active' };

const collection = pb.collection('accounts');

export const accountService = {
  /**
   * Fetches a full list of accounts based on a filter.
   * @param filter The PocketBase filter string.
   * @returns A promise that resolves to an array of accounts.
   */
  getAll: async (filter: string): Promise<Account[]> => {
    const records = await collection.getFullList({ filter });
    return records.map(mapPbToAccount);
  },

  /**
   * Creates a new account record.
   * @param data The data for the new account.
   * @returns A promise that resolves to the newly created account.
   */
  create: async (data: AccountCreationData): Promise<Account> => {
    const record = await collection.create(data);
    return mapPbToAccount(record);
  },

  /**
   * Updates an existing account record.
   * @param id The ID of the account to update.
   * @param data The partial data to update.
   * @param options Optional PocketBase request options.
   * @returns A promise that resolves to the updated account.
   */
  update: async (id: string, data: Partial<Omit<Account, 'id'>>, options: PocketBaseOptions = {}): Promise<Account> => {
    const record = await collection.update(id, data, options);
    return mapPbToAccount(record);
  },
  
  /**
   * Updates multiple accounts in parallel. Useful for reordering.
   * @param accountsToUpdate An array of accounts with updated data.
   * @returns A promise that resolves when all updates are complete.
   */
  batchUpdate: async (accountsToUpdate: { id: string, data: Partial<Omit<Account, 'id'>> }[]): Promise<void> => {
    const promises = accountsToUpdate.map(acc => 
      collection.update(acc.id, acc.data)
    );
    await Promise.all(promises);
  },

  /**
   * Deletes an account record by its ID.
   * @param id The ID of the account to delete.
   */
  delete: async (id: string): Promise<void> => {
    await collection.delete(id);
  },
  
  // No delete function is needed as we only archive accounts (which is an update operation).
};
