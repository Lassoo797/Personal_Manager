import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { user } = useAuth();

    if (!user) {
        return <>{children}</>;
    }

    return (
        <div className="h-screen bg-light-surface dark:bg-dark-surface text-light-onSurface dark:text-dark-onSurface flex overflow-hidden">
            {/* Sidebar Wrapper */}
            <div className={`fixed md:relative z-40 h-full transition-all duration-300 ease-in-out flex flex-col ${isSidebarCollapsed ? 'md:w-20' : 'md:w-72'} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <Sidebar 
                    isOpen={isSidebarOpen} 
                    onClose={() => setSidebarOpen(false)} 
                    collapsed={isSidebarCollapsed} 
                    onToggleCollapse={() => setSidebarCollapsed(!isSidebarCollapsed)}
                />
            </div>

            {/* Main Content Wrapper */}
            <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300`}>
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
                    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-h-full">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default Layout;
