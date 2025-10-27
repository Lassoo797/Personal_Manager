import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { NavLink } from 'react-router-dom';
import { MenuIcon, XIcon, ChevronDownIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from './icons';
import ThemeSwitcher from './ThemeSwitcher';
import { useAppContext } from '../context/AppContext';
import Modal from './Modal';
import WorkspaceManager from './WorkspaceManager';
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
        right: `calc(100% - ${rect.right}px)`,
        minWidth: '224px',
        zIndex: 50,
      });
    }
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={positionStyle}
      className="origin-top-right absolute mt-2 rounded-xl shadow-lg bg-light-surfaceContainer dark:bg-dark-surfaceContainer ring-1 ring-black ring-opacity-5 focus:outline-none"
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

const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { logout, user } = useAuth();
  
  const { workspaces, currentWorkspaceId, setCurrentWorkspaceId } = useAppContext();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const appVersion = useMemo(() => {
    const isTest = version.includes('test');
    const versionNumber = version.replace('-test', '');
    return `${isTest ? 'TEST' : ''} v${versionNumber}`;
  }, []);


  const currentWorkspace = useMemo(() => 
    workspaces.find((p: Workspace) => p.id === currentWorkspaceId),
    [workspaces, currentWorkspaceId]
  );
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWorkspaceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);


  const linkClasses = "px-3 py-2 rounded-full text-sm font-medium transition-colors";
  const activeLinkClasses = "bg-light-secondaryContainer text-light-onSecondaryContainer dark:bg-dark-secondaryContainer dark:text-dark-onSecondaryContainer";
  const inactiveLinkClasses = "text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-surfaceContainerHighest dark:hover:bg-dark-surfaceContainerHighest";

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => 
    `${linkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`;

  const navLinks = (
    <>
      <NavLink to="/" className={getNavLinkClass}>Nástenka</NavLink>
      <NavLink to="/transactions" className={getNavLinkClass}>Transakcie</NavLink>
      <NavLink to="/budgets" className={getNavLinkClass}>Rozpočty</NavLink>
      <NavLink to="/accounts" className={getNavLinkClass}>Účty</NavLink>
      <NavLink to="/system-events" className={getNavLinkClass}>Systémové Udalosti</NavLink>
    </>
  );

  return (
    <>
      <header className="bg-light-surface dark:bg-dark-surface sticky top-0 z-30 border-b border-light-outlineVariant dark:border-dark-outlineVariant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setIsWorkspaceDropdownOpen((prev: boolean) => !prev)}
                    className="flex items-center text-light-onSurface dark:text-dark-onSurface text-lg font-medium p-2 rounded-lg hover:bg-light-surfaceContainer dark:hover:bg-dark-surfaceContainer transition-colors"
                  >
                    <span className="font-bold">{currentWorkspace?.name || 'Vyberte priestor'}</span>
                    <ChevronDownIcon className={`h-5 w-5 ml-1 transition-transform ${isWorkspaceDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isWorkspaceDropdownOpen && (
                    <div className="origin-top-left absolute left-0 mt-2 w-56 rounded-xl shadow-lg bg-light-surfaceContainer dark:bg-dark-surfaceContainer ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                      <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        {workspaces.filter((p: Workspace) => p.id !== currentWorkspaceId).map((workspace: Workspace) => (
                          <a
                            key={workspace.id}
                            href="#"
                            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                              e.preventDefault();
                              setCurrentWorkspaceId(workspace.id);
                              setIsWorkspaceDropdownOpen(false);
                            }}
                            className="block px-4 py-2 text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh"
                            role="menuitem"
                          >
                            {workspace.name}
                          </a>
                        ))}
                         <div className="border-t border-light-outlineVariant dark:border-dark-outlineVariant my-1"></div>
                        <a
                          href="#"
                          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.preventDefault();
                            setIsWorkspaceModalOpen(true);
                            setIsWorkspaceDropdownOpen(false);
                          }}
                          className="block px-4 py-2 text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh"
                          role="menuitem"
                        >
                          Spravovať pracovné priestory...
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {currentWorkspaceId && (
                <div className="hidden md:block">
                  <div className="ml-10 flex items-baseline space-x-1">
                    {navLinks}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-green-500">
                {appVersion}
              </span>
              <ThemeSwitcher />
              
              {user && (
                <div className="relative" ref={userMenuRef}>
                   <button onClick={() => setIsUserMenuOpen(prev => !prev)} className="p-2 rounded-full text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh transition-colors">
                      <UserCircleIcon className="h-6 w-6" />
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

              {currentWorkspaceId && (
                <div className="-mr-2 flex md:hidden">
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    type="button"
                    className="inline-flex items-center justify-center p-2 rounded-full text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh focus:outline-none"
                    aria-controls="mobile-menu"
                    aria-expanded="false"
                  >
                    <span className="sr-only">Otvoriť hlavné menu</span>
                    {isMobileMenuOpen ? <XIcon /> : <MenuIcon />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {isMobileMenuOpen && currentWorkspaceId && (
          <div className="md:hidden" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 flex flex-col items-start">
              {navLinks}
            </div>
          </div>
        )}
      </header>
      <Modal isOpen={isWorkspaceModalOpen} onClose={() => setIsWorkspaceModalOpen(false)} title="Správa pracovných priestorov">
          <WorkspaceManager onClose={() => setIsWorkspaceModalOpen(false)} />
      </Modal>
    </>
  );
};

export default Header;