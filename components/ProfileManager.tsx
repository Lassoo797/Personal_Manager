import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PencilIcon, TrashIcon, PlusIcon } from './icons';
import type { BudgetProfile } from '../types';

const ProfileManager: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { budgetProfiles, addBudgetProfile, updateBudgetProfile, deleteBudgetProfile } = useAppContext();
    const [newProfileName, setNewProfileName] = useState('');
    const [editingProfile, setEditingProfile] = useState<BudgetProfile | null>(null);
    const [editingName, setEditingName] = useState('');
    const formInputStyle = "block w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0";

    const handleAddProfile = (e: React.FormEvent) => {
        e.preventDefault();
        if (newProfileName.trim()) {
            addBudgetProfile(newProfileName.trim());
            setNewProfileName('');
        }
    };

    const handleEdit = (profile: BudgetProfile) => {
        setEditingProfile(profile);
        setEditingName(profile.name);
    };

    const handleSaveEdit = () => {
        if (editingProfile && editingName.trim()) {
            updateBudgetProfile(editingProfile.id, editingName.trim());
        }
        setEditingProfile(null);
        setEditingName('');
    };
    
    const handleDelete = (profile: BudgetProfile) => {
        const confirmationMessage = `Naozaj chcete natrvalo zmazať profil "${profile.name}"? Týmto sa zmažú všetky súvisiace účty, transakcie a rozpočty.`;
        if (window.confirm(confirmationMessage)) {
            deleteBudgetProfile(profile.id);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-light-onSurface dark:text-dark-onSurface mb-2">Existujúce profily</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {budgetProfiles.map(profile => (
                        <div key={profile.id} className="flex items-center justify-between bg-light-surfaceContainer dark:bg-dark-surfaceContainer p-3 rounded-lg">
                            {editingProfile?.id === profile.id ? (
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onBlur={handleSaveEdit}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit() }}
                                    className="w-full bg-light-surface dark:bg-dark-surface text-light-onSurface dark:text-dark-onSurface rounded-md border-light-primary dark:border-dark-primary border-2 px-2 py-1 outline-none"
                                    autoFocus
                                />
                            ) : (
                                <span className="text-light-onSurface dark:text-dark-onSurface">{profile.name}</span>
                            )}
                            
                            <div className="flex items-center space-x-1 ml-4">
                                <button aria-label={`Upraviť profil ${profile.name}`} onClick={() => handleEdit(profile)} className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full p-2 hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh"><PencilIcon /></button>
                                {budgetProfiles.length > 1 && (
                                    <button aria-label={`Zmazať profil ${profile.name}`} onClick={() => handleDelete(profile)} className="text-light-error dark:text-dark-error rounded-full p-2 hover:bg-light-errorContainer dark:hover:bg-dark-errorContainer"><TrashIcon /></button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t border-light-outlineVariant dark:border-dark-outlineVariant pt-4">
                 <h3 className="text-lg font-medium text-light-onSurface dark:text-dark-onSurface mb-2">Vytvoriť nový profil</h3>
                <form onSubmit={handleAddProfile} className="flex items-center space-x-2">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            id="new-profile-name"
                            value={newProfileName}
                            onChange={(e) => setNewProfileName(e.target.value)}
                            className={`${formInputStyle} peer h-12 pt-2`}
                            required
                            placeholder=" "
                        />
                         <label htmlFor="new-profile-name" className="absolute text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant duration-300 transform -translate-y-3 scale-75 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3">Názov nového profilu</label>
                    </div>
                    <button type="submit" aria-label="Pridať nový profil" className="flex-shrink-0 p-3 bg-light-primary text-light-onPrimary rounded-full hover:shadow-lg transition-shadow">
                        <PlusIcon className="h-6 w-6" />
                    </button>
                </form>
            </div>
             <div className="flex justify-end pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 font-medium">Zavrieť</button>
            </div>
        </div>
    );
};

export default ProfileManager;