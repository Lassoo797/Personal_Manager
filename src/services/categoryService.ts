import { mapPbToCategory } from '../lib/mappers';
import type { Category } from '../types';
import { createPocketBaseService } from './genericService';

// Typ pre vytvorenie kategórie
type CategoryCreationData = Omit<Category, 'id' | 'workspaceId' | 'order' | 'status'> & {
  workspace: string;
  order: number;
  parent?: string;
  status: 'active';
};

// Typ pre aktualizáciu kategórie
type CategoryUpdateData = Partial<Omit<Category, 'id'>>;

const categoryService = createPocketBaseService<Category, CategoryCreationData, CategoryUpdateData>(
  'categories',
  mapPbToCategory,
  // Hook na odstránenie 'workspaceId' pred odoslaním na server
  (data) => {
    const { workspaceId, ...payload } = data;
    return payload;
  }
);

export { categoryService };

