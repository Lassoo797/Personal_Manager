import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Budgets from './pages/Budgets';
import Analysis from './pages/Analysis';
import { useAppContext } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationsContainer from './components/Notifications';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const WelcomeScreen: React.FC = () => {
  // TODO: Add a form to create the first workspace
  return (
    <div className="text-center py-20">
      <h1 className="text-2xl mb-4">Vitajte!</h1>
      <p>Vyzerá to, že zatiaľ nemáte vytvorený žiadny pracovný priestor.</p>
      {/* Neskôr tu bude formulár na vytvorenie workspace */}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { currentWorkspaceId, isLoading, error, workspaces } = useAppContext();
  const { user } = useAuth();

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center py-20">Načítavam dáta...</div>;
    }

    if (error) {
      return <div className="text-center py-20 text-red-500">Chyba: {error.message}</div>;
    }

    // After loading and no errors, check for workspaces
    if (user && workspaces.length === 0) {
        return <WelcomeScreen />;
    }

    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          {currentWorkspaceId ? (
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/analysis" element={<Analysis />} />
            </>
          ) : (
            // If the user is logged in but has no workspace selected (or exists)
            <Route path="/" element={<WelcomeScreen />} />
          )}
        </Route>
      </Routes>
    );
  };

  return (
    <div className="min-h-screen bg-light-surface dark:bg-dark-surface text-light-onSurface dark:text-dark-onSurface">
      {user && <Header />}
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {renderContent()}
      </main>
      <NotificationsContainer />
    </div>
  );
};

export default App;
