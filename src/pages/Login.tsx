
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError('Failed to login. Please check your credentials.');
      console.error(err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-light-background dark:bg-dark-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-light-surface dark:bg-dark-surface rounded-2xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-light-onSurface dark:text-dark-onSurface">
            Welcome Back
          </h1>
          <p className="mt-2 text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
            Sign in to continue to your dashboard
          </p>
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label 
              htmlFor="email" 
              className="text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 text-light-onSurface dark:text-dark-onSurface bg-light-surfaceContainer dark:bg-dark-surfaceContainer border border-light-outlineVariant dark:border-dark-outlineVariant rounded-lg focus:ring-light-primary focus:border-light-primary dark:focus:ring-dark-primary dark:focus:border-dark-primary"
            />
          </div>
          <div>
            <label 
              htmlFor="password" 
              className="text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 text-light-onSurface dark:text-dark-onSurface bg-light-surfaceContainer dark:bg-dark-surfaceContainer border border-light-outlineVariant dark:border-dark-outlineVariant rounded-lg focus:ring-light-primary focus:border-light-primary dark:focus:ring-dark-primary dark:focus:border-dark-primary"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <button 
              type="submit" 
              className="w-full px-4 py-2 font-medium text-light-onPrimary dark:text-dark-onPrimary bg-light-primary rounded-lg hover:bg-light-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-primary dark:bg-dark-primary dark:hover:bg-dark-primary/90 dark:focus:ring-dark-primary"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
