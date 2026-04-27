import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { setAuthHeaders, clearAuthHeaders } from '../api/client';
import type { User } from '../types';

export const SEEDED_USERS: User[] = [
  { id: 'emp-001', name: 'Alice Employee', email: 'alice@examplehr.com', role: 'EMPLOYEE' },
  { id: 'emp-002', name: 'Bob Employee',   email: 'bob@examplehr.com',   role: 'EMPLOYEE' },
  { id: 'emp-003', name: 'Carol Employee', email: 'carol@examplehr.com', role: 'EMPLOYEE' },
  { id: 'emp-004', name: 'Dave Employee',  email: 'dave@examplehr.com',  role: 'EMPLOYEE' },
  { id: 'mgr-001', name: 'Sarah Manager',  email: 'sarah@examplehr.com', role: 'MANAGER'  },
];

export const LOCATIONS = [
  { id: 'loc-nyc', name: 'New York', country: 'US' },
  { id: 'loc-lon', name: 'London',   country: 'UK' },
  { id: 'loc-syd', name: 'Sydney',   country: 'AU' },
] as const;

interface AuthContextValue {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'examplehr_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (currentUser) {
      setAuthHeaders(currentUser.id, currentUser.role);
    }
  }, []);

  const login = useCallback((user: User) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setAuthHeaders(user.id, user.role);
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    clearAuthHeaders();
    setCurrentUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
