import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';

import { useAppContext } from '../context/AppContext';
import type { TransactionType, Category } from '../types';
import { PlusIcon, TrashIcon, XIcon, ChevronDownIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, MenuIcon } from '../components/icons';
import Modal from '../components/Modal';

const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('sk-SK', { month: 'long', year: 'numeric' });
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

const EditableCategoryName: React.FC<{ category: Category }> = ({ category }) => {
    const { updateCategory } = useAppContext();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(category.name);
    const inputRef = useRef<HTMLInputElement>(null);
    const isParent = !category.parentId;

    useEffect(() => { if (isEditing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [isEditing]);

    const handleSave = () => {
        if (name.trim() && name.trim() !== category.name) {
            updateCategory({ ...category, name: name.trim() });
        }
        setIsEditing(false);
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent toggling expansion when editing name
        setIsEditing(true);
    };

    if (isEditing) {
        return (
            <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleSave} onKeyDown={(e) => { if(e.key === 'Enter') handleSave(); if(e.key === 'Escape') setIsEditing(false); }} onClick={e => e.stopPropagation()}
                className={`w-full bg-black/5 dark:bg-white/5 text-current rounded-md border-light-primary dark:border-dark-primary border-2 px-2 py-1 outline-none ${isParent ? 'text-lg font-semibold' : 'text-base font-medium'}`} />
        );
    }
    return (
        <span onClick={handleClick} className={`cursor-pointer hover:underline truncate ${isParent ? 'font-semibold text-lg' : 'font-medium text-base'}`}>
            {category.name}
        </span>
    );
}

const InlineCategoryForm: React.FC<{ 
    type: TransactionType, 
    parentId: string | null, 
    onCancel: () => void,
    onSaveSuccess: (newCategory: Category) => void 
}> = ({ type, parentId, onCancel, onSaveSuccess }) => {
    const { addCategory } = useAppContext();
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && !isSaving) {
            setIsSaving(true);
            const newCategory = await addCategory({ name: name.trim(), type, parentId });
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
        updateCategoryOrder, isLoading, error 
    } = useAppContext();
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // State for managing inline forms
    const [addingCategory, setAddingCategory] = useState<{type: TransactionType, parentId: string | null} | null>(null);

    // State for deletion modal
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

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
        return transactions.filter(t => t.categoryId === categoryId && t.date.startsWith(currentMonth)).reduce((sum, t) => sum + t.amount, 0);
    }, [transactions, currentMonth]);
    
    const parentCategories = useMemo(() => ({
        income: categories.filter(c => c.type === 'income' && !c.parentId).sort((a, b) => a.order - b.order),
        expense: categories.filter(c => c.type === 'expense' && !c.parentId).sort((a, b) => a.order - b.order),
    }), [categories]);

    
    
    const summary = useMemo(() => {
        const incomeCategoryIds = new Set(categories.filter(c => c.type === 'income').map(c => c.id));
        let plannedIncome = 0, actualIncome = 0, plannedExpense = 0, actualExpense = 0;
        budgets.forEach(b => {
            if (b.month === currentMonth) {
                if (incomeCategoryIds.has(b.categoryId)) plannedIncome += b.amount; else plannedExpense += b.amount;
            }
        });
        transactions.forEach(t => {
            if (t.date.startsWith(currentMonth)) {
                if (t.type === 'income') actualIncome += t.amount; else actualExpense += t.amount;
            }
        });
        return { plannedIncome, actualIncome, plannedExpense, actualExpense, plannedBalance: plannedIncome - plannedExpense, actualBalance: actualIncome - actualExpense };
    }, [budgets, transactions, currentMonth, categories]);

    const handleDeleteRequest = (e: React.MouseEvent, category: Category) => {
        e.stopPropagation();
        const isParent = !category.parentId;

        if (isParent) {
            const subcategories = categories.filter(c => c.parentId === category.id);
            const childIds = subcategories.map(sc => sc.id);
            const hasTransactionsInChildren = transactions.some(t => childIds.includes(t.categoryId));

            if (hasTransactionsInChildren) {
                alert(`Nie je možné zmazať skupinu "${category.name}", pretože jej podkategórie obsahujú transakcie. Najprv presuňte alebo zmažte transakcie z podkategórií.`);
                return;
            }
            
            const confirmationMessage = subcategories.length > 0
                ? `Naozaj chcete zmazať skupinu "${category.name}" a všetky jej podkategórie (${subcategories.map(s => s.name).join(', ')})?`
                : `Naozaj chcete zmazať prázdnu skupinu "${category.name}"?`;

            if (window.confirm(confirmationMessage)) {
                deleteCategoryAndChildren(category.id);
            }
        } else { // It's a subcategory
            const hasTransactions = transactions.some(t => t.categoryId === category.id);
            if (hasTransactions) {
                setCategoryToDelete(category);
                setIsReassignModalOpen(true);
            } else {
                if (window.confirm(`Naozaj chcete zmazať kategóriu "${category.name}"?`)) {
                    deleteCategory(category.id);
                }
            }
        }
    };


    const renderCategorySection = (type: TransactionType) => (
        <div className="space-y-4">
            {parentCategories[type].map((parent) => (
                <div key={parent.id}>
                    <CategoryGroup
                        parent={parent}
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

                <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-2xl border border-light-outlineVariant dark:border-dark-outlineVariant">
                    <h2 className="text-xl font-medium mb-4 text-light-onSurface dark:text-dark-onSurface">Súhrn za mesiac</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-center">
                        {/* Summary content... */}
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
            </div>
        
    );
};

interface CategoryGroupProps {
    parent: Category;
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
}

const CategoryGroup: React.FC<CategoryGroupProps> = ({ 
    parent, currentMonth, getActualAmount, onDeleteRequest, 
    onAddSubcategory, isAddingSubcategory, onCancelAddSubcategory, onSaveSubcategorySuccess,
    isExpanded, toggleExpansion, isDragging 
}) => {
    const { categories, budgets } = useAppContext();
    const subcategories = useMemo(() => categories.filter(c => c.parentId === parent.id).sort((a,b)=>a.name.localeCompare(b.name)), [categories, parent.id]);

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

    if (isIncome) {
        summaryLabel = isPositive ? 'Plán prekročený' : 'Chýba do plánu';
        summaryColor = isPositive ? 'text-green-600 dark:text-green-400' : 'text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant';
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
            <div className={`p-4 flex justify-between items-center ${headerBgClass} ${headerTextClass}`}>
                
                <div className="w-10 h-10 flex-shrink-0" />

                <div onClick={toggleExpansion} className="flex items-center space-x-3 flex-grow min-w-0 mx-2 cursor-pointer">
                    {isIncome ? <ArrowUpCircleIcon className="h-6 w-6 flex-shrink-0" /> : <ArrowDownCircleIcon className="h-6 w-6 flex-shrink-0" />}
                    <EditableCategoryName category={parent} />
                </div>

                <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                    <button onClick={toggleExpansion} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                        <ChevronDownIcon className={`h-6 w-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRequest(e, parent);
                        }} 
                        className="text-light-error dark:text-dark-error rounded-full p-2 hover:bg-black/10 dark:hover:bg-white/10"
                    >
                        <TrashIcon className="h-5 w-5"/>
                    </button>
                </div>
            </div>
            
            {/* Summary and Progress Bar */}
            {subcategories.length > 0 && (
                <div className="p-4 border-b border-light-outlineVariant dark:border-dark-outlineVariant">
                     <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Plán</p>
                            <span className="font-bold text-base text-light-onSurface dark:text-dark-onSurface">{parentTotalBudget.toLocaleString('sk-SK', {style:'currency',currency:'EUR'})}</span>
                        </div>
                        <div>
                            <p className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Skutočnosť</p>
                            <span className="font-bold text-base text-light-onSurface dark:text-dark-onSurface">{parentTotalActual.toLocaleString('sk-SK', {style:'currency',currency:'EUR'})}</span>
                        </div>
                        <div>
                            <p className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">{summaryLabel}</p>
                            <span className={`font-bold text-base ${summaryColor}`}>
                                {Math.abs(difference).toLocaleString('sk-SK', {style:'currency',currency:'EUR'})}
                            </span>
                        </div>
                    </div>
                    <div className="w-full bg-light-surfaceContainerLowest dark:bg-dark-surfaceContainerLowest rounded-full h-2.5 mt-2">
                        <div className={`h-2.5 rounded-full ${getBarColor(ratio, parent.type)}`} style={{ width: progressWidth }}></div>
                    </div>
                </div>
            )}
            
            {isExpanded && (
                <div className="space-y-2 p-2 transition-all duration-300 ease-in-out">
                    {subcategories.map(sub => <SubcategoryItem key={sub.id} category={sub} currentMonth={currentMonth} getActualAmount={getActualAmount} onDeleteRequest={onDeleteRequest} getBarColor={getBarColor} />)}
                    {isAddingSubcategory ? (
                        <InlineCategoryForm 
                            type={parent.type} 
                            parentId={parent.id} 
                            onCancel={onCancelAddSubcategory}
                            onSaveSuccess={onSaveSubcategorySuccess}
                        />
                    ) : (
                        <button onClick={onAddSubcategory} className="w-full flex items-center justify-center px-4 py-2 text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-lg hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh">
                            <PlusIcon className="h-4 w-4 mr-2"/> Pridať podkategóriu
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const SubcategoryItem: React.FC<{
    category: Category;
    currentMonth: string;
    getActualAmount: (id: string) => number;
    onDeleteRequest: (e: React.MouseEvent, cat: Category) => void;
    getBarColor: (ratio: number, type: TransactionType) => string;
}> = ({ category, currentMonth, getActualAmount, onDeleteRequest, getBarColor }) => {
    const { budgets } = useAppContext();
    const budgetAmount = budgets.find(b => b.categoryId === category.id && b.month === currentMonth)?.amount ?? 0;
    const actualAmount = getActualAmount(category.id);
    const ratio = budgetAmount > 0 ? actualAmount / budgetAmount : (actualAmount > 0 ? 1 : 0);
    const progressWidth = `${Math.min(ratio * 100, 100)}%`;

    const isIncome = category.type === 'income';
    let statusText = '';
    let statusColor = 'text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant';

    if (budgetAmount > 0) {
        const difference = actualAmount - budgetAmount;
        if (isIncome) {
            if (difference >= 0) {
                statusText = `Plán splnený o ${difference.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}`;
                statusColor = 'text-green-600 dark:text-green-400';
            } else {
                statusText = `Chýba ${Math.abs(difference).toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}`;
            }
        } else { // Expense
            const expenseDifference = budgetAmount - actualAmount;
            if (expenseDifference >= 0) {
                statusText = `Zostáva ${expenseDifference.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}`;
                statusColor = 'text-green-600 dark:text-green-400';
            } else {
                statusText = `Prekročené o ${Math.abs(expenseDifference).toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}`;
                statusColor = 'text-light-error dark:text-dark-error';
            }
        }
    } else if (actualAmount > 0) {
        statusText = isIncome ? `Nenaplánovaný príjem` : 'Nebol stanovený rozpočet';
        statusColor = isIncome ? 'text-green-600 dark:text-green-400' : 'text-yellow-500 dark:text-yellow-400';
    }

    return (
        <div className="p-2 rounded-lg hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh group">
            <div className="flex justify-between items-center">
                <div className="flex-grow truncate pr-2">
                    <EditableCategoryName category={category}/>
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={(e) => onDeleteRequest(e, category)} className="text-light-error dark:text-dark-error rounded-full p-1.5 hover:bg-light-errorContainer dark:hover:bg-dark-errorContainer"><TrashIcon className="h-4 w-4"/></button>
                </div>
            </div>
            <div className="mt-2">
                <div className="flex justify-between items-end gap-2">
                    <EditableBudgetValue categoryId={category.id} currentMonth={currentMonth} />
                    <div className="text-right flex-shrink-0">
                        <p className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-0.5">Skutočnosť</p>
                        <span className="text-base font-bold text-light-onSurface dark:text-dark-onSurface">{actualAmount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                </div>
                <div className="w-full bg-light-surfaceContainerHighest dark:bg-dark-surfaceContainerHighest rounded-full h-1.5 mt-1.5">
                    <div className={`h-1.5 rounded-full ${getBarColor(ratio, category.type)}`} style={{ width: progressWidth }}></div>
                </div>
                {statusText && (
                    <p className={`text-xs text-right mt-1 ${statusColor}`}>{statusText}</p>
                )}
            </div>
        </div>
    );
}

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
        return categories.filter(c => c.id !== category.id && c.type === category.type && c.parentId).sort((a,b) => a.name.localeCompare(b.name));
    }, [categories, category]);
    
    useEffect(() => { if (isOpen) { setTargetCategoryId(''); } }, [isOpen]);
    if (!isOpen || !category) return null;

    const getCategoryDisplayName = (cat: Category) => {
        const parent = categories.find(p => p.id === cat.parentId);
        return parent ? `${parent.name} - ${cat.name}` : cat.name;
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetCategoryId) { alert('Vyberte cieľovú kategóriu.'); return; }
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
                <div>
                    <label htmlFor="target-category" className="block text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Presunúť do:</label>
                    <select id="target-category" value={targetCategoryId} onChange={e => setTargetCategoryId(e.target.value)} className={formInputStyle} required>
                        <option value="">Vyberte kategóriu</option>
                        {potentialTargetCategories.map(c => (<option key={c.id} value={c.id}>{getCategoryDisplayName(c)}</option>))}
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