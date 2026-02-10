import { mapPbToBudget } from '../lib/mappers';
import type { Budget } from '../types';
import { createPocketBaseService } from './genericService';

// Typ pre vytvorenie rozpočtu
type BudgetCreationData = {
  workspace: string;
  category: string;
  month: string;
  amount: number;
  note: string;
};

// Typ pre aktualizáciu rozpočtu
type BudgetUpdateData = Partial<Omit<Budget, 'id'>>;

const budgetService = createPocketBaseService<Budget, BudgetCreationData, BudgetUpdateData>(
  'budgets',
  mapPbToBudget
);

// Generická služba neobsahuje batchUpdate, takže ho tu necháme zatiaľ
// Ak by sme ho potrebovali vo viacerých službách, pridali by sme ho do genericService
export { budgetService };

