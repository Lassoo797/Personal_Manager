import { RecordModel } from 'pocketbase';import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import pb from '../lib/pocketbase';
import type { Account, Category, Transaction, Budget, Workspace, TransactionType, Notification, AccountStatus } from '../types';
import { useAuth } from './AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Helper funkcie na mapovanie PocketBase záznamov
const mapPbToWorkspace = (r: RecordModel): Workspace => ({ id: r.id, name: r.name });
const mapPbToAccount = (r: RecordModel): Account => ({ id: r.id, name: r.name, workspaceId: r.workspace, currency: r.currency, accountType: r.accountType, type: r.type, initialBalance: r.initialBalance || 0, initialBalanceDate: r.initialBalanceDate, status: r.status || 'active' });
const mapPbToCategory = (r: RecordModel): Category => ({ id: r.id, name: r.name, parentId: r.parent || null, type: r.type, workspaceId: r.workspace, order: r.order, validFrom: r.validFrom, dedicatedAccount: r.dedicatedAccount || null, status: r.status || 'active' });
const mapPbToTransaction = (r: RecordModel): Transaction => ({ id: r.id, transactionDate: r.transactionDate, notes: r.notes, amount: r.amount, type: r.type, categoryId: r.category || null, account: r.account, destinationAccount: r.destinationAccount || null, workspaceId: r.workspace });
const mapPbToBudget = (r: RecordModel): Budget => ({ id: r.id, categoryId: r.category, amount: r.amount, month: r.month, workspaceId: r.workspace });

// PocketBase options to prevent autocancellation during batch operations
const noAutoCancel = { '$autoCancel': false };

interface AppContextType {
  // Nové stavy pre UI
  isLoading: boolean;
  error: Error | null;

  // Profile Management
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  setCurrentWorkspaceId: (id: string | null) => void;
  addWorkspace: (name: string) => Promise<void>;
  updateWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  
  // Data for current workspace
  accounts: Account[];
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
  archiveCategory: (id: string, force?: boolean) => Promise<{ needsConfirmation?: boolean; message?: string; }>;
  archiveCategoryAndChildren: (id: string) => Promise<void>;
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
  
  const loadAppData = useCallback(async () => {
    // This function can be used to manually trigger a full reload of everything.
     setIsGlobalLoading(true);
     setError(null);
     try {
       const workspacesData = await pb.collection('workspaces').getFullList();

       const mappedWorkspaces = workspacesData.map(mapPbToWorkspace);
       setWorkspaces(mappedWorkspaces);

       const isInvalidStoredWorkspace = currentWorkspaceId && !mappedWorkspaces.some(p => p.id === currentWorkspaceId);
       if (isInvalidStoredWorkspace) {
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
  }, [currentWorkspaceId, setCurrentWorkspaceId]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [{ id, message, type }, ...prev]);
  }, []);


  const getAccountBalance = useCallback((accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    const transactionsTotal = transactions.reduce((balance, t) => {
        if (t.type === 'transfer') {
            if (t.account === accountId) {
                // Zdrojový účet prevodu -> odčítať
                return balance - t.amount;
            }
            if (t.destinationAccount === accountId) {
                // Cieľový účet prevodu -> pričítať
                return balance + t.amount;
            }
        } else { // Pôvodná logika pre príjem/výdavok
            if (t.account === accountId) {
                return t.type === 'income' ? balance + t.amount : balance - t.amount;
            }
        }
        return balance;
    }, 0);

    return (account.initialBalance || 0) + transactionsTotal;
  }, [accounts, transactions]);

  const getFinancialSummary = useCallback((transactionsToSummarize: Transaction[]): { actualIncome: number, actualExpense: number } => {
    return transactionsToSummarize.reduce((summary, t) => {
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
        loadAppData();
    }
  }, [loadAppData]);

  const archiveCategory = useCallback(async (id: string, force: boolean = false): Promise<{ needsConfirmation?: boolean; message?: string; }> => {
    if (!currentWorkspaceId) return { message: 'No workspace selected.' };
    
    const categoryToArchive = allCategories.find(c => c.id === id);
    if (!categoryToArchive) return { message: 'Category not found.' };

    if (categoryToArchive.dedicatedAccount && !force) {
        const linkedAccount = allAccounts.find(a => a.id === categoryToArchive.dedicatedAccount);
        if (linkedAccount) {
            const balance = getAccountBalance(linkedAccount.id);
            if (Math.abs(balance) > 0.001) {
                const message = `Kategóriu '${categoryToArchive.name}' nie je možné archivovať, pretože prepojený účet '${linkedAccount.name}' má nenulový zostatok (${balance.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}). Najprv musíte zostatok účtu vynulovať.`;
                addNotification(message, 'error');
                return { message };
            }
            // Balance is zero, needs user confirmation to archive both
            return { 
                needsConfirmation: true, 
                message: `Kategória '${categoryToArchive.name}' je prepojená s účtom '${linkedAccount.name}'. Jej archiváciou sa archivuje aj tento účet. Prajete si pokračovať?`
            };
        }
    }
    
    try {
        // --- Actual Archiving Logic ---
        // Archive linked account if force is true
        if (categoryToArchive.dedicatedAccount && force) {
            await archiveAccount(categoryToArchive.dedicatedAccount);
        }

        // Delete related budgets
        const relatedBudgets = await pb.collection('budgets').getFullList({ filter: `category = '${id}'` });
        await Promise.all(relatedBudgets.map(b => pb.collection('budgets').delete(b.id)));
        
        // Archive the category itself
        await pb.collection('categories').update(id, { status: 'archived' });
        
        await pb.collection('system_events').create({
          workspace: currentWorkspaceId,
          type: 'category_archived',
          details: { categoryId: id, name: categoryToArchive.name }
        });

        // Update local state
        setAllCategories(prev => prev.map(c => c.id === id ? { ...c, status: 'archived' } : c));
        setBudgets(prev => prev.filter(b => b.categoryId !== id));
        
        addNotification(`Kategória '${categoryToArchive.name}' bola archivovaná.`, 'success');
        return {}; // Success
    } catch (e: any) {
        const errorMsg = 'Nepodarilo sa archivovať kategóriu.';
        addNotification(errorMsg, 'error');
        console.error(errorMsg, e);
        return { message: errorMsg };
    }
  }, [currentWorkspaceId, allCategories, allAccounts, getAccountBalance, addNotification]);

  const archiveCategoryAndChildren = useCallback(async (id: string) => {
    const children = allCategories.filter(c => c.parentId === id);
    for (const child of children) {
      await archiveCategoryAndChildren(child.id);
    }
    await archiveCategory(id, true); // Force archive without confirmation for children
  }, [allCategories, archiveCategory]);


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
      loadAppData();
    }
  }, [allCategories, loadAppData]);
  
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
            let parentCategory = categories.find(c => c.name === 'Sporenie' && c.type === 'expense' && !c.parentId);
            if (!parentCategory) {
                const parentData = { name: 'Sporenie', type: 'expense', parentId: null, validFrom: account.initialBalanceDate.substring(0, 7) };
                parentCategory = await addCategory(parentData);
            }

            if (parentCategory) {
                const subcategoryData = {
                    name: account.name,
                    type: 'expense',
                    parentId: parentCategory.id,
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
    
    const data = {
        ...transaction,
        workspace: currentWorkspaceId,
        account: transaction.account,
        category: transaction.type !== 'transfer' ? transaction.categoryId : null,
        destinationAccount: transaction.type === 'transfer' ? transaction.destinationAccount : null,
    };

    const newTransactionRecord = await pb.collection('transactions').create(data);
    const newTransaction = mapPbToTransaction(newTransactionRecord);
    setTransactions(prev => [...prev, newTransaction]);

    await pb.collection('system_events').create({
      workspace: currentWorkspaceId,
      type: 'transaction_created',
      details: {
        transactionId: newTransaction.id,
        type: newTransaction.type,
        amount: newTransaction.amount,
        account: newTransaction.account,
        categoryId: newTransaction.categoryId
      }
    });

    addNotification('Transakcia bola pridaná.', 'success');
  }, [currentWorkspaceId, addNotification]);

  const updateTransaction = useCallback(async (updated: Transaction) => {
    const { id, workspaceId, ...data } = updated;
    const originalTransaction = transactions.find(t => t.id === id);
    if (!originalTransaction) return;

    const payload = { 
        ...data,
        workspace: workspaceId,
        account: data.account,
        category: data.type !== 'transfer' ? data.categoryId : null,
        destinationAccount: data.type === 'transfer' ? data.destinationAccount : null,
     };
    const updatedTransactionRecord = await pb.collection('transactions').update(id, payload);
    const updatedTransaction = mapPbToTransaction(updatedTransactionRecord);
    setTransactions(prev => prev.map(t => t.id === id ? updatedTransaction : t));

    const changes: Record<string, any> = {};
    for (const key in updated) {
      if (key !== 'id' && updated[key as keyof Transaction] !== originalTransaction[key as keyof Transaction]) {
        changes[key] = {
          old: originalTransaction[key as keyof Transaction],
          new: updated[key as keyof Transaction]
        };
      }
    }
    
    if (Object.keys(changes).length > 0) {
      await pb.collection('system_events').create({
        workspace: workspaceId,
        type: 'transaction_updated',
        details: {
          transactionId: id,
          changes
        }
      });
    }

    addNotification('Transakcia bola aktualizovaná.', 'success');
  }, [addNotification, transactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!currentWorkspaceId) return;
    const transactionToDelete = transactions.find(t => t.id === id);
    if (!transactionToDelete) return;

    await pb.collection('transactions').delete(id);
    setTransactions(prev => prev.filter(t => t.id !== id));

    await pb.collection('system_events').create({
      workspace: currentWorkspaceId,
      type: 'transaction_deleted',
      details: {
        transactionId: id,
        type: transactionToDelete.type,
        amount: transactionToDelete.amount,
        account: transactionToDelete.account,
        date: transactionToDelete.transactionDate
      }
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
    categories, addCategory, updateCategory, archiveCategory, archiveCategoryAndChildren, updateCategoryOrder, moveCategoryUp, moveCategoryDown,
    transactions, addTransaction, updateTransaction, deleteTransaction,
    budgets, addOrUpdateBudget, deleteBudget, publishBudgetForYear, publishFullBudgetForYear,
    loadAppData, // Expose the loader function
    notifications, addNotification, removeNotification,
    getFinancialSummary,
  }), [
    isLoading, error,
    workspaces, currentWorkspaceId, setCurrentWorkspaceId, addWorkspace, updateWorkspace, deleteWorkspace,
    accounts, createAccount, updateAccount, archiveAccount, getAccountBalance,
    categories, addCategory, updateCategory, archiveCategory, archiveCategoryAndChildren, updateCategoryOrder, moveCategoryUp, moveCategoryDown,
    transactions, addTransaction, updateTransaction, deleteTransaction,
    budgets, addOrUpdateBudget, deleteBudget, publishBudgetForYear, publishFullBudgetForYear,
    loadAppData,
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