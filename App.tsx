import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Budgets from './pages/Budgets';
import Analysis from './pages/Analysis';
import { useAppContext } from './context/AppContext';
import MasterDashboard from './pages/MasterDashboard';

const App: React.FC = () => {
  const { currentProfileId } = useAppContext();

  return (
    <div className="min-h-screen bg-light-surface dark:bg-dark-surface text-light-onSurface dark:text-dark-onSurface">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {currentProfileId ? (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/analysis" element={<Analysis />} />
          </Routes>
        ) : (
          <MasterDashboard />
        )}
      </main>
    </div>
  );
};

export default App;
