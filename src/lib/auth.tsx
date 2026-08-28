import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as authClient from './authClient';
import type { AuthUser, SignupDetails } from './authClient';
import type { UserRole } from '../types';

const STORAGE_KEY = 'legalassist:auth';

interface StoredAuth {
  user: AuthUser;
  token: string;
}

function loadAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  signup: (
    fullName: string,
    email: string,
    password: string,
    role: UserRole,
    details?: SignupDetails
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(loadAuth);

  useEffect(() => {
    if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    else localStorage.removeItem(STORAGE_KEY);
  }, [auth]);

  const signup = async (
    fullName: string,
    email: string,
    password: string,
    role: UserRole,
    details?: SignupDetails
  ) => {
    const result = await authClient.signup(fullName, email, password, role, details);
    setAuth(result);
  };

  const login = async (email: string, password: string) => {
    const result = await authClient.login(email, password);
    setAuth(result);
  };

  const logout = () => {
    if (auth) authClient.logout(auth.token);
    setAuth(null);
  };

  return (
    <AuthContext.Provider
      value={{ user: auth?.user ?? null, token: auth?.token ?? null, signup, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
