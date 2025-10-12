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
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const AppContent: React.FC = () => {
  const { currentProfileId } = useAppContext();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-light-surface dark:bg-dark-surface text-light-onSurface dark:text-dark-onSurface">
      {user && <Header />}
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            {currentProfileId ? (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/budgets" element={<Budgets />} />
                <Route path="/analysis" element={<Analysis />} />
              </>
            ) : (
              <Route path="/" element={<MasterDashboard />} />
            )}
          </Route>
        </Routes>
      </main>
    </div>
  );
};

export default App;
