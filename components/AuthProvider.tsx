import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    responsible_name?: string;
  };
}

interface AuthContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Mock user for now - can be replaced with Firebase Auth later
    const stored = localStorage.getItem('sesau_user');
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      id: 'default-user',
      email: 'admin@sesau.ro.gov.br',
      user_metadata: {
        full_name: 'Administrador'
      }
    };
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('sesau_user', JSON.stringify(user));
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
