import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import { 
    WalletIcon, 
    BanknotesIcon, 
    CreditCardIcon, 
    CalendarDaysIcon, 
    PresentationChartLineIcon 
} from './icons';

interface PageHeaderProps {
    title: string;
    children?: React.ReactNode; // Ovládacie prvky (pravá časť)
}

const getPageIcon = (path: string) => {
    if (path === '/' || path === '/dashboard') return <PresentationChartLineIcon className="h-6 w-6" />;
    if (path.includes('/accounts')) return <WalletIcon className="h-6 w-6" />;
    if (path.includes('/transactions')) return <CreditCardIcon className="h-6 w-6" />;
    if (path.includes('/budgets')) return <BanknotesIcon className="h-6 w-6" />;
    if (path.includes('/system-events')) return <CalendarDaysIcon className="h-6 w-6" />;
    return <PresentationChartLineIcon className="h-6 w-6" />;
};

// Tento komponent sa použije na stránkach.
// Titulok a ovládacie prvky "pošle" do elementov v hlavnom Headeri.
const PageHeader: React.FC<PageHeaderProps> = ({ title, children }) => {
    const [mounted, setMounted] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    const titleNode = document.getElementById('header-title-portal');
    const actionsNode = document.getElementById('header-actions-portal');
    const icon = getPageIcon(location.pathname);

    return (
        <>
            {/* Teleportujeme nadpis */}
            {titleNode && ReactDOM.createPortal(
                <div className="flex items-center gap-3">
                    <span className="text-light-primary dark:text-dark-primary p-2 bg-light-primary/10 dark:bg-dark-primary/10 rounded-lg">
                        {icon}
                    </span>
                    <h1 className="text-xl md:text-2xl font-semibold text-light-onSurface dark:text-dark-onSurface truncate">
                        {title}
                    </h1>
                </div>,
                titleNode
            )}

            {/* Teleportujeme ovládacie prvky (tlačidlá, filtre...) */}
            {actionsNode && children && ReactDOM.createPortal(
                <div className="flex items-center gap-2 justify-end w-full">
                    {children}
                </div>,
                actionsNode
            )}
        </>
    );
};

export default PageHeader;
