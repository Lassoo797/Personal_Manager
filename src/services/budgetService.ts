// src/services/budgetService.ts
import pb from '../lib/pocketbase';
import { mapPbToBudget } from '../lib/mappers';
import type { Budget } from '../types';

type PocketBaseOptions = { [key: string]: any };

// Based on the data structure used for creating a budget in AppContext
type BudgetCreationData = {
  workspace: string;
  category: string;
  month: string;
  amount: number;
  note: string;
};

// For updates, any partial data of a budget (excluding id) is acceptable
type BudgetUpdateData = Partial<Omit<Budget, 'id'>>;

const collection = pb.collection('budgets');

export const budgetService = {
  /**
   * Fetches a full list of budgets based on a filter.
   * @param filter The PocketBase filter string.
   * @returns A promise that resolves to an array of budgets.
   */
  getAll: async (filter: string): Promise<Budget[]> => {
    const records = await collection.getFullList({ filter });
    return records.map(mapPbToBudget);
  },

  /**
   * Creates a new budget record.
   * @param data The data for the new budget.
   * @param options Optional PocketBase request options.
   * @returns A promise that resolves to the newly created budget.
   */
  create: async (data: BudgetCreationData, options: PocketBaseOptions = {}): Promise<Budget> => {
    const record = await collection.create(data, options);
    return mapPbToBudget(record);
  },

  /**
   * Updates an existing budget record.
   * @param id The ID of the budget to update.
   * @param data The partial data to update.
   * @param options Optional PocketBase request options.
   * @returns A promise that resolves to the updated budget.
   */
  update: async (id: string, data: BudgetUpdateData, options: PocketBaseOptions = {}): Promise<Budget> => {
    const record = await collection.update(id, data, options);
    return mapPbToBudget(record);
  },

  /**
   * Deletes a budget record by its ID.
   * @param id The ID of the budget to delete.
   * @returns A promise that resolves when the deletion is complete.
   */
  delete: async (id: string): Promise<void> => {
    await collection.delete(id);
  },
};
