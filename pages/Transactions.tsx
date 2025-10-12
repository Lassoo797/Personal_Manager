import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from '../components/Modal';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons';
import type { Transaction, TransactionType, Category } from '../types';

const TransactionForm: React.FC<{ transaction?: Transaction | null, onSave: () => void, onCancel: () => void }> = ({ transaction, onSave, onCancel }) => {
    const { accounts, categories, addTransaction, updateTransaction } = useAppContext();
    const [type, setType] = useState<TransactionType>(transaction?.type || 'expense');
    const [date, setDate] = useState(transaction?.date || new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState(transaction?.description || '');
    const [amount, setAmount] = useState(transaction?.amount || '');
    const [categoryId, setCategoryId] = useState(transaction?.categoryId || '');
    const [accountId, setAccountId] = useState(transaction?.accountId || '');
    const formInputStyle = "block w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0 peer";
    const formLabelStyle = "absolute text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant duration-300 transform -translate-y-3 scale-75 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3";


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
                    <option value="">Vyberte kategóriu</option>
                    {filteredCategories.map(c => <option key={c.id} value={c.id}>{categories.find(p=>p.id === c.parentId)?.name} - {c.name}</option>)}
                </select>
            </div>
            <div className="relative">
                <select id="account" value={accountId} onChange={e => setAccountId(e.target.value)} className={`${formInputStyle} h-14`} required>
                    <option value="">Vyberte účet</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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
              {sortedTransactions.map(t => (
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