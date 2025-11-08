import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';

import { useAppContext } from '../context/AppContext';
import type { TransactionType, Category, Budget } from '../types';
import { PlusIcon, ArchiveBoxIcon, XIcon, ChevronDownIcon, ChevronUpIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, PencilIcon, DotsVerticalIcon, CalendarClockIcon, CalendarDaysIcon, ChatBubbleLeftIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, PiggyBankIcon } from '../components/icons';
import Modal from '../components/Modal';
import { roundToTwoDecimals } from '../lib/utils';

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

const NoteTooltip: React.FC<{
    note: string;
    isOpen: boolean;
    triggerRef: React.RefObject<HTMLElement>;
}> = ({ note, isOpen, triggerRef }) => {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        if (isOpen && triggerRef.current && tooltipRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const tooltipHeight = tooltipRef.current.offsetHeight;
            const spaceAbove = rect.top;
            const opensUpward = spaceAbove > tooltipHeight + 10;

            setPositionStyle({
                position: 'fixed',
                top: opensUpward ? `${rect.top - 10}px` : `${rect.bottom + 10}px`,
                left: `${rect.left + rect.width / 2}px`,
                transform: opensUpward ? 'translate(-50%, -100%)' : 'translateX(-50%)',
                zIndex: 100,
            });
        }
    }, [isOpen, triggerRef]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div
            ref={tooltipRef}
            style={positionStyle}
            className="bg-light-surfaceContainerHigh dark:bg-dark-surfaceContainerHigh rounded-lg shadow-xl px-4 py-2 max-w-xs text-sm text-light-onSurface dark:text-dark-onSurface whitespace-pre-wrap"
        >
            {note}
        </div>,
        document.body
    );
};


// --- Re-usable Components ---

// Komponent bol odstránený, pretože bol duplicitný a nepoužívaný.
// Logika pre úpravu rozpočtu je priamo v komponente SubcategoryItem.

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
        allCategories, budgets, transactions, 
        archiveCategory, 
        isLoading, error, 
        publishFullBudgetForYear, getFinancialSummary
    } = useAppContext();
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // State for managing inline forms
    const [addingCategory, setAddingCategory] = useState<{type: TransactionType, parentId: string | null} | null>(null);

    // State for deletion modal
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, message: string, onConfirm: () => void, confirmText?: string }>({ isOpen: false, message: '', onConfirm: () => {}, confirmText: 'Archivovať' });
    const [archiveModalState, setArchiveModalState] = useState<{ isOpen: boolean, category: Category | null }>({ isOpen: false, category: null });
    const [noteModalState, setNoteModalState] = useState<{ isOpen: boolean, budget: Budget | null, categoryId: string | null, month: string | null }>({ isOpen: false, budget: null, categoryId: null, month: null });
    const [savingSettingsModalState, setSavingSettingsModalState] = useState<{ isOpen: boolean, category: Category | null }>({ isOpen: false, category: null });
    
    
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
        const total = transactions
            .filter(t => t.categoryId === categoryId && t.transactionDate && t.transactionDate.startsWith(currentMonth))
            .reduce((sum, t) => sum + t.amount, 0);
        return roundToTwoDecimals(total);
    }, [transactions, currentMonth]);
    
    
    const visibleCategories = useMemo(() => {
        return allCategories.filter(c =>
            c.validFrom <= currentMonth &&
            (c.status === 'active' || (c.status === 'archived' && c.archivedFrom && c.archivedFrom > currentMonth))
        );
    }, [allCategories, currentMonth]);

    const parentCategories = useMemo(() => {
        const income = visibleCategories
            .filter(c => c.type === 'income' && !c.parentId)
            .sort((a, b) => a.order - b.order);
        const expense = visibleCategories
            .filter(c => c.type === 'expense' && !c.parentId)
            .sort((a, b) => a.order - b.order);
        return { income, expense };
    }, [visibleCategories]);

    const handleExpandAll = useCallback(() => {
        const allParentIds = parentCategories.income.map(c => c.id).concat(parentCategories.expense.map(c => c.id));
        setExpandedGroups(new Set(allParentIds));
    }, [parentCategories]);

    const handleCollapseAll = () => {
        setExpandedGroups(new Set());
    };

    
    
    const summary = useMemo(() => {
        // --- VÝPOČET ZÁKLADNÝCH HODNÔT ---
        const incomeCategoryIds = new Set(visibleCategories.filter(c => c.type === 'income').map(c => c.id));
        
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
    }, [budgets, transactions, currentMonth, visibleCategories, getFinancialSummary]);

    const handleArchiveRequest = (e: React.MouseEvent, category: Category) => {
        e.stopPropagation();
        setArchiveModalState({ isOpen: true, category: category });
    };

    const handleConfirmArchive = async (categoryId: string, archiveMonth: string) => {
        setArchiveModalState({ isOpen: false, category: null });
        
        // Skúsi archivovať bez vynútenia, aby sa vykonali validácie
        const result = await archiveCategory(categoryId, archiveMonth, false);

        // 1. Ak archivácia prebehla úspešne hneď (neboli potrebné žiadne potvrdenia)
        if (result.success) {
            return; // Hotovo, notifikácia sa zobrazí z AppContext
        }

        // 2. Ak je potrebné potvrdenie od používateľa (napr. kvôli prepojeným účtom)
        if (result.needsConfirmation) {
            const onConfirm = async () => {
                await archiveCategory(categoryId, archiveMonth, true); // Vynútená archivácia
                setConfirmModalState({ isOpen: false, message: '', onConfirm: () => {} });
            };

            setConfirmModalState({
                isOpen: true,
                message: result.message!, // Použije správu z backendu
                onConfirm: onConfirm,
                confirmText: 'Áno, archivovať'
            });
        }
        
        // 3. Ak nastala iná chyba (napr. nájdené transakcie), notifikácia sa už zobrazila z AppContext a tu nerobíme nič.
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
                            categories={visibleCategories}
                            isDragging={false}
                            currentMonth={currentMonth}
                            getActualAmount={getActualAmount}
                            onArchiveRequest={handleArchiveRequest}
                            onAddSubcategory={() => setAddingCategory({ type, parentId: parent.id })}
                            isAddingSubcategory={addingCategory?.parentId === parent.id}
                            onCancelAddSubcategory={() => setAddingCategory(null)}
                            onSaveSubcategorySuccess={handleSaveSuccess}
                            isExpanded={expandedGroups.has(parent.id)}
                            toggleExpansion={() => toggleGroupExpansion(parent.id)}
                            setConfirmModalState={setConfirmModalState}
                            setNoteModalState={setNoteModalState}
                            setSavingSettingsModalState={setSavingSettingsModalState}
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
        <>
            <div className="sticky top-0 z-30 bg-light-surface dark:bg-dark-surface -mx-4 -mt-4 sm:-mx-6 sm:-mt-6">
                <div className="p-4 sm:p-6">
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
                    <div className="mt-4 bg-light-surfaceContainer dark:bg-dark-surfaceContainer p-3 rounded-2xl border border-light-outlineVariant/50 dark:border-dark-outlineVariant/50">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                            <div className="flex-1 min-w-max">
                                <p className="text-sm font-medium text-light-onSurface dark:text-dark-onSurface">Nástroje pre plánovanie</p>
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
                                    onClick={handleExpandAll}
                                    className="flex items-center gap-2 px-4 py-2 bg-light-surfaceContainer text-light-onSurfaceContainer dark:bg-dark-surfaceContainer dark:text-dark-onSurfaceContainer rounded-full font-medium text-sm hover:shadow-md transition-shadow"
                                >
                                    <ArrowsPointingOutIcon className="h-5 w-5" />
                                    Rozbaliť všetko
                                </button>
                                <button
                                    onClick={handleCollapseAll}
                                    className="flex items-center gap-2 px-4 py-2 bg-light-surfaceContainer text-light-onSurfaceContainer dark:bg-dark-surfaceContainer dark:text-dark-onSurfaceContainer rounded-full font-medium text-sm hover:shadow-md transition-shadow"
                                >
                                    <ArrowsPointingInIcon className="h-5 w-5" />
                                    Zbaliť všetko
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
                </div>
            </div>

            <div className="space-y-6 pt-6">
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

                <ConfirmModal 
                    isOpen={confirmModalState.isOpen} 
                    onClose={() => setConfirmModalState({ ...confirmModalState, isOpen: false })} 
                    message={confirmModalState.message}
                    onConfirm={confirmModalState.onConfirm}
                    confirmText={confirmModalState.confirmText}
                />
                <ArchiveCategoryModal 
                    isOpen={archiveModalState.isOpen}
                    onClose={() => setArchiveModalState({ isOpen: false, category: null })}
                    category={archiveModalState.category}
                    currentMonth={currentMonth}
                    onConfirm={handleConfirmArchive}
                />
                <NoteModal
                    isOpen={noteModalState.isOpen}
                    onClose={() => setNoteModalState({ isOpen: false, budget: null, categoryId: null, month: null })}
                    budget={noteModalState.budget}
                    categoryId={noteModalState.categoryId}
                    month={noteModalState.month}
                />
                <SavingSettingsModal
                    isOpen={savingSettingsModalState.isOpen}
                    onClose={() => setSavingSettingsModalState({ isOpen: false, category: null })}
                    category={savingSettingsModalState.category}
                />
            </div>
        </>
    );
};

interface CategoryGroupProps {
    parent: Category;
    parentIndex: number;
    siblingsCount: number;
    categories: Category[];
    currentMonth: string;
    getActualAmount: (id: string) => number;
    onArchiveRequest: (e: React.MouseEvent, cat: Category) => void;
    onAddSubcategory: () => void;
    isAddingSubcategory: boolean;
    onCancelAddSubcategory: () => void;
    onSaveSubcategorySuccess: (newCategory: Category) => void;
    isExpanded: boolean;
    toggleExpansion: () => void;
    isDragging: boolean;
    setConfirmModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean, message: string, onConfirm: () => void, confirmText?: string }>>;
    setNoteModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean, budget: Budget | null, categoryId: string | null, month: string | null }>>;
    setSavingSettingsModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean, category: Category | null }>>;
}

const CategoryGroup: React.FC<CategoryGroupProps> = ({ 
    parent, parentIndex, siblingsCount, categories, currentMonth, getActualAmount, onArchiveRequest, 
    onAddSubcategory, isAddingSubcategory, onCancelAddSubcategory, onSaveSubcategorySuccess,
    isExpanded, toggleExpansion, isDragging, setConfirmModalState, setNoteModalState, setSavingSettingsModalState
}) => {
    const { budgets, moveCategoryUp, moveCategoryDown, publishBudgetForYear } = useAppContext();
    const [isEditingName, setIsEditingName] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const subcategories = useMemo(() => 
        categories.filter(c => c.parentId === parent.id)
                  .sort((a,b)=>(a.order || 0) - (b.order || 0)), 
    [categories, parent.id]);

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
                                <button onClick={(e) => onArchiveRequest(e, parent)} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-error dark:text-dark-error hover:bg-light-error/10 dark:hover:bg-dark-error/10">
                                    <ArchiveBoxIcon className="h-5 w-5 mr-3"/> Archivovať skupinu
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
                    {subcategories.map((sub, index) => <SubcategoryItem key={sub.id} category={sub} subcategoryIndex={index} siblingsCount={subcategories.length} currentMonth={currentMonth} getActualAmount={getActualAmount} onArchiveRequest={onArchiveRequest} getBarColor={getBarColor} setConfirmModalState={setConfirmModalState} setNoteModalState={setNoteModalState} setSavingSettingsModalState={setSavingSettingsModalState} />)}
                    
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
    onArchiveRequest: (e: React.MouseEvent, cat: Category) => void;
    getBarColor: (ratio: number, type: TransactionType) => string;
    setConfirmModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean, message: string, onConfirm: () => void, confirmText?: string }>>;
    setNoteModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean, budget: Budget | null, categoryId: string | null, month: string | null }>>;
    setSavingSettingsModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean, category: Category | null }>>;
}> = ({ category, subcategoryIndex, siblingsCount, currentMonth, getActualAmount, onArchiveRequest, getBarColor, setConfirmModalState, setNoteModalState, setSavingSettingsModalState }) => {
    const { budgets, addOrUpdateBudget, moveCategoryUp, moveCategoryDown, publishBudgetForYear, deleteBudget } = useAppContext();
    const [isEditingName, setIsEditingName] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);
    const noteIconRef = useRef<HTMLButtonElement>(null);

    // Výpočty
    const budget = useMemo(() => budgets.find(b => b.categoryId === category.id && b.month === currentMonth), [budgets, category.id, currentMonth]);
    const budgetAmount = budget?.amount ?? 0;
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

    const handleBudgetSave = async () => {
        const amount = budgetValue === '' ? 0 : parseFloat(budgetValue);

        if (isNaN(amount) || amount < 0) {
            setIsEditingBudget(false);
            return;
        }

        const noteExists = budget?.note && budget.note.trim() !== '';

        if (amount > 0 || (amount === 0 && noteExists)) {
            if (amount !== budgetAmount) {
                await addOrUpdateBudget({ categoryId: category.id, month: currentMonth, amount: amount, note: budget?.note });
            }
        } 
        else if (amount === 0 && !noteExists && budget) {
            await deleteBudget(budget.id);
        }
        
        setIsEditingBudget(false);
    };

    return (
        <div className="p-4 group">
            <div className="flex items-center gap-4 w-full">
                {/* Názov kategórie */}
                <div className="w-1/3 flex-shrink-0 pl-[2.25rem] flex items-center gap-2">
                    {category.isSaving && <PiggyBankIcon className="h-5 w-5 text-light-tertiary dark:text-dark-tertiary flex-shrink-0" />}
                    <EditableCategoryName category={category} isEditing={isEditingName} setIsEditing={setIsEditingName} />
                    {budget?.note && budget.note.trim() !== '' && (
                        <>
                            <button 
                                ref={noteIconRef}
                                onClick={() => setNoteModalState({ isOpen: true, budget, categoryId: category.id, month: currentMonth })} 
                                onMouseEnter={() => setIsTooltipOpen(true)}
                                onMouseLeave={() => setIsTooltipOpen(false)}
                                className="p-1 rounded-full hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh"
                            >
                                <ChatBubbleLeftIcon className="h-4 w-4 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant" />
                            </button>
                            <NoteTooltip
                                isOpen={isTooltipOpen}
                                note={budget.note}
                                triggerRef={noteIconRef}
                            />
                        </>
                    )}
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
                            <button onClick={() => setNoteModalState({ isOpen: true, budget, categoryId: category.id, month: currentMonth })} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5">
                                <ChatBubbleLeftIcon className="h-5 w-5 mr-3"/> {budget?.note && budget.note.trim() !== '' ? 'Upraviť poznámku' : 'Pridať poznámku'}
                            </button>
                             <button 
                                onClick={() => {
                                    if (category.type === 'expense') {
                                        setSavingSettingsModalState({ isOpen: true, category: category });
                                    }
                                }}
                                className="w-full flex items-center px-4 py-2 text-sm text-left text-light-onSurface dark:text-dark-onSurface hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
                                disabled={category.type !== 'expense'}
                            >
                                <PencilIcon className="h-5 w-5 mr-3"/> Nastavenia sporenia
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
                            <button onClick={(e) => onArchiveRequest(e, category)} className="w-full flex items-center px-4 py-2 text-sm text-left text-light-error dark:text-dark-error hover:bg-light-error/10 dark:hover:bg-dark-error/10">
                                <ArchiveBoxIcon className="h-5 w-5 mr-3"/> Archivovať
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
}> = ({ isOpen, onClose, message, onConfirm, confirmText = 'Archivovať' }) => {
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Potvrdenie">
            <div className="space-y-4">
                <p className="text-light-onSurface dark:text-dark-onSurface">{message}</p>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2.5 text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 font-medium">Zrušiť</button>
                    <button type="button" onClick={onConfirm} className={`px-6 py-2.5 rounded-full hover:shadow-lg font-medium transition-shadow ${confirmText === 'Rozumiem' ? 'bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary' : 'bg-light-error text-light-onError dark:bg-dark-error dark:text-dark-onError'}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};



const ArchiveCategoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    category: Category | null;
    currentMonth: string;
    onConfirm: (categoryId: string, archiveMonth: string) => void;
}> = ({ isOpen, onClose, category, currentMonth, onConfirm }) => {
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const monthInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && category) {
            // The selected month cannot be before the category is valid.
            // If currentMonth is somehow before validFrom, use validFrom as the starting point.
            const initialMonth = (currentMonth >= category.validFrom) ? currentMonth : category.validFrom;
            setSelectedMonth(initialMonth);
        }
    }, [isOpen, currentMonth, category]);

    if (!isOpen || !category) return null;

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedMonth(e.target.value);
    };

    const handleSubmit = () => {
        onConfirm(category.id, selectedMonth);
    };
    
    const openCalendar = () => {
        monthInputRef.current?.showPicker();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Archivovať kategóriu">
            <div className="space-y-4">
                <p className="text-light-onSurface dark:text-dark-onSurface">
                    Vyberte mesiac, od ktorého chcete archivovať kategóriu <strong>{category.name}</strong>.
                </p>
                <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                    Kategória a všetky jej podkategórie budú skryté z rozpočtov od zvoleného mesiaca.
                    Uistite sa, že od tohto mesiaca neexistujú žiadne transakcie ani naplánované rozpočty.
                </p>
                <div>
                    <label htmlFor="archiveMonth" onClick={openCalendar} className="block text-sm font-medium text-light-onSurface dark:text-dark-onSurface mb-1 cursor-pointer">Archivovať od mesiaca</label>
                    <div className="relative" onClick={openCalendar}>
                        <input
                            ref={monthInputRef}
                            type="month"
                            id="archiveMonth"
                            value={selectedMonth}
                            min={category.validFrom}
                            onChange={handleMonthChange}
                            className="w-full bg-light-surfaceContainer dark:bg-dark-surfaceContainer border border-light-outline dark:border-dark-outline rounded-lg px-3 py-2 text-light-onSurface dark:text-dark-onSurface focus:ring-light-primary focus:border-light-primary cursor-pointer"
                        />
                    </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2.5 text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 font-medium">Zrušiť</button>
                    <button type="button" onClick={handleSubmit} className="px-6 py-2.5 rounded-full bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary hover:shadow-lg font-medium transition-shadow">
                        Pokračovať
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default Budgets;


const SavingSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    category: Category | null;
}> = ({ isOpen, onClose, category }) => {
    const { accounts, updateCategory } = useAppContext();
    const [isSaving, setIsSaving] = useState(category?.isSaving || false);
    const [selectedAccount, setSelectedAccount] = useState(category?.savingAccount || '');
    const [error, setError] = useState('');

    useEffect(() => {
        if (category) {
            setIsSaving(category.isSaving || false);
            setSelectedAccount(category.savingAccount || '');
            setError('');
        }
    }, [category]);

    const handleSave = async () => {
        if (!category) return;

        if (isSaving && !selectedAccount) {
            setError('Pre sporiacu kategóriu je povinné vybrať účet.');
            return;
        }

        await updateCategory({
            ...category,
            isSaving: isSaving,
            savingAccount: isSaving ? selectedAccount : null,
        });
        onClose();
    };

    if (!isOpen || !category) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Nastavenia sporenia pre "${category.name}"`}>
            <div className="space-y-6">
                <div className="flex items-start p-4 bg-light-tertiaryContainer/30 dark:bg-dark-tertiaryContainer/30 rounded-lg">
                    <PiggyBankIcon className="h-8 w-8 text-light-tertiary dark:text-dark-tertiary mt-1 mr-4 flex-shrink-0"/>
                    <div>
                        <h4 className="font-semibold text-light-onSurface dark:text-dark-onSurface">Čo je sporiaca kategória?</h4>
                        <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mt-1">
                            Ak je kategória sporiaca, rozdiel medzi plánovaným a skutočným výdavkom sa bude evidovať ako ušetrená suma. Táto suma bude virtuálne viazaná na zvolený účet, aby ste mali lepší prehľad o svojich úsporách.
                        </p>
                    </div>
                </div>

                <div className="relative flex items-start">
                    <div className="flex h-6 items-center">
                        <input
                            id="isSaving"
                            aria-describedby="isSaving-description"
                            name="isSaving"
                            type="checkbox"
                            checked={isSaving}
                            onChange={(e) => setIsSaving(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-light-primary focus:ring-light-primary"
                        />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                        <label htmlFor="isSaving" className="font-medium text-light-onSurface dark:text-dark-onSurface">
                            Aktivovať ako sporiacu kategóriu
                        </label>
                    </div>
                </div>

                {isSaving && (
                    <div>
                        <label htmlFor="savingAccount" className="block text-sm font-medium leading-6 text-light-onSurface dark:text-dark-onSurface">
                            Prepojiť s účtom
                        </label>
                        <select
                            id="savingAccount"
                            name="savingAccount"
                            value={selectedAccount}
                            onChange={(e) => {
                                setSelectedAccount(e.target.value)
                                if(error) setError('');
                            }}
                            className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-light-primary sm:text-sm sm:leading-6"
                        >
                            <option value="">-- Vyberte účet --</option>
                            {accounts.filter(a => a.status === 'active').map(account => (
                                <option key={account.id} value={account.id}>{account.name}</option>
                            ))}
                        </select>
                        {error && <p className="mt-2 text-sm text-light-error dark:text-dark-error">{error}</p>}
                    </div>
                )}
                
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2.5 text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 font-medium">Zrušiť</button>
                    <button type="button" onClick={handleSave} className="px-6 py-2.5 rounded-full bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary hover:shadow-lg font-medium transition-shadow">
                        Uložiť
                    </button>
                </div>
            </div>
        </Modal>
    );
};


const NoteModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    budget: Budget | null;
    categoryId: string | null;
    month: string | null;
}> = ({ isOpen, onClose, budget, categoryId, month }) => {
    const { addOrUpdateBudget } = useAppContext();
    const [note, setNote] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNote(budget?.note || '');
        }
    }, [isOpen, budget]);

    const handleSave = async () => {
        if (!categoryId || !month) return;

        // Ak budget neexistuje a poznámka je prázdna, nerob nič
        if (!budget && !note.trim()) {
            onClose();
            return;
        }

        await addOrUpdateBudget({
            categoryId: categoryId,
            month: month,
            amount: budget?.amount ?? 0,
            note: note.trim()
        });
        onClose();
    };
    
    const handleDelete = async () => {
        if (!categoryId || !month) return;

        await addOrUpdateBudget({
            categoryId: categoryId,
            month: month,
            amount: budget?.amount ?? 0,
            note: '' // Set note to empty string to delete it
        });
        onClose();
    };

    const noteExists = budget?.note && budget.note.trim() !== '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={noteExists ? "Upraviť poznámku" : "Pridať poznámku"}>
            <div className="space-y-4">
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Sem napíšte svoju poznámku..."
                    rows={4}
                    className="w-full bg-light-surfaceContainer dark:bg-dark-surfaceContainer border border-light-outline dark:border-dark-outline rounded-lg px-3 py-2 text-light-onSurface dark:text-dark-onSurface focus:ring-light-primary focus:border-light-primary"
                    autoFocus
                />
                <div className="flex justify-between items-center pt-4">
                    <div>
                        {noteExists && (
                             <button type="button" onClick={handleDelete} className="px-4 py-2.5 text-light-error dark:text-dark-error rounded-full hover:bg-light-error/10 dark:hover:bg-dark-error/10 font-medium text-sm">Zmazať poznámku</button>
                        )}
                    </div>
                    <div className="flex space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2.5 text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 font-medium">Zrušiť</button>
                        <button type="button" onClick={handleSave} className="px-6 py-2.5 rounded-full bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary hover:shadow-lg font-medium transition-shadow">
                            Uložiť
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
