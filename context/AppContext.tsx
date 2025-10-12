import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import pb from '../lib/pocketbase';
import type { Account, Category, Transaction, Budget, BudgetProfile, TransactionType } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Helper funkcie na mapovanie PocketBase záznamov
const mapPbToProfile = (r: any): BudgetProfile => ({ id: r.id, name: r.name });
const mapPbToAccount = (r: any): Account => ({ id: r.id, name: r.name, initialBalance: r.initialBalance, profileId: r.profile, currency: r.currency, type: r.type });
const mapPbToCategory = (r: any): Category => ({ id: r.id, name: r.name, parentId: r.parent || null, type: r.type, profileId: r.profile, order: r.order });
const mapPbToTransaction = (r: any): Transaction => ({ id: r.id, date: r.date, description: r.description, amount: r.amount, type: r.type, categoryId: r.category, accountId: r.account, profileId: r.profile });
const mapPbToBudget = (r: any): Budget => ({ id: r.id, categoryId: r.category, amount: r.amount, month: r.month, profileId: r.profile });


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
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  getAccountBalance: (accountId: string) => number;
  
  addCategory: (category: Omit<Category, 'id' | 'profileId' | 'order'>) => Promise<Category | null>;
  updateCategory: (category: Category) => Promise<void>;
  updateCategoryOrder: (updatedCategories: Category[]) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  deleteCategoryAndChildren: (id: string) => Promise<void>;
  reassignAnddeleteCategory: (categoryIdToDelete: string, targetCategoryId: string) => Promise<void>;

  addTransaction: (transaction: Omit<Transaction, 'id' | 'profileId'>) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addOrUpdateBudget: (budget: Omit<Budget, 'id' | 'profileId'>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [budgetProfiles, setBudgetProfiles] = useState<BudgetProfile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useLocalStorage<string | null>('currentProfileId', null);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // States for all profiles data
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allBudgets, setAllBudgets] = useState<Budget[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  // Efekt na načítanie všetkých dát po určení platného profilu
  useEffect(() => {
    const loadAppData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Step 1: Fetch all profiles and global data
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

        let newProfileId = currentProfileId;

        // Step 2: Ensure a valid profile ID is selected
        if (mappedProfiles.length > 0) {
            const isValid = mappedProfiles.some(p => p.id === newProfileId);
            // If the current ID is invalid (but not null), select the first profile
            if (newProfileId !== null && !isValid) {
                newProfileId = mappedProfiles[0].id;
            } else if (newProfileId === null) {
                // If no profile is selected, but profiles exist, select the first one.
                newProfileId = mappedProfiles[0].id;
            }
        } else {
            // No profiles exist at all.
            newProfileId = null;
        }
        
        // Step 3: Set the determined profile ID (might still be null)
        if (newProfileId !== currentProfileId) {
            setCurrentProfileId(newProfileId);
        }

        // Step 4: Load data for the active profile, if one is selected
        if (newProfileId) {
            const filter = pb.filter('profile = {:profileId}', { profileId: newProfileId });
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
        } else {
            // If no profile is selected, clear profile-specific data
            setAccounts([]);
            setCategories([]);
            setTransactions([]);
            setBudgets([]);
        }

      } catch (e: any) {
        if (e.name !== 'AbortError' && !e.isAbort) {
            setError(e);
            console.error("Chyba pri načítavaní dát:", e);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadAppData();
    // Only re-run when the profile ID changes
  }, [currentProfileId]);

  const refreshData = useCallback(async () => {
    // This function will now re-trigger the main loader
    const currentId = currentProfileId;
    setCurrentProfileId(null); // Momentary change to trigger effect
    setCurrentProfileId(currentId);
  },[currentProfileId, setCurrentProfileId]);



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
  }, [setCurrentProfileId]);

  const updateBudgetProfile = useCallback(async (id: string, name: string) => {
    const updated = await pb.collection('profiles').update(id, { name });
    setBudgetProfiles(prev => prev.map(p => p.id === id ? mapPbToProfile(updated) : p));
  }, []);

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

    } catch(e: any) {
        setError(e);
        console.error("Chyba pri mazaní profilu:", e);
    } finally {
        setIsLoading(false);
        // We might need to refresh data if something went partially wrong
        if (currentProfileId === id) {
           // The main useEffect will trigger due to profile change
        } else {
            // If we deleted a background profile, the current view is fine.
        }
    }
  }, [budgetProfiles, currentProfileId, setCurrentProfileId]);

  // --- Data Management ---
  const addAccount = useCallback(async (account: Omit<Account, 'id' | 'profileId'>) => {
    if (!currentProfileId) return;
    const newAccount = await pb.collection('accounts').create({ ...account, profile: currentProfileId });
    setAccounts(prev => [...prev, mapPbToAccount(newAccount)]);
  }, [currentProfileId]);

  const updateAccount = useCallback(async (updated: Account) => {
    const { id, profileId, ...data } = updated;
    const payload = { ...data, profile: profileId };
    const updatedAccount = await pb.collection('accounts').update(id, payload);
    setAccounts(prev => prev.map(a => a.id === id ? mapPbToAccount(updatedAccount) : a));
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    const hasTransactions = transactions.some(t => t.accountId === id);
    if (hasTransactions) {
      alert('Nie je možné zmazať účet, ku ktorému sú priradené transakcie.');
      return;
    }
    await pb.collection('accounts').delete(id);
    setAccounts(prev => prev.filter(a => a.id !== id));
  }, [transactions]);
  
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
      return mapped;
    } catch (e) {
      console.error("Nepodarilo sa vytvoriť kategóriu:", e);
      return null;
    }
  }, [currentProfileId, categories]);

  const updateCategory = useCallback(async (updated: Category) => {
    const { id, profileId, ...data } = updated;
    // Ensure parent is correctly formatted for PocketBase (ID or null)
    const payload = { ...data, parent: data.parentId || null, profile: profileId };
    const updatedCategory = await pb.collection('categories').update(id, payload);
    setCategories(prev => {
        const newState = prev.map(c => c.id === id ? mapPbToCategory(updatedCategory) : c)
        return newState.sort((a, b) => a.order - b.order);
    });
  }, []);

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
        refreshData();
    }
  }, [refreshData]);

  const deleteCategory = useCallback(async (id: string) => {
    // Delete related budgets first
    const relatedBudgets = await pb.collection('budgets').getFullList({ filter: `category = '${id}'` });
    await Promise.all(relatedBudgets.map(b => pb.collection('budgets').delete(b.id)));
    
    await pb.collection('categories').delete(id);
    
    // Update local state
    setCategories(prev => prev.filter(c => c.id !== id));
    setBudgets(prev => prev.filter(b => b.categoryId !== id));
  }, []);

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
    const relatedTransactions = await pb.collection('transactions').getFullList({ filter: `category = '${categoryIdToDelete}'` });
    await Promise.all(
      relatedTransactions.map(t => pb.collection('transactions').update(t.id, { category: targetCategoryId }))
    );
    await deleteCategory(categoryIdToDelete);
    refreshData(); // Refresh data
  }, [deleteCategory, refreshData]);

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
  }, [currentProfileId]);

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
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    await pb.collection('transactions').delete(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const addOrUpdateBudget = useCallback(async (budget: Omit<Budget, 'id' | 'profileId'>) => {
    if (!currentProfileId) return;
    
    const existing = budgets.find(b => b.categoryId === budget.categoryId && b.month === budget.month);

    if (existing) {
      const updated = await pb.collection('budgets').update(existing.id, { amount: budget.amount });
      setBudgets(prev => prev.map(b => b.id === existing.id ? mapPbToBudget(updated) : b));
    } else {
      const data = {
          ...budget,
          profile: currentProfileId,
          category: budget.categoryId
      };
      const newBudget = await pb.collection('budgets').create(data);
      setBudgets(prev => [...prev, mapPbToBudget(newBudget)]);
    }
  }, [currentProfileId, budgets]);
  
  const deleteBudget = useCallback(async(id:string) => {
    await pb.collection('budgets').delete(id);
    setBudgets(prev => prev.filter(b => b.id !== id));
  }, []);

  const value = useMemo(() => ({
    isLoading, error,
    budgetProfiles, currentProfileId, setCurrentProfileId, addBudgetProfile, updateBudgetProfile, deleteBudgetProfile,
    accounts, addAccount, updateAccount, deleteAccount, getAccountBalance,
    categories, addCategory, updateCategory, deleteCategory, deleteCategoryAndChildren, reassignAnddeleteCategory, updateCategoryOrder,
    transactions, addTransaction, updateTransaction, deleteTransaction,
    budgets, addOrUpdateBudget, deleteBudget,
    allAccounts, allTransactions, allBudgets, allCategories,
  }), [
    isLoading, error,
    budgetProfiles, currentProfileId, setCurrentProfileId, addBudgetProfile, updateBudgetProfile, deleteBudgetProfile,
    accounts, addAccount, updateAccount, deleteAccount, getAccountBalance,
    categories, addCategory, updateCategory, deleteCategory, deleteCategoryAndChildren, reassignAnddeleteCategory, updateCategoryOrder,
    transactions, addTransaction, updateTransaction, deleteTransaction,
    budgets, addOrUpdateBudget, deleteBudget,
    allAccounts, allTransactions, allBudgets, allCategories
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