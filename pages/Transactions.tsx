import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from '../components/Modal';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons';
import type { Transaction, TransactionType, Category } from '../types';

const TransactionForm: React.FC<{ transaction?: Transaction | null, onSave: () => void, onCancel: () => void }> = ({ transaction, onSave, onCancel }) => {
    const { accounts, categories, addTransaction, updateTransaction } = useAppContext();
    const [type, setType] = useState<TransactionType>('expense');
    const [date, setDate] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<number | string>('');
    const [categoryId, setCategoryId] = useState('');
    const [accountId, setAccountId] = useState('');
    const formInputStyle = "block w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0 peer";
    const formLabelStyle = "absolute text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant duration-300 transform -translate-y-3 scale-75 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3";

    useEffect(() => {
        if (transaction) {
            setType(transaction.type);
            // PocketBase date contains time, slice to get only YYYY-MM-DD
            setDate(transaction.date.slice(0, 10));
            setDescription(transaction.description);
            setAmount(transaction.amount);
            setCategoryId(transaction.categoryId);
            setAccountId(transaction.accountId);
        } else {
            // Reset form for a new transaction
            setType('expense');
            setDate(new Date().toISOString().slice(0, 10));
            setDescription('');
            setAmount('');
            setCategoryId('');
            setAccountId('');
        }
    }, [transaction]);



    const filteredCategories = useMemo(() => {
        return categories
            .filter(c => c.type === type && c.parentId) 
            .sort((a,b) => a.name.localeCompare(b.name));
    }, [categories, type]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !description || !amount || !categoryId || !accountId) {
            alert('Prosím, vyplňte všetky polia.');
            return;
        }

        const transactionData = {
            date,
            description,
            amount: parseFloat(String(amount)),
            type,
            categoryId,
            accountId,
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
                    <button type="button" onClick={() => setType('expense')} className={`px-4 py-2 w-1/2 transition-colors text-sm font-medium ${type === 'expense' ? 'bg-light-secondaryContainer text-light-onSecondaryContainer dark:bg-dark-secondaryContainer dark:text-dark-onSecondaryContainer' : 'text-light-onSurface dark:text-dark-onSurface'}`}>Výdavok</button>
                    <button type="button" onClick={() => setType('income')} className={`px-4 py-2 w-1/2 transition-colors text-sm font-medium ${type === 'income' ? 'bg-light-secondaryContainer text-light-onSecondaryContainer dark:bg-dark-secondaryContainer dark:text-dark-onSecondaryContainer' : 'text-light-onSurface dark:text-dark-onSurface'}`}>Príjem</button>
                </div>
            </div>
             <div className="relative">
                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className={`${formInputStyle} h-14 pt-2`} required placeholder=" " />
                <label htmlFor="date" className={formLabelStyle}>Dátum</label>
            </div>
            <div className="relative">
                <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} className={`${formInputStyle} h-14`} required placeholder=" "/>
                <label htmlFor="description" className={formLabelStyle}>Popis</label>
            </div>
            <div className="relative">
                <input type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)} step="0.01" className={`${formInputStyle} h-14`} required placeholder=" "/>
                <label htmlFor="amount" className={formLabelStyle}>Suma</label>
            </div>
             <div className="relative">
                <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className={`${formInputStyle} h-14`} required>
                    <option value="" className="dark:bg-dark-surfaceContainerHigh">Vyberte kategóriu</option>
                    {filteredCategories.map(c => <option key={c.id} value={c.id} className="dark:bg-dark-surfaceContainerHigh">{categories.find(p=>p.id === c.parentId)?.name} - {c.name}</option>)}
                </select>
            </div>
            <div className="relative">
                <select id="account" value={accountId} onChange={e => setAccountId(e.target.value)} className={`${formInputStyle} h-14`} required>
                    <option value="" className="dark:bg-dark-surfaceContainerHigh">Vyberte účet</option>
                    {accounts.map(a => <option key={a.id} value={a.id} className="dark:bg-dark-surfaceContainerHigh">{a.name}</option>)}
                </select>
            </div>
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
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    categoryId: '',
    minAmount: '',
    maxAmount: '',
    type: '',
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
        if (filters.startDate && new Date(t.date) < new Date(filters.startDate)) return false;
        if (filters.endDate && new Date(t.date) > new Date(filters.endDate)) return false;
        if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
        if (filters.minAmount && t.amount < parseFloat(filters.minAmount)) return false;
        if (filters.maxAmount && t.amount > parseFloat(filters.maxAmount)) return false;
        if (filters.type && t.type !== filters.type) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filters]);
  
  const sortedTransactions = useMemo(() => 
    [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]
  );

  const categoryMap = useMemo(() => 
    new Map(categories.map(c => [c.id, c])), 
    [categories]
  );

  const accountMap = useMemo(() =>
    new Map(accounts.map(a => [a.id, a.name])),
    [accounts]
  );
  
  const getCategoryDisplayName = (categoryId: string) => {
    const category = categoryMap.get(categoryId);
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
        <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
          
          {/* Skupina: Dátum */}
          <div className="flex-grow md:flex-grow-0">
            <label className="block text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1">Rozsah dátumov</label>
            <div className="flex items-center gap-2">
              <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="bg-light-surface dark:bg-dark-surface border-2 border-light-outline dark:border-dark-outline rounded-lg px-3 py-2 text-sm focus:border-light-primary dark:focus:border-dark-primary focus:ring-0" placeholder="Od" />
              <span className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">-</span>
              <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="bg-light-surface dark:bg-dark-surface border-2 border-light-outline dark:border-dark-outline rounded-lg px-3 py-2 text-sm focus:border-light-primary dark:focus:border-dark-primary focus:ring-0" placeholder="Do" />
            </div>
          </div>

          {/* Skupina: Kategória a Typ */}
          <div className="flex-grow md:flex-grow-0">
            <label htmlFor="category-filter" className="block text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1">Kategória</label>
            <select id="category-filter" name="categoryId" value={filters.categoryId} onChange={handleFilterChange} className="w-full md:w-48 bg-light-surface dark:bg-dark-surface border-2 border-light-outline dark:border-dark-outline rounded-lg px-3 py-2 text-sm focus:border-light-primary dark:focus:border-dark-primary focus:ring-0">
                <option value="" className="dark:bg-dark-surfaceContainerHigh">Všetky kategórie</option>
                {categories.filter(c => c.parentId).sort((a,b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id} className="dark:bg-dark-surfaceContainerHigh">{getCategoryDisplayName(c.id)}</option>)}
            </select>
          </div>
          
          <div className="flex-grow md:flex-grow-0">
            <label htmlFor="type-filter" className="block text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1">Typ</label>
            <select id="type-filter" name="type" value={filters.type} onChange={handleFilterChange} className="w-full md:w-32 bg-light-surface dark:bg-dark-surface border-2 border-light-outline dark:border-dark-outline rounded-lg px-3 py-2 text-sm focus:border-light-primary dark:focus:border-dark-primary focus:ring-0">
                <option value="" className="dark:bg-dark-surfaceContainerHigh">Všetky typy</option>
                <option value="income" className="dark:bg-dark-surfaceContainerHigh">Príjem</option>
                <option value="expense" className="dark:bg-dark-surfaceContainerHigh">Výdavok</option>
            </select>
          </div>

          {/* Skupina: Suma */}
          <div className="flex-grow md:flex-grow-0">
            <label className="block text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1">Suma</label>
            <div className="flex items-center gap-2">
              <input type="number" name="minAmount" value={filters.minAmount} onChange={handleFilterChange} placeholder="Min" className="w-24 bg-light-surface dark:bg-dark-surface border-2 border-light-outline dark:border-dark-outline rounded-lg px-3 py-2 text-sm focus:border-light-primary dark:focus:border-dark-primary focus:ring-0" />
              <span className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">-</span>
              <input type="number" name="maxAmount" value={filters.maxAmount} onChange={handleFilterChange} placeholder="Max" className="w-24 bg-light-surface dark:bg-dark-surface border-2 border-light-outline dark:border-dark-outline rounded-lg px-3 py-2 text-sm focus:border-light-primary dark:focus:border-dark-primary focus:ring-0" />
            </div>
          </div>

          {/* Tlačidlo na reset */}
          <div className="flex-grow flex items-end justify-end">
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
                <th className="py-3 px-4 text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Popis</th>
                <th className="py-3 px-4 text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Kategória</th>
                <th className="py-3 px-4 text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Účet</th>
                <th className="py-3 px-4 text-sm font-medium text-right text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Suma</th>
                <th className="py-3 px-4 text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Akcie</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(t => (
                <tr key={t.id} className="border-b border-light-surfaceContainerHigh dark:border-dark-surfaceContainerHigh last:border-b-0">
                  <td className="py-4 px-4">{new Date(t.date).toLocaleDateString('sk-SK')}</td>
                  <td className="py-4 px-4">{t.description}</td>
                  <td className="py-4 px-4 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">{getCategoryDisplayName(t.categoryId)}</td>
                  <td className="py-4 px-4 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">{accountMap.get(t.accountId)}</td>
                  <td className={`py-4 px-4 text-right font-semibold ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-light-error dark:text-dark-error'}`}>
                    {t.type === 'expense' && '- '}{t.amount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-1">
                        <button aria-label="Upraviť transakciu" onClick={() => openEditModal(t)} className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full p-2 hover:bg-light-surfaceContainerHighest dark:hover:bg-dark-surfaceContainerHighest"><PencilIcon /></button>
                        <button aria-label="Zmazať transakciu" onClick={() => window.confirm('Naozaj chcete zmazať túto transakciu?') && deleteTransaction(t.id)} className="text-light-error dark:text-dark-error rounded-full p-2 hover:bg-light-errorContainer dark:hover:bg-dark-errorContainer"><TrashIcon /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingTransaction ? "Upraviť transakciu" : "Pridať transakciu"}>
        <TransactionForm transaction={editingTransaction} onSave={closeModal} onCancel={closeModal} />
      </Modal>
    </div>
  );
};

export default Transactions;