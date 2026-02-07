import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAppContext } from '../context/AppContext';
import Modal from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import PageHeader from '../components/PageHeader';
import { PlusIcon, PencilIcon, ArchiveBoxIcon, LandmarkIcon, WalletIcon, DotsVerticalIcon, ChevronUpIcon, ChevronDownIcon, BanknotesIcon, PiggyBankIcon } from '../components/icons';
import type { Account, AccountType, AccountSubtype } from '../types';

const ACCOUNT_TYPES: AccountType[] = ['Štandardný účet'];
const ACCOUNT_SUBTYPES: AccountSubtype[] = ['Bankový účet', 'Hotovosť'];

const AccountIcon: React.FC<{ type: AccountSubtype }> = ({ type }) => {
  switch (type) {
    case 'Bankový účet':
      return <LandmarkIcon className="h-8 w-8 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant" />;
    case 'Hotovosť':
      return <WalletIcon className="h-8 w-8 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant" />;
    default:
      return null;
  }
};

const ActionMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
}> = ({ isOpen, onClose, triggerRef, children }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuHeightEstimate = 180; // A safe estimate for menu height
      const spaceBelow = window.innerHeight - rect.bottom;
      const opensUpward = spaceBelow < menuHeightEstimate && rect.top > menuHeightEstimate;

      setPositionStyle({
        position: 'fixed',
        top: opensUpward ? `${rect.top - menuHeightEstimate}px` : `${rect.bottom + 4}px`,
        left: `${rect.left + rect.width - 224}px`, // 224px is w-56
        width: '224px',
        zIndex: 50,
      });
    }
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={positionStyle}
      className="bg-light-surfaceContainerHigh dark:bg-dark-surfaceContainerHigh rounded-lg shadow-xl"
      onClick={onClose}
    >
      {children}
    </div>,
    document.body
  );
};

const AccountForm: React.FC<{
  account?: Account | null;
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
}> = ({ account, isEditing, onSave, onCancel }) => {
    const { createAccount, updateAccount } = useAppContext();
    const [name, setName] = useState(account?.name || '');
    const [initialBalance, setInitialBalance] = useState(account?.initialBalance?.toString() || '0');
    const [initialBalanceDate, setInitialBalanceDate] = useState(account?.initialBalanceDate?.slice(0,10) || new Date().toISOString().slice(0, 10));
    const [currency, setCurrency] = useState<'EUR' | 'USD' | 'CZK'>(account?.currency || 'EUR');
    const [accountType, ] = useState<AccountType>(account?.accountType || 'Štandardný účet');
    const [type, setType] = useState<AccountSubtype>(account?.type || 'Bankový účet');
    const [isSavings, setIsSavings] = useState(account?.isSavings || false);
    
    const dateInputRef = useRef<HTMLInputElement>(null);
    const openCalendar = () => dateInputRef.current?.showPicker();

    const formInputStyle = "block w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0 peer";
    const formLabelStyle = "absolute text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant duration-300 transform -translate-y-3 scale-75 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isEditing) {
            if (!name || !account) return;
            // Note: Editing initial balance might need more complex logic, e.g., creating a corrective transaction.
            // For now, we only allow updating descriptive fields.
            updateAccount({ id: account.id, name, currency, type });
        } else {
            if (!name) return;
            
            const balanceValue = parseFloat(String(initialBalance));
            if (isNaN(balanceValue)) return; // Ensure it's a valid number

            createAccount({ 
              name, 
              currency, 
              accountType, 
              type, 
              initialBalance: balanceValue, 
              initialBalanceDate,
              isSavings
            });
        }
        
        onSave();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
                <input type="text" id="name" value={name} className={`${formInputStyle} h-14`} required placeholder=" " onChange={e => setName(e.target.value)}/>
                <label htmlFor="name" className={formLabelStyle}>Názov účtu</label>
            </div>

            <div className="flex gap-4">
              <div className="relative flex-1">
                  <select id="type" value={type} onChange={e => setType(e.target.value as AccountSubtype)} className={`${formInputStyle} h-14`} required disabled={isEditing}>
                    {ACCOUNT_SUBTYPES.map(t => (
                      <option key={t} value={t} className="dark:bg-dark-surfaceContainerHigh">{t}</option>
                    ))}
                  </select>
                  <label htmlFor="type" className={formLabelStyle}>Podtyp účtu</label>
              </div>

              <div className="relative flex items-center h-14 px-4 border-2 border-light-outline dark:border-dark-outline rounded-lg bg-transparent">
                  <input 
                    type="checkbox" 
                    id="isSavings" 
                    checked={isSavings} 
                    onChange={e => setIsSavings(e.target.checked)} 
                    className="w-5 h-5 text-light-primary dark:text-dark-primary border-light-outline dark:border-dark-outline rounded focus:ring-light-primary dark:focus:ring-dark-primary bg-transparent"
                  />
                  <label htmlFor="isSavings" className="ml-3 text-sm font-medium text-light-onSurface dark:text-dark-onSurface cursor-pointer select-none">
                    Sporiaci účet
                  </label>
              </div>
            </div>
            
            {!isEditing && (
              <>
                <div className="relative" onClick={openCalendar}>
                    <input ref={dateInputRef} type="date" id="initialBalanceDate" value={initialBalanceDate} onChange={e => setInitialBalanceDate(e.target.value)} className={`${formInputStyle} h-14 pt-2 cursor-pointer`} required />
                    <label htmlFor="initialBalanceDate" className={`${formLabelStyle} cursor-pointer`}>Dátum počiatočného zostatku</label>
                </div>
                <div className="relative">
                    <input type="number" id="initialBalance" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} step="0.01" className={`${formInputStyle} h-14`} required placeholder=" " />
                    <label htmlFor="initialBalance" className={formLabelStyle}>Počiatočný zostatok</label>
                </div>
              </>
            )}
            
            <div className="relative">
                <select id="currency" value={currency} onChange={e => setCurrency(e.target.value as 'EUR' | 'USD' | 'CZK')} className={`${formInputStyle} h-14`} required>
                    <option value="EUR" className="dark:bg-dark-surfaceContainerHigh">EUR</option>
                    <option value="USD" className="dark:bg-dark-surfaceContainerHigh">USD</option>
                    <option value="CZK" className="dark:bg-dark-surfaceContainerHigh">CZK</option>
                </select>
                <label htmlFor="currency" className={formLabelStyle}>Mena</label>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2.5 text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 font-medium">Zrušiť</button>
                <button type="submit" className="px-6 py-2.5 bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary rounded-full hover:shadow-lg font-medium transition-shadow">Uložiť</button>
            </div>
        </form>
    );
};

const Accounts = () => {
  const { accounts, getAccountBalance, moveAccountUp, moveAccountDown, archiveAccount, setDefaultAccount, setSavingsAccount, updateAccount, createAccount } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isMenuOpenId, setIsMenuOpenId] = useState<string | null>(null);
  const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, message: string, onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });
  
  const menuTriggerRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const { totalBalance, savingsBalance, budgetBalance } = useMemo(() => {
    let total = 0;
    let savings = 0;
    let budget = 0;

    accounts.forEach(acc => {
      const balance = getAccountBalance(acc.id);
      total += balance;
      if (acc.isSavings) {
        savings += balance;
      } else {
        budget += balance;
      }
    });

    return { totalBalance: total, savingsBalance: savings, budgetBalance: budget };
  }, [accounts, getAccountBalance]);

  const budgetAccounts = useMemo(() => accounts.filter(a => !a.isSavings), [accounts]);
  const savingsAccounts = useMemo(() => accounts.filter(a => a.isSavings), [accounts]);

  const openAddModal = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setIsModalOpen(true);
    setIsMenuOpenId(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };
  
  const toggleMenu = (id: string) => {
    setIsMenuOpenId(prev => (prev === id ? null : id));
  };

  return (
    <div className="space-y-8 relative h-full flex flex-col">
      <PageHeader title="Účty">
        <button onClick={openAddModal} className="flex items-center justify-center px-4 py-2 bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary rounded-full hover:shadow-lg font-medium transition-all text-sm">
          <PlusIcon className="h-5 w-5 mr-2" />
          <span className="hidden sm:inline">Pridať účet</span>
          <span className="sm:hidden">Pridať</span>
        </button>
      </PageHeader>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-2xl border border-light-outlineVariant dark:border-dark-outlineVariant relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <LandmarkIcon className="w-24 h-24 text-light-primary dark:text-dark-primary" />
           </div>
           <p className="text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant uppercase tracking-wider relative z-10">Celkový majetok</p>
           <p className="text-3xl font-bold text-light-primary dark:text-dark-primary mt-2 relative z-10">{totalBalance.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
        </div>

        <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-2xl border border-light-outlineVariant dark:border-dark-outlineVariant relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <BanknotesIcon className="w-24 h-24 text-green-600 dark:text-green-400" />
           </div>
           <p className="text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant uppercase tracking-wider relative z-10">V rozpočte</p>
           <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2 relative z-10">{budgetBalance.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
        </div>

        <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-2xl border border-light-outlineVariant dark:border-dark-outlineVariant relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <PiggyBankIcon className="w-24 h-24 text-purple-600 dark:text-purple-400" />
           </div>
           <p className="text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant uppercase tracking-wider relative z-10">V sporeniach</p>
           <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2 relative z-10">{savingsBalance.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
        </div>
      </div>
      
      <div className="space-y-8">
        {/* Budget Accounts Section */}
        {budgetAccounts.length > 0 && (
          <section>
             <h2 className="text-xl font-medium mb-4 text-light-onSurface dark:text-dark-onSurface flex items-center gap-2">
                <WalletIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                Bežné účty (Rozpočet)
            </h2>
            <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant overflow-hidden">
              <ul className="divide-y divide-light-outlineVariant dark:divide-dark-outlineVariant">
                {budgetAccounts.map((account, index) => (
                  <li key={account.id} className="flex flex-col hover:bg-light-surfaceContainer dark:hover:bg-dark-surfaceContainer transition-colors duration-150 relative">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-700 dark:text-green-300">
                          <AccountIcon type={account.type} />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-light-onSurface dark:text-dark-onSurface flex items-center">
                            {account.name}
                            {account.isDefault && <span className="ml-2 text-yellow-500 text-xs bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full border border-yellow-200 dark:border-yellow-800">Hlavný</span>}
                          </h3>
                          <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                            {account.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <p className="text-lg font-bold text-light-onSurface dark:text-dark-onSurface">
                          {getAccountBalance(account.id).toLocaleString('sk-SK', { style: 'currency', currency: account.currency })}
                        </p>
                        <div className="relative">
                          <button 
                            ref={el => menuTriggerRefs.current[account.id] = el}
                            aria-label={`Možnosti pre účet ${account.name}`} 
                            onClick={(e) => { e.stopPropagation(); toggleMenu(account.id); }} 
                            className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full p-2 hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh transition-colors"
                          >
                            <DotsVerticalIcon />
                          </button>
                          <ActionMenu 
                            isOpen={isMenuOpenId === account.id} 
                            onClose={() => setIsMenuOpenId(null)} 
                            triggerRef={{ current: menuTriggerRefs.current[account.id] }}
                          >
                             <div className="py-2">
                              <button onClick={() => { moveAccountUp(account.id); setIsMenuOpenId(null); }} disabled={index === 0} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50">
                                <ChevronUpIcon className="h-5 w-5 mr-3"/> Posunúť vyššie
                              </button>
                              <button onClick={() => { moveAccountDown(account.id); setIsMenuOpenId(null); }} disabled={index === budgetAccounts.length - 1} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50">
                                <ChevronDownIcon className="h-5 w-5 mr-3"/> Posunúť nižšie
                              </button>
                              <div className="my-1 h-px bg-light-outlineVariant dark:bg-dark-outlineVariant" />
                              <button 
                                onClick={() => { setDefaultAccount(account.id); setIsMenuOpenId(null); }} 
                                disabled={account.isDefault} 
                                className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
                              >
                                <span className="w-5 h-5 mr-3 flex items-center justify-center">★</span> Nastaviť ako hlavný
                              </button>
                              <button 
                                onClick={() => { setSavingsAccount(account.id, true); setIsMenuOpenId(null); }} 
                                className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5"
                              >
                                <PiggyBankIcon className="h-5 w-5 mr-3"/> Nastaviť ako sporiaci
                              </button>
                              <div className="my-1 h-px bg-light-outlineVariant dark:bg-dark-outlineVariant" />
                              <button onClick={(e) => { e.stopPropagation(); openEditModal(account); }} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5">
                                <PencilIcon className="h-5 w-5 mr-3"/> Upraviť
                              </button>
                              <button onClick={(e) => {
                                e.stopPropagation();
                                setConfirmModalState({
                                  isOpen: true,
                                  message: `Naozaj chcete archivovať účet "${account.name}"?`,
                                  onConfirm: () => {
                                    archiveAccount(account.id);
                                    setConfirmModalState(prev => ({ ...prev, isOpen: false }));
                                  }
                                });
                                setIsMenuOpenId(null);
                              }} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-error dark:text-dark-error hover:bg-light-error/10 dark:hover:bg-dark-error/10">
                                <ArchiveBoxIcon className="h-5 w-5 mr-3"/> Archivovať
                              </button>
                            </div>
                          </ActionMenu>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Savings Accounts Section */}
        {savingsAccounts.length > 0 && (
          <section>
             <h2 className="text-xl font-medium mb-4 text-light-onSurface dark:text-dark-onSurface flex items-center gap-2">
                <PiggyBankIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Sporiace účty
            </h2>
            <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant overflow-hidden">
              <ul className="divide-y divide-light-outlineVariant dark:divide-dark-outlineVariant">
                {savingsAccounts.map((account, index) => (
                  <li key={account.id} className="flex flex-col hover:bg-light-surfaceContainer dark:hover:bg-dark-surfaceContainer transition-colors duration-150 relative">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-700 dark:text-purple-300">
                           <AccountIcon type={account.type} />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-light-onSurface dark:text-dark-onSurface flex items-center">
                            {account.name}
                          </h3>
                          <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                            {account.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <p className="text-lg font-bold text-light-onSurface dark:text-dark-onSurface">
                          {getAccountBalance(account.id).toLocaleString('sk-SK', { style: 'currency', currency: account.currency })}
                        </p>
                         <div className="relative">
                          <button 
                            ref={el => menuTriggerRefs.current[account.id] = el}
                            aria-label={`Možnosti pre účet ${account.name}`} 
                            onClick={(e) => { e.stopPropagation(); toggleMenu(account.id); }} 
                            className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full p-2 hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh transition-colors"
                          >
                            <DotsVerticalIcon />
                          </button>
                          <ActionMenu 
                            isOpen={isMenuOpenId === account.id} 
                            onClose={() => setIsMenuOpenId(null)} 
                            triggerRef={{ current: menuTriggerRefs.current[account.id] }}
                          >
                             <div className="py-2">
                              <button onClick={() => { moveAccountUp(account.id); setIsMenuOpenId(null); }} disabled={index === 0} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50">
                                <ChevronUpIcon className="h-5 w-5 mr-3"/> Posunúť vyššie
                              </button>
                              <button onClick={() => { moveAccountDown(account.id); setIsMenuOpenId(null); }} disabled={index === savingsAccounts.length - 1} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50">
                                <ChevronDownIcon className="h-5 w-5 mr-3"/> Posunúť nižšie
                              </button>
                              <div className="my-1 h-px bg-light-outlineVariant dark:bg-dark-outlineVariant" />
                              <button 
                                onClick={() => { setSavingsAccount(account.id, false); setIsMenuOpenId(null); }} 
                                className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5"
                              >
                                <WalletIcon className="h-5 w-5 mr-3"/> Zmeniť na bežný účet
                              </button>
                              <div className="my-1 h-px bg-light-outlineVariant dark:bg-dark-outlineVariant" />
                              <button onClick={(e) => { e.stopPropagation(); openEditModal(account); }} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5">
                                <PencilIcon className="h-5 w-5 mr-3"/> Upraviť
                              </button>
                              <button onClick={(e) => {
                                e.stopPropagation();
                                setConfirmModalState({
                                  isOpen: true,
                                  message: `Naozaj chcete archivovať účet "${account.name}"?`,
                                  onConfirm: () => {
                                    archiveAccount(account.id);
                                    setConfirmModalState(prev => ({ ...prev, isOpen: false }));
                                  }
                                });
                                setIsMenuOpenId(null);
                              }} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-error dark:text-dark-error hover:bg-light-error/10 dark:hover:bg-dark-error/10">
                                <ArchiveBoxIcon className="h-5 w-5 mr-3"/> Archivovať
                              </button>
                            </div>
                          </ActionMenu>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
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
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))} 
        message={confirmModalState.message}
        onConfirm={confirmModalState.onConfirm}
        title="Potvrdenie archivácie"
      />
    </div>
  );
};


export default Accounts;