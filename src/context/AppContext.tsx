import { RecordModel } from 'pocketbase';import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import pb from '../lib/pocketbase';
import type { Account, Category, Transaction, Budget, BudgetProfile, TransactionType, Notification } from '../types';
import { useAuth } from './AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Helper funkcie na mapovanie PocketBase záznamov
const mapPbToProfile = (r: RecordModel): BudgetProfile => ({ id: r.id, name: r.name });
const mapPbToAccount = (r: RecordModel): Account => ({ id: r.id, name: r.name, initialBalance: r.initialBalance, profileId: r.profile, currency: r.currency, type: r.type });
const mapPbToCategory = (r: RecordModel): Category => ({ id: r.id, name: r.name, parentId: r.parent || null, type: r.type, profileId: r.profile, order: r.order });
const mapPbToTransaction = (r: RecordModel): Transaction => ({ id: r.id, date: r.date, description: r.description, amount: r.amount, type: r.type, categoryId: r.category, accountId: r.account, profileId: r.profile });
const mapPbToBudget = (r: RecordModel): Budget => ({ id: r.id, categoryId: r.category, amount: r.amount, month: r.month, profileId: r.profile });

// PocketBase options to prevent autocancellation during batch operations
const noAutoCancel = { '$autoCancel': false };

interface AppContextType {
  // Nové stavy pre UI
  isLoading: boolean;
  error: Error | null;

  // Profile Management
  budgetProfiles: BudgetProfile[];
  currentProfileId: string | null;
  setCurrentProfileId: (id: string | null) => void;
  addBudgetProfile: (name: string) => Promise<void>;
  updateBudgetProfile: (id: string, name: string) => Promise<void>;
  deleteBudgetProfile: (id: string) => Promise<void>;
  
  // Data for current profile
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];

  // Data for all profiles (for MasterDashboard)
  allAccounts: Account[];
  allTransactions: Transaction[];
  allBudgets: Budget[];
  allCategories: Category[];

  // Actions
  addAccount: (account: Omit<Account, 'id' | 'profileId'>) => Promise<void>;
  updateAccount: (account: Partial<Account> & Pick<Account, 'id'>) => Promise<void>;
  deleteAccount: (id: string) => Promise<string | void>;
  getAccountBalance: (accountId: string) => number;
  
  addCategory: (category: Omit<Category, 'id' | 'profileId' | 'order'>) => Promise<Category | null>;
  updateCategory: (category: Category) => Promise<void>;
  updateCategoryOrder: (updatedCategories: Category[]) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  deleteCategoryAndChildren: (id: string) => Promise<void>;
  reassignAnddeleteCategory: (categoryIdToDelete: string, targetCategoryId: string) => Promise<void>;
  moveCategoryUp: (categoryId: string) => Promise<void>;
  moveCategoryDown: (categoryId: string) => Promise<void>;

  addTransaction: (transaction: Omit<Transaction, 'id' | 'profileId'>) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addOrUpdateBudget: (budget: Omit<Budget, 'id' | 'profileId'>) => Promise<void>;
  publishBudgetForYear: (categoryId: string, month: string, forAllSubcategories?: boolean) => Promise<void>;
  publishFullBudgetForYear: (month: string) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  
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
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [budgetProfiles, setBudgetProfiles] = useState<BudgetProfile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useLocalStorage<string | null>('currentProfileId', null);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // States for all profiles data
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allBudgets, setAllBudgets] = useState<Budget[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  // Combined loading state
  useEffect(() => {
    setIsLoading(isGlobalLoading || isProfileLoading);
  }, [isGlobalLoading, isProfileLoading]);

  // Effect to load global data once on startup
  useEffect(() => {
    const loadGlobalData = async () => {
      if (!user) {
        // If user is logged out, clear all data and stop loading
        setBudgetProfiles([]);
        setAllAccounts([]);
        setAllTransactions([]);
        setAllBudgets([]);
        setAllCategories([]);
        setIsGlobalLoading(false);
        return;
      }

      setIsGlobalLoading(true);
      setError(null);
      try {
        const [profiles, allAccs, allTrans, allBuds, allCats] = await Promise.all([
          pb.collection('profiles').getFullList(),
          pb.collection('accounts').getFullList(),
          pb.collection('transactions').getFullList(),
          pb.collection('budgets').getFullList(),
          pb.collection('categories').getFullList(),
      ]);

        const mappedProfiles = profiles.map(mapPbToProfile);
        setBudgetProfiles(mappedProfiles);
        setAllAccounts(allAccs.map(mapPbToAccount));
        setAllTransactions(allTrans.map(mapPbToTransaction));
        setAllBudgets(allBuds.map(mapPbToBudget));
        setAllCategories(allCats.map(mapPbToCategory));

        // Auto-select profile logic after global data is loaded
        const isInvalidStoredProfile = currentProfileId && !mappedProfiles.some(p => p.id === currentProfileId);
        if (isInvalidStoredProfile || !currentProfileId) { // Also auto-select if no profile was selected
          setCurrentProfileId(mappedProfiles.length > 0 ? mappedProfiles[0].id : null);
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

  // Effect to load profile-specific data when profile changes
  useEffect(() => {
    const loadProfileData = async () => {
      if (currentProfileId) {
        setIsProfileLoading(true);
        setError(null);
        try {
          const filter = pb.filter('profile = {:profileId}', { profileId: currentProfileId });
          const [accs, cats, trans, buds] = await Promise.all([
            pb.collection('accounts').getFullList({ filter }),
            pb.collection('categories').getFullList({ filter }),
            pb.collection('transactions').getFullList({ filter }),
            pb.collection('budgets').getFullList({ filter }),
          ]);
          setAccounts(accs.map(mapPbToAccount));
          setCategories(cats.map(mapPbToCategory));
          setTransactions(trans.map(mapPbToTransaction));
          setBudgets(buds.map(mapPbToBudget));
        } catch (e: any) {
          if (e.name !== 'AbortError' && !e.isAbort) {
            setError(e);
            console.error("Chyba pri načítavaní dát profilu:", e);
          }
        } finally {
          setIsProfileLoading(false);
        }
      } else {
        // If no profile is selected, clear profile-specific data
        setAccounts([]);
        setCategories([]);
        setTransactions([]);
        setBudgets([]);
      }
    };

    // Don't load profile data until global data is ready
    if (!isGlobalLoading) {
      loadProfileData();
    }
  }, [currentProfileId, isGlobalLoading]);
  
  const loadAppData = useCallback(async () => {
    // This function can be used to manually trigger a full reload of everything.
     setIsGlobalLoading(true);
     setError(null);
     try {
       const [profiles, allAccs, allTrans, allBuds, allCats] = await Promise.all([
         pb.collection('profiles').getFullList(),
         pb.collection('accounts').getFullList(),
         pb.collection('transactions').getFullList(),
         pb.collection('budgets').getFullList(),
         pb.collection('categories').getFullList(),
       ]);

       const mappedProfiles = profiles.map(mapPbToProfile);
       setBudgetProfiles(mappedProfiles);
       setAllAccounts(allAccs.map(mapPbToAccount));
       setAllTransactions(allTrans.map(mapPbToTransaction));
       setAllBudgets(allBuds.map(mapPbToBudget));
       setAllCategories(allCats.map(mapPbToCategory));

       const isInvalidStoredProfile = currentProfileId && !mappedProfiles.some(p => p.id === currentProfileId);
       if (isInvalidStoredProfile) {
         setCurrentProfileId(mappedProfiles.length > 0 ? mappedProfiles[0].id : null);
       }
     } catch (e: any) {
       if (e.name !== 'AbortError' && !e.isAbort) {
         setError(e);
         console.error("Chyba pri načítavaní globálnych dát:", e);
       }
     } finally {
       setIsGlobalLoading(false);
     }
  }, [currentProfileId, setCurrentProfileId]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  }, [removeNotification]);



  const getAccountBalance = useCallback((accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    return transactions.reduce((acc, t) => {
      if (t.accountId === accountId) {
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
      }
      return acc;
    }, account.initialBalance);
  }, [accounts, transactions]);

  // --- Profile Management ---
  const addBudgetProfile = useCallback(async (name: string) => {
    const newProfile = await pb.collection('profiles').create({ name });
    const mapped = mapPbToProfile(newProfile);
    setBudgetProfiles(prev => [...prev, mapped]);
    setCurrentProfileId(mapped.id);
    addNotification(`Profil "${name}" bol úspešne vytvorený.`, 'success');
  }, [setCurrentProfileId, addNotification]);

  const updateBudgetProfile = useCallback(async (id: string, name: string) => {
    const updated = await pb.collection('profiles').update(id, { name });
    setBudgetProfiles(prev => prev.map(p => p.id === id ? mapPbToProfile(updated) : p));
    addNotification(`Profil "${name}" bol aktualizovaný.`, 'success');
  }, [addNotification]);

  const deleteBudgetProfile = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const filter = pb.filter('profile = {:profileId}', { profileId: id });
      
      // Get IDs of all related records
      const [accountsToDelete, categoriesToDelete, transactionsToDelete, budgetsToDelete] = await Promise.all([
          pb.collection('accounts').getFullList({ filter, fields: 'id' }),
          pb.collection('categories').getFullList({ filter, fields: 'id' }),
          pb.collection('transactions').getFullList({ filter, fields: 'id' }),
          pb.collection('budgets').getFullList({ filter, fields: 'id' })
      ]);

      // Batch delete records. PocketBase JS SDK doesn't have batch delete, so we do it in parallel.
      // Adjust if you have a very large number of records per profile to avoid overwhelming the server.
      await Promise.all([
        ...accountsToDelete.map(r => pb.collection('accounts').delete(r.id)),
        ...categoriesToDelete.map(r => pb.collection('categories').delete(r.id)),
        ...transactionsToDelete.map(r => pb.collection('transactions').delete(r.id)),
        ...budgetsToDelete.map(r => pb.collection('budgets').delete(r.id)),
      ]);

      // Finally, delete the profile itself
      await pb.collection('profiles').delete(id);

      // Update local state
      const remaining = budgetProfiles.filter(p => p.id !== id);
      setBudgetProfiles(remaining);
      if (currentProfileId === id) {
        setCurrentProfileId(remaining.length > 0 ? remaining[0].id : null);
      }
      
      // Also update the 'all' states to reflect the deletion without a full reload
      setAllAccounts(prev => prev.filter(a => a.profileId !== id));
      setAllCategories(prev => prev.filter(c => c.profileId !== id));
      setAllTransactions(prev => prev.filter(t => t.profileId !== id));
      setAllBudgets(prev => prev.filter(b => b.profileId !== id));
      addNotification('Profil a všetky jeho dáta boli zmazané.', 'success');

    } catch(e: any) {
        setError(e);
        console.error("Chyba pri mazaní profilu:", e);
        addNotification('Chyba pri mazaní profilu.', 'error');
    } finally {
        setIsLoading(false);
        // We might need to refresh data if something went partially wrong
        if (currentProfileId === id) {
           // The main useEffect will trigger due to profile change
        } else {
            // If we deleted a background profile, the current view is fine.
        }
    }
  }, [budgetProfiles, currentProfileId, setCurrentProfileId, addNotification]);

  // --- Data Management ---
  const addAccount = useCallback(async (account: Omit<Account, 'id' | 'profileId'>) => {
    if (!currentProfileId) return;
    const newAccount = await pb.collection('accounts').create({ ...account, profile: currentProfileId });
    setAccounts(prev => [...prev, mapPbToAccount(newAccount)]);
    addNotification(`Účet "${account.name}" bol pridaný.`, 'success');
  }, [currentProfileId, addNotification]);

  const updateAccount = useCallback(async (accountToUpdate: Partial<Account> & Pick<Account, 'id'>) => {
    const { id, name, currency, type, initialBalance } = accountToUpdate;
    const payload: Partial<Account> = {};
    if (name) payload.name = name;
    if (currency) payload.currency = currency;
    if (type) payload.type = type;
    if (initialBalance !== undefined) payload.initialBalance = initialBalance;

    if (Object.keys(payload).length === 0) return; // No fields to update

    await pb.collection('accounts').update(id, payload);

    setAccounts(prev =>
      prev.map(acc =>
        acc.id === id ? { ...acc, ...payload } : acc
      )
    );
    setAllAccounts(prev => 
      prev.map(acc => 
        acc.id === id ? { ...acc, ...payload } : acc
      )
    )
    addNotification(`Účet bol aktualizovaný.`, 'success');
  }, [addNotification]);

  const deleteAccount = useCallback(async (id: string): Promise<string | void> => {
    const hasTransactions = transactions.some(t => t.accountId === id);
    if (hasTransactions) {
      const message = 'Nie je možné zmazať účet, ku ktorému sú priradené transakcie.';
      addNotification(message, 'error');
      return message;
    }
    await pb.collection('accounts').delete(id);
    setAccounts(prev => prev.filter(a => a.id !== id));
    addNotification('Účet bol úspešne zmazaný.', 'success');
  }, [transactions, addNotification]);
  
  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'profileId' | 'order'>): Promise<Category | null> => {
    if (!currentProfileId) return null;
    
    const siblings = categories.filter(c => c.parentId === category.parentId && c.type === category.type);
    const newOrder = siblings.length > 0 ? Math.max(...siblings.map(c => c.order)) + 1 : 0;
    
    const data = {
        ...category,
        profile: currentProfileId,
        order: newOrder,
        parent: category.parentId || undefined
    };

    try {
      const newCategory = await pb.collection('categories').create(data);
      const mapped = mapPbToCategory(newCategory);
      setCategories(prev => [...prev, mapped]);
      addNotification(`Kategória "${mapped.name}" bola vytvorená.`, 'success');
      return mapped;
    } catch (e: any) {
      setError(e);
      addNotification('Nepodarilo sa vytvoriť kategóriu.', 'error');
      console.error("Nepodarilo sa vytvoriť kategóriu:", e);
      return null;
    }
  }, [currentProfileId, categories, addNotification]);

  const updateCategory = useCallback(async (updated: Category) => {
    const { id, profileId, ...data } = updated;
    // Ensure parent is correctly formatted for PocketBase (ID or null)
    const payload = { ...data, parent: data.parentId || null, profile: profileId };
    const updatedCategory = await pb.collection('categories').update(id, payload);
    setCategories(prev => {
        const newState = prev.map(c => c.id === id ? mapPbToCategory(updatedCategory) : c)
        return newState.sort((a, b) => a.order - b.order);
    });
    addNotification(`Kategória "${updated.name}" bola aktualizovaná.`, 'success');
  }, [addNotification]);

  const updateCategoryOrder = useCallback(async (updatedCategories: Category[]) => {
    try {
        await Promise.all(
            updatedCategories.map(cat => 
                pb.collection('categories').update(cat.id, { order: cat.order })
            )
        );
        // Optimistically update local state to avoid re-fetch lag
        setCategories(prev => {
            const updatedMap = new Map(updatedCategories.map(c => [c.id, c]));
            return prev.map(c => updatedMap.get(c.id) || c);
        });
    } catch (e) {
        console.error("Failed to update category order:", e);
        // If update fails, refetch to ensure consistency
        loadAppData();
    }
  }, [loadAppData]);

  const deleteCategory = useCallback(async (id: string) => {
    // Delete related budgets first
    const relatedBudgets = await pb.collection('budgets').getFullList({ filter: `category = '${id}'` });
    await Promise.all(relatedBudgets.map(b => pb.collection('budgets').delete(b.id)));
    
    await pb.collection('categories').delete(id);
    
    // Update local state
    setCategories(prev => prev.filter(c => c.id !== id));
    setBudgets(prev => prev.filter(b => b.categoryId !== id));
    addNotification('Kategória bola zmazaná.', 'success');
  }, [addNotification]);

  const deleteCategoryAndChildren = useCallback(async (id: string) => {
    const children = categories.filter(c => c.parentId === id);
    for (const child of children) {
      // Recursively delete children and their associated data
      await deleteCategoryAndChildren(child.id);
    }
    // Delete the parent category itself
    await deleteCategory(id);
  }, [categories, deleteCategory]);

  const reassignAnddeleteCategory = useCallback(async (categoryIdToDelete: string, targetCategoryId: string) => {
    // 1. Find transactions to update in PocketBase
    const relatedTransactions = await pb.collection('transactions').getFullList({ 
        filter: `category = '${categoryIdToDelete}'` 
    });

    // 2. Update them in PocketBase
    await Promise.all(
      relatedTransactions.map(t => pb.collection('transactions').update(t.id, { category: targetCategoryId }))
    );

    // 3. Update local state for immediate UI feedback
    setTransactions(prevTransactions => 
      prevTransactions.map(t => 
        t.categoryId === categoryIdToDelete 
          ? { ...t, categoryId: targetCategoryId } 
          : t
      )
    );

    // 4. Delete the category (which also handles budgets)
    await deleteCategory(categoryIdToDelete);
    addNotification('Transakcie boli presunuté a kategória bola zmazaná.', 'success');
    
    // No loadAppData() needed as we updated the state manually
  }, [deleteCategory, addNotification]);

  const moveCategory = useCallback(async (categoryId: string, direction: 'up' | 'down') => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
  
    const siblings = categories
      .filter(c => c.parentId === category.parentId && c.type === category.type)
      .sort((a, b) => a.order - b.order);
  
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
      setCategories(prev => {
        const updatedMap = new Map(updatedOrders.map(c => [c.id, c]));
        const sorted = prev.map(c => updatedMap.get(c.id) || c).sort((a,b)=> a.order - b.order);
        return sorted;
      });
    } catch (e) {
      console.error(`Failed to move category ${direction}:`, e);
      loadAppData();
    }
  }, [categories, loadAppData]);
  
  const moveCategoryUp = useCallback((categoryId: string) => moveCategory(categoryId, 'up'), [moveCategory]);
  const moveCategoryDown = useCallback((categoryId: string) => moveCategory(categoryId, 'down'), [moveCategory]);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'profileId'>) => {
    if (!currentProfileId) return;
    const data = {
        ...transaction,
        profile: currentProfileId,
        account: transaction.accountId,
        category: transaction.categoryId
    };
    const newTransaction = await pb.collection('transactions').create(data);
    setTransactions(prev => [...prev, mapPbToTransaction(newTransaction)]);
    addNotification('Transakcia bola pridaná.', 'success');
  }, [currentProfileId, addNotification]);

  const updateTransaction = useCallback(async (updated: Transaction) => {
    const { id, profileId, ...data } = updated;
    const payload = { 
        ...data,
        profile: profileId,
        account: data.accountId,
        category: data.categoryId,
     };
    const updatedTransaction = await pb.collection('transactions').update(id, payload);
    setTransactions(prev => prev.map(t => t.id === id ? mapPbToTransaction(updatedTransaction) : t));
    addNotification('Transakcia bola aktualizovaná.', 'success');
  }, [addNotification]);

  const deleteTransaction = useCallback(async (id: string) => {
    await pb.collection('transactions').delete(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    addNotification('Transakcia bola zmazaná.', 'success');
  }, [addNotification]);

  const addOrUpdateBudget = useCallback(async (budget: Omit<Budget, 'id' | 'profileId'>) => {
    if (!currentProfileId) return;
    
    const existing = budgets.find(b => b.categoryId === budget.categoryId && b.month === budget.month);

    if (existing) {
      const updated = await pb.collection('budgets').update(existing.id, { amount: budget.amount });
    setBudgets(prev => prev.map(b => b.id === existing.id ? mapPbToBudget(updated) : b));
    setAllBudgets(prev => prev.map(b => b.id === existing.id ? mapPbToBudget(updated) : b));
  } else {
    const data = {
        ...budget,
        profile: currentProfileId,
        category: budget.categoryId
    };
    const newBudget = await pb.collection('budgets').create(data);
    const mapped = mapPbToBudget(newBudget);
    setBudgets(prev => [...prev, mapped]);
    setAllBudgets(prev => [...prev, mapped]);
  }
  addNotification('Rozpočet bol uložený.', 'success');
  }, [currentProfileId, budgets, addNotification]);
  
  const deleteBudget = useCallback(async(id:string) => {
    await pb.collection('budgets').delete(id);
    setBudgets(prev => prev.filter(b => b.id !== id));
    setAllBudgets(prev => prev.filter(b => b.id !== id));
    addNotification('Rozpočet bol zmazaný.', 'success');
  }, [addNotification]);

  const publishBudgetForYear = useCallback(async (baseCategoryId: string, baseMonth: string, forAllSubcategories: boolean = false) => {
    if (!currentProfileId) return;

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
            const data = { profile: currentProfileId, category: categoryId, month: targetMonth, amount: sourceAmount };
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

    setAllBudgets(prev => {
      const updatedMap = new Map(updatedBudgets.map(b => [b.id, b]));
      const prevWithoutUpdated = prev.map(b => updatedMap.get(b.id) || b);
      return [...prevWithoutUpdated, ...newBudgets];
    });
    addNotification('Rozpočet bol publikovaný pre nasledujúce mesiace.', 'success');

  }, [currentProfileId, budgets, categories, addNotification]);

  const publishFullBudgetForYear = useCallback(async (baseMonth: string) => {
    if (!currentProfileId) return;
  
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
          const data = { profile: currentProfileId, category: categoryId, month: targetMonth, amount: sourceAmount };
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
      setAllBudgets(prev => {
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
  }, [currentProfileId, categories, budgets, addNotification]);

  const value = useMemo(() => ({
    isLoading, error,
    budgetProfiles, currentProfileId, setCurrentProfileId, addBudgetProfile, updateBudgetProfile, deleteBudgetProfile,
    accounts, addAccount, updateAccount, deleteAccount, getAccountBalance,
    categories, addCategory, updateCategory, deleteCategory, deleteCategoryAndChildren, reassignAnddeleteCategory, updateCategoryOrder, moveCategoryUp, moveCategoryDown,
    transactions, addTransaction, updateTransaction, deleteTransaction,
    budgets, addOrUpdateBudget, deleteBudget, publishBudgetForYear, publishFullBudgetForYear,
    allAccounts, allTransactions, allBudgets, allCategories,
    loadAppData, // Expose the loader function
    notifications, addNotification, removeNotification,
  }), [
    isLoading, error,
    budgetProfiles, currentProfileId, setCurrentProfileId, addBudgetProfile, updateBudgetProfile, deleteBudgetProfile,
    accounts, addAccount, updateAccount, deleteAccount, getAccountBalance,
    categories, addCategory, updateCategory, deleteCategory, deleteCategoryAndChildren, reassignAnddeleteCategory, updateCategoryOrder, moveCategoryUp, moveCategoryDown,
    transactions, addTransaction, updateTransaction, deleteTransaction,
    budgets, addOrUpdateBudget, deleteBudget, publishBudgetForYear, publishFullBudgetForYear,
    allAccounts, allTransactions, allBudgets, allCategories,
    loadAppData,
    notifications, addNotification, removeNotification
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