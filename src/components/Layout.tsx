import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const { user } = useAuth();

    if (!user) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-light-surface dark:bg-dark-surface text-light-onSurface dark:text-dark-onSurface">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="md:ml-64">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main>
                    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
