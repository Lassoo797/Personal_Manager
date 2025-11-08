import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAppContext } from '../context/AppContext';
import Modal from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { PlusIcon, PencilIcon, ArchiveBoxIcon, LandmarkIcon, WalletIcon, DotsVerticalIcon, ChevronUpIcon, ChevronDownIcon } from '../components/icons';
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
    const [accountType, setAccountType] = useState<AccountType>(account?.accountType || 'Štandardný účet');
    const [type, setType] = useState<AccountSubtype>(account?.type || 'Bankový účet');
    
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
            updateAccount({ id: account.id, name, currency, accountType, type });
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
              initialBalanceDate 
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

            <div className="relative">
                <select id="type" value={type} onChange={e => setType(e.target.value as AccountSubtype)} className={`${formInputStyle} h-14`} required disabled={isEditing}>
                  {ACCOUNT_SUBTYPES.map(t => (
                    <option key={t} value={t} className="dark:bg-dark-surfaceContainerHigh">{t}</option>
                  ))}
                </select>
                <label htmlFor="type" className={formLabelStyle}>Podtyp účtu</label>
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

const AccountListItem: React.FC<{
  account: Account;
  index: number;
  accountsCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ account, index, accountsCount, isExpanded, onToggle }) => {
  const { 
    getAccountBalance, moveAccountUp, moveAccountDown, 
    archiveAccount, setDefaultAccount, allCategories, budgets, transactions 
  } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, message: string, onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);

  const { totalBalance, availableForBudget, savingDetails } = useMemo(() => {
    const totalBalance = getAccountBalance(account.id);
    const today = new Date();
    
    const savingCategories = allCategories.filter(c => 
      c.isSaving && c.savingAccount === account.id && c.type === 'expense'
    );

    const details: { categoryId: string, categoryName: string, saved: number }[] = [];
    let totalSavedAmount = 0;

    savingCategories.forEach(cat => {
      let totalSavedForCategory = 0;
      const startDate = new Date(cat.validFrom);
      // Loop until the start of the month after the archive date, or the current month.
      const endDate = cat.archivedFrom ? new Date(cat.archivedFrom) : new Date(today.getFullYear(), today.getMonth() + 1, 1);

      // Iterate through each month the category was active
      for (let d = startDate; d < endDate; d.setMonth(d.getMonth() + 1)) {
        const monthStr = d.toISOString().slice(0, 7);

        // Don't calculate for future months
        if (monthStr > today.toISOString().slice(0,7)) continue;
        
        const budget = budgets.find(b => b.categoryId === cat.id && b.month === monthStr);
        const budgetAmount = budget?.amount || 0;

        if (budgetAmount > 0) {
            const spentAmount = transactions
            .filter(t => t.categoryId === cat.id && t.transactionDate.startsWith(monthStr))
            .reduce((sum, t) => sum + t.amount, 0);
            
            const savedInMonth = budgetAmount - spentAmount;

            if (savedInMonth > 0) {
                totalSavedForCategory += savedInMonth;
            }
        }
      }

      if (totalSavedForCategory > 0) {
        totalSavedAmount += totalSavedForCategory;
        details.push({ categoryId: cat.id, categoryName: cat.name, saved: totalSavedForCategory });
      }
    });
    
    const availableForBudget = totalBalance - totalSavedAmount;

    return { totalBalance, availableForBudget, savingDetails: details };
  }, [account.id, getAccountBalance, allCategories, budgets, transactions]);

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setIsModalOpen(true);
    setIsMenuOpen(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  return (
    <>
      <li className="flex flex-col hover:bg-light-surfaceContainer dark:hover:bg-dark-surfaceContainer transition-colors duration-150">
        <div onClick={onToggle} className="p-4 flex items-center justify-between cursor-pointer">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-light-surfaceContainerHighest dark:bg-dark-surfaceContainerHighest rounded-full">
              <AccountIcon type={account.type} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-light-onSurface dark:text-dark-onSurface flex items-center">
                {account.name}
                {account.isDefault && <span className="ml-2 text-yellow-500" role="img" aria-label="Default">★</span>}
              </h3>
              <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">{account.type}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <p className="text-xl font-bold text-light-primary dark:text-dark-primary">
              {totalBalance.toLocaleString('sk-SK', { style: 'currency', currency: account.currency })}
            </p>
            <div className="flex items-center">
              <button 
                ref={menuTriggerRef}
                aria-label={`Možnosti pre účet ${account.name}`} 
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(prev => !prev); }} 
                className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full p-2 hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh"
              >
                <DotsVerticalIcon />
              </button>
              <ActionMenu 
                isOpen={isMenuOpen} 
                onClose={() => setIsMenuOpen(false)} 
                triggerRef={menuTriggerRef}
              >
                <div className="py-2">
                  <button onClick={() => { moveAccountUp(account.id); setIsMenuOpen(false); }} disabled={index === 0} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50">
                    <ChevronUpIcon className="h-5 w-5 mr-3"/> Posunúť vyššie
                  </button>
                  <button onClick={() => { moveAccountDown(account.id); setIsMenuOpen(false); }} disabled={index === accountsCount - 1} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50">
                    <ChevronDownIcon className="h-5 w-5 mr-3"/> Posunúť nižšie
                  </button>
                  <div className="my-1 h-px bg-light-outlineVariant dark:bg-dark-outlineVariant" />
                  <button 
                    onClick={() => { setDefaultAccount(account.id); setIsMenuOpen(false); }} 
                    disabled={account.isDefault} 
                    className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
                  >
                    <span className="w-5 h-5 mr-3">★</span> Nastaviť ako predvolený
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); openEditModal(account); }} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5">
                    <PencilIcon className="h-5 w-5 mr-3"/> Upraviť
                  </button>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setConfirmModalState({
                      isOpen: true,
                      message: `Naozaj chcete archivovať účet "${account.name}"? Účet bude skrytý, ale jeho história zostane zachovaná.`,
                      onConfirm: () => {
                        archiveAccount(account.id);
                        setConfirmModalState({ isOpen: false, message: '', onConfirm: () => {} });
                      }
                    });
                    setIsMenuOpen(false);
                  }} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-error dark:text-dark-error hover:bg-light-error/10 dark:hover:bg-dark-error/10">
                    <ArchiveBoxIcon className="h-5 w-5 mr-3"/> Archivovať
                  </button>
                </div>
              </ActionMenu>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div className="pb-4 px-6">
            <div className="bg-light-surfaceContainer dark:bg-dark-surfaceContainer p-4 rounded-lg">
                <ul className="space-y-2">
                    <li className="flex justify-between items-center">
                        <span>Voľné prostriedky</span>
                        <span>{availableForBudget.toLocaleString('sk-SK', { style: 'currency', currency: account.currency })}</span>
                    </li>
                    <li className="flex justify-between items-center">
                        <span>Viazané prostriedky</span>
                        <span>{(totalBalance - availableForBudget).toLocaleString('sk-SK', { style: 'currency', currency: account.currency })}</span>
                    </li>
                    {savingDetails.length > 0 && (
                      <ul className="pl-4 pt-1 space-y-1">
                        {savingDetails.map(detail => (
                            <li key={detail.categoryId} className="flex justify-between items-center text-sm">
                                <span className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">{detail.categoryName}</span>
                                <span>{detail.saved.toLocaleString('sk-SK', { style: 'currency', currency: account.currency })}</span>
                            </li>
                        ))}
                      </ul>
                    )}
                </ul>
            </div>
          </div>
        )}
      </li>
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title="Upraviť účet">
          <AccountForm 
            account={editingAccount} 
            isEditing={!!editingAccount} 
            onSave={closeModal} 
            onCancel={closeModal} 
          />
        </Modal>
      )}
      <ConfirmModal 
        isOpen={confirmModalState.isOpen} 
        onClose={() => setConfirmModalState({ ...confirmModalState, isOpen: false })} 
        message={confirmModalState.message}
        onConfirm={confirmModalState.onConfirm}
        title="Potvrdenie archivácie"
      />
    </>
  );
};

const AccountList: React.FC<{
  accounts: Account[];
  title: string;
  expandedAccountId: string | null;
  onToggleExpand: (accountId: string) => void;
}> = ({ accounts, title, expandedAccountId, onToggleExpand }) => (
  <div>
    <h2 className="text-2xl font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant pt-6 pb-4">{title}</h2>
    <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant overflow-hidden">
      <ul className="divide-y divide-light-outlineVariant dark:divide-dark-outlineVariant">
        {accounts.map((account, index) => (
          <AccountListItem 
            key={account.id}
            account={account}
            index={index}
            accountsCount={accounts.length}
            isExpanded={expandedAccountId === account.id}
            onToggle={() => onToggleExpand(account.id)}
          />
        ))}
      </ul>
    </div>
  </div>
);

const Accounts: React.FC = () => {
  const { accounts, getAccountBalance } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  
  const handleToggleExpand = (accountId: string) => {
    setExpandedAccountId(prevId => (prevId === accountId ? null : accountId));
  };
  
  const openAddModal = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };
  
  const { totalBalance } = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);

    return { totalBalance };
  }, [accounts, getAccountBalance]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-normal text-light-onSurface dark:text-dark-onSurface">Účty</h1>
        <button onClick={openAddModal} className="flex items-center px-6 py-3 bg-light-tertiaryContainer text-light-onTertiaryContainer dark:bg-dark-tertiaryContainer dark:text-dark-onTertiaryContainer rounded-2xl hover:shadow-md font-medium transition-shadow">
          <PlusIcon className="h-5 w-5 mr-2" />
          Pridať účet
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
          <h2 className="text-base font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Celkový majetok</h2>
          <p className="text-3xl font-bold text-light-tertiary dark:text-dark-tertiary mt-1">{totalBalance.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
        </div>
      </div>
      
      {accounts.length > 0 && (
        <AccountList 
          accounts={accounts} 
          title="Všetky účty"
          expandedAccountId={expandedAccountId}
          onToggleExpand={handleToggleExpand}
        />
      )}
      
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAccount ? "Upraviť účet" : "Pridať účet"}>
        <AccountForm 
          account={editingAccount} 
          isEditing={!!editingAccount} 
          onSave={closeModal} 
          onCancel={closeModal} 
        />
      </Modal>
    </div>
  );
};


export default Accounts;