import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { MenuIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from './icons';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Workspace } from '../types';

import { version } from '../../package.json';

const UserMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  onLogout: () => void;
  userName: string;
}> = ({ isOpen, onClose, triggerRef, onLogout, userName }) => {
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
      setPositionStyle({
        position: 'fixed',
        top: `${rect.bottom + 8}px`,
        right: `24px`, // Fixed right margin for safety
        minWidth: '224px',
        zIndex: 60, // Higher than header
      });
    }
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={positionStyle}
      className="absolute mt-2 rounded-xl shadow-lg bg-light-surfaceContainer dark:bg-dark-surfaceContainer ring-1 ring-black ring-opacity-5 focus:outline-none"
    >
      <div className="py-1">
        <div className="px-4 py-3">
          <p className="text-sm text-light-onSurface dark:text-dark-onSurface">Prihlásený ako</p>
          <p className="text-sm font-medium text-light-onSurface dark:text-dark-onSurface truncate">
            {userName}
          </p>
        </div>
        <div className="border-t border-light-outlineVariant dark:border-dark-outlineVariant"></div>
        <button
          onClick={onLogout}
          className="w-full text-left flex items-center px-4 py-2 text-sm text-light-error dark:text-dark-error hover:bg-light-error/10 dark:hover:bg-dark-error/10"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
          Odhlásiť sa
        </button>
      </div>
    </div>,
    document.body
  );
};

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { logout, user } = useAuth();
  
  const { workspaces, currentWorkspaceId } = useAppContext();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const appVersion = useMemo(() => {
    const isTest = version.includes('test');
    const versionNumber = version.replace('-test', '');
    return `${isTest ? 'TEST' : ''} v${versionNumber}`;
  }, []);
  
  return (
    <header className="bg-light-surface dark:bg-dark-surface sticky top-0 z-40 border-b border-light-outlineVariant dark:border-dark-outlineVariant h-16 md:h-20 transition-all">
      <div className="w-full h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        
        {/* Left Section: Mobile Menu & Page Title */}
        <div className="flex items-center gap-3 min-w-[200px] flex-shrink-0">
            <button
                onClick={onMenuClick}
                className="p-2 -ml-2 mr-1 rounded-full text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh focus:outline-none md:hidden"
                aria-label="Open sidebar"
            >
                <MenuIcon />
            </button>
            
            {/* Page Title Portal Target */}
            <div id="header-title-portal" />
        </div>

        {/* Center/Right Section: Page Actions Portal Target */}
        <div id="header-actions-portal" className="flex-1 flex justify-end items-center min-w-0" />

        {/* Far Right Section: User & System Info */}
        <div className="flex items-center gap-3 flex-shrink-0 border-l border-light-outlineVariant dark:border-dark-outlineVariant pl-3 ml-2">
            <span className="text-xs text-green-500 hidden sm:block font-mono">
              {appVersion}
            </span>
            
            {user && (
              <div className="relative" ref={userMenuRef}>
                 <button 
                    onClick={() => setIsUserMenuOpen(prev => !prev)} 
                    className="p-1.5 rounded-full text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh transition-colors"
                    title={user.name || user.email}
                 >
                    <UserCircleIcon className="h-8 w-8" />
                 </button>
                 <UserMenu
                    isOpen={isUserMenuOpen}
                    onClose={() => setIsUserMenuOpen(false)}
                    triggerRef={userMenuRef}
                    onLogout={logout}
                    userName={user.name || user.email}
                 />
              </div>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;