import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';

import { useAppContext } from '../context/AppContext';
import type { TransactionType, Category } from '../types';
import { PlusIcon, TrashIcon, XIcon, ChevronDownIcon, ChevronUpIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, PencilIcon, DotsVerticalIcon, CalendarClockIcon, CalendarDaysIcon } from '../components/icons';
import Modal from '../components/Modal';

import ReactDOM from 'react-dom';

const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('sk-SK', { month: 'long', year: 'numeric' });
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


// --- Re-usable Components ---

const EditableBudgetValue: React.FC<{ categoryId: string; currentMonth: string; }> = ({ categoryId, currentMonth }) => {
    const { budgets, addOrUpdateBudget } = useAppContext();
    const budgetAmount = useMemo(() => budgets.find(b => b.categoryId === categoryId && b.month === currentMonth)?.amount ?? 0, [budgets, categoryId, currentMonth]);
    
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(budgetAmount > 0 ? budgetAmount.toFixed(2) : '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setValue(budgetAmount > 0 ? budgetAmount.toFixed(2) : ''); }, [budgetAmount]);
    useEffect(() => { if (isEditing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [isEditing]);

    const handleSave = () => {
        const amount = value === '' ? 0 : parseFloat(value);
        if (!isNaN(amount) && amount >= 0 && amount !== budgetAmount) {
            addOrUpdateBudget({ categoryId, month: currentMonth, amount });
        }
        setIsEditing(false);
    };

    if (isEditing) {
        return (
             <div className="relative text-left flex-shrink-0 w-32">
                <p className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-0.5">Plán</p>
                <input ref={inputRef} type="number" value={value} onChange={(e) => setValue(e.target.value)} onBlur={handleSave} onKeyDown={(e) => { if(e.key === 'Enter') handleSave(); if(e.key === 'Escape') setIsEditing(false); }}
                    className="w-full bg-light-surface dark:bg-dark-surface text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-primary dark:border-dark-primary focus:ring-0 px-2 py-1 text-left font-bold text-base" step="0.01" min="0" />
            </div>
        );
    }
    return (
        <div className="text-left cursor-pointer group flex-shrink-0 w-32" onClick={() => setIsEditing(true)}>
            <p className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-0.5">Plán</p>
            <span className="text-base font-bold text-light-onSurface dark:text-dark-onSurface group-hover:text-light-primary dark:group-hover:text-dark-primary">
                {budgetAmount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
            </span>
        </div>
    );
};

const EditableCategoryName: React.FC<{ category: Category, isEditing: boolean, setIsEditing: (isEditing: boolean) => void }> = ({ category, isEditing, setIsEditing }) => {
    const { updateCategory } = useAppContext();
    const [name, setName] = useState(category.name);
    const inputRef = useRef<HTMLInputElement>(null);
    const isParent = !category.parentId;

    useEffect(() => { 
        if (isEditing) { 
            inputRef.current?.focus(); 
            inputRef.current?.select(); 
        } else {
            setName(category.name); // Reset name if editing is cancelled
        }
    }, [isEditing, category.name]);

    const handleSave = () => {
        if (name.trim() && name.trim() !== category.name) {
            updateCategory({ ...category, name: name.trim() });
        }
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleSave} onKeyDown={(e) => { if(e.key === 'Enter') handleSave(); if(e.key === 'Escape') setIsEditing(false); }} onClick={e => e.stopPropagation()}
                className={`w-full bg-black/5 dark:bg-white/5 text-current rounded-md border-light-primary dark:border-dark-primary border-2 px-2 py-1 outline-none ${isParent ? 'text-lg font-semibold' : 'text-base font-medium'}`} />
        );
    }
    return (
        <span className={`truncate ${isParent ? 'font-semibold text-lg' : 'font-medium text-base'}`}>
            {category.name}
        </span>
    );
}

const InlineCategoryForm: React.FC<{ 
    type: TransactionType, 
    parentId: string | null, 
    validFrom: string, // YYYY-MM
    onCancel: () => void,
    onSaveSuccess: (newCategory: Category) => void 
}> = ({ type, parentId, validFrom, onCancel, onSaveSuccess }) => {
    const { addCategory } = useAppContext();
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && !isSaving) {
            setIsSaving(true);
            const newCategory = await addCategory({ name: name.trim(), type, parentId, validFrom });
            setIsSaving(false);
            if (newCategory) {
                onSaveSuccess(newCategory);
                onCancel(); // Close form
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center space-x-2 p-4">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={parentId ? "Názov podkategórie" : "Názov skupiny"}
                className="flex-grow bg-light-surface dark:bg-dark-surface text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0 px-3 py-2 text-sm" autoFocus />
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-light-primary text-light-onPrimary rounded-full text-sm font-medium disabled:bg-gray-400">
                {isSaving ? 'Ukladám...' : 'Uložiť'}
            </button>
            <button type="button" onClick={onCancel} className="p-2 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh"><XIcon className="h-5 w-5"/></button>
        </form>
    );
};


// --- Main Page and Sections ---

const Budgets: React.FC = () => {
    const { 
        categories, budgets, transactions, 
        deleteCategory, deleteCategoryAndChildren, reassignAnddeleteCategory, 
        updateCategoryOrder, isLoading, error, 
        publishBudgetForYear, publishFullBudgetForYear, getFinancialSummary
    } = useAppContext();
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // State for managing inline forms
    const [addingCategory, setAddingCategory] = useState<{type: TransactionType, parentId: string | null} | null>(null);

    // State for deletion modal
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, message: string, onConfirm: () => void, confirmText?: string }>({ isOpen: false, message: '', onConfirm: () => {}, confirmText: 'Zmazať' });

    const handleSaveSuccess = (newCategory: Category) => {
        // Ak bola pridaná nová skupina (nemá parentId), rozbaľ ju
        if (!newCategory.parentId) {
            setExpandedGroups(prev => new Set(prev).add(newCategory.id));
        }
    };


    const currentMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }, [currentDate]);

    const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    const toggleGroupExpansion = useCallback((groupId: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) {
                newSet.delete(groupId);
            } else {
                newSet.add(groupId);
            }
            return newSet;
        });
    }, []);

    const getActualAmount = useCallback((categoryId: string) => {
        return transactions
            .filter(t => t.categoryId === categoryId && t.transactionDate && t.transactionDate.startsWith(currentMonth))
            .reduce((sum, t) => sum + t.amount, 0);
    }, [transactions, currentMonth]);
    
    const parentCategories = useMemo(() => {
        const income = categories
            .filter(c => c.type === 'income' && !c.parentId && c.validFrom <= currentMonth)
            .sort((a, b) => a.order - b.order);
        const expense = categories
            .filter(c => c.type === 'expense' && !c.parentId && c.validFrom <= currentMonth)
            .sort((a, b) => a.order - b.order);
        return { income, expense };
    }, [categories, currentMonth]);

    
    
    const summary = useMemo(() => {
        // --- VÝPOČET ZÁKLADNÝCH HODNÔT ---
        const incomeCategoryIds = new Set(categories.filter(c => c.type === 'income').map(c => c.id));
        
        let plannedIncome = 0;
        let plannedExpense = 0;

        // Iterácia cez všetky rozpočty pre aktuálny mesiac
        budgets.forEach(b => {
            if (b.month === currentMonth) {
                // Rozdelenie na príjmy a výdavky podľa kategórie
                if (incomeCategoryIds.has(b.categoryId)) {
                    plannedIncome += b.amount;
                } else {
                    plannedExpense += b.amount;
                }
            }
        });

        // Použitie novej centrálnej funkcie
        const monthlyTransactions = transactions.filter(t => t.transactionDate && t.transactionDate.startsWith(currentMonth));
        const { actualIncome, actualExpense } = getFinancialSummary(monthlyTransactions);
        
        const plannedBalance = plannedIncome - plannedExpense;
        const actualBalance = actualIncome - actualExpense;

        return { plannedIncome, actualIncome, plannedExpense, actualExpense, plannedBalance, actualBalance };
    }, [budgets, transactions, currentMonth, categories, getFinancialSummary]);

    const handleDeleteRequest = (e: React.MouseEvent, category: Category) => {
        e.stopPropagation();
        const isParent = !category.parentId;

        if (isParent) {
            const subcategories = categories.filter(c => c.parentId === category.id);
            const childIds = subcategories.map(sc => sc.id);
            const hasTransactionsInChildren = transactions.some(t => childIds.includes(t.categoryId));

            if (hasTransactionsInChildren) {
                setConfirmModalState({
                    isOpen: true,
                    message: `Nie je možné zmazať skupinu "${category.name}", pretože jej podkategórie obsahujú transakcie. Najprv presuňte alebo zmažte transakcie z podkategórií.`,
                    onConfirm: () => setConfirmModalState({ ...confirmModalState, isOpen: false }),
                    confirmText: 'Rozumiem'
                });
                return;
            }
            
            const confirmationMessage = subcategories.length > 0
                ? `Naozaj chcete zmazať skupinu "${category.name}" a všetky jej podkategórie (${subcategories.map(s => s.name).join(', ')})?`
                : `Naozaj chcete zmazať prázdnu skupinu "${category.name}"?`;

            setConfirmModalState({
                isOpen: true,
                message: confirmationMessage,
                onConfirm: () => {
                    deleteCategoryAndChildren(category.id);
                    setConfirmModalState({ ...confirmModalState, isOpen: false });
                }
            });

        } else { // It's a subcategory
            const hasTransactions = transactions.some(t => t.categoryId === category.id);
            if (hasTransactions) {
                setCategoryToDelete(category);
                setIsReassignModalOpen(true);
            } else {
                setConfirmModalState({
                    isOpen: true,
                    message: `Naozaj chcete zmazať kategóriu "${category.name}"?`,
                    onConfirm: () => {
                        deleteCategory(category.id);
                        setConfirmModalState({ ...confirmModalState, isOpen: false });
                    }
                });
            }
        }
    };


    const renderCategorySection = (type: TransactionType) => {
        const parents = parentCategories[type];
        return (
            <div className="space-y-4">
                {parents.map((parent, index) => (
                    <div key={parent.id}>
                        <CategoryGroup
                            parent={parent}
                            parentIndex={index}
                            siblingsCount={parents.length}
                            isDragging={false}
                            currentMonth={currentMonth}
                            getActualAmount={getActualAmount}
                            onDeleteRequest={handleDeleteRequest}
                            onAddSubcategory={() => setAddingCategory({ type, parentId: parent.id })}
                            isAddingSubcategory={addingCategory?.parentId === parent.id}
                            onCancelAddSubcategory={() => setAddingCategory(null)}
                            onSaveSubcategorySuccess={handleSaveSuccess}
                            isExpanded={expandedGroups.has(parent.id)}
                            toggleExpansion={() => toggleGroupExpansion(parent.id)}
                        />
                    </div>
                ))}
                {addingCategory?.type === type && addingCategory?.parentId === null ? (
                    <InlineCategoryForm 
                        type={type} 
                        parentId={null} 
                        validFrom={currentMonth}
                        onCancel={() => setAddingCategory(null)}
                        onSaveSuccess={handleSaveSuccess}
                    />
                ) : (
                    <div className="p-2">
                        <button onClick={() => setAddingCategory({ type, parentId: null })} className="w-full flex items-center justify-center px-4 py-2 border-2 border-dashed border-light-outline dark:border-dark-outline rounded-lg text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-surfaceContainer dark:hover:bg-dark-surfaceContainer">
                            <PlusIcon className="h-5 w-5 mr-2" /> Pridať skupinu
                        </button>
                    </div>
                )}
            </div>
        );
    };
    
    if (isLoading) {
        return <div className="text-center p-10">Načítavam dáta...</div>;
    }

    if (error) {
        return <div className="text-center p-10 text-red-500">Chyba pri načítavaní dát: {error.message}</div>;
    }

    return (
        
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <h1 className="text-4xl font-normal text-light-onSurface dark:text-dark-onSurface">Rozpočty</h1>
                    <div className="flex items-center space-x-2 bg-light-surfaceContainer dark:bg-dark-surfaceContainer p-1 rounded-full">
                        <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh" aria-label="Predchádzajúci mesiac">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="font-semibold text-center w-40 select-none">{formatMonth(currentMonth)}</span>
                        <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh" aria-label="Nasledujúci mesiac">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>

                <div className="bg-light-surfaceContainer dark:bg-dark-surfaceContainer p-4 rounded-2xl border border-light-outlineVariant/50 dark:border-dark-outlineVariant/50">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex-1 min-w-max">
                            <h3 className="font-medium text-light-onSurface dark:text-dark-onSurface">Nástroje pre plánovanie</h3>
                            <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Uľahčite si prácu s opakujúcimi sa rozpočtami.</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button 
                                onClick={() => setCurrentDate(new Date())}
                                className="flex items-center gap-2 px-4 py-2 bg-light-tertiaryContainer text-light-onTertiaryContainer dark:bg-dark-tertiaryContainer dark:text-dark-onTertiaryContainer rounded-full font-medium text-sm hover:shadow-md transition-shadow"
                            >
                                <CalendarDaysIcon className="h-5 w-5" />
                                Aktuálny mesiac
                            </button>
                            <button 
                                onClick={() => {
                                    setConfirmModalState({
                                        isOpen: true,
                                        message: `Naozaj chcete nastaviť aktuálny plán pre všetky kategórie a podkategórie na všetky nasledujúce mesiace do konca roka?`,
                                        onConfirm: () => {
                                            publishFullBudgetForYear(currentMonth);
                                            setConfirmModalState({ ...confirmModalState, isOpen: false });
                                        },
                                        confirmText: 'Nastaviť'
                                    });
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-light-secondaryContainer text-light-onSecondaryContainer dark:bg-dark-secondaryContainer dark:text-dark-onSecondaryContainer rounded-full font-medium text-sm hover:shadow-md transition-shadow"
                            >
                                <CalendarClockIcon className="h-5 w-5" />
                                Nastaviť plán do konca roka
                            </button>
                        </div>
                    </div>
                </div>



                <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-2xl border border-light-outlineVariant dark:border-dark-outlineVariant">
                    <h2 className="text-xl font-medium mb-4 text-light-onSurface dark:text-dark-onSurface">Súhrn za mesiac</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                        {(() => {
                            // --- PRÍPRAVA HODNÔT PRE ZOBRAZENIE ---
                            const { plannedIncome, actualIncome, plannedExpense, actualExpense, plannedBalance, actualBalance } = summary;

                            // --- Logika pre Príjmy ---
                            const incomeDiff = actualIncome - plannedIncome;
                            // Pomer plnenia: ak je plán 0, akýkoľvek príjem je 100% úspech. Inak štandardný pomer.
                            const incomeRatio = plannedIncome > 0 ? actualIncome / plannedIncome : (actualIncome > 0 ? 1 : 0);
                            const incomeProgressWidth = `${Math.min(incomeRatio * 100, 100)}%`;
                            const incomeDiffColor = incomeDiff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-light-error dark:text-dark-error';
                            
                            // --- Logika pre Výdavky ---
                            const remainingExpense = plannedExpense - actualExpense;
                             // Pomer čerpania: ak je plán 0, akýkoľvek výdavok je 100% prekročenie.
                            const expenseRatio = plannedExpense > 0 ? actualExpense / plannedExpense : (actualExpense > 0 ? 1 : 0);
                            const expenseProgressWidth = `${Math.min(expenseRatio * 100, 100)}%`;
                            const remainingExpenseColor = remainingExpense >= 0 ? 'text-green-600 dark:text-green-400' : 'text-light-error dark:text-dark-error';
                            // Farba progress baru pre výdavky sa mení podľa miery čerpania
                            let expenseBarColor = 'bg-green-500';
                            if (expenseRatio > 1) expenseBarColor = 'bg-light-error dark:bg-dark-error';
                            else if (expenseRatio > 0.8) expenseBarColor = 'bg-yellow-500';

                            // --- Logika pre Bilanciu ---
                            const balanceDiff = actualBalance - plannedBalance;
                            
                            // ÚSPECH sa definuje ako dosiahnutie alebo prekročenie plánovanej bilancie.
                            const isSuccess = actualBalance >= plannedBalance;
                            
                            // Definovanie farieb na základe stavu
                            const balanceDiffColor = isSuccess ? 'text-green-600 dark:text-green-400' : 'text-yellow-500';
                            let actualBalanceColor = isSuccess ? 'text-green-600 dark:text-green-400' : 'text-yellow-500';
                            if (actualBalance < 0) {
                                actualBalanceColor = 'text-light-error dark:text-dark-error';
                            }
                            
                            // Pomer pre progress bar: jednoduchý pomer aktuálnej hodnoty k plánu.
                            // Ak je plán 0, akýkoľvek výsledok nad 0 je 100%.
                            let balanceRatio = 0;
                            if (plannedBalance !== 0) {
                                balanceRatio = actualBalance / plannedBalance;
                            } else {
                                balanceRatio = actualBalance > 0 ? 1 : 0;
                            }
                            
                            const balanceProgressWidth = `${Math.max(0, Math.min(balanceRatio * 100, 100))}%`;
                            const balanceBarColor = isSuccess ? 'bg-green-500' : (actualBalance < 0 ? 'bg-light-error' : 'bg-yellow-500');

                            return (
                                <>
                                    {/* Príjmy */}
                                    <div className="md:border-r md:border-light-outlineVariant md:dark:border-dark-outlineVariant md:pr-8 flex flex-col">
                                        <h3 className="text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant text-center">Príjmy</h3>
                                        <div className="flex-grow mt-1 text-center mb-3">
                                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                {actualIncome.toLocaleString('sk-SK', {style:'currency', currency:'EUR'})}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-baseline text-xs">
                                            <span className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant opacity-80">
                                                Plán: {plannedIncome.toLocaleString('sk-SK', {style:'currency', currency:'EUR'})}
                                            </span>
                                            <span>
                                                <span className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant opacity-80">Rozdiel: </span>
                                                <span className={`font-medium ${incomeDiffColor}`}>
                                                    {incomeDiff.toLocaleString('sk-SK', {style:'currency', currency:'EUR', signDisplay:'always'})}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-light-surfaceContainerHighest dark:bg-dark-surfaceContainerHighest rounded-full h-2 mt-1">
                                            <div className="bg-green-500 h-2 rounded-full" style={{ width: incomeProgressWidth }}></div>
                                        </div>
                                    </div>

                                    {/* Výdavky */}
                                    <div className="md:border-r md:border-light-outlineVariant md:dark:border-dark-outlineVariant md:pr-8 flex flex-col">
                                        <h3 className="text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant text-center">Výdavky</h3>
                                        <div className="flex-grow mt-1 text-center mb-3">
                                            <p className="text-2xl font-bold text-light-error dark:text-dark-error">
                                                {actualExpense.toLocaleString('sk-SK', {style:'currency', currency:'EUR'})}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-baseline text-xs">
                                            <span className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant opacity-80">
                                                Plán: {plannedExpense.toLocaleString('sk-SK', {style:'currency', currency:'EUR'})}
                                            </span>
                                            <span>
                                                <span className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant opacity-80">Rozdiel: </span>
                                                <span className={`font-medium ${remainingExpenseColor}`}>
                                                    {remainingExpense.toLocaleString('sk-SK', {style:'currency', currency:'EUR', signDisplay:'always'})}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-light-surfaceContainerHighest dark:bg-dark-surfaceContainerHighest rounded-full h-2 mt-1">
                                            <div className={`${expenseBarColor} h-2 rounded-full`} style={{ width: expenseProgressWidth }}></div>
                                        </div>
                                    </div>
                                    
                                    {/* Bilancia */}
                                    <div className="flex flex-col">
                                        <h3 className="text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant text-center">Bilancia</h3>
                                        <div className="flex-grow mt-1 text-center mb-3">
                                            <p className={`text-2xl font-bold ${actualBalanceColor}`}>
                                                {actualBalance.toLocaleString('sk-SK', {style:'currency', currency:'EUR'})}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-baseline text-xs">
                                            <span className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant opacity-80">
                                                Plán: {plannedBalance.toLocaleString('sk-SK', {style:'currency', currency:'EUR'})}
                                            </span>
                                            <span>
                                                <span className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant opacity-80">Rozdiel: </span>
                                                <span className={`font-medium ${balanceDiffColor}`}>
                                                    {balanceDiff.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR', signDisplay: 'always' })}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-light-surfaceContainerHighest dark:bg-dark-surfaceContainerHighest rounded-full h-2 mt-1">
                                            <div className={`${balanceBarColor} h-2 rounded-full`} style={{ width: balanceProgressWidth }}></div>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>

                <div className="space-y-8">
                    <div>
                        <h2 className="text-2xl font-medium mb-4 text-green-600 dark:text-green-400 px-2">Príjmy</h2>
                        {renderCategorySection('income')}
                    </div>
                    <div>
                        <h2 className="text-2xl font-medium mb-4 text-light-error dark:text-dark-error px-2">Výdavky</h2>
                        {renderCategorySection('expense')}
                    </div>
                </div>
                <ReassignAndDeleteModal 
                    isOpen={isReassignModalOpen} 
                    onClose={() => {
                        setIsReassignModalOpen(false);
                        setCategoryToDelete(null);
                    }} 
                    category={categoryToDelete} 
                    reassignAnddeleteCategory={reassignAnddeleteCategory}
                />
                <ConfirmModal 
                    isOpen={confirmModalState.isOpen} 
                    onClose={() => setConfirmModalState({ ...confirmModalState, isOpen: false })} 
                    message={confirmModalState.message}
                    onConfirm={confirmModalState.onConfirm}
                    confirmText={confirmModalState.confirmText}
                />
            </div>
        
    );
};

interface CategoryGroupProps {
    parent: Category;
    parentIndex: number;
    siblingsCount: number;
    currentMonth: string;
    getActualAmount: (id: string) => number;
    onDeleteRequest: (e: React.MouseEvent, cat: Category) => void;
    onAddSubcategory: () => void;
    isAddingSubcategory: boolean;
    onCancelAddSubcategory: () => void;
    onSaveSubcategorySuccess: (newCategory: Category) => void;
    isExpanded: boolean;
    toggleExpansion: () => void;
    isDragging: boolean;
    setConfirmModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean, message: string, onConfirm: () => void, confirmText?: string }>>;
}

const CategoryGroup: React.FC<CategoryGroupProps> = ({ 
    parent, parentIndex, siblingsCount, currentMonth, getActualAmount, onDeleteRequest, 
    onAddSubcategory, isAddingSubcategory, onCancelAddSubcategory, onSaveSubcategorySuccess,
    isExpanded, toggleExpansion, isDragging, setConfirmModalState 
}) => {
    const { categories, budgets, moveCategoryUp, moveCategoryDown, publishBudgetForYear } = useAppContext();
    const [isEditingName, setIsEditingName] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const subcategories = useMemo(() => 
        categories.filter(c => c.parentId === parent.id && c.validFrom <= currentMonth)
                  .sort((a,b)=>(a.order || 0) - (b.order || 0)), 
    [categories, parent.id, currentMonth]);

    const { parentTotalBudget, parentTotalActual } = useMemo(() => {
        let totalBudget = 0;
        let totalActual = 0;
        subcategories.forEach(sub => {
            totalBudget += budgets.find(b => b.categoryId === sub.id && b.month === currentMonth)?.amount ?? 0;
            totalActual += getActualAmount(sub.id);
        });
        return { parentTotalBudget: totalBudget, parentTotalActual: totalActual };
    }, [subcategories, budgets, currentMonth, getActualAmount]);

    const isIncome = parent.type === 'income';
    const difference = isIncome ? parentTotalActual - parentTotalBudget : parentTotalBudget - parentTotalActual;
    const isPositive = difference >= 0;

    let summaryLabel = '';
    let summaryColor = '';
    const actualColor = isIncome ? 'text-green-600 dark:text-green-400' : 'text-light-error dark:text-dark-error';

    if (isIncome) {
        summaryLabel = 'Rozdiel';
        summaryColor = isPositive ? 'text-green-600 dark:text-green-400' : 'text-light-error dark:text-dark-error';
    } else { // Expense
        summaryLabel = isPositive ? 'Zostáva' : 'Prekročené';
        summaryColor = isPositive ? 'text-green-600 dark:text-green-400' : 'text-light-error dark:text-dark-error';
    }

    const ratio = parentTotalBudget > 0 ? parentTotalActual / parentTotalBudget : (parentTotalActual > 0 ? 1 : 0);
    const progressWidth = `${Math.min(ratio * 100, 100)}%`;

    const getBarColor = (r: number, type: TransactionType) => {
        if (type === 'income') {
            return r >= 1 ? 'bg-green-500' : 'bg-light-primary dark:bg-dark-primary';
        }
        if (r > 1) return 'bg-light-error dark:bg-dark-error';
        if (r > 0.8) return 'bg-yellow-500';
        return 'bg-light-primary dark:bg-dark-primary';
    };

    const headerBgClass = isIncome ? 'bg-green-500/10' : 'bg-light-error/10 dark:bg-dark-error/10';
    const headerTextClass = isIncome ? 'text-green-800 dark:text-green-300' : 'text-light-error dark:text-dark-error';
    const containerClasses = `bg-light-surfaceContainer dark:bg-dark-surfaceContainer rounded-2xl overflow-hidden border border-light-outlineVariant/50 dark:border-dark-outlineVariant/50 transition-shadow ${isDragging ? 'shadow-2xl' : ''}`;

    return (
        <div className={containerClasses}>
            <div 
                className={`relative ${headerBgClass} ${headerTextClass} p-4 cursor-pointer`}
                onClick={() => !isEditingName && toggleExpansion()}
            >
                <div className="flex items-center gap-4 w-full">
                    {/* Left Side: Icon and Name (fixed width) */}
                    <div className="w-1/3 flex-shrink-0 flex items-center space-x-3 overflow-hidden">
                        {isIncome ? <ArrowUpCircleIcon className="h-6 w-6 flex-shrink-0" /> : <ArrowDownCircleIcon className="h-6 w-6 flex-shrink-0" />}
                        <EditableCategoryName category={parent} isEditing={isEditingName} setIsEditing={setIsEditingName} />
                    </div>
                    
                    {/* Middle: Financial Summary (takes remaining space) */}
                    <div className="flex-grow">
                        <div className="grid grid-cols-3 gap-x-2 sm:gap-x-4 text-center w-full">
                            {/* Plán */}
                            <div>
                                <p className="text-xs opacity-80 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant truncate">Plán</p>
                                <span className="text-base font-medium text-light-onSurface dark:text-dark-onSurface">
                                    {parentTotalBudget.toLocaleString('sk-SK', {style:'currency',currency:'EUR'})}
                                </span>
                            </div>
                            {/* Skutočnosť */}
                            <div>
                                <p className="text-xs opacity-80 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant truncate">Skutočnosť</p>
                                <span className={`text-base font-medium ${actualColor}`}>
                                    {parentTotalActual.toLocaleString('sk-SK', {style:'currency',currency:'EUR'})}
                                </span>
                            </div>
                            {/* Rozdiel */}
                            <div>
                                <p className="text-xs opacity-80 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant truncate">{summaryLabel}</p>
                                <span className={`text-base font-medium ${summaryColor}`}>
                                    {isIncome 
                                        ? difference.toLocaleString('sk-SK', {style:'currency', currency:'EUR', signDisplay: 'always'})
                                        : Math.abs(difference).toLocaleString('sk-SK', {style:'currency', currency:'EUR'})
                                    }
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        {subcategories.length > 0 && parentTotalBudget > 0 && (
                            <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 mt-2">
                                <div className={`h-1.5 rounded-full ${getBarColor(ratio, parent.type)}`} style={{ width: progressWidth }}></div>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Controls (fixed width) */}
                    <div className="flex-shrink-0 flex items-center space-x-1">
                        <button ref={triggerRef} onClick={(e) => { e.stopPropagation(); setIsMenuOpen(true); }} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                            <DotsVerticalIcon className="h-5 w-5" />
                        </button>
                        
                        <ActionMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} triggerRef={triggerRef}>
                            <div className="py-2">
                                <button onClick={() => moveCategoryUp(parent.id)} disabled={parentIndex === 0} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50">
                                    <ChevronUpIcon className="h-5 w-5 mr-3"/> Posunúť vyššie
                                </button>
                                <button onClick={() => moveCategoryDown(parent.id)} disabled={parentIndex === siblingsCount - 1} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50">
                                    <ChevronDownIcon className="h-5 w-5 mr-3"/> Posunúť nižšie
                                </button>
                                <button onClick={() => setIsEditingName(true)} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5">
                                    <PencilIcon className="h-5 w-5 mr-3"/> Premenovať
                                </button>
                                <button 
                                    onClick={() => {
                                        setConfirmModalState({
                                            isOpen: true,
                                            message: `Naozaj chcete nastaviť aktuálny plán pre skupinu "${parent.name}" a všetky jej podkategórie na všetky nasledujúce mesiace do konca roka?`,
                                            onConfirm: () => {
                                                publishBudgetForYear(parent.id, currentMonth, true);
                                                setConfirmModalState(prev => ({ ...prev, isOpen: false }));
                                            },
                                            confirmText: 'Nastaviť'
                                        });
                                    }}
                                    className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5"
                                >
                                    <CalendarClockIcon className="h-5 w-5 mr-3"/> Nastaviť do konca roka
                                </button>
                                <div className="my-1 h-px bg-light-outlineVariant dark:bg-dark-outlineVariant" />
                                <button onClick={(e) => onDeleteRequest(e, parent)} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-error dark:text-dark-error hover:bg-light-error/10 dark:hover:bg-dark-error/10">
                                    <TrashIcon className="h-5 w-5 mr-3"/> Zmazať skupinu
                                </button>
                            </div>
                        </ActionMenu>

                        <button onClick={(e) => { e.stopPropagation(); toggleExpansion(); }} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                            <ChevronDownIcon className={`h-6 w-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>
            
            {isExpanded && (
                <div className="divide-y divide-light-outlineVariant/50 dark:divide-dark-outlineVariant/50">
                    {subcategories.map((sub, index) => <SubcategoryItem key={sub.id} category={sub} subcategoryIndex={index} siblingsCount={subcategories.length} currentMonth={currentMonth} getActualAmount={getActualAmount} onDeleteRequest={onDeleteRequest} getBarColor={getBarColor} />)}
                    
                    {isAddingSubcategory ? (
                        <div className="p-2">
                            <InlineCategoryForm 
                                type={parent.type} 
                                parentId={parent.id} 
                                validFrom={currentMonth}
                                onCancel={onCancelAddSubcategory}
                                onSaveSuccess={onSaveSubcategorySuccess}
                            />
                        </div>
                    ) : (
                        <div className="p-2">
                            <button onClick={onAddSubcategory} className="w-full flex items-center justify-center px-4 py-2 text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-lg hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh">
                                <PlusIcon className="h-4 w-4 mr-2"/> Pridať podkategóriu
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};;

const SubcategoryItem: React.FC<{
    category: Category;
    subcategoryIndex: number;
    siblingsCount: number;
    currentMonth: string;
    getActualAmount: (id: string) => number;
    onDeleteRequest: (e: React.MouseEvent, cat: Category) => void;
    getBarColor: (ratio: number, type: TransactionType) => string;
    setConfirmModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean, message: string, onConfirm: () => void, confirmText?: string }>>;
}> = ({ category, subcategoryIndex, siblingsCount, currentMonth, getActualAmount, onDeleteRequest, getBarColor, setConfirmModalState }) => {
    const { budgets, addOrUpdateBudget, moveCategoryUp, moveCategoryDown, publishBudgetForYear } = useAppContext();
    const [isEditingName, setIsEditingName] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Výpočty
    const budgetAmount = useMemo(() => budgets.find(b => b.categoryId === category.id && b.month === currentMonth)?.amount ?? 0, [budgets, category.id, currentMonth]);
    const actualAmount = getActualAmount(category.id);
    const difference = category.type === 'income' ? actualAmount - budgetAmount : budgetAmount - actualAmount;
    const ratio = budgetAmount > 0 ? actualAmount / budgetAmount : (actualAmount > 0 ? 1 : 0);
    const progressWidth = `${Math.min(ratio * 100, 100)}%`;
    const isSuccess = category.type === 'income' ? actualAmount >= budgetAmount : actualAmount <= budgetAmount;

    // Definovanie popisov a farieb
    const isIncome = category.type === 'income';
    const summaryLabel = isIncome ? 'Rozdiel' : (difference >= 0 ? 'Zostáva' : 'Prekročené');
    const differenceColor = isSuccess ? 'text-green-600 dark:text-green-400' : (isIncome ? 'text-light-error dark:text-dark-error' : 'text-yellow-500');
    const actualColor = isIncome ? 'text-green-600 dark:text-green-400' : 'text-light-error dark:text-dark-error';
    
    // Inline editácia rozpočtu
    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [budgetValue, setBudgetValue] = useState(budgetAmount > 0 ? budgetAmount.toFixed(2) : '');
    const budgetInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setBudgetValue(budgetAmount > 0 ? budgetAmount.toFixed(2) : ''); }, [budgetAmount]);
    useEffect(() => { if (isEditingBudget) { budgetInputRef.current?.focus(); budgetInputRef.current?.select(); } }, [isEditingBudget]);

    const handleBudgetSave = () => {
        const amount = budgetValue === '' ? 0 : parseFloat(budgetValue);
        if (!isNaN(amount) && amount >= 0 && amount !== budgetAmount) {
            addOrUpdateBudget({ categoryId: category.id, month: currentMonth, amount });
        }
        setIsEditingBudget(false);
    };

    return (
        <div className="p-4 group">
            <div className="flex items-center gap-4 w-full">
                {/* Názov kategórie */}
                <div className="w-1/3 flex-shrink-0 pl-[2.25rem]">
                    <EditableCategoryName category={category} isEditing={isEditingName} setIsEditing={setIsEditingName} />
                </div>

                {/* Finančná časť */}
                <div className="flex-grow">
                    <div className="grid grid-cols-3 gap-x-2 sm:gap-x-4 text-center w-full">
                        {/* Plán */}
                        <div onClick={() => !isEditingBudget && setIsEditingBudget(true)} className="cursor-pointer">
                            <p className="text-xs opacity-80 truncate">Plán</p>
                            {isEditingBudget ? (
                                <input ref={budgetInputRef} type="number" value={budgetValue} 
                                    onChange={(e) => setBudgetValue(e.target.value)} 
                                    onBlur={handleBudgetSave} 
                                    onKeyDown={(e) => { if(e.key === 'Enter') handleBudgetSave(); if(e.key === 'Escape') setIsEditingBudget(false); }}
                                    onClick={e => e.stopPropagation()}
                                    className="w-full bg-black/10 dark:bg-white/10 text-current rounded-md border-light-primary dark:border-dark-primary border-2 px-1 py-0 text-sm font-medium text-center"
                                />
                            ) : (
                                <span className="text-sm font-medium text-light-onSurface dark:text-dark-onSurface">
                                    {budgetAmount.toLocaleString('sk-SK', {style:'currency',currency:'EUR'})}
                                </span>
                            )}
                        </div>
                        {/* Skutočnosť */}
                        <div>
                            <p className="text-xs opacity-80 truncate">Skutočnosť</p>
                            <span className={`text-sm font-medium ${actualColor}`}>
                                {actualAmount.toLocaleString('sk-SK', {style:'currency',currency:'EUR'})}
                            </span>
                        </div>
                        {/* Rozdiel */}
                        <div>
                            <p className="text-xs opacity-80 truncate">{summaryLabel}</p>
                            <span className={`text-sm font-medium ${differenceColor}`}>
                                {isIncome 
                                    ? difference.toLocaleString('sk-SK', {style:'currency', currency:'EUR', signDisplay: 'always'})
                                    : Math.abs(difference).toLocaleString('sk-SK', {style:'currency', currency:'EUR'})
                                }
                            </span>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-light-surfaceContainerHighest dark:bg-dark-surfaceContainerHighest rounded-full h-1.5 mt-1">
                        <div className={`h-1.5 rounded-full ${getBarColor(ratio, category.type)}`} style={{ width: progressWidth }}></div>
                    </div>
                </div>
                
                {/* Ovládacie prvky */}
                <div className="flex-shrink-0 flex items-center space-x-1">
                    <button ref={triggerRef} onClick={(e) => { e.stopPropagation(); setIsMenuOpen(true); }} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                        <DotsVerticalIcon className="h-5 w-5" />
                    </button>
                    <ActionMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} triggerRef={triggerRef}>
                        <div className="py-2">
                            <button onClick={() => moveCategoryUp(category.id)} disabled={subcategoryIndex === 0} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50">
                                <ChevronUpIcon className="h-5 w-5 mr-3"/> Posunúť vyššie
                            </button>
                            <button onClick={() => moveCategoryDown(category.id)} disabled={subcategoryIndex === siblingsCount - 1} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50">
                                <ChevronDownIcon className="h-5 w-5 mr-3"/> Posunúť nižšie
                            </button>
                            <button onClick={() => setIsEditingName(true)} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5">
                                <PencilIcon className="h-5 w-5 mr-3"/> Premenovať
                            </button>
                             <button 
                                onClick={() => {
                                    setConfirmModalState({
                                        isOpen: true,
                                        message: `Naozaj chcete nastaviť aktuálny plán pre kategóriu "${category.name}" na všetky nasledujúce mesiace do konca roka?`,
                                        onConfirm: () => {
                                            publishBudgetForYear(category.id, currentMonth, false);
                                            setConfirmModalState(prev => ({ ...prev, isOpen: false }));
                                        },
                                        confirmText: 'Nastaviť'
                                    });
                                }}
                                className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5"
                            >
                                <CalendarClockIcon className="h-5 w-5 mr-3"/> Nastaviť do konca roka
                            </button>
                            <div className="my-1 h-px bg-light-outlineVariant dark:bg-dark-outlineVariant" />
                            <button onClick={(e) => onDeleteRequest(e, category)} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-error dark:text-dark-error hover:bg-light-error/10 dark:hover:bg-dark-error/10">
                                <TrashIcon className="h-5 w-5 mr-3"/> Zmazať
                            </button>
                        </div>
                    </ActionMenu>
                    <div className="w-10 h-10"></div>
                </div>
            </div>
        </div>
    );
}

const ConfirmModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
}> = ({ isOpen, onClose, message, onConfirm, confirmText = 'Zmazať' }) => {
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Potvrdenie">
            <div className="space-y-4">
                <p className="text-light-onSurface dark:text-dark-onSurface">{message}</p>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2.5 text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 font-medium">Zrušiť</button>
                    <button type="button" onClick={onConfirm} className={`px-6 py-2.5 rounded-full hover:shadow-lg font-medium transition-shadow ${confirmText === 'Zmazať' || confirmText === 'Rozumiem' ? 'bg-light-error text-light-onError dark:bg-dark-error dark:text-dark-onError' : 'bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary'}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const ReassignAndDeleteModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    category: Category | null; 
    reassignAnddeleteCategory: (categoryIdToDelete: string, targetCategoryId: string) => void;
}> = ({ isOpen, onClose, category, reassignAnddeleteCategory }) => {
    const { categories, transactions } = useAppContext();
    const [targetCategoryId, setTargetCategoryId] = useState('');

    const formInputStyle = "mt-1 block w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 h-14 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0";
    const transactionCount = useMemo(() => category ? transactions.filter(t => t.categoryId === category.id).length : 0, [transactions, category]);
    const potentialTargetCategories = useMemo(() => {
        if (!category) return [];
        // Assuming the `currentMonth` is available in this component's scope,
        // which might require passing it down from `Budgets` component.
        // For now, let's assume we can get it from useAppContext or similar.
        // A simpler approach is to filter by `validFrom` relative to the transaction dates,
        // but for UI consistency let's just filter broadly here.
        return categories.filter(c => 
            c.id !== category.id && 
            c.type === category.type && 
            c.parentId
        ).sort((a,b) => a.name.localeCompare(b.name));
    }, [categories, category]);
    
    useEffect(() => { if (isOpen) { setTargetCategoryId(''); } }, [isOpen]);
    if (!isOpen || !category) return null;

    const getCategoryDisplayName = (cat: Category) => {
        const parent = categories.find(p => p.id === cat.parentId);
        return parent ? `${parent.name} - ${cat.name}` : cat.name;
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetCategoryId) { 
            // This is a safeguard, the button should be disabled.
            // But if it happens, we can show a more integrated error message.
            return; 
        }
        reassignAnddeleteCategory(category.id, targetCategoryId);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Presunúť transakcie a zmazať">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <p className="text-light-onSurface dark:text-dark-onSurface">Kategória <span className="font-bold">"{category.name}"</span> obsahuje <span className="font-bold">{transactionCount}</span> transakcií.</p>
                    <p className="mt-2 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Pre jej zmazanie je potrebné presunúť tieto transakcie do inej kategórie.</p>
                </div>
                <div className="relative pt-2">
                    <label htmlFor="target-category" className="absolute text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant duration-300 transform -translate-y-3 scale-75 top-5 z-10 origin-[0] left-4">Presunúť do:</label>
                    <select id="target-category" value={targetCategoryId} onChange={e => setTargetCategoryId(e.target.value)} className={formInputStyle} required>
                        <option value="" className="dark:bg-dark-surfaceContainerHigh">Vyberte kategóriu</option>
                        {potentialTargetCategories.map(c => (<option key={c.id} value={c.id} className="dark:bg-dark-surfaceContainerHigh">{getCategoryDisplayName(c)}</option>))}
                    </select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2.5 text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 font-medium">Zrušiť</button>
                    <button type="submit" disabled={!targetCategoryId} className="px-6 py-2.5 bg-light-error text-light-onError dark:bg-dark-error dark:text-dark-onError rounded-full hover:shadow-lg font-medium transition-shadow disabled:bg-light-onSurface/20 dark:disabled:bg-dark-onSurface/20 disabled:shadow-none">Presunúť a zmazať</button>
                </div>
            </form>
        </Modal>
    );
};


export default Budgets;

