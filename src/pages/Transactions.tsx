import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from '../components/Modal';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons';
import { ConfirmModal } from '../components/ConfirmModal';
import type { Transaction, TransactionType, Account, Category } from '../types';

const TransactionForm: React.FC<{ transaction?: Transaction | null, onSave: () => void, onCancel: () => void }> = ({ transaction, onSave, onCancel }) => {
    const { accounts, categories, addTransaction, updateTransaction } = useAppContext();
    const [type, setType] = useState<TransactionType>(transaction?.type || 'expense');
    const [transactionDate, setTransactionDate] = useState(transaction?.transactionDate.slice(0, 10) || new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState(transaction?.notes || '');
    const [amount, setAmount] = useState<number | string>(transaction?.amount || '');
    const [categoryId, setCategoryId] = useState(transaction?.categoryId || '');
    const [accountId, setAccountId] = useState(transaction?.accountId || '');
    const [destinationAccountId, setDestinationAccountId] = useState(transaction?.destinationAccountId || '');
    const [error, setError] = useState<string | null>(null);
    const [dedicatedAccountInfo, setDedicatedAccountInfo] = useState<{ name: string, type: 'income' | 'expense' } | null>(null);
    const dateInputRef = React.useRef<HTMLInputElement>(null);

    const formInputStyle = "block w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0 peer";
    const formLabelStyle = "absolute text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant duration-300 transform -translate-y-3 scale-75 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3";

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
            setType('expense');
            setTransactionDate(new Date().toISOString().slice(0, 10));
            setNotes('');
            setAmount('');
            setCategoryId('');
            setAccountId('');
            setDestinationAccountId('');
        }
    }, [transaction]);

    // Effect to show info about dedicated (savings) account
    useEffect(() => {
        if (categoryId) {
            const category = categories.find(c => c.id === categoryId);
            if (category?.dedicatedAccount) {
                const account = accounts.find(a => a.id === category.dedicatedAccount);
                if (account) {
                    setDedicatedAccountInfo({ name: account.name, type: category.type as 'income' | 'expense' });
                }
            } else {
                setDedicatedAccountInfo(null);
            }
        } else {
            setDedicatedAccountInfo(null);
        }
    }, [categoryId, categories, accounts]);

    const filteredCategories = useMemo(() => {
        const transactionMonth = transactionDate.substring(0, 7);
        return categories
            .filter((c: Category) => c.type === type && c.parentId && c.validFrom <= transactionMonth)
            .sort((a: Category, b: Category) => a.name.localeCompare(b.name));
    }, [categories, type, transactionDate]);
    
    // Filter accounts for transfers - only standard accounts
    const standardAccounts = useMemo(() =>
        accounts.filter((a: Account) => a.accountType === 'Štandardný účet'),
        [accounts]);

    const handleSubmit = (e: React.FormEvent) => {
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

        const transactionData = {
            transactionDate,
            notes,
            amount: parseFloat(String(amount)),
            type,
            categoryId: type !== 'transfer' ? categoryId : null,
            accountId,
            destinationAccountId: type === 'transfer' ? destinationAccountId : null,
        };

        if (transaction) {
            updateTransaction({ ...transaction, ...transactionData });
        } else {
            addTransaction(transactionData);
        }
        onSave();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
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
                            {standardAccounts.map((a: Account) => <option key={a.id} value={a.id} className="dark:bg-dark-surfaceContainerHigh">{a.name}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <select id="destinationAccount" value={destinationAccountId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDestinationAccountId(e.target.value)} className={`${formInputStyle} h-14`} required>
                            <option value="" className="dark:bg-dark-surfaceContainerHigh">Na účet...</option>
                            {standardAccounts.filter((a: Account) => a.id !== accountId).map((a: Account) => <option key={a.id} value={a.id} className="dark:bg-dark-surfaceContainerHigh">{a.name}</option>)}
                        </select>
                    </div>
                </>
            ) : (
                <>
                    <div className="relative">
                        <select id="category" value={categoryId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryId(e.target.value)} className={`${formInputStyle} h-14`} required>
                            <option value="" className="dark:bg-dark-surfaceContainerHigh">Vyberte kategóriu</option>
                            {filteredCategories.map((c: Category) => <option key={c.id} value={c.id} className="dark:bg-dark-surfaceContainerHigh">{categories.find((p: Category) => p.id === c.parentId)?.name} - {c.name}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <input type="number" id="amount" value={amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)} step="0.01" className={`${formInputStyle} h-14`} required placeholder=" "/>
                        <label htmlFor="amount" className={formLabelStyle}>Suma</label>
                    </div>
                    <div className="relative">
                        <select id="account" value={accountId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAccountId(e.target.value)} className={`${formInputStyle} h-14`} required>
                            <option value="" className="dark:bg-dark-surfaceContainerHigh">Vyberte účet</option>
                            {standardAccounts.map((a: Account) => <option key={a.id} value={a.id} className="dark:bg-dark-surfaceContainerHigh">{a.name}</option>)}
                        </select>
                    </div>

                    {dedicatedAccountInfo && (
                        <div className="relative">
                            <input 
                                type="text" 
                                value={dedicatedAccountInfo.name} 
                                className={`${formInputStyle} h-14 text-light-onSurfaceVariant/70 dark:text-dark-onSurfaceVariant/70`} 
                                disabled 
                            />
                            <label className={`${formLabelStyle} text-light-onSurfaceVariant/70 dark:text-dark-onSurfaceVariant/70`}>
                                {dedicatedAccountInfo.type === 'expense' ? 'Na sporiaci účet' : 'Zo sporiaceho účtu'}
                            </label>
                        </div>
                    )}
                </>
            )}

            <div className="relative">
                <input type="text" id="notes" value={notes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)} className={`${formInputStyle} h-14`} placeholder=" "/>
                <label htmlFor="notes" className={formLabelStyle}>Poznámky</label>
            </div>

            {error && <p className="text-sm text-light-error dark:text-dark-error">{error}</p>}
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2.5 text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 font-medium">Zrušiť</button>
                <button type="submit" className="px-6 py-2.5 bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary rounded-full hover:shadow-lg font-medium transition-shadow">Uložiť</button>
            </div>
        </form>
    );
};


const Transactions: React.FC = () => {
  const { transactions, deleteTransaction, categories, accounts } = useAppContext();
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
  };

  const filteredTransactions = useMemo(() => {
    return [...transactions]
      .filter(t => {
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
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  }, [transactions, filters]);

  const categoryMap = useMemo(() =>
    new Map(categories.map((c: Category) => [c.id, c])),
    [categories]
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-normal text-light-onSurface dark:text-dark-onSurface">Transakcie</h1>
        <button onClick={openAddModal} className="flex items-center px-6 py-3 bg-light-tertiaryContainer text-light-onTertiaryContainer dark:bg-dark-tertiaryContainer dark:text-dark-onTertiaryContainer rounded-2xl hover:shadow-md font-medium transition-shadow">
          <PlusIcon className="h-5 w-5 mr-2" />
          Pridať transakciu
        </button>
      </div>

      <div className="bg-light-surfaceContainer dark:bg-dark-surfaceContainer p-4 rounded-2xl border border-light-outlineVariant/50 dark:border-dark-outlineVariant/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          
          {/* Dátum od */}
          <div className="relative cursor-pointer" onClick={() => startDateRef.current?.showPicker()}>
            <label htmlFor="startDate" className="block text-xs font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1">Dátum od</label>
            <input ref={startDateRef} type="date" name="startDate" id="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0 px-3 py-2 cursor-pointer" />
          </div>

          {/* Dátum do */}
          <div className="relative cursor-pointer" onClick={() => endDateRef.current?.showPicker()}>
            <label htmlFor="endDate" className="block text-xs font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1">Dátum do</label>
            <input ref={endDateRef} type="date" name="endDate" id="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0 px-3 py-2 cursor-pointer" />
          </div>

          {/* Kategória */}
          <div className="relative">
            <label htmlFor="category-filter" className="block text-xs font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1">Kategória</label>
            <select id="category-filter" name="categoryId" value={filters.categoryId} onChange={handleFilterChange} className="w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0 px-3 py-2 appearance-none">
                <option value="" className="dark:bg-dark-surfaceContainerHigh">Všetky kategórie</option>
                {categories.filter((c: Category) => c.parentId).sort((a: Category, b: Category) => a.name.localeCompare(b.name)).map((c: Category) => {
                    const parent = categoryMap.get(c.parentId!);
                    const displayName = `${parent ? parent.name : '...'} - ${c.name}`;
                    return <option key={c.id} value={c.id} className="dark:bg-dark-surfaceContainerHigh">{displayName}</option>
                })}
            </select>
          </div>
          
          {/* Typ */}
          <div className="relative">
            <label htmlFor="type-filter" className="block text-xs font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1">Typ</label>
            <select id="type-filter" name="type" value={filters.type} onChange={handleFilterChange} className="w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0 px-3 py-2 appearance-none">
                <option value="" className="dark:bg-dark-surfaceContainerHigh">Všetky typy</option>
                <option value="income" className="dark:bg-dark-surfaceContainerHigh">Príjem</option>
                <option value="expense" className="dark:bg-dark-surfaceContainerHigh">Výdavok</option>
                <option value="transfer" className="dark:bg-dark-surfaceContainerHigh">Prevod</option>
            </select>
          </div>

          {/* Suma od */}
           <div className="relative">
            <label htmlFor="minAmount" className="block text-xs font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1">Suma od</label>
            <input type="number" name="minAmount" id="minAmount" value={filters.minAmount} onChange={handleFilterChange} placeholder="0,00" className="w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0 px-3 py-2" />
          </div>

          {/* Suma do */}
           <div className="relative">
            <label htmlFor="maxAmount" className="block text-xs font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1">Suma do</label>
            <input type="number" name="maxAmount" id="maxAmount" value={filters.maxAmount} onChange={handleFilterChange} placeholder="100,00" className="w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0 px-3 py-2" />
          </div>

          {/* Tlačidlo na reset */}
          <div className="sm:col-start-2 md:col-start-3 lg:col-start-4 flex justify-end">
            <button onClick={resetFilters} className="px-4 py-2 text-sm font-medium text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 self-end">
                Zrušiť filtre
            </button>
          </div>
        </div>
      </div>

      <div className="bg-light-surfaceContainer dark:bg-dark-surfaceContainer p-4 sm:p-6 rounded-2xl border border-light-outlineVariant dark:border-dark-outlineVariant">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-light-outlineVariant dark:border-dark-outlineVariant">
                <th className="py-3 px-4 text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Dátum</th>
                <th className="py-3 px-4 text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Kategória</th>
                <th className="py-3 px-4 text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Poznámky</th>
                <th className="py-3 px-4 text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Účet</th>
                <th className="py-3 px-4 text-sm font-medium text-right text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Suma</th>
                <th className="py-3 px-4 text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Akcie</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(t => {
                const isTransfer = t.type === 'transfer';
                const isSaving = t.type === 'expense' && t.linkedTransaction;

                return (
                  <tr key={t.id} className="border-b border-light-surfaceContainerHigh dark:border-dark-surfaceContainerHigh last:border-b-0">
                    <td className="py-4 px-4">{new Date(t.transactionDate).toLocaleDateString('sk-SK')}</td>
                    <td className="py-4 px-4 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                      {isSaving ? `Sporenie: ${getCategoryDisplayName(t)}` : (isTransfer ? 'Prevod' : getCategoryDisplayName(t))}
                    </td>
                    <td className="py-4 px-4">{t.notes}</td>
                    <td className="py-4 px-4 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                      {isTransfer 
                        ? `${accountMap.get(t.accountId)} → ${accountMap.get(t.destinationAccountId || '')}` 
                        : accountMap.get(t.accountId)}
                    </td>
                    <td className={`py-4 px-4 text-right font-semibold ${getAmountClass(t.type)}`}>
                      {t.type === 'expense' && '- '}{t.amount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-1">
                          <button aria-label="Upraviť transakciu" onClick={() => openEditModal(t)} className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full p-2 hover:bg-light-surfaceContainerHighest dark:hover:bg-dark-surfaceContainerHighest"><PencilIcon /></button>
                          <button aria-label="Zmazať transakciu" onClick={() => setConfirmModalState({
                            isOpen: true,
                            message: `Naozaj chcete zmazať túto transakciu? ${isSaving ? 'Týmto sa zmaže aj súvisiaci príjem na sporiacom účte.' : ''}`,
                            onConfirm: () => {
                              deleteTransaction(t.id);
                              setConfirmModalState({ isOpen: false, message: '', onConfirm: () => {} });
                            }
                          })} className="text-light-error dark:text-dark-error rounded-full p-2 hover:bg-light-errorContainer dark:hover:bg-dark-errorContainer"><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
    </div>
  );
};

export default Transactions;