import React, { useState, useMemo, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { XIcon, HomeIcon, BanknotesIcon, ChartPieIcon, WalletIcon, ChevronDownIcon, MenuIcon, CreditCardIcon, CalendarDaysIcon } from './icons';
import ThemeSwitcher from './ThemeSwitcher';
import { useAppContext } from '../context/AppContext';
import { Workspace } from '../types';
import Modal from './Modal';
import WorkspaceManager from './WorkspaceManager';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, collapsed = false, onToggleCollapse }) => {
  const linkClasses = `flex items-center rounded-xl font-medium transition-all duration-300 ${collapsed ? 'justify-center p-3' : 'px-4 py-3 text-base'}`;
  const activeLinkClasses = "bg-light-primaryContainer text-light-onPrimaryContainer dark:bg-dark-primaryContainer dark:text-dark-onPrimaryContainer shadow-sm";
  const inactiveLinkClasses = "text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-surfaceContainerHighest dark:hover:bg-dark-surfaceContainerHighest hover:text-light-onSurface dark:hover:text-dark-onSurface";

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${linkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`;

  const { workspaces, currentWorkspaceId, setCurrentWorkspaceId } = useAppContext();
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
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


  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Sidebar Container */}
      <div
        className={`fixed top-0 left-0 h-full bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow shadow-xl z-50 transform transition-all duration-300 ease-in-out border-r border-light-outlineVariant/50 dark:border-dark-outlineVariant/50 flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'w-20' : 'w-72'}
        `}
      >
        {/* Header / Logo Area */}
        <div className={`flex items-center h-16 border-b border-light-outlineVariant/50 dark:border-dark-outlineVariant/50 ${collapsed ? 'justify-center' : 'justify-between px-6'}`}>
          <div 
            onClick={() => window.innerWidth >= 768 && onToggleCollapse?.()}
            className={`cursor-pointer font-bold text-xl text-light-primary dark:text-dark-primary flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}
          >
             <div className="bg-light-primaryContainer dark:bg-dark-primaryContainer p-2 rounded-lg">
                <MenuIcon className="w-6 h-6 text-light-onPrimaryContainer dark:text-dark-onPrimaryContainer" />
             </div>
             <span className="text-light-onSurface dark:text-dark-onSurface">Menu</span>
          </div>
          {/* Logo icon visible when collapsed */}
          <div 
            onClick={() => window.innerWidth >= 768 && onToggleCollapse?.()}
            className={`absolute cursor-pointer transition-all duration-300 ${collapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'}`}
          >
             <div className="bg-light-primaryContainer dark:bg-dark-primaryContainer p-2 rounded-lg">
                <MenuIcon className="w-6 h-6 text-light-onPrimaryContainer dark:text-dark-onPrimaryContainer" />
             </div>
          </div>

          <button onClick={onClose} className="md:hidden p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
            <XIcon />
          </button>
        </div>

        {/* Workspace Selector (Moved from Header) */}
        {!collapsed && (
          <div className="px-4 pt-4 pb-2">
            <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsWorkspaceDropdownOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-light-surfaceContainerHigh dark:bg-dark-surfaceContainerHigh hover:bg-light-surfaceContainerHighest dark:hover:bg-dark-surfaceContainerHighest transition-colors border border-light-outlineVariant/50 dark:border-dark-outlineVariant/50"
                >
                   <div className="flex flex-col items-start overflow-hidden">
                       <span className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant uppercase font-bold tracking-wider">Rozpočet</span>
                       <span className="text-sm font-semibold text-light-onSurface dark:text-dark-onSurface truncate w-full text-left">{currentWorkspace?.name || 'Vyberte...'}</span>
                   </div>
                   <ChevronDownIcon className={`h-5 w-5 ml-2 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant transition-transform ${isWorkspaceDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isWorkspaceDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-lg bg-light-surfaceContainer dark:bg-dark-surfaceContainer ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden">
                      <div className="py-1 max-h-60 overflow-y-auto">
                        {workspaces.map((workspace: Workspace) => (
                          <button
                            key={workspace.id}
                            onClick={() => {
                              setCurrentWorkspaceId(workspace.id);
                              setIsWorkspaceDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh flex items-center justify-between
                                ${workspace.id === currentWorkspaceId 
                                    ? 'text-light-primary dark:text-dark-primary font-medium bg-light-primaryContainer/10 dark:bg-dark-primaryContainer/10' 
                                    : 'text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant'
                                }
                            `}
                          >
                            <span className="truncate">{workspace.name}</span>
                            {workspace.id === currentWorkspaceId && <div className="w-2 h-2 rounded-full bg-light-primary dark:bg-dark-primary"></div>}
                          </button>
                        ))}
                         <div className="border-t border-light-outlineVariant dark:border-dark-outlineVariant my-1"></div>
                        <button
                          onClick={() => {
                            setIsWorkspaceModalOpen(true);
                            setIsWorkspaceDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-light-primary dark:text-dark-primary font-medium hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh"
                        >
                          Spravovať rozpočty...
                        </button>
                      </div>
                    </div>
                  )}
            </div>
          </div>
        )}
        
        {/* Separator if collapsed to keep spacing consistent */}
        {collapsed && <div className="h-4"></div>}

        {/* Navigation Links */}
        <nav className="p-3 space-y-2 flex-1 overflow-y-auto">
          <NavLink to="/" className={getNavLinkClass} onClick={onClose} title={collapsed ? "Nástenka" : ""}>
            <HomeIcon className={`flex-shrink-0 ${collapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3'}`} />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>Nástenka</span>
          </NavLink>
          
          <NavLink to="/transactions" className={getNavLinkClass} onClick={onClose} title={collapsed ? "Transakcie" : ""}>
            <CreditCardIcon className={`flex-shrink-0 ${collapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3'}`} />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>Transakcie</span>
          </NavLink>
          
          <NavLink to="/budgets" className={getNavLinkClass} onClick={onClose} title={collapsed ? "Rozpočty" : ""}>
            <BanknotesIcon className={`flex-shrink-0 ${collapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3'}`} />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>Rozpočty</span>
          </NavLink>
          
          <NavLink to="/accounts" className={getNavLinkClass} onClick={onClose} title={collapsed ? "Účty" : ""}>
            <WalletIcon className={`flex-shrink-0 ${collapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3'}`} />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>Účty</span>
          </NavLink>
          
          <div className="my-4 border-t border-light-outlineVariant/50 dark:border-dark-outlineVariant/50 mx-2"></div>

          <NavLink to="/system-events" className={getNavLinkClass} onClick={onClose} title={collapsed ? "Systémové Udalosti" : ""}>
            <CalendarDaysIcon className={`flex-shrink-0 ${collapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3'}`} />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>Systémové Udalosti</span>
          </NavLink>
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-light-outlineVariant/50 dark:border-dark-outlineVariant/50">
             <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
                <div className={`${collapsed ? 'hidden' : 'block'} text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant`}>
                    Režim
                </div>
                <ThemeSwitcher />
             </div>
        </div>
      </div>
      
      {/* Workspace Management Modal */}
      {isWorkspaceModalOpen && (
        <Modal isOpen={isWorkspaceModalOpen} onClose={() => setIsWorkspaceModalOpen(false)} title="Správa rozpočtov">
            <WorkspaceManager onClose={() => setIsWorkspaceModalOpen(false)} />
        </Modal>
      )}
    </>
  );
};

export default Sidebar;
