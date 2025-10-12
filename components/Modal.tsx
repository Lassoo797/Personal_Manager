
import React, { ReactNode } from 'react';
import { XIcon } from './icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-light-surfaceContainerHigh dark:bg-dark-surfaceContainerHigh rounded-2xl shadow-xl w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6">
          <h3 className="text-2xl font-normal text-light-onSurface dark:text-dark-onSurface">{title}</h3>
          <button onClick={onClose} aria-label="Zavrieť modálne okno" className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant rounded-full p-2 hover:bg-light-surfaceContainerHighest dark:hover:bg-dark-surfaceContainerHighest">
            <XIcon />
          </button>
        </div>
        <div className="px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;