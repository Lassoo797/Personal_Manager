
import React, { createContext, useContext, useEffect, useState } from 'react';
import pb from '../lib/pocketbase';
import { RecordModel, RecordAuthResponse } from 'pocketbase';

interface AuthContextType {
  user: RecordModel | null;
  token: string;
  login: (email: string, pass: string) => Promise<RecordAuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<RecordModel | null>(pb.authStore.model);
  const [token, setToken] = useState<string>(pb.authStore.token);

  useEffect(() => {
    // This effect runs once on component mount
    const checkAuth = async () => {
      // Check if the token is valid
      if (pb.authStore.isValid) {
        try {
          // Verify with the server
          await pb.collection('users').authRefresh();
        } catch (_) {
          // If refresh fails, clear the auth store
          pb.authStore.clear();
        }
      }
    };

    checkAuth();

    const unsubscribe = pb.authStore.onChange((token, model) => {
      setToken(token);
      setUser(model);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const authData = await pb.collection('users').authWithPassword(email, pass);
    return authData;
  };

  const logout = () => {
    pb.authStore.clear();
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
