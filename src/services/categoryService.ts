// src/services/categoryService.ts
import pb from '../lib/pocketbase';
import { mapPbToCategory } from '../lib/mappers';
import type { Category } from '../types';

type PocketBaseOptions = { [key: string]: any };

// This mirrors the data structure used in AppContext for creating a new category
type CategoryCreationData = Omit<Category, 'id' | 'workspaceId' | 'order' | 'status'> & {
  workspace: string;
  order: number;
  parent?: string;
  status: 'active';
};

const collection = pb.collection('categories');

export const categoryService = {
  /**
   * Fetches a full list of categories based on a filter.
   * @param filter The PocketBase filter string.
   * @returns A promise that resolves to an array of categories.
   */
  getAll: async (filter: string): Promise<Category[]> => {
    const records = await collection.getFullList({ filter });
    return records.map(mapPbToCategory);
  },

  /**
   * Creates a new category record.
   * @param data The data for the new category.
   * @returns A promise that resolves to the newly created category.
   */
  create: async (data: CategoryCreationData): Promise<Category> => {
    const record = await collection.create(data);
    return mapPbToCategory(record);
  },

  /**
   * Updates an existing category record.
   * @param id The ID of the category to update.
   * @param data The partial data to update.
   * @param options Optional PocketBase request options.
   * @returns A promise that resolves to the updated category.
   */
  update: async (id: string, data: Partial<Omit<Category, 'id'>>, options: PocketBaseOptions = {}): Promise<Category> => {
    // The payload might contain workspaceId, which we don't want to send.
    // PocketBase handles relations via fields like 'workspace', not 'workspaceId'.
    const { workspaceId, ...payload } = data;
    const record = await collection.update(id, payload, options);
    return mapPbToCategory(record);
  },

  /**
   * Updates multiple categories in parallel. Useful for reordering.
   * @param categoriesToUpdate An array of categories with updated data.
   * @returns A promise that resolves when all updates are complete.
   */
  batchUpdate: async (categoriesToUpdate: { id: string, data: Partial<Omit<Category, 'id'>> }[]): Promise<void> => {
    const promises = categoriesToUpdate.map(cat => 
      collection.update(cat.id, cat.data)
    );
    await Promise.all(promises);
  },
};
