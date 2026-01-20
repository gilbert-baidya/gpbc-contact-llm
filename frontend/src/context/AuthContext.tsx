import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'pastor' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPastor: boolean;
  canSendMessages: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo users - In production, this should be in a backend database
const DEMO_USERS = [
  {
    id: '1',
    name: 'Pastor John',
    email: 'pastor@gpbc.org',
    password: 'pastor123',
    role: 'pastor' as UserRole
  },
  {
    id: '2',
    name: 'Admin Sarah',
    email: 'admin@gpbc.org',
    password: 'admin123',
    role: 'admin' as UserRole
  },
  {
    id: '3',
    name: 'Member Tom',
    email: 'member@gpbc.org',
    password: 'member123',
    role: 'user' as UserRole
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('churchUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('churchUser');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // In production, this would be an API call to your backend
    const foundUser = DEMO_USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (foundUser) {
      const userData: User = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role
      };
      setUser(userData);
      localStorage.setItem('churchUser', JSON.stringify(userData));
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('churchUser');
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isPastor = user?.role === 'pastor';
  const canSendMessages = isAdmin || isPastor;

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated,
        isAdmin,
        isPastor,
        canSendMessages
      }}
    >
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
