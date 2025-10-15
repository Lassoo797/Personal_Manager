import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from '../components/Modal';
import { ConfirmModal } from './Transactions';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons';
import type { Account, AccountType, AccountSubtype } from '../types';

const ACCOUNT_TYPES: AccountType[] = ['Štandardný účet', 'Sporiaci účet'];
const ACCOUNT_SUBTYPES: AccountSubtype[] = ['Bankový účet', 'Hotovosť'];

const AccountForm: React.FC<{
  account?: Account | null;
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
}> = ({ account, isEditing, onSave, onCancel }) => {
    const { addAccount, updateAccount } = useAppContext();
    const [name, setName] = useState(account?.name || '');
    const [initialBalance, setInitialBalance] = useState(isEditing ? '' : (account?.initialBalance ?? ''));
    const [currency, setCurrency] = useState<'EUR' | 'USD' | 'CZK'>(account?.currency || 'EUR');
    const [accountType, setAccountType] = useState<AccountType>(account?.accountType || 'Štandardný účet');
    const [type, setType] = useState<AccountSubtype>(account?.type || 'Bankový účet');
    
    const formInputStyle = "block w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0 peer";
    const formLabelStyle = "absolute text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant duration-300 transform -translate-y-3 scale-75 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isEditing) {
            if (!name || !account) return;
            updateAccount({ id: account.id, name, currency, accountType, type });
        } else {
            // Explicitne kontrolujeme, či je string prázdny. 
            // Hodnota 0 sa tak bude považovať za platnú.
            if (!name || initialBalance === '') return;
            
            const balanceValue = parseFloat(String(initialBalance));
            
            // Finálna kontrola, či je hodnota naozaj číslo
            if (isNaN(balanceValue)) return;

            addAccount({ name, initialBalance: balanceValue, currency, accountType, type });
        }
        
        onSave();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
                <input type="text" id="name" value={name} className={`${formInputStyle} h-14`} required placeholder=" " onChange={e => setName(e.target.value)}/>
                <label htmlFor="name" className={formLabelStyle}>Názov účtu</label>
            </div>
            
            {!isEditing && (
              <div className="relative">
                  <input type="number" id="initialBalance" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} step="0.01" className={`${formInputStyle} h-14`} required placeholder=" " />
                  <label htmlFor="initialBalance" className={formLabelStyle}>Počiatočný zostatok</label>
              </div>
            )}
            
            <div className="relative">
                <select id="currency" value={currency} onChange={e => setCurrency(e.target.value as 'EUR' | 'USD' | 'CZK')} className={`${formInputStyle} h-14`} required>
                    <option value="EUR" className="dark:bg-dark-surfaceContainerHigh">EUR</option>
                    <option value="USD" className="dark:bg-dark-surfaceContainerHigh">USD</option>
                    <option value="CZK" className="dark:bg-dark-surfaceContainerHigh">CZK</option>
                </select>
                <label htmlFor="currency" className={formLabelStyle}>Mena</label>
            </div>
            <div className="relative">
                <select id="accountType" value={accountType} onChange={e => setAccountType(e.target.value as AccountType)} className={`${formInputStyle} h-14`} required>
                  {ACCOUNT_TYPES.map(t => (
                    <option key={t} value={t} className="dark:bg-dark-surfaceContainerHigh">{t}</option>
                  ))}
                </select>
                <label htmlFor="accountType" className={formLabelStyle}>Typ účtu</label>
            </div>
            <div className="relative">
                <select id="type" value={type} onChange={e => setType(e.target.value as AccountSubtype)} className={`${formInputStyle} h-14`} required>
                  {ACCOUNT_SUBTYPES.map(t => (
                    <option key={t} value={t} className="dark:bg-dark-surfaceContainerHigh">{t}</option>
                  ))}
                </select>
                <label htmlFor="type" className={formLabelStyle}>Podtyp účtu</label>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2.5 text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 font-medium">Zrušiť</button>
                <button type="submit" className="px-6 py-2.5 bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary rounded-full hover:shadow-lg font-medium transition-shadow">Uložiť</button>
            </div>
        </form>
    );
};

const Accounts: React.FC = () => {
  const { accounts, deleteAccount, getAccountBalance } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, message: string, onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });

  const openAddModal = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };
  
  const operatingAccounts = accounts.filter(a => a.accountType === 'Štandardný účet');
  const savingsAccounts = accounts.filter(a => a.accountType === 'Sporiaci účet');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-normal text-light-onSurface dark:text-dark-onSurface">Účty</h1>
        <button onClick={openAddModal} className="flex items-center px-6 py-3 bg-light-tertiaryContainer text-light-onTertiaryContainer dark:bg-dark-tertiaryContainer dark:text-dark-onTertiaryContainer rounded-2xl hover:shadow-md font-medium transition-shadow">
          <PlusIcon className="h-5 w-5 mr-2" />
          Pridať účet
        </button>
      </div>

      <div>
        <h2 className="text-2xl font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant pb-4">Bežné účty</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {operatingAccounts.map(account => (
            <div key={account.id} className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-medium text-light-onSurface dark:text-dark-onSurface">{account.name}</h3>
                <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">{account.type}</p>
                <p className="text-3xl font-bold text-light-primary dark:text-dark-primary mt-2">
                  {getAccountBalance(account.id).toLocaleString('sk-SK', { style: 'currency', currency: account.currency })}
                </p>
              </div>
              <div className="flex justify-end space-x-1 mt-4">
                <button aria-label={`Upraviť účet ${account.name}`} onClick={() => openEditModal(account)} className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full p-2 hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh"><PencilIcon /></button>
                <button aria-label={`Zmazať účet ${account.name}`} onClick={() => setConfirmModalState({
                  isOpen: true,
                  message: `Naozaj chcete zmazať účet "${account.name}"?`,
                  onConfirm: () => {
                    deleteAccount(account.id);
                    setConfirmModalState({ isOpen: false, message: '', onConfirm: () => {} });
                  }
                })} className="text-light-error dark:text-dark-error rounded-full p-2 hover:bg-light-errorContainer dark:hover:bg-dark-errorContainer"><TrashIcon /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant pt-6 pb-4">Sporiace účty</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savingsAccounts.map(account => (
            <div key={account.id} className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-medium text-light-onSurface dark:text-dark-onSurface">{account.name}</h3>
                <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">{account.type}</p>
                <p className="text-3xl font-bold text-light-secondary dark:text-dark-secondary mt-2">
                  {getAccountBalance(account.id).toLocaleString('sk-SK', { style: 'currency', currency: account.currency })}
                </p>
              </div>
              <div className="flex justify-end space-x-1 mt-4">
                <button aria-label={`Upraviť účet ${account.name}`} onClick={() => openEditModal(account)} className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full p-2 hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh"><PencilIcon /></button>
                <button aria-label={`Zmazať účet ${account.name}`} onClick={() => setConfirmModalState({
                  isOpen: true,
                  message: `Naozaj chcete zmazať účet "${account.name}"?`,
                  onConfirm: () => {
                    deleteAccount(account.id);
                    setConfirmModalState({ isOpen: false, message: '', onConfirm: () => {} });
                  }
                })} className="text-light-error dark:text-dark-error rounded-full p-2 hover:bg-light-errorContainer dark:hover:bg-dark-errorContainer"><TrashIcon /></button>
              </div>
            </div>
        ))}
        </div>
      </div>
      
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAccount ? "Upraviť účet" : "Pridať účet"}>
        <AccountForm 
          account={editingAccount} 
          isEditing={!!editingAccount} 
          onSave={closeModal} 
          onCancel={closeModal} 
        />
      </Modal>

      <ConfirmModal 
        isOpen={confirmModalState.isOpen} 
        onClose={() => setConfirmModalState({ ...confirmModalState, isOpen: false })} 
        message={confirmModalState.message}
        onConfirm={confirmModalState.onConfirm}
        title="Potvrdenie zmazania"
      />
    </div>
  );
};

export default Accounts;