import { RecordModel } from 'pocketbase';import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import pb from '../lib/pocketbase';
import type { Account, Category, Transaction, Budget, Workspace, TransactionType, Notification, AccountStatus } from '../types';
import { useAuth } from './AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { mapPbToWorkspace, mapPbToAccount, mapPbToCategory, mapPbToTransaction, mapPbToBudget } from '../lib/mappers';


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
  createAccount: (account: Omit<Account, 'id' | 'workspaceId'>) => Promise<void>;
  updateAccount: (account: Partial<Account> & Pick<Account, 'id'>) => Promise<void>;
  archiveAccount: (id: string) => Promise<string | void>;
  getAccountBalance: (accountId: string) => number;
  
  addCategory: (category: Omit<Category, 'id' | 'workspaceId' | 'order' | 'status'>) => Promise<Category | null>;
  updateCategory: (category: Category) => Promise<void>;
  updateCategoryOrder: (updatedCategories: Category[]) => Promise<void>;
  archiveCategory: (id: string, archiveMonth: string, force?: boolean) => Promise<{ success: boolean; message?: string; needsConfirmation?: boolean; }>;
  moveCategoryUp: (categoryId: string) => Promise<void>;
  moveCategoryDown: (categoryId: string) => Promise<void>;

  addTransaction: (transaction: Omit<Transaction, 'id' | 'workspaceId'>) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addOrUpdateBudget: (budget: Omit<Budget, 'id' | 'workspaceId'>) => Promise<void>;
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
  const accounts = useMemo(() => allAccounts.filter(a => a.status === 'active'), [allAccounts]);
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
        const workspacesData = await pb.collection('workspaces').getFullList();

        const mappedWorkspaces = workspacesData.map(mapPbToWorkspace);
        setWorkspaces(mappedWorkspaces);

        // Auto-select workspace logic after global data is loaded
        const isInvalidStoredWorkspace = currentWorkspaceId && !mappedWorkspaces.some(p => p.id === currentWorkspaceId);
        if (isInvalidStoredWorkspace || !currentWorkspaceId) { // Also auto-select if no workspace was selected
          setCurrentWorkspaceId(mappedWorkspaces.length > 0 ? mappedWorkspaces[0].id : null);
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
            pb.collection('accounts').getFullList({ filter }),
            pb.collection('categories').getFullList({ filter }),
            pb.collection('transactions').getFullList({ filter }),
            pb.collection('budgets').getFullList({ filter }),
          ]);
          setAllAccounts(accs.map(mapPbToAccount));
          setAllCategories(cats.map(mapPbToCategory));
          setTransactions(trans.map(mapPbToTransaction));
          setBudgets(buds.map(mapPbToBudget));
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

    return (account.initialBalance || 0) + transactionsTotal;
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

  // --- Workspace Management ---
  const addWorkspace = useCallback(async (name: string) => {
    const newWorkspaceRecord = await pb.collection('workspaces').create({ name: name });
    const mapped = mapPbToWorkspace(newWorkspaceRecord);
    setWorkspaces(prev => [...prev, mapped]);
    setCurrentWorkspaceId(mapped.id);

    await pb.collection('system_events').create({
      workspace: mapped.id,
      type: 'workspace_created',
      details: {
        workspaceId: mapped.id,
        name: mapped.name
      }
    });

    addNotification(`Pracovný priestor "${name}" bol úspešne vytvorený.`, 'success');
  }, [setCurrentWorkspaceId, addNotification]);

  const updateWorkspace = useCallback(async (id: string, name: string) => {
    const originalWorkspace = workspaces.find(w => w.id === id);
    if (!originalWorkspace) return;

    const updated = await pb.collection('workspaces').update(id, { name: name });
    setWorkspaces(prev => prev.map(p => p.id === id ? mapPbToWorkspace(updated) : p));

    await pb.collection('system_events').create({
      workspace: id,
      type: 'workspace_updated',
      details: {
        workspaceId: id,
        oldName: originalWorkspace.name,
        newName: name
      }
    });

    addNotification(`Pracovný priestor "${name}" bol aktualizovaný.`, 'success');
  }, [addNotification, workspaces]);

  const deleteWorkspace = useCallback(async (id: string) => {
    const workspaceToDelete = workspaces.find(w => w.id === id);
    if (!workspaceToDelete) return;

    try {
      setIsLoading(true);
      const filter = pb.filter('workspace = {:workspaceId}', { workspaceId: id });
      
      // Get IDs of all related records
      const [accountsToDelete, categoriesToDelete, transactionsToDelete, budgetsToDelete] = await Promise.all([
          pb.collection('accounts').getFullList({ filter, fields: 'id' }),
          pb.collection('categories').getFullList({ filter, fields: 'id' }),
          pb.collection('transactions').getFullList({ filter, fields: 'id' }),
          pb.collection('budgets').getFullList({ filter, fields: 'id' })
      ]);

      // Batch delete records. PocketBase JS SDK doesn't have batch delete, so we do it in parallel.
      // Adjust if you have a very large number of records per workspace to avoid overwhelming the server.
      await Promise.all([
        ...accountsToDelete.map(r => pb.collection('accounts').delete(r.id)),
        ...categoriesToDelete.map(r => pb.collection('categories').delete(r.id)),
        ...transactionsToDelete.map(r => pb.collection('transactions').delete(r.id)),
        ...budgetsToDelete.map(r => pb.collection('budgets').delete(r.id)),
      ]);

      // Finally, delete the workspace itself
      await pb.collection('workspaces').delete(id);
      
      await pb.collection('system_events').create({
        workspace: id,
        type: 'workspace_deleted',
        details: {
          workspaceId: id,
          name: workspaceToDelete.name
        }
      });

      // Update local state
      const remaining = workspaces.filter(p => p.id !== id);
      setWorkspaces(remaining);
      if (currentWorkspaceId === id) {
        setCurrentWorkspaceId(remaining.length > 0 ? remaining[0].id : null);
      }
      
      addNotification('Pracovný priestor a všetky jeho dáta boli zmazané.', 'success');

    } catch(e: any) {
        setError(e);
        console.error("Chyba pri mazaní pracovného priestoru:", e);
        addNotification('Chyba pri mazaní pracovného priestoru. Skontrolujte, či nie sú k pracovnému priestoru priradené nejaké dáta.', 'error');
    } finally {
        setIsLoading(false);
        // We might need to refresh data if something went partially wrong
        if (currentWorkspaceId === id) {
           // The main useEffect will trigger due to workspace change
        } else {
            // If we deleted a background workspace, the current view is fine.
        }
    }
  }, [workspaces, currentWorkspaceId, setCurrentWorkspaceId, addNotification]);

  // --- Data Management ---
  
  // CATEGORY MANAGEMENT
  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'workspaceId' | 'order' | 'status'>): Promise<Category | null> => {
    if (!currentWorkspaceId) return null;
    
    const siblings = allCategories.filter(c => c.parentId === category.parentId && c.type === category.type);
    const newOrder = siblings.length > 0 ? Math.max(...siblings.map(c => c.order)) + 1 : 0;
    
    const data = {
        ...category,
        workspace: currentWorkspaceId,
        order: newOrder,
        parent: category.parentId || undefined,
        status: 'active'
    };

    try {
      const newCategoryRecord = await pb.collection('categories').create(data);
      const mapped = mapPbToCategory(newCategoryRecord);
      setAllCategories(prev => [...prev, mapped]);

      await pb.collection('system_events').create({
        workspace: currentWorkspaceId,
        type: 'category_created',
        details: {
          categoryId: mapped.id,
          name: mapped.name,
          type: mapped.type,
          parentId: mapped.parentId
        }
      });

      addNotification(`Kategória "${mapped.name}" bola vytvorená.`, 'success');
      return mapped;
    } catch (e: any) {
      setError(e);
      addNotification('Nepodarilo sa vytvoriť kategóriu.', 'error');
      console.error("Nepodarilo sa vytvoriť kategóriu:", e);
      return null;
    }
  }, [currentWorkspaceId, allCategories, addNotification]);

  const updateCategory = useCallback(async (updated: Category) => {
    const { id, name } = updated;
    const originalCategory = allCategories.find(c => c.id === id);
    if (!originalCategory) return;

    // Create a snapshot of changes
    const changes: Record<string, any> = {};
    for (const key in updated) {
      if (key !== 'id' && updated[key as keyof Category] !== originalCategory[key as keyof Category]) {
        changes[key] = {
          old: originalCategory[key as keyof Category],
          new: updated[key as keyof Category]
        };
      }
    }
    
    // Update linked account name if it's a dedicated category and name has changed
    if (originalCategory.dedicatedAccount && name && name !== originalCategory.name) {
        const linkedAccount = accounts.find(a => a.id === originalCategory.dedicatedAccount);
        if (linkedAccount && linkedAccount.name !== name) {
            await pb.collection('accounts').update(linkedAccount.id, { name });
            setAllAccounts(prev => prev.map(acc => acc.id === linkedAccount.id ? { ...acc, name } : acc));
        }
    }

    const payload = { ...updated, parent: updated.parentId || null, workspace: updated.workspaceId };
    delete (payload as any).id; 
    delete (payload as any).workspaceId;

    const updatedCategory = await pb.collection('categories').update(id, payload);
    setAllCategories(prev => {
        const newState = prev.map(c => c.id === id ? mapPbToCategory(updatedCategory) : c)
        return newState.sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    if (Object.keys(changes).length > 0) {
      await pb.collection('system_events').create({
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
  }, [addNotification, categories, accounts]);
  
  const updateCategoryOrder = useCallback(async (updatedCategories: Category[]) => {
    try {
        await Promise.all(
            updatedCategories.map(cat => 
                pb.collection('categories').update(cat.id, { order: cat.order })
            )
        );
        // Optimistically update local state to avoid re-fetch lag
        setAllCategories(prev => {
            const updatedMap = new Map(updatedCategories.map(c => [c.id, c]));
            return prev.map(c => updatedMap.get(c.id) || c);
        });
    } catch (e) {
        console.error("Failed to update category order:", e);
        // If update fails, refetch to ensure consistency
        // loadAppData();
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
      const conflictingBudget = budgets.find(b => allRelatedCategoryIds.includes(b.categoryId) && b.month >= archiveMonth);
      if (conflictingBudget) {
        const message = `Kategóriu nie je možné archivovať, pretože ona alebo jej podkategória má v mesiaci ${archiveMonth} alebo neskôr naplánovaný rozpočet.`;
        addNotification(message, 'error');
        return { success: false, message };
      }
      
      // 3. Validácia prepojených účtov
      const allRelatedCategories = [categoryToArchive, ...children];
      const dedicatedAccounts = allRelatedCategories
          .map(c => c.dedicatedAccount ? allAccounts.find(a => a.id === c.dedicatedAccount) : null)
          .filter((acc): acc is Account => !!acc);

      for (const account of dedicatedAccounts) {
          const balance = getAccountBalance(account.id);
          if (Math.abs(balance) > 0.001) {
              const message = `Kategóriu '${categoryToArchive.name}' nie je možné archivovať, pretože prepojený účet '${account.name}' má nenulový zostatok. Najprv ho musíte vynulovať.`;
              addNotification(message, 'error');
              return { success: false, message };
          }
      }

      if (dedicatedAccounts.length > 0) {
        return { 
            success: false, 
            needsConfirmation: true, 
            message: `Kategória '${categoryToArchive.name}' je prepojená so sporiacim účtom/účtami. Jej archiváciou sa archivujú aj tieto účty. Prajete si pokračovať?`
        };
      }
    }
    
    // --- Samotná archivácia ---
    try {
        const accountsToArchiveIds = [
            categoryToArchive.dedicatedAccount, 
            ...children.map(c => c.dedicatedAccount)
        ].filter((accId): accId is string => !!accId);

        if (accountsToArchiveIds.length > 0) {
            await Promise.all(accountsToArchiveIds.map(accId => pb.collection('accounts').update(accId, { status: 'archived' }, noAutoCancel)));
        }
        
        await Promise.all(allRelatedCategoryIds.map(catId => pb.collection('categories').update(catId, { status: 'archived', archivedFrom: archiveMonth }, noAutoCancel)));
        
        await pb.collection('system_events').create({
          workspace: currentWorkspaceId,
          type: 'category_archived',
          details: { categoryId: id, name: categoryToArchive.name, childrenCount: children.length, archiveMonth }
        });

        // Update local state
        setAllCategories(prev => prev.map(c => allRelatedCategoryIds.includes(c.id) ? { ...c, status: 'archived', archivedFrom: archiveMonth } : c));
        if (accountsToArchiveIds.length > 0) {
            setAllAccounts(prev => prev.map(a => accountsToArchiveIds.includes(a.id) ? { ...a, status: 'archived' } : a));
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
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
  
    const siblings = categories
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
      await Promise.all(
        updatedOrders.map(c => pb.collection('categories').update(c.id, { order: c.order }))
      );
      setAllCategories(prev => {
        const updatedMap = new Map(updatedOrders.map(c => [c.id, c]));
        const sorted = prev.map(c => updatedMap.get(c.id) || c).sort((a,b)=> (a.order || 0) - (b.order || 0));
        return sorted;
      });
    } catch (e) {
      console.error(`Failed to move category ${direction}:`, e);
      // loadAppData();
    }
  }, [allCategories]);
  
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
        if (accountToArchive && accountToArchive.accountType === 'Sporiaci účet') {
            const linkedCategory = allCategories.find(c => c.dedicatedAccount === id);
            // We don't archive the linked category here automatically. 
            // The user should archive the category, which in turn archives the account.
            if (linkedCategory && linkedCategory.status === 'active') {
                 addNotification(`Toto je sporiaci účet prepojený s kategóriou '${linkedCategory.name}'. Pre archiváciu prosím archivujte danú kategóriu.`, 'info');
                 return;
            }
        }
        
        await pb.collection('accounts').update(id, { status: 'archived' });

        setAllAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'archived' } : a));
        addNotification('Účet bol úspešne archivovaný.', 'success');
        
        if (accountToArchive) {
          await pb.collection('system_events').create({
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
  
  // ACCOUNT MANAGEMENT
  const createAccount = useCallback(async (account: Omit<Account, 'id' | 'workspaceId' | 'status'>) => {
    if (!currentWorkspaceId) return;

    try {
        const newAccountRecord = await pb.collection('accounts').create({ ...account, workspace: currentWorkspaceId, status: 'active' });
        const newAccount = mapPbToAccount(newAccountRecord);
        setAllAccounts(prev => [...prev, newAccount]);

        // Log system event for account creation
        await pb.collection('system_events').create({
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
        if (account.initialBalance && account.initialBalance > 0) {
          await pb.collection('system_events').create({
            workspace: currentWorkspaceId,
            type: 'initial_balance_set',
            details: {
              accountId: newAccount.id,
              name: newAccount.name,
              initialBalance: account.initialBalance,
              initialBalanceDate: account.initialBalanceDate
            }
          });
        }
        
        if (account.accountType === 'Sporiaci účet') {
            // --- Kategória pre VKLAD na sporenie (Výdavok) ---
            let expenseParent = categories.find(c => c.name === 'Sporenie' && c.type === 'expense' && !c.parentId);
            if (!expenseParent) {
                const parentData = { name: 'Sporenie', type: 'expense', parentId: null, validFrom: account.initialBalanceDate.substring(0, 7) };
                expenseParent = await addCategory(parentData);
            }

            if (expenseParent) {
                const subcategoryData = {
                    name: account.name,
                    type: 'expense',
                    parentId: expenseParent.id,
                    validFrom: account.initialBalanceDate.substring(0, 7),
                    dedicatedAccount: newAccount.id
                };
                await addCategory(subcategoryData);
            }

            // --- Kategória pre VÝBER zo sporenia (Príjem) ---
            let incomeParent = categories.find(c => c.name === 'Príjem zo sporenia' && c.type === 'income' && !c.parentId);
            if (!incomeParent) {
                const parentData = { name: 'Príjem zo sporenia', type: 'income', parentId: null, validFrom: account.initialBalanceDate.substring(0, 7) };
                incomeParent = await addCategory(parentData);
            }

            if (incomeParent) {
                const subcategoryData = {
                    name: account.name,
                    type: 'income',
                    parentId: incomeParent.id,
                    validFrom: account.initialBalanceDate.substring(0, 7),
                    dedicatedAccount: newAccount.id
                };
                await addCategory(subcategoryData);
            }
        }

        addNotification(`Účet "${account.name}" bol pridaný.`, 'success');
    } catch (e: any) {
        console.error("Chyba pri vytváraní účtu:", e);
        addNotification('Nastala chyba pri vytváraní účtu.', 'error');
    }
  }, [currentWorkspaceId, addNotification, categories, allAccounts, addCategory]);

  const updateAccount = useCallback(async (accountToUpdate: Partial<Account> & Pick<Account, 'id'>) => {
    if (!currentWorkspaceId) return;
    const { id, name } = accountToUpdate;
    const originalAccount = accounts.find(a => a.id === id);
    if (!originalAccount) return;

    // We are only allowing name change for now to avoid complexity with other fields
    if (!name || name === originalAccount.name) return;

    await pb.collection('accounts').update(id, { name });

    await pb.collection('system_events').create({
      workspace: currentWorkspaceId,
      type: 'account_updated',
      details: {
        accountId: id,
        oldName: originalAccount.name,
        newName: name
      }
    });

    // If it's a savings account, find and update the linked category
    if (originalAccount.accountType === 'Sporiaci účet') {
        const linkedCategory = allCategories.find(c => c.dedicatedAccount === id);
        if (linkedCategory && linkedCategory.name !== name) {
            await updateCategory({ ...linkedCategory, name });
        }
    }
    
    // Optimistically update local state
    setAllAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, name } : acc));
    addNotification(`Účet "${name}" bol aktualizovaný.`, 'success');
  }, [accounts, allCategories, addNotification, updateCategory, currentWorkspaceId]);


  // TRANSACTION MANAGEMENT

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'workspaceId'>) => {
    if (!currentWorkspaceId) return;

    // --- LOGIKA PRE SPORENIE ---
    const category = categories.find(c => c.id === transaction.categoryId);
    const isSavingExpense = transaction.type === 'expense' && category?.dedicatedAccount;
    const isSavingIncome = transaction.type === 'income' && category?.dedicatedAccount;

    if (isSavingExpense) {
        // ... (existujúca logika pre sporenie)
    } else if (isSavingIncome) {
        // --- LOGIKA PRE VÝBER ZO SPORENIA ---
        // 1. Vytvor hlavný príjem
        const incomeData = {
            ...transaction,
            workspace: currentWorkspaceId,
            account: transaction.accountId,
            category: transaction.categoryId,
            onBudget: true,
        };
        const incomeRecord = await pb.collection('transactions').create(incomeData, noAutoCancel);

        // 2. Vytvor interný výdavok zo sporiaceho účtu
        const expenseData = {
            ...transaction,
            workspace: currentWorkspaceId,
            type: 'expense',
            account: category.dedicatedAccount,
            categoryId: null,
            onBudget: false,
            notes: `Výber zo sporenia: ${transaction.notes || category.name}`,
            linkedTransaction: incomeRecord.id, // Prepoj s príjmom
        };
        const expenseRecord = await pb.collection('transactions').create(expenseData, noAutoCancel);

        // 3. Aktualizuj hlavný príjem, aby obsahoval link na interný výdavok
        const finalIncomeRecord = await pb.collection('transactions').update(incomeRecord.id, { linkedTransaction: expenseRecord.id }, noAutoCancel);

        // 4. Aktualizuj lokálny stav
        const newIncome = mapPbToTransaction(finalIncomeRecord);
        const newExpense = mapPbToTransaction(expenseRecord);
        setTransactions(prev => [...prev, newIncome, newExpense]);
        
        addNotification('Výber zo sporenia bol úspešne zaevidovaný.', 'success');

    } else {
        // --- PÔVODNÁ LOGIKA ---
        const data = {
            ...transaction,
            workspace: currentWorkspaceId,
            account: transaction.accountId,
            category: transaction.type !== 'transfer' ? transaction.categoryId : null,
            destinationAccount: transaction.type === 'transfer' ? transaction.destinationAccountId : null,
            onBudget: transaction.onBudget !== false, // Default to true
        };

        const newTransactionRecord = await pb.collection('transactions').create(data);
        const newTransaction = mapPbToTransaction(newTransactionRecord);
        setTransactions(prev => [...prev, newTransaction]);
        addNotification('Transakcia bola pridaná.', 'success');
    }

    // Spoločné logovanie udalosti (môže sa vylepšiť)
    await pb.collection('system_events').create({
      workspace: currentWorkspaceId,
      type: 'transaction_created',
      details: { /* ... dáta pre log ... */ }
    });

  }, [currentWorkspaceId, addNotification, categories]);

  const updateTransaction = useCallback(async (updated: Transaction) => {
    const { id, workspaceId, ...data } = updated;
    const originalTransaction = transactions.find(t => t.id === id);
    if (!originalTransaction) return;

    // --- LOGIKA PRE SPORENIE ---
    if (originalTransaction.linkedTransaction) {
        const linkedTransaction = transactions.find(t => t.id === originalTransaction.linkedTransaction);
        if (linkedTransaction) {
            // 1. Aktualizuj hlavnú transakciu
            const payload = { ...data, workspace: workspaceId, account: data.accountId };
            const updatedRecord = await pb.collection('transactions').update(id, payload, noAutoCancel);

            // 2. Aktualizuj prepojenú transakciu (suma, dátum, poznámka)
            const notePrefix = originalTransaction.type === 'expense' ? 'Sporenie: ' : 'Výber zo sporenia: ';
            const linkedPayload = { 
                amount: data.amount, 
                transactionDate: data.transactionDate,
                notes: `${notePrefix}${data.notes || ''}`,
            };
            const updatedLinkedRecord = await pb.collection('transactions').update(linkedTransaction.id, linkedPayload, noAutoCancel);
            
            // 3. Aktualizuj lokálny stav
            setTransactions(prev => prev.map(t => {
                if (t.id === id) return mapPbToTransaction(updatedRecord);
                if (t.id === linkedTransaction.id) return mapPbToTransaction(updatedLinkedRecord);
                return t;
            }));
        }
    } else {
        // --- PÔVODNÁ LOGIKA ---
        const payload = { 
            ...data,
            workspace: workspaceId,
            account: data.accountId,
            category: data.type !== 'transfer' ? data.categoryId : null,
            destinationAccount: data.type === 'transfer' ? data.destinationAccountId : null,
        };
        const updatedTransactionRecord = await pb.collection('transactions').update(id, payload);
        const updatedTransaction = mapPbToTransaction(updatedTransactionRecord);
        setTransactions(prev => prev.map(t => t.id === id ? updatedTransaction : t));
    }
    
    addNotification('Transakcia bola aktualizovaná.', 'success');
    // Logovanie sa tu môže doplniť...
  }, [addNotification, transactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!currentWorkspaceId) return;
    const transactionToDelete = transactions.find(t => t.id === id);
    if (!transactionToDelete) return;

    // --- LOGIKA PRE SPORENIE ---
    if (transactionToDelete.linkedTransaction) {
        // Zmaž obe transakcie
        await pb.collection('transactions').delete(id, noAutoCancel);
        await pb.collection('transactions').delete(transactionToDelete.linkedTransaction, noAutoCancel);
        setTransactions(prev => prev.filter(t => t.id !== id && t.id !== transactionToDelete.linkedTransaction));
    } else {
        // --- PÔVODNÁ LOGIKA ---
        await pb.collection('transactions').delete(id);
        setTransactions(prev => prev.filter(t => t.id !== id));
    }

    await pb.collection('system_events').create({
      workspace: currentWorkspaceId,
      type: 'transaction_deleted',
      details: { transactionId: id, type: transactionToDelete.type, amount: transactionToDelete.amount }
    });

    addNotification('Transakcia bola zmazaná.', 'success');
  }, [addNotification, transactions, currentWorkspaceId]);

  const addOrUpdateBudget = useCallback(async (budget: Omit<Budget, 'id' | 'workspaceId'>) => {
    if (!currentWorkspaceId) return;
    
    const existing = budgets.find(b => b.categoryId === budget.categoryId && b.month === budget.month);

    if (existing) {
      const updatedRecord = await pb.collection('budgets').update(existing.id, { amount: budget.amount });
      const updated = mapPbToBudget(updatedRecord);
      setBudgets(prev => prev.map(b => b.id === existing.id ? updated : b));

      await pb.collection('system_events').create({
        workspace: currentWorkspaceId,
        type: 'budget_updated',
        details: {
          budgetId: existing.id,
          categoryId: existing.categoryId,
          month: existing.month,
          oldAmount: existing.amount,
          newAmount: updated.amount
        }
      });

    } else {
      const data = {
          ...budget,
          workspace: currentWorkspaceId,
          category: budget.categoryId
      };
      const newBudgetRecord = await pb.collection('budgets').create(data);
      const mapped = mapPbToBudget(newBudgetRecord);
      setBudgets(prev => [...prev, mapped]);

      await pb.collection('system_events').create({
        workspace: currentWorkspaceId,
        type: 'budget_created',
        details: {
          budgetId: mapped.id,
          categoryId: mapped.categoryId,
          month: mapped.month,
          amount: mapped.amount
        }
      });
    }
    addNotification('Rozpočet bol uložený.', 'success');
  }, [currentWorkspaceId, budgets, addNotification]);
  
  const deleteBudget = useCallback(async(id:string) => {
    if (!currentWorkspaceId) return;
    const budgetToDelete = budgets.find(b => b.id === id);
    if (!budgetToDelete) return;

    await pb.collection('budgets').delete(id);
    setBudgets(prev => prev.filter(b => b.id !== id));

    await pb.collection('system_events').create({
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
                    const updated = await pb.collection('budgets').update(existingBudget.id, { amount: sourceAmount }, noAutoCancel);
                    updatedBudgets.push(mapPbToBudget(updated));
                } catch (e) { console.error(`Failed to update budget for ${categoryId} in ${targetMonth}:`, e); }
            }
        } else if (sourceAmount > 0) {
             // Vytvor nový, len ak je suma > 0
            const data = { workspace: currentWorkspaceId, category: categoryId, month: targetMonth, amount: sourceAmount };
            try {
                const newBudget = await pb.collection('budgets').create(data, noAutoCancel);
                newBudgets.push(mapPbToBudget(newBudget));
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
            budgetsToUpdate.push(pb.collection('budgets').update(existingBudget.id, { amount: sourceAmount }, noAutoCancel));
          }
        } else if (sourceAmount > 0) {
          const data = { workspace: currentWorkspaceId, category: categoryId, month: targetMonth, amount: sourceAmount };
          budgetsToCreate.push(pb.collection('budgets').create(data, noAutoCancel));
        }
      }
    }
  
    try {
      setIsLoading(true);
      const created = await Promise.all(budgetsToCreate);
      const updated = await Promise.all(budgetsToUpdate);
      
      // Update local state
      setBudgets(prev => {
        const updatedMap = new Map(updated.map(b => [b.id, mapPbToBudget(b)]));
        const prevWithoutUpdated = prev.map(b => updatedMap.get(b.id) || b);
        return [...prevWithoutUpdated, ...created.map(mapPbToBudget)];
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
    accounts, createAccount, updateAccount, archiveAccount, getAccountBalance,
    categories, allCategories, addCategory, updateCategory, archiveCategory, updateCategoryOrder, moveCategoryUp, moveCategoryDown,
    transactions, addTransaction, updateTransaction, deleteTransaction,
    budgets, addOrUpdateBudget, deleteBudget, publishBudgetForYear, publishFullBudgetForYear,

    notifications, addNotification, removeNotification,
    getFinancialSummary,
  }), [
    isLoading, error,
    workspaces, currentWorkspaceId, setCurrentWorkspaceId, addWorkspace, updateWorkspace, deleteWorkspace,
    accounts, createAccount, updateAccount, archiveAccount, getAccountBalance,
    categories, allCategories, addCategory, updateCategory, archiveCategory, updateCategoryOrder, moveCategoryUp, moveCategoryDown,
    transactions, addTransaction, updateTransaction, deleteTransaction,
    budgets, addOrUpdateBudget, deleteBudget, publishBudgetForYear, publishFullBudgetForYear,

    notifications, addNotification, removeNotification,
    getFinancialSummary
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