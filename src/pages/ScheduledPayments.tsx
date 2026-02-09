import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { ConfirmModal } from '../components/ConfirmModal';
import { PlusIcon, PencilIcon, TrashIcon, CalendarDaysIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, CheckCircleIcon, ChevronUpIcon } from '../components/icons';
import type { ScheduledPayment, TransactionType, Account, Category, PaymentFrequency } from '../types';


const ScheduledPaymentForm: React.FC<{ payment?: ScheduledPayment | null, onSave: () => void, onCancel: () => void }> = ({ payment, onSave, onCancel }) => {
    const { accounts, allCategories, addScheduledPayment, updateScheduledPayment } = useAppContext();
    const [type, setType] = useState<TransactionType>(payment?.type || 'expense');
    const [amount, setAmount] = useState<number | string>(payment?.amount || '');
    const [categoryId, setCategoryId] = useState(payment?.categoryId || '');
    const [accountId, setAccountId] = useState(payment?.accountId || '');
    const [destinationAccountId, setDestinationAccountId] = useState(payment?.destinationAccountId || '');
    const [frequency, setFrequency] = useState<PaymentFrequency>(payment?.frequency || 'monthly');
    const [startDate, setStartDate] = useState(payment?.startDate ? payment.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(payment?.endDate ? payment.endDate.slice(0, 10) : '');
    const [notes, setNotes] = useState(payment?.notes || '');
    const [error, setError] = useState<string | null>(null);
    const startDateRef = React.useRef<HTMLInputElement>(null);
    const endDateRef = React.useRef<HTMLInputElement>(null);

    const formInputStyle = "block w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0 peer";
    const formLabelStyle = "absolute text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant duration-300 transform -translate-y-3 scale-75 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3";

    const availableAccounts = useMemo(() => accounts.filter(a => a.status === 'active'), [accounts]);
    const availableAccountsForRegular = useMemo(() => 
        availableAccounts.filter(a => !a.isSavings),
        [availableAccounts]);
    
    // Group categories for select
    const groupedCategories = useMemo(() => {
        const subcategories = allCategories.filter(c => c.parentId && c.status === 'active');
        const mapped = subcategories.map(c => {
            const parent = allCategories.find(p => p.id === c.parentId);
            return {
                ...c,
                displayName: `${parent ? parent.name : '...'} - ${c.name}`,
                parentOrder: parent?.order ?? 999,
                categoryOrder: c.order ?? 999
            };
        });
        mapped.sort((a, b) => {
             if (a.parentOrder !== b.parentOrder) return a.parentOrder - b.parentOrder;
             return a.categoryOrder - b.categoryOrder;
        });
        return {
            income: mapped.filter(c => c.type === 'income'),
            expense: mapped.filter(c => c.type === 'expense')
        };
    }, [allCategories]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (type === 'transfer') {
            if (!amount || !accountId || !destinationAccountId || !startDate) {
                setError('Vyplňte všetky povinné polia.');
                return;
            }
            if (accountId === destinationAccountId) {
                setError('Zdrojový a cieľový účet nemôžu byť rovnaké.');
                return;
            }
        } else {
            if (!amount || !categoryId || !accountId || !startDate) {
                setError('Vyplňte všetky povinné polia.');
                return;
            }
        }

        const paymentData: any = {
            amount: parseFloat(String(amount)),
            type,
            categoryId: type !== 'transfer' ? categoryId : null,
            accountId,
            destinationAccountId: type === 'transfer' ? destinationAccountId : null,
            frequency,
            startDate,
            endDate: endDate || null,
            notes,
            active: true
        };

        if (payment) {
             // For update, we preserve nextPaymentDate if it exists, logic handled in service/backend usually or here if we want to reset it on start date change?
             // Usually changing start date or frequency implies recalculation of nextPaymentDate.
             // For simplicity, let's assume update handles it or we pass what's needed.
             // If we change frequency/start date, we might want to reset nextPaymentDate logic.
             // Let's keep it simple: update fields.
             updateScheduledPayment({ ...payment, ...paymentData });
        } else {
             addScheduledPayment(paymentData);
        }
        onSave();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
             <div>
                <label className="block text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-2">Typ</label>
                <div className="flex rounded-full border-2 border-light-outline dark:border-dark-outline overflow-hidden">
                    <button type="button" onClick={() => setType('expense')} className={`px-4 py-2 w-1/3 transition-colors text-sm font-medium ${type === 'expense' ? 'bg-light-secondaryContainer text-light-onSecondaryContainer dark:bg-dark-secondaryContainer dark:text-dark-onSecondaryContainer' : 'text-light-onSurface dark:text-dark-onSurface'}`}>Výdavok</button>
                    <button type="button" onClick={() => setType('income')} className={`px-4 py-2 w-1/3 transition-colors text-sm font-medium ${type === 'income' ? 'bg-light-secondaryContainer text-light-onSecondaryContainer dark:bg-dark-secondaryContainer dark:text-dark-onSecondaryContainer' : 'text-light-onSurface dark:text-dark-onSurface'}`}>Príjem</button>
                    <button type="button" onClick={() => setType('transfer')} className={`px-4 py-2 w-1/3 transition-colors text-sm font-medium ${type === 'transfer' ? 'bg-light-secondaryContainer text-light-onSecondaryContainer dark:bg-dark-secondaryContainer dark:text-dark-onSecondaryContainer' : 'text-light-onSurface dark:text-dark-onSurface'}`}>Prevod</button>
                </div>
            </div>

            <div className="relative">
                <input type="text" id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={`${formInputStyle} h-14`} placeholder=" " />
                <label htmlFor="notes" className={formLabelStyle}>Názov / Poznámka</label>
            </div>

            <div className="relative">
                <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" className={`${formInputStyle} h-14`} required placeholder=" "/>
                <label htmlFor="amount" className={formLabelStyle}>Suma</label>
            </div>

            <div className="relative">
                 <select id="frequency" value={frequency} onChange={(e: any) => setFrequency(e.target.value)} className={`${formInputStyle} h-14`} required>
                    <option value="once">Jednorázovo</option>
                    <option value="daily">Denne</option>
                    <option value="weekly">Týždenne</option>
                    <option value="monthly">Mesačne</option>
                    <option value="yearly">Ročne</option>
                </select>
                <label htmlFor="frequency" className={formLabelStyle}>Frekvencia</label>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="relative" onClick={() => startDateRef.current?.showPicker()}>
                    <input ref={startDateRef} type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${formInputStyle} h-14 pt-2 cursor-pointer`} required placeholder=" " />
                    <label htmlFor="startDate" className={`${formLabelStyle} cursor-pointer`}>Platné od / Dátum</label>
                </div>
                <div className="relative" onClick={() => endDateRef.current?.showPicker()}>
                    <input ref={endDateRef} type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`${formInputStyle} h-14 pt-2 cursor-pointer`} placeholder=" " />
                    <label htmlFor="endDate" className={`${formLabelStyle} cursor-pointer`}>Platné do (nepovinné)</label>
                </div>
            </div>

            {type === 'transfer' ? (
                <>
                    <div className="relative">
                        <select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)} className={`${formInputStyle} h-14`} required>
                            <option value="" className="dark:bg-dark-surfaceContainerHigh">Z účtu...</option>
                            {availableAccounts.map(a => <option key={a.id} value={a.id} className="dark:bg-dark-surfaceContainerHigh">{a.name}</option>)}
                        </select>
                         <label htmlFor="account" className={formLabelStyle}>Z účtu</label>
                    </div>
                    <div className="relative">
                        <select id="destinationAccount" value={destinationAccountId} onChange={(e) => setDestinationAccountId(e.target.value)} className={`${formInputStyle} h-14`} required>
                            <option value="" className="dark:bg-dark-surfaceContainerHigh">Na účet...</option>
                            {availableAccounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id} className="dark:bg-dark-surfaceContainerHigh">{a.name}</option>)}
                        </select>
                        <label htmlFor="destinationAccount" className={formLabelStyle}>Na účet</label>
                    </div>
                </>
            ) : (
                <>
                    <div className="relative">
                        <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${formInputStyle} h-14`} required>
                            <option value="" className="dark:bg-dark-surfaceContainerHigh">Vyberte kategóriu</option>
                             {groupedCategories.expense.length > 0 && (
                                <optgroup label="Výdavky" className="font-semibold text-light-error dark:text-dark-error">
                                    {groupedCategories.expense.map((c: any) => (
                                        <option key={c.id} value={c.id} className="text-light-onSurface dark:text-dark-onSurface dark:bg-dark-surfaceContainerHigh">
                                            {c.displayName}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                            {groupedCategories.income.length > 0 && (
                                <optgroup label="Príjmy" className="font-semibold text-green-600 dark:text-green-400">
                                    {groupedCategories.income.map((c: any) => (
                                        <option key={c.id} value={c.id} className="text-light-onSurface dark:text-dark-onSurface dark:bg-dark-surfaceContainerHigh">
                                            {c.displayName}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                         <label htmlFor="category" className={formLabelStyle}>Kategória</label>
                    </div>
                    <div className="relative">
                        <select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)} className={`${formInputStyle} h-14`} required>
                            <option value="" className="dark:bg-dark-surfaceContainerHigh">Vyberte účet</option>
                            {availableAccountsForRegular.map(a => <option key={a.id} value={a.id} className="dark:bg-dark-surfaceContainerHigh">{a.name}</option>)}
                        </select>
                        <label htmlFor="account" className={formLabelStyle}>Účet</label>
                    </div>
                </>
            )}

            {error && <p className="text-sm text-light-error dark:text-dark-error">{error}</p>}

             <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2.5 text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 font-medium">Zrušiť</button>
                <button type="submit" className="px-6 py-2.5 bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary rounded-full hover:shadow-lg font-medium transition-shadow">Uložiť</button>
            </div>
        </form>
    );
};

const ScheduledPayments: React.FC = () => {
    const { scheduledPayments, deleteScheduledPayment, confirmScheduledPayment, allCategories, accounts } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<ScheduledPayment | null>(null);
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, message: string, onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });
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


    const openAddModal = () => {
        setEditingPayment(null);
        setIsModalOpen(true);
    };

    const openEditModal = (payment: ScheduledPayment) => {
        setEditingPayment(payment);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingPayment(null);
    };

    const categoryMap = useMemo(() => new Map(allCategories.map(c => [c.id, c])), [allCategories]);
    const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a.name])), [accounts]);

    const getCategoryDisplayName = (categoryId: string | null) => {
        if (!categoryId) return '---';
        const c = categoryMap.get(categoryId);
        if (!c) return 'Neznáma';
        if (c.parentId) {
             const parent = categoryMap.get(c.parentId);
             return `${parent ? parent.name : '...'} - ${c.name}`;
        }
        return c.name;
    };

    const getFrequencyLabel = (freq: PaymentFrequency) => {
        switch(freq) {
            case 'once': return 'Jednorázovo';
            case 'daily': return 'Denne';
            case 'weekly': return 'Týždenne';
            case 'monthly': return 'Mesačne';
            case 'yearly': return 'Ročne';
            default: return freq;
        }
    };
    
    // Independent Payment Date State for each card is tricky in a loop with hooks.
    // Instead, we can use a temporary state that holds the date for the currently "confirming" payment
    // BUT here we have the input directly in the card.
    // Let's create a small sub-component for the Card to handle its own date state?
    // OR just use today's date as default when clicking confirm, and if we want date picker inside the card, we need a component.
    // Let's refactor the list item into a component `ScheduledPaymentCard`.


    // Sort: Active first, then by nextPaymentDate
    const sortedPayments = useMemo(() => {
        return [...scheduledPayments].sort((a, b) => {
            if (a.active === b.active) {
                return new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime();
            }
            return a.active ? -1 : 1;
        });
    }, [scheduledPayments]);

    return (
        <div className="space-y-6 relative h-full flex flex-col">
            <PageHeader title="Plánované platby">
                 <button 
                    onClick={openAddModal} 
                    className="flex items-center justify-center p-2 rounded-full bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary hover:shadow-md transition-all"
                    title="Pridať plánovanú platbu"
                >
                    <PlusIcon className="h-5 w-5" />
                </button>
            </PageHeader>

            <div className="bg-light-surfaceContainer dark:bg-dark-surfaceContainer p-4 sm:p-6 rounded-2xl border border-light-outlineVariant dark:border-dark-outlineVariant flex-1 overflow-hidden flex flex-col">
                 <div className="overflow-y-auto h-full pb-20 p-1">
                    <div className="flex flex-col space-y-3">
                        {sortedPayments.map(payment => (
                            <ScheduledPaymentCard 
                                key={payment.id} 
                                payment={payment} 
                                onEdit={() => openEditModal(payment)} 
                                onDelete={() => setConfirmModalState({ isOpen: true, message: 'Naozaj zmazať túto plánovanú platbu?', onConfirm: () => deleteScheduledPayment(payment.id) })}
                                onConfirmPayment={confirmScheduledPayment}
                                accountMap={accountMap}
                                getCategoryDisplayName={getCategoryDisplayName}
                                getFrequencyLabel={getFrequencyLabel}
                            />
                        ))}
                         {scheduledPayments.length === 0 && (
                            <div className="text-center py-10 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                                Zatiaľ žiadne naplánované platby.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPayment ? "Upraviť plánovanú platbu" : "Nová plánovaná platba"}>
                 <ScheduledPaymentForm payment={editingPayment} onSave={closeModal} onCancel={closeModal} />
            </Modal>

            <ConfirmModal
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
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

// Subcomponent for Card to handle local state (payment date)
const ScheduledPaymentCard: React.FC<{
    payment: ScheduledPayment,
    onEdit: () => void,
    onDelete: () => void,
    onConfirmPayment: (p: ScheduledPayment, date: string, amount: number) => Promise<void>,
    accountMap: Map<string, string>,
    getCategoryDisplayName: (id: string | null) => string,
    getFrequencyLabel: (f: PaymentFrequency) => string
}> = ({ payment, onEdit, onDelete, onConfirmPayment, accountMap, getCategoryDisplayName, getFrequencyLabel }) => {
    const isTransfer = payment.type === 'transfer';
    const isDue = payment.active && new Date(payment.nextPaymentDate) <= new Date();
    const [paymentDate, setPaymentDate] = useState<string>(() => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 10);
    });
    const [paymentAmount, setPaymentAmount] = useState<string>(payment.amount.toString());
    const [confirming, setConfirming] = useState(false);
    
    // Reset date and amount when payment changes (e.g. after confirmation and update)
    useEffect(() => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        setPaymentDate(new Date(d.getTime() - offset).toISOString().slice(0, 10));
        setPaymentAmount(payment.amount.toString());
        setConfirming(false);
    }, [payment.nextPaymentDate, payment.amount]);

    const dateObj = new Date(payment.nextPaymentDate);
    const day = dateObj.getDate();
    const month = dateObj.toLocaleString('sk-SK', { month: 'short' }).toUpperCase().replace('.', '');

    const getAmountClass = (type: TransactionType) => {
        switch(type) {
            case 'income': return 'text-green-600 dark:text-green-400';
            case 'expense': return 'text-light-error dark:text-dark-error';
            case 'transfer': return 'text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant';
            default: return '';
        }
    }

    return (
         <div className={`bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-3 sm:p-4 rounded-2xl border ${payment.active ? 'border-light-outlineVariant/40 dark:border-dark-outlineVariant/40' : 'border-transparent opacity-70'} shadow-sm hover:shadow-md transition-all group`}>
             <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                
                {/* 1. Date & Icon */}
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full sm:w-auto">
                    <div className="hidden md:flex flex-col items-center justify-center min-w-[50px] pr-4 border-r border-light-outlineVariant/30 dark:border-dark-outlineVariant/30 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                        <span className="text-xl font-bold leading-none">{day}</span>
                        <span className="text-[10px] font-bold tracking-wider opacity-70">{month}</span>
                    </div>

                    <div className={`p-2 sm:p-3 rounded-full shrink-0 ${
                        payment.type === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                        payment.type === 'expense' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                        {payment.type === 'income' ? <ArrowUpCircleIcon className="h-5 w-5 sm:h-6 sm:w-6"/> : 
                            payment.type === 'expense' ? <ArrowDownCircleIcon className="h-5 w-5 sm:h-6 sm:w-6"/> : 
                            <div className="h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center font-bold">⇄</div>}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                             <span className="font-bold text-light-onSurface dark:text-dark-onSurface text-sm sm:text-base truncate" title={payment.notes}>
                                {payment.notes || (isTransfer ? 'Prevod' : getCategoryDisplayName(payment.categoryId))}
                            </span>
                            {!payment.active && <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 rounded text-gray-500">Neaktívne</span>}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mt-0.5">
                             <span className="truncate max-w-[150px] sm:max-w-xs" title={isTransfer ? `${accountMap.get(payment.accountId)} -> ${accountMap.get(payment.destinationAccountId || '')}` : accountMap.get(payment.accountId)}>
                                {isTransfer 
                                    ? <>{accountMap.get(payment.accountId)} → {accountMap.get(payment.destinationAccountId || '')}</>
                                    : accountMap.get(payment.accountId)
                                }
                            </span>
                            <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
                            <span className="bg-light-surfaceContainerHighest dark:bg-dark-surfaceContainerHighest px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium uppercase tracking-wide">
                                {getFrequencyLabel(payment.frequency)}
                            </span>
                             <span className="md:hidden opacity-90 ml-auto text-xs">
                                {dateObj.toLocaleDateString('sk-SK')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Amount & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 w-full sm:w-auto mt-2 sm:mt-0 pl-14 sm:pl-0">
                    <div className="flex flex-col items-end min-w-[70px] sm:min-w-[100px]">
                        <span className={`font-bold text-base sm:text-lg whitespace-nowrap ${getAmountClass(payment.type)}`}>
                            {payment.type === 'expense' && '- '}{payment.amount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
                        </span>
                        {isDue && payment.active && (
                           <span className="text-[10px] text-light-error dark:text-dark-error font-bold animate-pulse">
                               Na úhradu
                           </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 pl-2 border-l border-light-outlineVariant/20 dark:border-dark-outlineVariant/20">
                         {isDue && !confirming && (
                             <button 
                                onClick={() => setConfirming(true)}
                                className="p-1.5 sm:p-2 rounded-lg text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                title="Zadať úhradu"
                             >
                                <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6"/>
                             </button>
                         )}
                        <button 
                            onClick={onEdit} 
                            className="p-1.5 sm:p-2 rounded-lg text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-primaryContainer hover:text-light-onPrimaryContainer dark:hover:bg-dark-primaryContainer dark:hover:text-dark-onPrimaryContainer transition-colors"
                            title="Upraviť"
                        >
                            <PencilIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                        </button>
                        <button 
                            onClick={onDelete} 
                            className="p-1.5 sm:p-2 rounded-lg text-light-error dark:text-dark-error hover:bg-light-errorContainer dark:hover:bg-dark-errorContainer transition-colors"
                            title="Zmazať"
                        >
                            <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                        </button>
                    </div>
                </div>
             </div>

             {/* Confirmation Area (Expandable) */}
             {confirming && (
                 <div className="mt-3 pt-3 border-t border-light-outlineVariant/50 dark:border-dark-outlineVariant/50 flex flex-col sm:flex-row items-center gap-3 animate-fadeIn">
                     <div className="flex-1 w-full sm:w-auto flex flex-wrap items-center gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant font-medium">Dátum:</label>
                            <input 
                                type="date" 
                                value={paymentDate} 
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="block w-full sm:w-36 bg-light-surfaceContainerHigh dark:bg-dark-surfaceContainerHigh text-sm text-light-onSurface dark:text-dark-onSurface rounded-lg border-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary py-1.5 px-3"
                            />
                        </div>
                        <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
                            <label className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant font-medium">Suma:</label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={paymentAmount} 
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                className="block w-full bg-light-surfaceContainerHigh dark:bg-dark-surfaceContainerHigh text-sm text-light-onSurface dark:text-dark-onSurface rounded-lg border-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary py-1.5 px-3"
                            />
                        </div>
                     </div>
                     <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                         <button 
                            onClick={() => setConfirming(false)}
                            className="px-3 py-1.5 text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-surfaceContainerHighest dark:hover:bg-dark-surfaceContainerHighest rounded-lg"
                         >
                             Zrušiť
                         </button>
                         <button 
                            onClick={() => onConfirmPayment(payment, paymentDate, parseFloat(paymentAmount) || 0)}
                            className="px-4 py-1.5 text-sm bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary rounded-lg hover:shadow-md font-medium"
                         >
                             Potvrdiť
                         </button>
                     </div>
                 </div>
             )}
         </div>
    )
}

export default ScheduledPayments;

