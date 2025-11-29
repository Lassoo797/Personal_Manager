import React from 'react';
import { NavLink } from 'react-router-dom';
import { XIcon } from './icons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const linkClasses = "flex items-center px-4 py-2 rounded-lg text-lg font-medium transition-colors";
const activeLinkClasses = "bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary";
const inactiveLinkClasses = "text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-surfaceContainerHighest dark:hover:bg-dark-surfaceContainerHighest";

const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${linkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`;

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      ></div>
      <div
        className={`fixed top-0 left-0 h-full bg-light-surface dark:bg-dark-surface w-64 shadow-lg z-50 transform transition-transform md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex justify-between items-center border-b border-light-outlineVariant dark:border-dark-outlineVariant">
          <h2 className="text-xl font-bold">Menu</h2>
          <button onClick={onClose} className="md:hidden">
            <XIcon />
          </button>
        </div>
        <nav className="p-4 space-y-2">
          <NavLink to="/" className={getNavLinkClass} onClick={onClose}>Nástenka</NavLink>
          <NavLink to="/transactions" className={getNavLinkClass} onClick={onClose}>Transakcie</NavLink>
          <NavLink to="/budgets" className={getNavLinkClass} onClick={onClose}>Rozpočty</NavLink>
          <NavLink to="/accounts" className={getNavLinkClass} onClick={onClose}>Účty</NavLink>
          <NavLink to="/system-events" className={getNavLinkClass} onClick={onClose}>Systémové Udalosti</NavLink>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
