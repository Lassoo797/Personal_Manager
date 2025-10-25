import pb from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

type PocketBaseOptions = { [key: string]: any };

/**
 * Creates a generic service for interacting with a PocketBase collection.
 * @param collectionName The name of the PocketBase collection.
 * @param mapper A function that maps a PocketBase record to the application's defined type.
 * @param preUpdateHook An optional function to transform data before an update operation.
 */
export function createPocketBaseService<T, TCreate, TUpdate>(
  collectionName: string,
  mapper: (record: RecordModel) => T,
  preUpdateHook?: (data: TUpdate) => any
) {
  const collection = pb.collection(collectionName);

  return {
    /**
     * Fetches all records based on a filter.
     * @param filter PocketBase filter string.
     */
    getAll: async (filter?: string): Promise<T[]> => {
      const options = filter ? { filter } : {};
      const records = await collection.getFullList(options);
      return records.map(mapper);
    },

    /**
     * Creates a new record.
     * @param data The data for the new record.
     * @param options Optional PocketBase options.
     */
    create: async (data: TCreate, options: PocketBaseOptions = {}): Promise<T> => {
      const record = await collection.create(data, options);
      return mapper(record);
    },

    /**
     * Updates an existing record.
     * @param id The ID of the record to update.
     * @param data The data for the update.
     * @param options Optional PocketBase options.
     */
    update: async (id: string, data: TUpdate, options: PocketBaseOptions = {}): Promise<T> => {
      const payload = preUpdateHook ? preUpdateHook(data) : data;
      const record = await collection.update(id, payload, options);
      return mapper(record);
    },

    /**
     * Deletes a record by its ID.
     * @param id The ID of the record to delete.
     * @param options Optional PocketBase options.
     */
    delete: async (id: string, options: PocketBaseOptions = {}): Promise<void> => {
      await collection.delete(id, options);
    },

    /**
     * Updates multiple records at once.
     * @param itemsToUpdate An array of objects with ID and data to update.
     */
    batchUpdate: async (itemsToUpdate: { id: string; data: TUpdate }[]): Promise<void> => {
      const options = { '$autoCancel': false };
      const promises = itemsToUpdate.map(item =>
        collection.update(item.id, item.data, options)
      );
      await Promise.all(promises);
    },
  };
}
