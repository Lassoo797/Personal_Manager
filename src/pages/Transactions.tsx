import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { PlusIcon, PencilIcon, TrashIcon, FunnelIcon, MagnifyingGlassIcon, XIcon, CalendarDaysIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, ChevronUpIcon } from '../components/icons';
import { ConfirmModal } from '../components/ConfirmModal';
import { roundToTwoDecimals } from '../lib/utils';
import type { Transaction, TransactionType, Account, Category } from '../types';

const TransactionForm: React.FC<{ transaction?: Transaction | null, onSave: () => void, onCancel: () => void }> = ({ transaction, onSave, onCancel }) => {
    const { accounts, allCategories, addTransaction, updateTransaction, transactions, getAccountBalance } = useAppContext();
    const [type, setType] = useState<TransactionType>(transaction?.type || 'expense');
    const [transactionDate, setTransactionDate] = useState(transaction?.transactionDate.slice(0, 10) || new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState(transaction?.notes || '');
    const [amount, setAmount] = useState<number | string>(transaction?.amount || '');
    const [categoryId, setCategoryId] = useState(transaction?.categoryId || '');
    const [accountId, setAccountId] = useState(transaction?.accountId || '');
    const [destinationAccountId, setDestinationAccountId] = useState(transaction?.destinationAccountId || '');
    const [error, setError] = useState<string | null>(null);
    const dateInputRef = React.useRef<HTMLInputElement>(null);

    const formInputStyle = "block w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0 peer";
    const formLabelStyle = "absolute text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant duration-300 transform -translate-y-3 scale-75 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3";
    
    // --- Helper for grouping categories in select ---
    // (Used in both TransactionForm and Filter)
    const renderCategoryOptions = (groupedCats: { income: any[], expense: any[] }) => {
        return (
            <>
                <option value="" className="dark:bg-dark-surfaceContainerHigh">Vyberte kategóriu</option>
                {groupedCats.expense.length > 0 && (
                    <optgroup label="Výdavky" className="font-semibold text-light-error dark:text-dark-error">
                         {groupedCats.expense.map((c: any) => (
                             <option key={c.id} value={c.id} className="text-light-onSurface dark:text-dark-onSurface dark:bg-dark-surfaceContainerHigh">
                                {c.displayName}
                             </option>
                        ))}
                    </optgroup>
                )}
                {groupedCats.income.length > 0 && (
                    <optgroup label="Príjmy" className="font-semibold text-green-600 dark:text-green-400">
                         {groupedCats.income.map((c: any) => (
                             <option key={c.id} value={c.id} className="text-light-onSurface dark:text-dark-onSurface dark:bg-dark-surfaceContainerHigh">
                                {c.displayName}
                             </option>
                        ))}
                    </optgroup>
                )}
            </>
        );
    };


    useEffect(() => {
        if (transaction) {
            setType(transaction.type);
            setTransactionDate(transaction.transactionDate.slice(0, 10));
            setNotes(transaction.notes);
            setAmount(transaction.amount);
            setCategoryId(transaction.categoryId || '');
            setAccountId(transaction.accountId);
            setDestinationAccountId(transaction.destinationAccountId || '');
        } else {
            // Reset form for a new transaction
            const defaultAccount = accounts.find(a => a.isDefault);
            setType('expense');
            setTransactionDate(new Date().toISOString().slice(0, 10));
            setNotes('');
            setAmount('');
            setCategoryId('');
            setAccountId(defaultAccount?.id || '');
            setDestinationAccountId('');
        }
    }, [transaction, accounts]);

    const { top5Categories, groupedOtherCategories: otherCategories } = useMemo(() => {
        const transactionMonth = transactionDate.substring(0, 7);
        
        // --- Calculate Top 5 Categories ---
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const recentTransactions = transactions.filter(t => new Date(t.transactionDate) >= threeMonthsAgo && t.type === type && t.categoryId);

        const categoryUsage: { [key: string]: number } = {};
        recentTransactions.forEach(t => {
            if(t.categoryId) {
                categoryUsage[t.categoryId] = (categoryUsage[t.categoryId] || 0) + 1;
            }
        });
        
        const top5CategoryIds = Object.keys(categoryUsage)
            .sort((a, b) => categoryUsage[b] - categoryUsage[a])
            .slice(0, 5);

        const top5Categories = top5CategoryIds.map(id => allCategories.find(c => c.id === id)).filter((c): c is Category => !!c);
        const top5IdsSet = new Set(top5CategoryIds);


        // --- Get All Other Categories ---
        const subcategories = allCategories.filter(c =>
            c.type === type &&
            c.parentId && 
            c.validFrom <= transactionMonth &&
            (c.status === 'active' || (c.archivedFrom && c.archivedFrom > transactionMonth))
        );

        // Map for easier sorting and display name generation
        const mappedSubcategories = subcategories.map(c => {
             const parent = allCategories.find(p => p.id === c.parentId);
             return {
                 ...c,
                 displayName: `${parent ? parent.name : '...'} - ${c.name}`,
                 parentOrder: parent?.order ?? 999,
                 categoryOrder: c.order ?? 999
             }
        });

        // Sort by parent order then category order
        mappedSubcategories.sort((a, b) => {
            if (a.parentOrder !== b.parentOrder) {
                return a.parentOrder - b.parentOrder;
            }
            return a.categoryOrder - b.categoryOrder;
        });

        return { 
            top5Categories, 
            // We group "other" categories for the dropdown, but Top 5 are handled separately in the UI
            groupedOtherCategories: {
                income: mappedSubcategories.filter(c => c.type === 'income'),
                expense: mappedSubcategories.filter(c => c.type === 'expense')
            }
        };
    }, [allCategories, type, transactionDate, transactions]);
    
    const availableAccounts = useMemo(() =>
        accounts.filter((a: Account) => a.status === 'active'),
        [accounts]);

    // Use availableAccounts instead of filtering inline to be consistent and include savings accounts if needed
    // However, depending on business logic, maybe savings accounts shouldn't be available for regular Expense/Income?
    // The requirement was: "takze pre prijmy a vydavky sa ani nedaju vybrat ked davam tranzakciu, iba pre prevody"
    
    const availableAccountsForRegular = useMemo(() => 
        availableAccounts.filter(a => !a.isSavings),
        [availableAccounts]);

    const handleSubmit = (e: React.FormEvent, keepOpen: boolean = false) => {
        e.preventDefault();
        setError(null);
        
        let isValid = true;
        if (type === 'transfer') {
            if (!transactionDate || !amount || !accountId || !destinationAccountId) {
                setError('Prosím, vyplňte všetky polia pre prevod.');
                isValid = false;
            } else if (accountId === destinationAccountId) {
                setError('Zdrojový a cieľový účet nemôžu byť rovnaké.');
                isValid = false;
            }
        } else {
            if (!transactionDate || !amount || !categoryId || !accountId) {
                setError('Prosím, vyplňte všetky povinné polia.');
                isValid = false;
            }
        }

        if (!isValid) return;

        const amountVal = parseFloat(String(amount));

        // Validation for negative balance
        if (type === 'expense' || type === 'transfer') {
            let simulatedBalance = getAccountBalance(accountId);

            // Ak upravujeme existujúcu transakciu, musíme "vrátiť" jej vplyv na zostatok,
            // aby sme zistili reálne dostupné prostriedky pre novú sumu.
            if (transaction && transaction.accountId === accountId) {
                if (transaction.type === 'income') {
                    // Ak to bol predtým príjem, jeho odstránením sa zostatok zníži
                    simulatedBalance -= transaction.amount;
                } else {
                    // Ak to bol výdavok alebo prevod, jeho odstránením (vrátením peňazí) sa zostatok zvýši
                    simulatedBalance += transaction.amount;
                }
            }

            if (roundToTwoDecimals(simulatedBalance - amountVal) < 0) {
                setError(`Nedostatok prostriedkov na účte. Disponibilný zostatok pre túto operáciu: ${simulatedBalance.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}`);
                return;
            }
        }

        const transactionData = {
            transactionDate,
            notes,
            amount: amountVal,
            type,
            categoryId: type !== 'transfer' ? categoryId : null,
            accountId,
            destinationAccountId: type === 'transfer' ? destinationAccountId : null,
            created: new Date().toISOString(), // Ensure created date is set for new transactions
        };

        if (transaction) {
            // For update, we don't overwrite 'created' unless necessary, but spread handles it.
            // Actually, updateTransaction likely expects the full object or partial.
            // Let's ensure we don't accidentally change 'created' if it exists in 'transaction'.
             updateTransaction({ ...transaction, ...transactionData, created: transaction.created });
        } else {
            addTransaction(transactionData);
        }
        
        if (keepOpen) {
            // Reset form but keep date
            setType('expense');
            // transactionDate is kept
            setNotes('');
            setAmount('');
            setCategoryId('');
            setAccountId(accounts.find(a => a.isDefault)?.id || '');
            setDestinationAccountId('');
        } else {
            onSave();
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
        if (event.key === 'Enter' && !event.ctrlKey && !event.shiftKey && !event.altKey) {
            // Check if the focused element is not a button to avoid double submission
            if (document.activeElement?.tagName.toLowerCase() !== 'button') {
                event.preventDefault();
                handleSubmit(event, true);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-2">Typ transakcie</label>
                <div className="flex rounded-full border-2 border-light-outline dark:border-dark-outline overflow-hidden">
                    <button type="button" onClick={() => setType('expense')} className={`px-4 py-2 w-1/3 transition-colors text-sm font-medium ${type === 'expense' ? 'bg-light-secondaryContainer text-light-onSecondaryContainer dark:bg-dark-secondaryContainer dark:text-dark-onSecondaryContainer' : 'text-light-onSurface dark:text-dark-onSurface'}`}>Výdavok</button>
                    <button type="button" onClick={() => setType('income')} className={`px-4 py-2 w-1/3 transition-colors text-sm font-medium ${type === 'income' ? 'bg-light-secondaryContainer text-light-onSecondaryContainer dark:bg-dark-secondaryContainer dark:text-dark-onSecondaryContainer' : 'text-light-onSurface dark:text-dark-onSurface'}`}>Príjem</button>
                    <button type="button" onClick={() => setType('transfer')} className={`px-4 py-2 w-1/3 transition-colors text-sm font-medium ${type === 'transfer' ? 'bg-light-secondaryContainer text-light-onSecondaryContainer dark:bg-dark-secondaryContainer dark:text-dark-onSecondaryContainer' : 'text-light-onSurface dark:text-dark-onSurface'}`}>Prevod</button>
                </div>
            </div>
             <div className="relative" onClick={() => dateInputRef.current?.showPicker()}>
                <input ref={dateInputRef} type="date" id="transactionDate" value={transactionDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransactionDate(e.target.value)} className={`${formInputStyle} h-14 pt-2 cursor-pointer`} required placeholder=" " />
                <label htmlFor="transactionDate" className={`${formLabelStyle} cursor-pointer`}>Dátum</label>
            </div>

            {type === 'transfer' ? (
                <>
                    <div className="relative">
                        <input type="number" id="amount" value={amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)} step="0.01" className={`${formInputStyle} h-14`} required placeholder=" "/>
                        <label htmlFor="amount" className={formLabelStyle}>Suma</label>
                    </div>
                    <div className="relative">
                        <select id="account" value={accountId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAccountId(e.target.value)} className={`${formInputStyle} h-14`} required>
                            <option value="" className="dark:bg-dark-surfaceContainerHigh">Z účtu...</option>
                            {availableAccounts.map((a: Account) => <option key={a.id} value={a.id} className="dark:bg-dark-surfaceContainerHigh">{a.name}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <select id="destinationAccount" value={destinationAccountId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDestinationAccountId(e.target.value)} className={`${formInputStyle} h-14`} required>
                            <option value="" className="dark:bg-dark-surfaceContainerHigh">Na účet...</option>
                            {availableAccounts.filter((a: Account) => a.id !== accountId).map((a: Account) => <option key={a.id} value={a.id} className="dark:bg-dark-surfaceContainerHigh">{a.name}</option>)}
                        </select>
                    </div>
                </>
            ) : (
                <>
                    <div className="relative">
                        <select id="category" value={categoryId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryId(e.target.value)} className={`${formInputStyle} h-14`} required>
                            <option value="" className="dark:bg-dark-surfaceContainerHigh">Vyberte kategóriu</option>
                            {top5Categories.length > 0 && [
                                <optgroup key="top-header" label="Najpoužívanejšie" className="font-bold text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                                     {top5Categories.map((c: Category) => {
                                         const parent = allCategories.find((p: Category) => p.id === c.parentId);
                                         return (
                                            <option key={c.id} value={c.id} className="dark:bg-dark-surfaceContainerHigh">
                                                {parent ? parent.name : '...'} - {c.name}
                                            </option>
                                         );
                                     })}
                                </optgroup>
                            ]}
                            
                            {/* Render grouped categories based on transaction type context - although 'type' state restricts choices already, grouping helps visual consistency */}
                             {otherCategories.income.length > 0 && (
                                <optgroup label="Príjmy" className="font-semibold text-green-600 dark:text-green-400">
                                    {otherCategories.income.map((c: any) => (
                                        <option key={c.id} value={c.id} className="text-light-onSurface dark:text-dark-onSurface dark:bg-dark-surfaceContainerHigh">
                                            {c.displayName}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                             {otherCategories.expense.length > 0 && (
                                <optgroup label="Výdavky" className="font-semibold text-light-error dark:text-dark-error">
                                    {otherCategories.expense.map((c: any) => (
                                        <option key={c.id} value={c.id} className="text-light-onSurface dark:text-dark-onSurface dark:bg-dark-surfaceContainerHigh">
                                            {c.displayName}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>
                    <div className="relative">
                        <input type="number" id="amount" value={amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)} step="0.01" className={`${formInputStyle} h-14`} required placeholder=" "/>
                        <label htmlFor="amount" className={formLabelStyle}>Suma</label>
                    </div>
                    <div className="relative">
                        <select id="account" value={accountId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAccountId(e.target.value)} className={`${formInputStyle} h-14`} required>
                            <option value="" className="dark:bg-dark-surfaceContainerHigh">Vyberte účet</option>
                            {availableAccountsForRegular.map((a: Account) => <option key={a.id} value={a.id} className="dark:bg-dark-surfaceContainerHigh">{a.name}</option>)}
                        </select>
                    </div>
                </>
            )}

            <div className="relative">
                <input type="text" id="notes" value={notes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)} className={`${formInputStyle} h-14`} placeholder=" "/>
                <label htmlFor="notes" className={formLabelStyle}>Poznámky</label>
            </div>

            {error && <p className="text-sm text-light-error dark:text-dark-error">{error}</p>}
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2.5 text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 font-medium">Zrušiť</button>
                <button type="button" onClick={(e) => handleSubmit(e, true)} className="px-6 py-2.5 bg-light-secondaryContainer text-light-onSecondaryContainer dark:bg-dark-secondaryContainer dark:text-dark-onSecondaryContainer rounded-full hover:shadow-lg font-medium transition-shadow">Uložiť a nová</button>
                <button type="submit" className="px-6 py-2.5 bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary rounded-full hover:shadow-lg font-medium transition-shadow">Uložiť</button>
            </div>
        </form>
    );
};


const Transactions: React.FC = () => {
  const { transactions, deleteTransaction, categories, allCategories, accounts } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, message: string, onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });
  const startDateRef = React.useRef<HTMLInputElement>(null);
  const endDateRef = React.useRef<HTMLInputElement>(null);
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    categoryId: '',
    minAmount: '',
    maxAmount: '',
    type: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      categoryId: '',
      minAmount: '',
      maxAmount: '',
      type: '',
    });
    setSearchQuery('');
  };

  const filteredTransactions = useMemo(() => {
    return [...transactions]
      .filter(t => {
        if (searchQuery && !t.notes?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filters.startDate && new Date(t.transactionDate) < new Date(filters.startDate)) return false;
        if (filters.endDate && new Date(t.transactionDate) > new Date(filters.endDate)) return false;
        
        // Hide all offBudget transactions from the main view
        if (t.onBudget === false) return false;
        
        // Filter by category if a category is selected
        if (filters.categoryId && t.categoryId !== filters.categoryId) return false;

        if (filters.minAmount && t.amount < parseFloat(filters.minAmount)) return false;
        if (filters.maxAmount && t.amount > parseFloat(filters.maxAmount)) return false;
        if (filters.type && t.type !== filters.type) return false;
        return true;
      })
      .sort((a, b) => {
        const dateComparison = new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
        if (dateComparison !== 0) {
          return dateComparison;
        }
        // If dates are the same, sort by creation time (newest first)
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      });
  }, [transactions, filters]);

  const categoryMap = useMemo(() =>
    new Map(allCategories.map((c: Category) => [c.id, c])),
    [allCategories]
  );

  const accountMap = useMemo(() =>
    new Map(accounts.map((a: Account) => [a.id, a.name])),
    [accounts]
  );
  
  const getCategoryDisplayName = (transaction: Transaction) => {
    if (!transaction.categoryId) return 'N/A';
    const category = categoryMap.get(transaction.categoryId);
    if (!category) return 'Neznáma kategória';
    if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        return `${parent ? parent.name : '...'} - ${category.name}`;
    }
    return category.name;
  };

  const openAddModal = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };
  
  const getAmountClass = (type: TransactionType) => {
    switch(type) {
        case 'income': return 'text-green-600 dark:text-green-400';
        case 'expense': return 'text-light-error dark:text-dark-error';
        case 'transfer': return 'text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant';
        default: return '';
    }
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const removeFilter = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: '' }));
  };

  const groupedCategories = useMemo(() => {
      const subcategories = categories.filter((c: Category) => c.parentId);
      
      const mapped = subcategories.map((c: Category) => {
          const parent = categoryMap.get(c.parentId!);
          return {
              ...c,
              displayName: `${parent ? parent.name : '...'} - ${c.name}`,
              parentOrder: parent?.order ?? 999,
              categoryOrder: c.order ?? 999
          };
      });

      // Sort by parent order then category order
      mapped.sort((a: any, b: any) => {
          if (a.parentOrder !== b.parentOrder) {
              return a.parentOrder - b.parentOrder;
          }
          return a.categoryOrder - b.categoryOrder;
      });

      return {
          income: mapped.filter((c: any) => c.type === 'income'),
          expense: mapped.filter((c: any) => c.type === 'expense')
      };
  }, [categories, categoryMap]);

  const activeFiltersList = [
      { key: 'startDate', label: `Od: ${new Date(filters.startDate).toLocaleDateString('sk-SK')}`, value: filters.startDate },
      { key: 'endDate', label: `Do: ${new Date(filters.endDate).toLocaleDateString('sk-SK')}`, value: filters.endDate },
      { key: 'categoryId', label: categoryMap.get(filters.categoryId)?.name, value: filters.categoryId },
      { key: 'type', label: filters.type === 'income' ? 'Príjem' : filters.type === 'expense' ? 'Výdavok' : 'Prevod', value: filters.type },
      { key: 'minAmount', label: `> ${filters.minAmount} €`, value: filters.minAmount },
      { key: 'maxAmount', label: `< ${filters.maxAmount} €`, value: filters.maxAmount },
  ].filter(f => f.value);
  
  // --- Helper for grouping categories in select ---
  // (Duplicated here because Transactions component can't see the one inside TransactionForm. Ideally should be moved to utils or a separate component)
  const renderCategoryOptions = (groupedCats: { income: any[], expense: any[] }) => {
        return (
            <>
                <option value="" className="dark:bg-dark-surfaceContainerHigh">Všetky kategórie</option>
                {groupedCats.expense.length > 0 && (
                    <optgroup label="Výdavky" className="font-semibold text-light-error dark:text-dark-error">
                         {groupedCats.expense.map((c: any) => (
                             <option key={c.id} value={c.id} className="text-light-onSurface dark:text-dark-onSurface dark:bg-dark-surfaceContainerHigh">
                                {c.displayName}
                             </option>
                        ))}
                    </optgroup>
                )}
                {groupedCats.income.length > 0 && (
                    <optgroup label="Príjmy" className="font-semibold text-green-600 dark:text-green-400">
                         {groupedCats.income.map((c: any) => (
                             <option key={c.id} value={c.id} className="text-light-onSurface dark:text-dark-onSurface dark:bg-dark-surfaceContainerHigh">
                                {c.displayName}
                             </option>
                        ))}
                    </optgroup>
                )}
            </>
        );
    };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
       <PageHeader title="Transakcie">
            <div className="flex items-center gap-3 w-full md:w-auto">
                 {/* Search Bar - Compact on scroll */}
                <div className="relative flex-1 max-w-sm transition-all duration-300">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant" />
                    </div>
                    <input
                        type="text"
                        placeholder="Hľadať..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 border-none rounded-full bg-light-surfaceContainerHigh dark:bg-dark-surfaceContainerHigh text-light-onSurface dark:text-dark-onSurface placeholder-light-onSurfaceVariant dark:placeholder-dark-onSurfaceVariant focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary transition-all py-2 text-sm"
                    />
                </div>

                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center justify-center rounded-full font-medium transition-all px-3 py-2 text-sm ${showFilters || activeFilterCount > 0 
                        ? 'bg-light-secondaryContainer text-light-onSecondaryContainer dark:bg-dark-secondaryContainer dark:text-dark-onSecondaryContainer' 
                        : 'bg-light-surfaceContainerHigh text-light-onSurfaceVariant dark:bg-dark-surfaceContainerHigh dark:text-dark-onSurfaceVariant hover:bg-light-surfaceContainerHighest dark:hover:bg-dark-surfaceContainerHighest'}`}
                    title="Filtre"
                >
                    <FunnelIcon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Filtre</span>
                    {activeFilterCount > 0 && (
                        <span className="bg-light-onSecondaryContainer text-light-secondaryContainer dark:bg-dark-onSecondaryContainer dark:text-dark-secondaryContainer text-xs font-bold px-1.5 py-0.5 rounded-full ml-2">
                            {activeFilterCount}
                        </span>
                    )}
                </button>

                <button 
                    onClick={openAddModal} 
                    className="flex items-center justify-center p-2 rounded-full bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary hover:shadow-md transition-all"
                    title="Pridať transakciu"
                >
                    <PlusIcon className="h-5 w-5" />
                </button>
            </div>
       </PageHeader>

        {/* Collapsible Filter Panel - positioned absolutely or relatively depending on needs, kept simple here */}
        {showFilters && (
            <div className="mt-4 bg-light-surfaceContainer dark:bg-dark-surfaceContainer p-5 rounded-2xl border border-light-outlineVariant/50 dark:border-dark-outlineVariant/50 animate-fadeIn shadow-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                     {/* ... Filter inputs (Keep existing filter inputs logic) ... */}
                     <div className="relative group cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).tagName !== 'INPUT') startDateRef.current?.showPicker(); }}>
                        <label className="block text-xs font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1 ml-1">Dátum od</label>
                        <div className="relative">
                            <input ref={startDateRef} type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow text-light-onSurface dark:text-dark-onSurface rounded-xl border-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary pl-3 pr-10 py-2.5" />
                            <CalendarDaysIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant pointer-events-none" />
                        </div>
                    </div>
                    <div className="relative group cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).tagName !== 'INPUT') endDateRef.current?.showPicker(); }}>
                        <label className="block text-xs font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1 ml-1">Dátum do</label>
                        <div className="relative">
                            <input ref={endDateRef} type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow text-light-onSurface dark:text-dark-onSurface rounded-xl border-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary pl-3 pr-10 py-2.5" />
                            <CalendarDaysIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant pointer-events-none" />
                        </div>
                    </div>
                     <div className="relative">
                        <label className="block text-xs font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1 ml-1">Kategória</label>
                        <select name="categoryId" value={filters.categoryId} onChange={handleFilterChange} className="w-full bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow text-light-onSurface dark:text-dark-onSurface rounded-xl border-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary px-3 py-2.5 appearance-none">
                            {renderCategoryOptions(groupedCategories)}
                        </select>
                    </div>
                    <div className="relative">
                        <label className="block text-xs font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1 ml-1">Typ</label>
                        <select name="type" value={filters.type} onChange={handleFilterChange} className="w-full bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow text-light-onSurface dark:text-dark-onSurface rounded-xl border-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary px-3 py-2.5 appearance-none">
                            <option value="" className="dark:bg-dark-surfaceContainerHigh">Všetky typy</option>
                            <option value="income" className="dark:bg-dark-surfaceContainerHigh">Príjem</option>
                            <option value="expense" className="dark:bg-dark-surfaceContainerHigh">Výdavok</option>
                            <option value="transfer" className="dark:bg-dark-surfaceContainerHigh">Prevod</option>
                        </select>
                    </div>
                    <div className="relative">
                        <label className="block text-xs font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1 ml-1">Suma od</label>
                        <input type="number" name="minAmount" value={filters.minAmount} onChange={handleFilterChange} placeholder="0,00" className="w-full bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow text-light-onSurface dark:text-dark-onSurface rounded-xl border-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary px-3 py-2.5" />
                    </div>
                    <div className="relative">
                        <label className="block text-xs font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1 ml-1">Suma do</label>
                        <input type="number" name="maxAmount" value={filters.maxAmount} onChange={handleFilterChange} placeholder="100,00" className="w-full bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow text-light-onSurface dark:text-dark-onSurface rounded-xl border-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary px-3 py-2.5" />
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <button onClick={() => setShowFilters(false)} className="text-sm font-medium text-light-primary dark:text-dark-primary hover:underline">Schovať filtre</button>
                </div>
            </div>
        )}

      <div className="space-y-4 pt-2">
        {/* Active Filters Chips */}
        {activeFiltersList.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
                {activeFiltersList.map((filter) => (
                    <div key={filter.key} className="flex items-center bg-light-surfaceContainerHighest dark:bg-dark-surfaceContainerHighest text-light-onSurface dark:text-dark-onSurface px-3 py-1 rounded-full text-sm border border-light-outline/20 dark:border-dark-outline/20">
                        <span>{filter.label}</span>
                        <button 
                            onClick={() => removeFilter(filter.key as keyof typeof filters)}
                            className="ml-2 p-0.5 hover:bg-light-surfaceContainerLow dark:hover:bg-dark-surfaceContainerLow rounded-full"
                        >
                            <XIcon className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                <button 
                    onClick={resetFilters} 
                    className="text-sm text-light-primary dark:text-dark-primary hover:underline px-2"
                >
                    Vymazať všetko
                </button>
            </div>
        )}

      </div>

      <div className="bg-light-surfaceContainer dark:bg-dark-surfaceContainer p-4 sm:p-6 rounded-2xl border border-light-outlineVariant dark:border-dark-outlineVariant flex-1 overflow-hidden flex flex-col">
        
        {/* --- UNIFIED RESPONSIVE LIST VIEW --- */}
        <div className="overflow-y-auto h-full pb-20 p-1">
            <div className="flex flex-col space-y-3">
                {filteredTransactions.map(t => {
                    const isTransfer = t.type === 'transfer';
                    const dateObj = new Date(t.transactionDate);
                    const day = dateObj.getDate();
                    const month = dateObj.toLocaleString('sk-SK', { month: 'short' }).toUpperCase().replace('.', '');
                    const year = dateObj.getFullYear();
                    const currentYear = new Date().getFullYear();

                    return (
                        <div key={t.id} className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-3 sm:p-4 rounded-2xl border border-light-outlineVariant/40 dark:border-dark-outlineVariant/40 shadow-sm hover:shadow-md transition-all group">
                            
                            <div className="flex items-center gap-3 sm:gap-4">
                                
                                {/* 1. LEFT SECTION: Date & Identity */}
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                    
                                    {/* Desktop Date Block (Visible md+) */}
                                    <div className="hidden md:flex flex-col items-center justify-center min-w-[50px] pr-4 border-r border-light-outlineVariant/30 dark:border-dark-outlineVariant/30 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                                        <span className="text-xl font-bold leading-none">{day}</span>
                                        <span className="text-[10px] font-bold tracking-wider opacity-70">{month}</span>
                                        {year !== currentYear && <span className="text-[9px] opacity-50">{year}</span>}
                                    </div>

                                    {/* Icon */}
                                    <div className={`p-2 sm:p-3 rounded-full shrink-0 ${
                                        t.type === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                        t.type === 'expense' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                    }`}>
                                        {t.type === 'income' ? <ArrowUpCircleIcon className="h-5 w-5 sm:h-6 sm:w-6"/> : 
                                         t.type === 'expense' ? <ArrowDownCircleIcon className="h-5 w-5 sm:h-6 sm:w-6"/> : 
                                         <div className="h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center font-bold">⇄</div>}
                                    </div>

                                    {/* Text Info */}
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-light-onSurface dark:text-dark-onSurface text-sm sm:text-base truncate" title={isTransfer ? 'Prevod' : getCategoryDisplayName(t)}>
                                            {isTransfer ? 'Prevod' : getCategoryDisplayName(t)}
                                        </span>
                                        
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-xs sm:text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                                             {/* Mobile Date */}
                                            <span className="md:hidden opacity-90">
                                                {dateObj.toLocaleDateString('sk-SK')}
                                            </span>
                                            {/* Desktop Notes */}
                                            {t.notes && (
                                                <span className="hidden md:block italic truncate opacity-70 border-l border-light-outlineVariant dark:border-dark-outlineVariant pl-2 ml-1 max-w-[200px] lg:max-w-[300px] xl:max-w-[400px] pr-2" title={t.notes}>
                                                    {t.notes}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 2. RIGHT SECTION: Amount, Account & Actions */}
                                <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                                    
                                    {/* Amount & Account Column */}
                                    <div className="flex flex-col items-end min-w-[70px] sm:min-w-[100px]">
                                        <span className={`font-bold text-base sm:text-lg whitespace-nowrap ${getAmountClass(t.type)}`}>
                                            {t.type === 'expense' && '- '}{t.amount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
                                        </span>
                                        <span className="text-[10px] sm:text-xs text-light-onSurfaceVariant/80 dark:text-dark-onSurfaceVariant/80 text-right truncate max-w-[100px] sm:max-w-[140px]" title={isTransfer ? `${accountMap.get(t.accountId)} -> ${accountMap.get(t.destinationAccountId || '')}` : accountMap.get(t.accountId)}>
                                            {isTransfer 
                                                ? <>{accountMap.get(t.accountId)} → {accountMap.get(t.destinationAccountId || '')}</>
                                                : accountMap.get(t.accountId)
                                            }
                                        </span>
                                    </div>

                                    {/* Actions (Always Visible, Rightmost) */}
                                    <div className="flex items-center gap-1 sm:gap-2 pl-2 border-l border-light-outlineVariant/20 dark:border-dark-outlineVariant/20">
                                        <button 
                                            onClick={() => openEditModal(t)} 
                                            className="p-1.5 sm:p-2 rounded-lg text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-primaryContainer hover:text-light-onPrimaryContainer dark:hover:bg-dark-primaryContainer dark:hover:text-dark-onPrimaryContainer transition-colors"
                                            title="Upraviť"
                                        >
                                            <PencilIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                                        </button>
                                        <button 
                                            onClick={() => setConfirmModalState({
                                                isOpen: true,
                                                message: `Naozaj chcete zmazať túto transakciu?`,
                                                onConfirm: () => {
                                                deleteTransaction(t.id);
                                                setConfirmModalState({ isOpen: false, message: '', onConfirm: () => {} });
                                                }
                                            })} 
                                            className="p-1.5 sm:p-2 rounded-lg text-light-error dark:text-dark-error hover:bg-light-errorContainer dark:hover:bg-dark-errorContainer transition-colors"
                                            title="Zmazať"
                                        >
                                            <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Notes (Below content) */}
                            {t.notes && (
                                <div className="md:hidden mt-2 pt-2 text-xs sm:text-sm text-light-onSurfaceVariant/80 dark:text-dark-onSurfaceVariant/80 italic border-t border-light-outlineVariant/30 dark:border-dark-outlineVariant/30 truncate px-1">
                                    {t.notes}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {filteredTransactions.length === 0 && (
                <div className="text-center py-10 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant h-full flex items-center justify-center">
                    <p>Žiadne transakcie nenájdené.</p>
                </div>
            )}
        </div>

      </div>
      
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingTransaction ? "Upraviť transakciu" : "Pridať transakciu"}>
        <TransactionForm transaction={editingTransaction} onSave={closeModal} onCancel={closeModal} />
      </Modal>
      
      <ConfirmModal 
        isOpen={confirmModalState.isOpen} 
        onClose={() => setConfirmModalState({ ...confirmModalState, isOpen: false })} 
        message={confirmModalState.message}
        onConfirm={confirmModalState.onConfirm}
      />
      
      {/* Scroll to top button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 p-3 rounded-full bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${isScrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
        aria-label="Späť hore"
      >
        <ChevronUpIcon className="h-6 w-6" />
      </button>
    </div>
  );
};

export default Transactions;