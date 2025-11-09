import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import pb from '../lib/pocketbase'; // Keep for pb.filter for now
import type { Account, Category, Transaction, Budget, Workspace, TransactionType, Notification } from '../types';
import { systemEventService } from '../services/systemEventService';
import { workspaceService } from '../services/workspaceService';
import { budgetService } from '../services/budgetService';
import { categoryService } from '../services/categoryService';
import { accountService } from '../services/accountService';
import { transactionService } from '../services/transactionService';
import { useAuth } from './AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { roundToTwoDecimals } from '../lib/utils';


// PocketBase options to prevent autocancellation during batch operations
const noAutoCancel = { '$autoCancel': false };

interface AppContextType {
  // Nové stavy pre UI
  isLoading: boolean;
  error: Error | null;

  // Workspace Management
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  setCurrentWorkspaceId: (id: string | null) => void;
  addWorkspace: (name: string) => Promise<void>;
  updateWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  
  // Data for current workspace
  accounts: Account[];
  allCategories: Category[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];

  // Actions
  createAccount: (account: Omit<Account, 'id' | 'workspaceId' | 'status' | 'order'>) => Promise<void>;
  updateAccount: (account: Partial<Account> & Pick<Account, 'id'>) => Promise<void>;
  archiveAccount: (id: string) => Promise<string | void>;
  getAccountBalance: (accountId: string) => number;
  moveAccountUp: (accountId: string) => Promise<void>;
  moveAccountDown: (accountId: string) => Promise<void>;
  setDefaultAccount: (accountId: string) => Promise<void>;
  
  addCategory: (category: Omit<Category, 'id' | 'workspaceId' | 'order' | 'status'>) => Promise<Category | null>;
  updateCategory: (category: Category) => Promise<void>;
  updateCategoryOrder: (updatedCategories: Category[]) => Promise<void>;
  archiveCategory: (id: string, archiveMonth: string, force?: boolean) => Promise<{ success: boolean; message?: string; needsConfirmation?: boolean; }>;
  moveCategoryUp: (categoryId: string) => Promise<void>;
  moveCategoryDown: (categoryId: string) => Promise<void>;

  addTransaction: (transaction: Omit<Transaction, 'id' | 'workspaceId'>) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addOrUpdateBudget: (budget: Partial<Budget> & Pick<Budget, 'categoryId' | 'month'>) => Promise<{ success: boolean; message?: string; }>;
  publishBudgetForYear: (categoryId: string, month: string, forAllSubcategories?: boolean) => Promise<void>;
  publishFullBudgetForYear: (month: string) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  
  getFinancialSummary: (transactions: Transaction[]) => { actualIncome: number, actualExpense: number };
  
  // Notifications
  notifications: Notification[];
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  removeNotification: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth(); // Get the user from AuthContext
  const [isLoading, setIsLoading] = useState(true);
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useLocalStorage<string | null>('currentWorkspaceId', null);
  
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const accounts = useMemo(() => allAccounts.filter(a => a.status === 'active').sort((a,b) => a.order - b.order), [allAccounts]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const categories = useMemo(() => allCategories.filter(c => c.status === 'active'), [allCategories]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  
  // Combined loading state
  useEffect(() => {
    setIsLoading(isGlobalLoading || isWorkspaceLoading);
  }, [isGlobalLoading, isWorkspaceLoading]);

  // Effect to load global data once on startup
  useEffect(() => {
    const loadGlobalData = async () => {
      if (!user) {
        // If user is logged out, clear all data and stop loading
        setWorkspaces([]);
        setIsGlobalLoading(false);
        return;
      }

      setIsGlobalLoading(true);
      setError(null);
      try {
        const workspacesData = await workspaceService.getAll();
        setWorkspaces(workspacesData);

        // Auto-select workspace logic after global data is loaded
        const isInvalidStoredWorkspace = currentWorkspaceId && !workspacesData.some(p => p.id === currentWorkspaceId);
        if (isInvalidStoredWorkspace || !currentWorkspaceId) { // Also auto-select if no workspace was selected
          setCurrentWorkspaceId(workspacesData.length > 0 ? workspacesData[0].id : null);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError' && !e.isAbort) {
          setError(e);
          console.error("Chyba pri načítavaní globálnych dát:", e);
        }
      } finally {
        setIsGlobalLoading(false);
      }
    };

    loadGlobalData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Re-run this effect when the user object changes

  // Effect to load workspace-specific data when workspace changes
  useEffect(() => {
    const loadWorkspaceData = async () => {
      if (currentWorkspaceId) {
        setIsWorkspaceLoading(true);
        setError(null);
        try {
          const filter = pb.filter('workspace = {:workspaceId}', { workspaceId: currentWorkspaceId });
          const [accs, cats, trans, buds] = await Promise.all([
            accountService.getAll(filter), // Použitie servisu
            categoryService.getAll(filter), // Použitie servisu
            transactionService.getAll(filter), // Použitie servisu
            budgetService.getAll(filter), // Použitie servisu
          ]);
          setAllAccounts(accs); // Mapper je už v servise
          setAllCategories(cats); // Mapper je už v servise
          setTransactions(trans); // Mapper je už v servise
          setBudgets(buds); // Mapper je už v servise
        } catch (e: any) {
          if (e.name !== 'AbortError' && !e.isAbort) {
            setError(e);
            console.error("Chyba pri načítavaní dát pracovného priestoru:", e);
          }
        } finally {
          setIsWorkspaceLoading(false);
        }
      } else {
        // If no workspace is selected, clear workspace-specific data
        setAllAccounts([]);
        setAllCategories([]);
        setTransactions([]);
        setBudgets([]);
      }
    };

    // Don't load workspace data until global data is ready
    if (!isGlobalLoading) {
      loadWorkspaceData();
    }
  }, [currentWorkspaceId, isGlobalLoading]);
  

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [{ id, message, type }, ...prev]);
  }, []);


  const getAccountBalance = useCallback((accountId: string) => {
    const account = allAccounts.find(a => a.id === accountId);
    if (!account) return 0;

    const transactionsTotal = transactions.reduce((balance, t) => {
        // Celkový zostatok na účte musí brať do úvahy VŠETKY transakcie,
        // bez ohľadu na 'onBudget', pretože aj interné presuny menia reálny zostatok.
        if (t.type === 'transfer') {
            if (t.accountId === accountId) return balance - t.amount;
            if (t.destinationAccountId === accountId) return balance + t.amount;
        } else {
            if (t.accountId === accountId) {
                return t.type === 'income' ? balance + t.amount : balance - t.amount;
            }
        }
        return balance;
    }, 0);

    return roundToTwoDecimals((account.initialBalance || 0) + transactionsTotal);
  }, [allAccounts, transactions]);

  const getFinancialSummary = useCallback((transactionsToSummarize: Transaction[]): { actualIncome: number, actualExpense: number } => {
    return transactionsToSummarize
      .filter(t => t.onBudget !== false) // Iba transakcie, ktoré idú do budgetu/štatistík
      .reduce((summary, t) => {
        if (t.type === 'income') {
            summary.actualIncome += t.amount;
        } else if (t.type === 'expense') {
            summary.actualExpense += t.amount;
        }
        return summary;
    }, { actualIncome: 0, actualExpense: 0 });
  }, []);

  // --- Start of new calculation logic ---

  const calculateTotalSavings = useCallback((untilMonth: string): number => {
    const savingCategoryIds = new Set(allCategories.filter(c => c.isSaving).map(c => c.id));
    
    const totalSavedAmount = budgets.reduce((sum, budget) => {
      if (savingCategoryIds.has(budget.categoryId) && budget.month <= untilMonth) {
        sum += budget.amount;
      }
      return sum;
    }, 0);

    return roundToTwoDecimals(totalSavedAmount);
  }, [allCategories, budgets]);

  const calculateProjectedAvailableBalance = useCallback((targetMonth: string): number => {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    // 1. Zisti aktuálny reálny zostatok na všetkých účtoch
    const totalCurrentBalance = allAccounts
      .filter(a => a.status === 'active')
      .reduce((sum, account) => sum + getAccountBalance(account.id), 0);

    // 2. Vypočítaj plánované príjmy a výdavky odTERAZ do cieľového mesiaca
    const nonSavingCategoryIds = new Set(allCategories.filter(c => !c.isSaving).map(c => c.id));
    const incomeCategoryIds = new Set(allCategories.filter(c => c.type === 'income').map(c => c.id));

    let projectedNetIncome = 0;
    budgets.forEach(budget => {
      // Zahrň rozpočty od aktuálneho mesiaca (vrátane) do cieľového mesiaca (vrátane)
      if (nonSavingCategoryIds.has(budget.categoryId) && budget.month >= currentMonth && budget.month <= targetMonth) {
        if (incomeCategoryIds.has(budget.categoryId)) {
          projectedNetIncome += budget.amount; // Príjem
        } else {
          projectedNetIncome -= budget.amount; // Výdavok
        }
      }
    });

    // 3. Vypočítaj celkovú sumu, ktorá už je našetrená (v minulosti a teraz)
    const totalPastAndCurrentSavings = calculateTotalSavings(targetMonth);

    // Výsledok: Aktuálny zostatok + budúce čisté príjmy - už našetrená suma
    const availableBalance = totalCurrentBalance + projectedNetIncome - totalPastAndCurrentSavings;
    
    return roundToTwoDecimals(availableBalance);

  }, [allAccounts, allCategories, budgets, getAccountBalance, calculateTotalSavings]);

  // --- End of new calculation logic ---

  // --- Workspace Management ---
  const addWorkspace = useCallback(async (name: string) => {
    try {
      const newWorkspace = await workspaceService.create(name);
      setWorkspaces(prev => [...prev, newWorkspace]);
      setCurrentWorkspaceId(newWorkspace.id);

      await systemEventService.create({
        workspace: newWorkspace.id,
        type: 'workspace_created',
        details: {
          workspaceId: newWorkspace.id,
          name: newWorkspace.name
        }
      });
      addNotification(`Pracovný priestor "${name}" bol úspešne vytvorený.`, 'success');
    } catch (e: any) {
      console.error("Chyba pri vytváraní pracovného priestoru:", e);
      addNotification(`Nepodarilo sa vytvoriť pracovný priestor: ${e.message}`, 'error');
    }
  }, [setCurrentWorkspaceId, addNotification]);

  const updateWorkspace = useCallback(async (id: string, name: string) => {
    const originalWorkspace = workspaces.find(w => w.id === id);
    if (!originalWorkspace) return;
    try {
      const updated = await workspaceService.update(id, name);
      setWorkspaces(prev => prev.map(p => p.id === id ? updated : p));

      await systemEventService.create({
        workspace: id,
        type: 'workspace_updated',
        details: {
          workspaceId: id,
          oldName: originalWorkspace.name,
          newName: name
        }
      });
      addNotification(`Pracovný priestor "${name}" bol aktualizovaný.`, 'success');
    } catch (e: any) {
      console.error("Chyba pri aktualizácii pracovného priestoru:", e);
      addNotification(`Nepodarilo sa aktualizovať pracovný priestor: ${e.message}`, 'error');
    }
  }, [addNotification, workspaces]);

  const deleteWorkspace = useCallback(async (id: string) => {
    const workspaceToDelete = workspaces.find(w => w.id === id);
    if (!workspaceToDelete) return;

    try {
      setIsLoading(true);
      
      await workspaceService.deleteCascade(id);
      
      const remainingWorkspaces = workspaces.filter(p => p.id !== id);
      setWorkspaces(remainingWorkspaces);

      if (currentWorkspaceId === id) {
        const newWorkspaceId = remainingWorkspaces.length > 0 ? remainingWorkspaces[0].id : null;
        setCurrentWorkspaceId(newWorkspaceId);
        
        if (!newWorkspaceId) {
          setAllAccounts([]);
          setAllCategories([]);
          setTransactions([]);
          setBudgets([]);
        }
      }
      
      addNotification(`Pracovný priestor "${workspaceToDelete.name}" a všetky jeho dáta boli úspešne zmazané.`, 'success');
      
    } catch(e: any) {
        setError(e);
        console.error("Chyba pri mazaní pracovného priestoru:", e);
        addNotification(`Chyba pri mazaní pracovného priestoru: ${e.message}`, 'error');
    } finally {
        setIsLoading(false);
    }
  }, [workspaces, currentWorkspaceId, setCurrentWorkspaceId, addNotification]);

  // --- Data Management ---
  
  // CATEGORY MANAGEMENT
  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'workspaceId' | 'order' | 'status'>): Promise<Category | null> => {
    if (!currentWorkspaceId) return null;
    
    const siblings = allCategories.filter(c => c.parentId === category.parentId && c.type === category.type);
    const newOrder = siblings.length > 0 ? Math.max(...siblings.map(c => c.order || 0)) + 1 : 0;
    
    const data = {
        ...category,
        workspace: currentWorkspaceId,
        order: newOrder,
        parent: category.parentId || undefined,
        status: 'active' as const
    };

    try {
      const newCategory = await categoryService.create(data);
      setAllCategories(prev => [...prev, newCategory]);

      await systemEventService.create({
        workspace: currentWorkspaceId,
        type: 'category_created',
        details: {
          categoryId: newCategory.id,
          name: newCategory.name,
          type: newCategory.type,
          parentId: newCategory.parentId
        }
      });

      addNotification(`Kategória "${newCategory.name}" bola vytvorená.`, 'success');
      return newCategory;
    } catch (e: any) {
      console.error("Nepodarilo sa vytvoriť kategóriu:", e);
      addNotification(`Nepodarilo sa vytvoriť kategóriu: ${e.message}`, 'error');
      setError(e);
      return null;
    }
  }, [currentWorkspaceId, allCategories, addNotification]);

  const updateCategory = useCallback(async (updated: Category) => {
    const { id, name, workspaceId } = updated;
    const originalCategory = allCategories.find(c => c.id === id);
    if (!originalCategory) return;

    try {
      // Create a snapshot of changes
      const changes: Record<string, any> = {};
      // Correctly iterate over the keys of the 'updated' object
      for (const key of Object.keys(updated) as (keyof Category)[]) {
        if (key !== 'id' && updated[key] !== originalCategory[key]) {
          changes[key] = {
            old: originalCategory[key],
            new: updated[key]
          };
        }
    }
      
      const payload = { ...updated, parent: updated.parentId || null, workspace: workspaceId };
      const updatedCategory = await categoryService.update(id, payload);

      setAllCategories(prev => {
          const newState = prev.map(c => c.id === id ? updatedCategory : c)
          return newState.sort((a, b) => (a.order || 0) - (b.order || 0));
      });

      if (Object.keys(changes).length > 0) {
        await systemEventService.create({
          workspace: originalCategory.workspaceId,
          type: 'category_updated',
          details: {
            categoryId: id,
            name: updated.name,
            changes
          }
        });
      }

      addNotification(`Kategória "${updated.name}" bola aktualizovaná.`, 'success');
    } catch (e: any) {
      console.error("Chyba pri aktualizácii kategórie:", e);
      addNotification(`Nepodarilo sa aktualizovať kategóriu: ${e.message}`, 'error');
      setError(e);
    }
  }, [addNotification, allCategories, accounts]);
  
  const updateCategoryOrder = useCallback(async (updatedCategories: Category[]) => {
    try {
        const batchPayload = updatedCategories.map(cat => ({
          id: cat.id,
          data: { order: cat.order }
        }));
        await categoryService.batchUpdate(batchPayload);

        // Optimistically update local state to avoid re-fetch lag
        setAllCategories(prev => {
            const updatedMap = new Map(updatedCategories.map(c => [c.id, c]));
            return prev.map(c => updatedMap.get(c.id) || c);
        });
    } catch (e: any) {
        console.error("Failed to update category order:", e);
        addNotification(`Nepodarilo sa aktualizovať poradie kategórií: ${e.message}`, 'error');
        // If update fails, refetch to ensure consistency
        // loadWorkspaceData(); // Consider re-fetching on error
    }
  }, []);

  const archiveCategory = useCallback(async (id: string, archiveMonth: string, force: boolean = false): Promise<{ success: boolean; message?: string; needsConfirmation?: boolean; }> => {
    if (!currentWorkspaceId) return { success: false, message: 'Nie je vybraný pracovný priestor.' };
    
    const categoryToArchive = allCategories.find(c => c.id === id);
    if (!categoryToArchive) return { success: false, message: 'Kategória nebola nájdená.' };

    const children = allCategories.filter(c => c.parentId === id);
    const allRelatedCategoryIds = [id, ...children.map(c => c.id)];

    // --- Validácia ---
    if (!force) {
      // 1. Validácia oproti transakciám
      const conflictingTransaction = transactions.find(t => t.categoryId && allRelatedCategoryIds.includes(t.categoryId) && t.transactionDate.substring(0, 7) >= archiveMonth);
      if (conflictingTransaction) {
        const message = `Kategóriu nie je možné archivovať, pretože ona alebo jej podkategória má v mesiaci ${archiveMonth} alebo neskôr existujúcu transakciu.`;
        addNotification(message, 'error');
        return { success: false, message };
      }

      // 2. Validácia oproti budgetom
      const conflictingBudget = budgets.find(b => allRelatedCategoryIds.includes(b.categoryId) && b.month >= archiveMonth && b.amount > 0);
      if (conflictingBudget) {
        const message = `Kategóriu nie je možné archivovať, pretože ona alebo jej podkategória má v mesiaci ${archiveMonth} alebo neskôr naplánovaný rozpočet.`;
        addNotification(message, 'error');
        return { success: false, message };
      }
    }
    
    // --- Samotná archivácia ---
    try {
        // Find future budget records with amount 0 to delete
        const budgetsToDelete = budgets.filter(b => 
            allRelatedCategoryIds.includes(b.categoryId) && 
            b.month >= archiveMonth && 
            b.amount <= 0
        );

        const deletePromises = budgetsToDelete.map(b => budgetService.delete(b.id, noAutoCancel));
        const updatePromises = allRelatedCategoryIds.map(catId => categoryService.update(catId, { status: 'archived', archivedFrom: archiveMonth }, noAutoCancel));

        // Execute all updates and deletions in parallel
        await Promise.all([...updatePromises, ...deletePromises]);
        
        await systemEventService.create({
          workspace: currentWorkspaceId,
          type: 'category_archived',
          details: { categoryId: id, name: categoryToArchive.name, childrenCount: children.length, archiveMonth, deletedZeroBudgets: budgetsToDelete.length }
        });

        // Update local state for both categories and budgets
        setAllCategories(prev => prev.map(c => allRelatedCategoryIds.includes(c.id) ? { ...c, status: 'archived', archivedFrom: archiveMonth } : c));
        if (budgetsToDelete.length > 0) {
            const idsToDelete = new Set(budgetsToDelete.map(b => b.id));
            setBudgets(prev => prev.filter(b => !idsToDelete.has(b.id)));
        }
        
        addNotification(`Kategória '${categoryToArchive.name}' a jej podkategórie boli archivované od mesiaca ${archiveMonth}.`, 'success');
        return { success: true };
    } catch (e: any) {
        const errorMsg = 'Nepodarilo sa archivovať kategóriu.';
        addNotification(errorMsg, 'error');
        console.error(errorMsg, e);
        return { success: false, message: errorMsg };
    }
  }, [currentWorkspaceId, allCategories, allAccounts, getAccountBalance, addNotification, transactions, budgets]);



  const moveCategory = useCallback(async (categoryId: string, direction: 'up' | 'down') => {
    const category = allCategories.find(c => c.id === categoryId);
    if (!category) return;
  
    const siblings = allCategories
      .filter(c => c.parentId === category.parentId && c.type === category.type)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  
    const currentIndex = siblings.findIndex(c => c.id === categoryId);
    if (currentIndex === -1) return;
  
    let newSiblings = [...siblings];
    if (direction === 'up' && currentIndex > 0) {
      [newSiblings[currentIndex], newSiblings[currentIndex - 1]] = [newSiblings[currentIndex - 1], newSiblings[currentIndex]];
    } else if (direction === 'down' && currentIndex < siblings.length - 1) {
      [newSiblings[currentIndex], newSiblings[currentIndex + 1]] = [newSiblings[currentIndex + 1], newSiblings[currentIndex]];
    } else {
      return; // Can't move further
    }
  
    const updatedOrders = newSiblings.map((c, index) => ({ ...c, order: index }));
  
    try {
      const batchPayload = updatedOrders.map(c => ({ id: c.id, data: { order: c.order } }));
      await categoryService.batchUpdate(batchPayload);
      
      setAllCategories(prev => {
        const updatedMap = new Map(updatedOrders.map(c => [c.id, c]));
        const sorted = prev.map(c => updatedMap.get(c.id) || c).sort((a,b)=> (a.order || 0) - (b.order || 0));
        return sorted;
      });
    } catch (e: any) {
      console.error(`Failed to move category ${direction}:`, e);
      addNotification(`Nepodarilo sa posunúť kategóriu: ${e.message}`, 'error');
    }
  }, [allCategories, addNotification]);
  
  const moveCategoryUp = useCallback((categoryId: string) => moveCategory(categoryId, 'up'), [moveCategory]);
  const moveCategoryDown = useCallback((categoryId: string) => moveCategory(categoryId, 'down'), [moveCategory]);

  const archiveAccount = useCallback(async (id: string): Promise<string | void> => {
    if (!currentWorkspaceId) return;
    const balance = getAccountBalance(id);
    if (Math.abs(balance) > 0.001) {
      const message = `Účet nie je možné archivovať, pretože jeho zostatok je ${balance.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}. Pred archiváciou musíte zostatok vynulovať.`;
      addNotification(message, 'error');
      return message;
    }
    
    try {
        const accountToArchive = allAccounts.find(a => a.id === id);
        
        await accountService.update(id, { status: 'archived' });

        setAllAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'archived' } : a));
        addNotification('Účet bol úspešne archivovaný.', 'success');
        
        if (accountToArchive) {
          await systemEventService.create({
            workspace: currentWorkspaceId,
            type: 'account_archived',
            details: {
              accountId: accountToArchive.id,
              name: accountToArchive.name,
            }
          });
        }
    } catch (e: any) {
        console.error("Chyba pri archivácii účtu:", e);
        addNotification('Nastala chyba pri archivácii účtu.', 'error');
    }
  }, [transactions, addNotification, getAccountBalance, allAccounts, allCategories, currentWorkspaceId]);

  const moveAccount = useCallback(async (accountId: string, direction: 'up' | 'down') => {
    const account = allAccounts.find(a => a.id === accountId);
    if (!account) return;

    const siblings = allAccounts
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    const currentIndex = siblings.findIndex(a => a.id === accountId);
    if (currentIndex === -1) return;

    let newSiblings = [...siblings];
    if (direction === 'up' && currentIndex > 0) {
        [newSiblings[currentIndex], newSiblings[currentIndex - 1]] = [newSiblings[currentIndex - 1], newSiblings[currentIndex]];
    } else if (direction === 'down' && currentIndex < siblings.length - 1) {
        [newSiblings[currentIndex], newSiblings[currentIndex + 1]] = [newSiblings[currentIndex + 1], newSiblings[currentIndex]];
    } else {
        return;
    }
    
    const updatedOrders = newSiblings.map((a, index) => ({ ...a, order: index }));

    try {
        const batchPayload = updatedOrders.map(a => ({ id: a.id, data: { order: a.order } }));
        await accountService.batchUpdate(batchPayload);
        
        setAllAccounts(prev => {
            const updatedMap = new Map(updatedOrders.map(a => [a.id, a]));
            return prev.map(a => updatedMap.get(a.id) || a);
        });
    } catch (e: any) {
        console.error(`Failed to move account ${direction}:`, e);
        addNotification(`Nepodarilo sa posunúť účet: ${e.message}`, 'error');
    }
  }, [allAccounts, addNotification]);

  const moveAccountUp = useCallback((accountId: string) => moveAccount(accountId, 'up'), [moveAccount]);
  const moveAccountDown = useCallback((accountId: string) => moveAccount(accountId, 'down'), [moveAccount]);

  const setDefaultAccount = useCallback(async (accountId: string) => {
    if (!currentWorkspaceId) return;

    const currentDefault = allAccounts.find(a => a.isDefault);

    try {
        const batchPayload = [];

        // Ak existuje iný default účet, pripravíme jeho zrušenie
        if (currentDefault && currentDefault.id !== accountId) {
            batchPayload.push({ id: currentDefault.id, data: { isDefault: false } });
        }
        
        // Pripravíme nastavenie nového default účtu
        batchPayload.push({ id: accountId, data: { isDefault: true } });

        // Všetko odošleme v jednej dávkovej požiadavke
        await accountService.batchUpdate(batchPayload);

        // Optimistická aktualizácia UI zostáva rovnaká
        setAllAccounts(prev => 
            prev.map(a => ({
                ...a,
                isDefault: a.id === accountId
            }))
        );

        const account = allAccounts.find(a => a.id === accountId);
        if (!account) {
          console.error("setDefaultAccount: Account not found in state, cannot log system event.");
          // Notifikácia je miernejšia, keďže hlavná funkčnosť (nastavenie default) prebehla
          addNotification(`Účet bol nastavený ako predvolený, ale nastala chyba pri logovaní udalosti.`, 'info');
          return;
        }

        addNotification(`Účet "${account.name}" bol nastavený ako predvolený.`, 'success');
        
        const eventPayload = {
            workspace: currentWorkspaceId,
            type: 'default_account_set' as const,
            details: {
              accountId: accountId,
              name: account.name
            }
        };

        console.log("Attempting to create system event with payload:", JSON.stringify(eventPayload, null, 2));
        
        await systemEventService.create(eventPayload);

    } catch (e: any) {
        console.error("Failed to set default account:", e);
        addNotification(`Nepodarilo sa nastaviť predvolený účet: ${e.message}`, 'error');
    }
  }, [allAccounts, currentWorkspaceId, addNotification]);
  
  // ACCOUNT MANAGEMENT
  const createAccount = useCallback(async (account: Omit<Account, 'id' | 'workspaceId' | 'status' | 'order'>) => {
    if (!currentWorkspaceId) return;

    try {
        const siblings = allAccounts.filter(a => a.accountType === account.accountType);
        const newOrder = siblings.length > 0 ? Math.max(...siblings.map(a => a.order || 0)) + 1 : 0;

        const data = {
          ...account,
          initialBalance: account.initialBalance ? Math.round((account.initialBalance + Number.EPSILON) * 100) / 100 : 0,
        };

        const newAccount = await accountService.create({ ...data, workspace: currentWorkspaceId, status: 'active', order: newOrder });
        setAllAccounts(prev => [...prev, newAccount]);

        // Log system event for account creation
        await systemEventService.create({
          workspace: currentWorkspaceId,
          type: 'account_created',
          details: {
            accountId: newAccount.id,
            name: newAccount.name,
            type: newAccount.type,
            accountType: newAccount.accountType,
            currency: newAccount.currency,
          }
        });
        
        // Log system event for initial balance if it exists
        if (data.initialBalance && data.initialBalance > 0) {
          await systemEventService.create({
            workspace: currentWorkspaceId,
            type: 'initial_balance_set',
            details: {
              accountId: newAccount.id,
              name: newAccount.name,
              initialBalance: data.initialBalance,
              initialBalanceDate: data.initialBalanceDate
            }
          });
        }

        addNotification(`Účet "${account.name}" bol pridaný.`, 'success');
    } catch (e: any) {
        console.error("Chyba pri vytváraní účtu:", e);
        addNotification(`Nepodarilo sa vytvoriť účet: ${e.message}`, 'error');
    }
  }, [currentWorkspaceId, addNotification, categories, addCategory, allAccounts]);

  const updateAccount = useCallback(async (accountToUpdate: Partial<Account> & Pick<Account, 'id'>) => {
    if (!currentWorkspaceId) return;
    const { id, name } = accountToUpdate;
    const originalAccount = accounts.find(a => a.id === id);
    if (!originalAccount) return;

    // We are only allowing name change for now to avoid complexity with other fields
    if (!name || name === originalAccount.name) return;

    try {
      const updatedAccount = await accountService.update(id, { name });

      await systemEventService.create({
        workspace: currentWorkspaceId,
        type: 'account_updated',
        details: {
          accountId: id,
          oldName: originalAccount.name,
          newName: name
        }
      });
      
      // Optimistically update local state
      setAllAccounts(prev => prev.map(acc => acc.id === id ? updatedAccount : acc));
      addNotification(`Účet "${name}" bol aktualizovaný.`, 'success');
    } catch (e: any) {
      console.error("Chyba pri aktualizácii účtu:", e);
      addNotification(`Nepodarilo sa aktualizovať účet: ${e.message}`, 'error');
    }
  }, [accounts, allCategories, addNotification, updateCategory, currentWorkspaceId]);


  // TRANSACTION MANAGEMENT

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'workspaceId'>) => {
    if (!currentWorkspaceId) return;

    try {
        const data = {
            ...transaction,
            amount: Math.round((transaction.amount + Number.EPSILON) * 100) / 100,
            workspace: currentWorkspaceId,
            account: transaction.accountId,
            category: transaction.type !== 'transfer' ? transaction.categoryId : null,
            destinationAccount: transaction.type === 'transfer' ? transaction.destinationAccountId : null,
            onBudget: transaction.onBudget !== false, // Default to true
        };

        const newTransaction = await transactionService.create(data);
        setTransactions(prev => [...prev, newTransaction]);
        addNotification('Transakcia bola pridaná.', 'success');

      // Spoločné logovanie udalosti (môže sa vylepšiť)
      await systemEventService.create({
        workspace: currentWorkspaceId,
        type: 'transaction_created',
        details: { /* ... dáta pre log ... */ }
      });
    } catch (e: any) {
      console.error("Chyba pri pridávaní transakcie:", e);
      addNotification(`Nepodarilo sa pridať transakciu: ${e.message}`, 'error');
    }
  }, [currentWorkspaceId, addNotification, categories]);

  const updateTransaction = useCallback(async (updated: Transaction) => {
    const { id, workspaceId, ...data } = updated;
    const originalTransaction = transactions.find(t => t.id === id);
    if (!originalTransaction) return;

    try {
        const payload = { 
            ...data,
            amount: Math.round((data.amount + Number.EPSILON) * 100) / 100,
            account: data.accountId,
            category: data.type !== 'transfer' ? data.categoryId : null,
            destinationAccount: data.type === 'transfer' ? data.destinationAccountId : null,
        };
        const updatedTransaction = await transactionService.update(id, payload);
        setTransactions(prev => prev.map(t => t.id === id ? updatedTransaction : t));
      
      addNotification('Transakcia bola aktualizovaná.', 'success');
      // Logovanie sa tu môže doplniť...
    } catch (e: any) {
      console.error("Chyba pri aktualizácii transakcie:", e);
      addNotification(`Nepodarilo sa aktualizovať transakciu: ${e.message}`, 'error');
    }
  }, [addNotification, transactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!currentWorkspaceId) return;
    const transactionToDelete = transactions.find(t => t.id === id);
    if (!transactionToDelete) return;

    try {
        await transactionService.delete(id);
        setTransactions(prev => prev.filter(t => t.id !== id));

      await systemEventService.create({
        workspace: currentWorkspaceId,
        type: 'transaction_deleted',
        details: { transactionId: id, type: transactionToDelete.type, amount: transactionToDelete.amount }
      });

    addNotification('Transakcia bola zmazaná.', 'success');
    } catch (e: any) {
      console.error("Chyba pri mazaní transakcie:", e);
      addNotification(`Nepodarilo sa zmazať transakciu: ${e.message}`, 'error');
    }
  }, [addNotification, transactions, currentWorkspaceId]);

  const addOrUpdateBudget = useCallback(async (budget: Partial<Budget> & Pick<Budget, 'categoryId' | 'month'>): Promise<{ success: boolean; message?: string; }> => {
    if (!currentWorkspaceId) return { success: false, message: "Pracovný priestor nebol nájdený." };

    const category = allCategories.find(c => c.id === budget.categoryId);
    const existing = budgets.find(b => b.categoryId === budget.categoryId && b.month === budget.month);
    const newAmount = budget.amount !== undefined ? roundToTwoDecimals(budget.amount) : 0;
    const oldAmount = existing?.amount ?? 0;
    const amountChange = newAmount - oldAmount;

    // --- Validácia pre sporiace kategórie ---
    if (category?.isSaving && amountChange > 0) {
      const availableFunds = calculateProjectedAvailableBalance(budget.month);
      if (amountChange > availableFunds) {
        const message = `Plánovanú sumu nie je možné uložiť. Prekračuje dostupné prostriedky (${availableFunds.toLocaleString('sk-SK', {style:'currency', currency:'EUR'})}) o ${(amountChange - availableFunds).toLocaleString('sk-SK', {style:'currency', currency:'EUR'})}.`;
        addNotification(message, 'error');
        return { success: false, message };
      }
    }
    // --- Koniec validácie ---

    try {
      if (existing) {
        const hasAmountChanged = budget.amount !== undefined && newAmount !== existing.amount;
        const hasNoteChanged = budget.note !== undefined && budget.note !== existing.note;
        
        if (!hasAmountChanged && !hasNoteChanged) return { success: true };

        const dataToUpdate: Partial<Budget> = {};
        if (hasAmountChanged) dataToUpdate.amount = newAmount;
        if (hasNoteChanged) dataToUpdate.note = budget.note;
        
        const updated = await budgetService.update(existing.id, dataToUpdate);
        setBudgets(prev => prev.map(b => b.id === existing.id ? updated : b));
        
        await systemEventService.create({
          workspace: currentWorkspaceId,
          type: 'budget_updated',
          details: { 
            budgetId: existing.id,
            categoryId: existing.categoryId,
            month: existing.month,
            oldAmount: existing.amount,
            newAmount: updated.amount,
           }
        });

      } else {
        const data = {
          workspace: currentWorkspaceId,
          category: budget.categoryId,
          month: budget.month,
          amount: newAmount,
          note: budget.note || '',
        };
        const newBudget = await budgetService.create(data);
        setBudgets(prev => [...prev, newBudget]);

        await systemEventService.create({
          workspace: currentWorkspaceId,
          type: 'budget_created',
          details: { 
            budgetId: newBudget.id,
            categoryId: newBudget.categoryId,
            month: newBudget.month,
            amount: newBudget.amount
           }
        });
      }
      addNotification('Rozpočet bol uložený.', 'success');
      return { success: true };
    } catch (e: any) {
      const message = `Nepodarilo sa uložiť rozpočet: ${e.message}`;
      console.error("Chyba pri ukladaní rozpočtu:", e);
      addNotification(message, 'error');
      return { success: false, message };
    }
  }, [currentWorkspaceId, budgets, allCategories, calculateProjectedAvailableBalance, addNotification]);
  
  const deleteBudget = useCallback(async(id:string) => {
    if (!currentWorkspaceId) return;
    const budgetToDelete = budgets.find(b => b.id === id);
    if (!budgetToDelete) return;

    try {
      await budgetService.delete(id);
      setBudgets(prev => prev.filter(b => b.id !== id));

      await systemEventService.create({
        workspace: currentWorkspaceId,
        type: 'budget_deleted',
        details: {
          budgetId: id,
          categoryId: budgetToDelete.categoryId,
          month: budgetToDelete.month,
          amount: budgetToDelete.amount
        }
      });

    addNotification('Rozpočet bol zmazaný.', 'success');
    } catch (e: any) {
      console.error("Chyba pri mazaní rozpočtu:", e);
      addNotification(`Nepodarilo sa zmazať rozpočet: ${e.message}`, 'error');
    }
  }, [addNotification, budgets, currentWorkspaceId]);

  const publishBudgetForYear = useCallback(async (baseCategoryId: string, baseMonth: string, forAllSubcategories: boolean = false) => {
    if (!currentWorkspaceId) return;

    const [year, month] = baseMonth.split('-').map(Number);
    let categoryIdsToUpdate = [baseCategoryId];

    // Ak je to pre všetky podkategórie, nájdi ich
    if (forAllSubcategories) {
        const subcategories = categories.filter(c => c.parentId === baseCategoryId);
        categoryIdsToUpdate.push(...subcategories.map(s => s.id));
    }

    const newBudgets: Budget[] = [];
    const updatedBudgets: Budget[] = [];

    // Pre každú kategóriu (hlavnú alebo aj podkategórie)
    for (const categoryId of categoryIdsToUpdate) {
        const sourceBudget = budgets.find(b => b.categoryId === categoryId && b.month === baseMonth);
        const sourceAmount = sourceBudget?.amount ?? 0;

        // Pre každý nasledujúci mesiac v roku
        for (let m = month + 1; m <= 12; m++) {
            const targetMonth = `${year}-${String(m).padStart(2, '0')}`;
            const existingBudget = budgets.find(b => b.categoryId === categoryId && b.month === targetMonth);

            if (existingBudget) {
                if (existingBudget.amount !== sourceAmount) {
                                      // Update existujúceho
                try {
                    const updated = await budgetService.update(existingBudget.id, { amount: sourceAmount }, noAutoCancel);
                    updatedBudgets.push(updated);
                } catch (e) { console.error(`Failed to update budget for ${categoryId} in ${targetMonth}:`, e); }
            }
        } else if (sourceAmount > 0) {
             // Vytvor nový, len ak je suma > 0
            const data = { workspace: currentWorkspaceId, category: categoryId, month: targetMonth, amount: sourceAmount, note: sourceBudget?.note || '' };
            try {
                const newBudget = await budgetService.create(data, noAutoCancel);
                newBudgets.push(newBudget);
            } catch (e) { console.error(`Failed to create budget for ${categoryId} in ${targetMonth}:`, e); }
        }
        }
    }
    
    // Aktualizuj stav naraz
    setBudgets(prev => {
        const updatedMap = new Map(updatedBudgets.map(b => [b.id, b]));
        const prevWithoutUpdated = prev.map(b => updatedMap.get(b.id) || b);
        return [...prevWithoutUpdated, ...newBudgets];
    });

    addNotification('Rozpočet bol publikovaný pre nasledujúce mesiace.', 'success');

  }, [currentWorkspaceId, budgets, categories, addNotification]);

  const publishFullBudgetForYear = useCallback(async (baseMonth: string) => {
    if (!currentWorkspaceId) return;
  
    const [year, month] = baseMonth.split('-').map(Number);
    const categoryIds = categories.map(c => c.id);
  
    const budgetsToCreate: any[] = [];
    const budgetsToUpdate: any[] = [];
  
    // Pre každú kategóriu
    for (const categoryId of categoryIds) {
      const sourceBudget = budgets.find(b => b.categoryId === categoryId && b.month === baseMonth);
      const sourceAmount = sourceBudget?.amount ?? 0;
  
      // Pre každý nasledujúci mesiac v roku
      for (let m = month + 1; m <= 12; m++) {
        const targetMonth = `${year}-${String(m).padStart(2, '0')}`;
        const existingBudget = budgets.find(b => b.categoryId === categoryId && b.month === targetMonth);
  
        if (existingBudget) {
          if (existingBudget.amount !== sourceAmount) {
            budgetsToUpdate.push(budgetService.update(existingBudget.id, { amount: sourceAmount }, noAutoCancel));
          }
        } else if (sourceAmount > 0) {
          const data = { workspace: currentWorkspaceId, category: categoryId, month: targetMonth, amount: sourceAmount, note: sourceBudget?.note || '' };
          budgetsToCreate.push(budgetService.create(data, noAutoCancel));
        }
      }
    }
  
    try {
      setIsLoading(true);
      const created = await Promise.all(budgetsToCreate);
      const updated = await Promise.all(budgetsToUpdate);
      
      // Update local state
      setBudgets(prev => {
        const updatedMap = new Map(updated.map(b => [b.id, b]));
        const prevWithoutUpdated = prev.map(b => updatedMap.get(b.id) || b);
        return [...prevWithoutUpdated, ...created];
      });
      addNotification('Celý rozpočet bol publikovaný pre nasledujúce mesiace.', 'success');

    } catch (e) {
      console.error("Chyba pri hromadnom publikovaní rozpočtu:", e);
      addNotification('Nastala chyba pri hromadnom publikovaní.', 'error');
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspaceId, categories, budgets, addNotification]);

  const value = useMemo(() => ({
    isLoading, error,
    workspaces, currentWorkspaceId, setCurrentWorkspaceId, addWorkspace, updateWorkspace, deleteWorkspace,
    accounts, createAccount, updateAccount, archiveAccount, getAccountBalance, moveAccountUp, moveAccountDown, setDefaultAccount,
    categories, allCategories, addCategory, updateCategory, archiveCategory, updateCategoryOrder, moveCategoryUp, moveCategoryDown,
    transactions, addTransaction, updateTransaction, deleteTransaction,
    budgets, addOrUpdateBudget, deleteBudget, publishBudgetForYear, publishFullBudgetForYear,

    notifications, addNotification, removeNotification,
    getFinancialSummary,
  }), [
    isLoading, error,
    workspaces, currentWorkspaceId, setCurrentWorkspaceId, addWorkspace, updateWorkspace, deleteWorkspace,
    accounts, createAccount, updateAccount, archiveAccount, getAccountBalance, moveAccountUp, moveAccountDown, setDefaultAccount,
    categories, allCategories, addCategory, updateCategory, archiveCategory, updateCategoryOrder, moveCategoryUp, moveCategoryDown,
    transactions, addTransaction, updateTransaction, deleteTransaction,
    budgets, addOrUpdateBudget, deleteBudget, publishBudgetForYear, publishFullBudgetForYear,

    notifications, addNotification, removeNotification,
    getFinancialSummary,
    calculateProjectedAvailableBalance, 
    calculateTotalSavings
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
;