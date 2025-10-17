import React, { useState, useMemo, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { MenuIcon, XIcon, ChevronDownIcon } from './icons';
import ThemeSwitcher from './ThemeSwitcher';
import { useAppContext } from '../context/AppContext';
import Modal from './Modal';
import WorkspaceManager from './WorkspaceManager';
import { useAuth } from '../context/AuthContext';
import { Workspace } from '../types';


const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const { logout, user } = useAuth();
  
  const { workspaces, currentWorkspaceId, setCurrentWorkspaceId } = useAppContext();
  const dropdownRef = useRef<HTMLDivElement>(null);


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
      <NavLink to="/analysis" className={getNavLinkClass}>Analýza</NavLink>
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
            <div className="flex items-center">
              {user && (
                <span className="mr-4 text-sm">
                  Prihlásený: <strong>{user.email}</strong>
                </span>
              )}
              <button
                onClick={logout}
                className="mr-4 px-3 py-2 rounded-full text-sm font-medium transition-colors text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-surfaceContainerHighest dark:hover:bg-dark-surfaceContainerHighest"
              >
                Odhlásiť
              </button>
              <span className="text-xs text-light-onSurfaceVariant/50 dark:text-dark-onSurfaceVariant/50 mr-4">
                v{process.env.APP_VERSION}
              </span>
              <ThemeSwitcher />
              {currentWorkspaceId && (
                <div className="-mr-2 flex md:hidden ml-2">
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