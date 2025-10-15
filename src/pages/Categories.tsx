import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from '../components/Modal';
import { ConfirmModal } from './Transactions';
import { PlusIcon, PencilIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from '../components/icons';
import type { Category, TransactionType } from '../types';

const CategoryForm: React.FC<{ category?: Category | null, onSave: () => void, onCancel: () => void }> = ({ category, onSave, onCancel }) => {
    const { categories, addCategory, updateCategory } = useAppContext();
    const [name, setName] = useState(category?.name || '');
    const [type, setType] = useState<TransactionType>(category?.type || 'expense');
    const [parentId, setParentId] = useState(category?.parentId || '');
    const [isSubcategory, setIsSubcategory] = useState(!!category?.parentId);
    const formInputStyle = "block w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0 peer";
    const formLabelStyle = "absolute text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant duration-300 transform -translate-y-3 scale-75 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3";


    const parentCategories = useMemo(() => {
        return categories.filter(c => c.type === type && !c.parentId && c.id !== category?.id);
    }, [categories, type, category]);
    
    const hasChildren = useMemo(() => {
        if (!category) return false;
        return categories.some(c => c.parentId === category.id);
    }, [categories, category]);

    useEffect(() => {
        if (!category && parentId) { 
            const parentExists = parentCategories.some(p => p.id === parentId);
            if (!parentExists) {
                setParentId('');
            }
        }
    }, [type, parentCategories, parentId, category]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            alert('Názov kategórie nemôže byť prázdny.');
            return;
        }

        if (isSubcategory && !parentId) {
            alert('Prosím, vyberte nadradenú kategóriu.');
            return;
        }

        const categoryData = {
            name: name.trim(),
            type,
            parentId: isSubcategory ? parentId : null,
        };

        if (category) {
            updateCategory({ ...category, ...categoryData });
        } else {
            addCategory(categoryData);
        }
        onSave();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
             <div>
                <label className="block text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-2">Typ</label>
                 <select 
                    value={type} 
                    onChange={e => setType(e.target.value as TransactionType)} 
                    className={`${formInputStyle} h-14`}
                    disabled={!!category}
                 >
                    <option value="expense">Výdavok</option>
                    <option value="income">Príjem</option>
                </select>
                {!!category && <p className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mt-1 px-2">Typ nie je možné zmeniť pri existujúcej kategórii.</p>}
            </div>
            <div className="relative">
                <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className={`${formInputStyle} h-14`} required placeholder=" " />
                 <label htmlFor="name" className={formLabelStyle}>Názov kategórie</label>
            </div>
             <div className="flex items-center justify-between bg-light-surfaceContainer dark:bg-dark-surfaceContainer p-3 rounded-lg">
                <label htmlFor="is-subcategory" className="text-sm text-light-onSurface dark:text-dark-onSurface">
                    Je to podkategória
                </label>
                <div className="relative inline-flex items-center cursor-pointer">
                     <input 
                        id="is-subcategory" 
                        type="checkbox" 
                        checked={isSubcategory}
                        onChange={e => {
                            setIsSubcategory(e.target.checked);
                            if (!e.target.checked) setParentId('');
                        }}
                        className="sr-only peer"
                        disabled={hasChildren}
                    />
                    <div className="w-11 h-6 bg-light-outline rounded-full peer dark:bg-dark-outline peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-light-primary dark:peer-checked:bg-dark-primary peer-disabled:opacity-50"></div>
                </div>
            </div>
            {hasChildren && <p className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant -mt-4 px-2">Nie je možné zmeniť, pretože kategória má podkategórie.</p>}
            
            {isSubcategory && (
                <div className="relative">
                    <select id="parent" value={parentId} onChange={e => setParentId(e.target.value)} className={`${formInputStyle} h-14`} required={isSubcategory}>
                        <option value="">Vyberte nadradenú kategóriu</option>
                        {parentCategories.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            )}
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2.5 text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 font-medium">Zrušiť</button>
                <button type="submit" className="px-6 py-2.5 bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary rounded-full hover:shadow-lg font-medium transition-shadow">Uložiť</button>
            </div>
        </form>
    );
};

const ReassignAndDeleteModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
}> = ({ isOpen, onClose, category }) => {
    const { categories, transactions, reassignAnddeleteCategory } = useAppContext();
    const [targetCategoryId, setTargetCategoryId] = useState('');
    const formInputStyle = "mt-1 block w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 h-14 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0";

    const transactionCount = useMemo(() =>
        category ? transactions.filter(t => t.categoryId === category.id).length : 0,
    [transactions, category]);

    const potentialTargetCategories = useMemo(() => {
        if (!category) return [];
        return categories.filter(c =>
            c.id !== category.id &&
            c.type === category.type &&
            c.parentId 
        ).sort((a,b) => a.name.localeCompare(b.name));
    }, [categories, category]);
    
    useEffect(() => {
        if (isOpen) {
            setTargetCategoryId('');
        }
    }, [isOpen]);

    if (!isOpen || !category) return null;

    const getCategoryDisplayName = (cat: Category) => {
        const parent = categories.find(p => p.id === cat.parentId);
        return parent ? `${parent.name} - ${cat.name}` : cat.name;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetCategoryId) {
            alert('Vyberte cieľovú kategóriu.');
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
                
                <div>
                    <label htmlFor="target-category" className="block text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Presunúť do:</label>
                    <select id="target-category" value={targetCategoryId} onChange={e => setTargetCategoryId(e.target.value)} className={formInputStyle} required>
                        <option value="">Vyberte kategóriu</option>
                        {potentialTargetCategories.map(c => (
                            <option key={c.id} value={c.id}>
                                {getCategoryDisplayName(c)}
                            </option>
                        ))}
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


const CategoryList: React.FC<{ type: TransactionType, onEdit: (cat: Category) => void, onDelete: (cat: Category) => void }> = ({ type, onEdit, onDelete }) => {
    const { categories, moveCategoryUp, moveCategoryDown } = useAppContext();
    const parentCategories = categories
        .filter(c => c.type === type && !c.parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    return (
        <div className="space-y-3">
            {parentCategories.map((parent, parentIndex) => {
                const subcategories = categories
                    .filter(c => c.parentId === parent.id)
                    .sort((a, b) => (a.order || 0) - (b.order || 0));

                return (
                    <div key={parent.id} className="bg-light-surfaceContainer dark:bg-dark-surfaceContainer p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-light-onSurface dark:text-dark-onSurface">{parent.name}</span>
                            <div className="flex items-center space-x-1">
                                <button aria-label={`Move ${parent.name} up`} onClick={() => moveCategoryUp(parent.id)} disabled={parentIndex === 0} className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full p-2 hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh disabled:opacity-50"><ChevronUpIcon /></button>
                                <button aria-label={`Move ${parent.name} down`} onClick={() => moveCategoryDown(parent.id)} disabled={parentIndex === parentCategories.length - 1} className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full p-2 hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh disabled:opacity-50"><ChevronDownIcon /></button>
                                <button aria-label={`Upraviť kategóriu ${parent.name}`} onClick={() => onEdit(parent)} className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full p-2 hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh"><PencilIcon /></button>
                                <button aria-label={`Zmazať kategóriu ${parent.name}`} onClick={() => onDelete(parent)} className="text-light-error dark:text-dark-error rounded-full p-2 hover:bg-light-errorContainer dark:hover:bg-dark-errorContainer"><TrashIcon /></button>
                            </div>
                        </div>
                        <div className="ml-4 mt-2 space-y-2 border-l-2 border-light-outlineVariant dark:border-dark-outlineVariant pl-4">
                            {subcategories.map((child, childIndex) => (
                                <div key={child.id} className="flex justify-between items-center">
                                    <span className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">{child.name}</span>
                                    <div className="flex items-center space-x-1">
                                        <button aria-label={`Move ${child.name} up`} onClick={() => moveCategoryUp(child.id)} disabled={childIndex === 0} className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full p-2 hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh disabled:opacity-50"><ChevronUpIcon /></button>
                                        <button aria-label={`Move ${child.name} down`} onClick={() => moveCategoryDown(child.id)} disabled={childIndex === subcategories.length - 1} className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full p-2 hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh disabled:opacity-50"><ChevronDownIcon /></button>
                                        <button aria-label={`Upraviť podkategóriu ${child.name}`} onClick={() => onEdit(child)} className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full p-2 hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh"><PencilIcon /></button>
                                        <button aria-label={`Zmazať podkategóriu ${child.name}`} onClick={() => onDelete(child)} className="text-light-error dark:text-dark-error rounded-full p-2 hover:bg-light-errorContainer dark:hover:bg-dark-errorContainer"><TrashIcon /></button>
                                    </div>
                                </div>
                        ))}
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

const Categories: React.FC = () => {
    const { categories, transactions, deleteCategory, deleteCategoryAndChildren } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, message: string, onConfirm: () => void, confirmText?: string }>({ isOpen: false, message: '', onConfirm: () => {}, confirmText: 'Zmazať' });

    const openAddModal = () => {
        setEditingCategory(null);
        setIsModalOpen(true);
    };

    const openEditModal = (category: Category) => {
        setEditingCategory(category);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
    };

    const closeReassignModal = () => {
        setIsReassignModalOpen(false);
        setCategoryToDelete(null);
    };

    const handleDeleteRequest = (category: Category) => {
        const isParent = !category.parentId;
        if (isParent) {
            const subcategories = categories.filter(c => c.parentId === category.id);
            const childIds = subcategories.map(sc => sc.id);
            const hasTransactionsInChildren = transactions.some(t => childIds.includes(t.categoryId));

            if (hasTransactionsInChildren) {
                setConfirmModalState({
                    isOpen: true,
                    message: `Nie je možné zmazať skupinu "${category.name}", pretože jej podkategórie obsahujú transakcie. Najprv presuňte alebo zmažte transakcie.`,
                    onConfirm: () => setConfirmModalState({ isOpen: false, message: '', onConfirm: () => {} }),
                    confirmText: 'Rozumiem'
                });
                return;
            }

            const confirmationMessage = subcategories.length > 0
                ? `Naozaj chcete zmazať skupinu "${category.name}" a všetky jej podkategórie?`
                : `Naozaj chcete zmazať prázdnu skupinu "${category.name}"?`;
            
            setConfirmModalState({
                isOpen: true,
                message: confirmationMessage,
                onConfirm: () => {
                    deleteCategoryAndChildren(category.id);
                    setConfirmModalState({ isOpen: false, message: '', onConfirm: () => {} });
                },
                confirmText: 'Zmazať'
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
                        setConfirmModalState({ isOpen: false, message: '', onConfirm: () => {} });
                    },
                    confirmText: 'Zmazať'
                });
            }
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-normal text-light-onSurface dark:text-dark-onSurface">Kategórie</h1>
                <button onClick={openAddModal} className="flex items-center px-6 py-3 bg-light-tertiaryContainer text-light-onTertiaryContainer dark:bg-dark-tertiaryContainer dark:text-dark-onTertiaryContainer rounded-2xl hover:shadow-md font-medium transition-shadow">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Pridať kategóriu
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
                    <h2 className="text-2xl font-medium mb-4 text-light-error dark:text-dark-error">Výdavky</h2>
                    <CategoryList type="expense" onEdit={openEditModal} onDelete={handleDeleteRequest} />
                </div>
                <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
                    <h2 className="text-2xl font-medium mb-4 text-green-600 dark:text-green-400">Príjmy</h2>
                    <CategoryList type="income" onEdit={openEditModal} onDelete={handleDeleteRequest} />
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCategory ? "Upraviť kategóriu" : "Pridať kategóriu"}>
                <CategoryForm category={editingCategory} onSave={closeModal} onCancel={closeModal} />
            </Modal>

            <ReassignAndDeleteModal 
                isOpen={isReassignModalOpen} 
                onClose={closeReassignModal} 
                category={categoryToDelete} 
            />
            <ConfirmModal 
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ isOpen: false, message: '', onConfirm: () => {} })}
                message={confirmModalState.message}
                onConfirm={confirmModalState.onConfirm}
                confirmText={confirmModalState.confirmText}
            />
        </div>
    );
};

export default Categories;