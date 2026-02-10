import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PencilIcon, TrashIcon, PlusIcon } from './icons';
import type { Workspace } from '../types';
import { ConfirmModal } from './ConfirmModal';


const WorkspaceManager: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { workspaces, addWorkspace, updateWorkspace, deleteWorkspace } = useAppContext();
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
    const [editingName, setEditingName] = useState('');
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, message: string, onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });
    const formInputStyle = "block w-full bg-transparent text-light-onSurface dark:text-dark-onSurface rounded-lg border-2 border-light-outline dark:border-dark-outline focus:border-light-primary dark:focus:border-dark-primary focus:ring-0";

    const handleAddWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newWorkspaceName.trim()) {
            await addWorkspace(newWorkspaceName.trim());
            setNewWorkspaceName('');
            onClose();
        }
    };

    const handleEdit = (workspace: Workspace) => {
        setEditingWorkspace(workspace);
        setEditingName(workspace.name);
    };

    const handleSaveEdit = () => {
        if (editingWorkspace && editingName.trim()) {
            updateWorkspace(editingWorkspace.id, editingName.trim());
        }
        setEditingWorkspace(null);
        setEditingName('');
    };
    
    const handleDeleteRequest = (workspace: Workspace) => {
        setConfirmModalState({
            isOpen: true,
            message: `Ste si absolútne istý? Zmazaním pracovného priestoru "${workspace.name}" sa natrvalo a nenávratne odstránia všetky priradené dáta vrátane účtov, transakcií, rozpočtov a kategórií. Táto akcia sa nedá vrátiť späť.`,
            onConfirm: () => {
                deleteWorkspace(workspace.id);
                setConfirmModalState({ isOpen: false, message: '', onConfirm: () => {} });
            }
        });
    };

    return (
        <>
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium text-light-onSurface dark:text-dark-onSurface mb-2">Existujúce pracovné priestory</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {workspaces.map(workspace => (
                            <div key={workspace.id} className="flex items-center justify-between bg-light-surfaceContainer dark:bg-dark-surfaceContainer p-3 rounded-lg">
                                {editingWorkspace?.id === workspace.id ? (
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
                                    <span className="text-light-onSurface dark:text-dark-onSurface">{workspace.name}</span>
                                )}
                                
                                <div className="flex items-center space-x-1 ml-4">
                                    <button aria-label={`Upraviť pracovný priestor ${workspace.name}`} onClick={() => handleEdit(workspace)} className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full p-2 hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh"><PencilIcon /></button>
                                    {workspaces.length > 1 && (
                                        <button aria-label={`Zmazať pracovný priestor ${workspace.name}`} onClick={() => handleDeleteRequest(workspace)} className="text-light-error dark:text-dark-error rounded-full p-2 hover:bg-light-errorContainer dark:hover:bg-dark-errorContainer"><TrashIcon /></button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-light-outlineVariant dark:border-dark-outlineVariant pt-4">
                    <h3 className="text-lg font-medium text-light-onSurface dark:text-dark-onSurface mb-2">Vytvoriť nový pracovný priestor</h3>
                    <form onSubmit={handleAddWorkspace} className="flex items-center space-x-2">
                        <div className="relative flex-grow">
                            <input
                                type="text"
                                id="new-workspace-name"
                                value={newWorkspaceName}
                                onChange={(e) => setNewWorkspaceName(e.target.value)}
                                className={`${formInputStyle} peer h-12 pt-2`}
                                required
                                placeholder=" "
                            />
                            <label htmlFor="new-workspace-name" className="absolute text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant duration-300 transform -translate-y-3 scale-75 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3">Názov nového pracovného priestoru</label>
                        </div>
                        <button type="submit" aria-label="Pridať nový pracovný priestor" className="flex-shrink-0 p-3 bg-light-primary text-light-onPrimary rounded-full hover:shadow-lg transition-shadow">
                            <PlusIcon className="h-6 w-6" />
                        </button>
                    </form>
                </div>
                <div className="flex justify-end pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 font-medium">Zavrieť</button>
                </div>
            </div>
            <ConfirmModal 
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ ...confirmModalState, isOpen: false })}
                message={confirmModalState.message}
                onConfirm={confirmModalState.onConfirm}
                title="Potvrdenie zmazania pracovného priestoru"
            />
        </>
    );
};

export default WorkspaceManager;