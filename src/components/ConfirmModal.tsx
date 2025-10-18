import React from 'react';
import Modal from './Modal';

export const ConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  message: string;
  onConfirm: () => void;
  title?: string;
  confirmButtonText?: string;
}> = ({ 
  isOpen, 
  onClose, 
  message, 
  onConfirm, 
  title = "Potvrdenie",
  confirmButtonText = "Zmazať"
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p>{message}</p>
        <div className="flex justify-end space-x-2 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-light-primary dark:text-dark-primary rounded-full hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 font-medium">Zrušiť</button>
          <button type="button" onClick={onConfirm} className="px-6 py-2.5 bg-light-error text-light-onError dark:bg-dark-error dark:text-dark-onError rounded-full hover:shadow-lg font-medium transition-shadow">{confirmButtonText}</button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
