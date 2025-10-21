import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { PlusIcon, PencilIcon, ArchiveBoxIcon, ChevronUpIcon, ChevronDownIcon } from '../components/icons';
import type { Category, TransactionType } from '../types';

const ArchiveCategoryModal: React.FC<{
    category: Category | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (categoryId: string, archiveMonth: string) => void;
}> = ({ category, isOpen, onClose, onConfirm }) => {
    const [archiveMonth, setArchiveMonth] = useState(new Date().toISOString().slice(0, 7));

    useEffect(() => {
        // Reset month when modal opens for a new category
        if (isOpen) {
            setArchiveMonth(new Date().toISOString().slice(0, 7));
        }
    }, [isOpen]);

    if (!isOpen || !category) return null;

    const handleSubmit = () => {
        onConfirm(category.id, archiveMonth);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Archivovať kategóriu "${category.name}"`}>
            <div className="space-y-4">
                <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                    Vyberte mesiac, od ktorého bude kategória archivovaná. Kategóriu nie je možné archivovať, ak v danom alebo budúcom mesiaci existujú transakcie alebo rozpočty.
                </p>
                <div>
                    <label htmlFor="archiveMonth" className="block text-xs font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-1">Archivovať od mesiaca</label>
                    <input
                        type="month"
                        id="archiveMonth"
                        value={archiveMonth}
                        onChange={(e) => setArchiveMonth(e.target.value)}
                        className="w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0 px-3 py-2"
                    />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2.5 text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 font-medium">Zrušiť</button>
                    <button onClick={handleSubmit} className="px-6 py-2.5 bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary rounded-full hover:shadow-lg font-medium transition-shadow">Potvrdiť archiváciu</button>
                </div>
            </div>
        </Modal>
    );
};

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
                                <button aria-label={`Archivovať kategóriu ${parent.name}`} onClick={() => onDelete(parent)} className="text-light-error dark:text-dark-error rounded-full p-2 hover:bg-light-errorContainer dark:hover:bg-dark-errorContainer"><ArchiveBoxIcon /></button>
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
                                        <button aria-label={`Archivovať podkategóriu ${child.name}`} onClick={() => onDelete(child)} className="text-light-error dark:text-dark-error rounded-full p-2 hover:bg-light-errorContainer dark:hover:bg-dark-errorContainer"><ArchiveBoxIcon /></button>
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
    const { archiveCategory } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [archiveModalState, setArchiveModalState] = useState<{ isOpen: boolean, category: Category | null }>({ isOpen: false, category: null });
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, message: string, onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });

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

    const handleArchiveRequest = (category: Category) => {
        setArchiveModalState({ isOpen: true, category: category });
    };

    const handleConfirmArchive = async (categoryId: string, archiveMonth: string) => {
        const result = await archiveCategory(categoryId, archiveMonth, false);
        
        if (result.needsConfirmation && result.message) {
            setArchiveModalState({ isOpen: false, category: null });
            setConfirmModalState({
                isOpen: true,
                message: result.message,
                onConfirm: () => {
                    archiveCategory(categoryId, archiveMonth, true);
                    setConfirmModalState({ isOpen: false, message: '', onConfirm: () => {} });
                }
            });
        } else if (result.success) {
            setArchiveModalState({ isOpen: false, category: null });
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
                    <CategoryList type="expense" onEdit={openEditModal} onDelete={handleArchiveRequest} />
                </div>
                <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
                    <h2 className="text-2xl font-medium mb-4 text-green-600 dark:text-green-400">Príjmy</h2>
                    <CategoryList type="income" onEdit={openEditModal} onDelete={handleArchiveRequest} />
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCategory ? "Upraviť kategóriu" : "Pridať kategóriu"}>
                <CategoryForm category={editingCategory} onSave={closeModal} onCancel={closeModal} />
            </Modal>
            
            <ArchiveCategoryModal 
                isOpen={archiveModalState.isOpen}
                onClose={() => setArchiveModalState({ isOpen: false, category: null })}
                category={archiveModalState.category}
                onConfirm={handleConfirmArchive}
            />

            <ConfirmModal 
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ isOpen: false, message: '', onConfirm: () => {} })}
                message={confirmModalState.message}
                onConfirm={confirmModalState.onConfirm}
                confirmButtonText="Áno, archivovať"
            />
        </div>
    );
};

export default Categories;