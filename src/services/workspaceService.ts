// src/services/workspaceService.ts
import pb from '../lib/pocketbase';
import { mapPbToWorkspace } from '../lib/mappers';
import type { Workspace } from '../types';

const collection = pb.collection('workspaces');

export const workspaceService = {
  /**
   * Fetches a full list of all available workspaces.
   * @returns A promise that resolves to an array of workspaces.
   */
  getAll: async (): Promise<Workspace[]> => {
    const records = await collection.getFullList();
    return records.map(mapPbToWorkspace);
  },

  /**
   * Creates a new workspace.
   * @param name The name for the new workspace.
   * @returns A promise that resolves to the newly created workspace.
   */
  create: async (name: string): Promise<Workspace> => {
    const record = await collection.create({ name });
    return mapPbToWorkspace(record);
  },

  /**
   * Updates an existing workspace.
   * @param id The ID of the workspace to update.
   * @param name The new name for the workspace.
   * @returns A promise that resolves to the updated workspace.
   */
  update: async (id: string, name: string): Promise<Workspace> => {
    const record = await collection.update(id, { name });
    return mapPbToWorkspace(record);
  },

  /**
   * Deletes a workspace and all its associated data.
   * Note: This service only deletes the workspace record itself.
   * The deletion of related data (accounts, transactions, etc.)
   * should be handled in the business logic layer (e.g., AppContext)
   * before calling this function.
   * @param id The ID of the workspace to delete.
   * @returns A promise that resolves when the deletion is complete.
   */
  delete: async (id: string): Promise<void> => {
    await collection.delete(id);
  },
};
