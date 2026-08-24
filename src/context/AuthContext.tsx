import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, Role } from '../types';
import { ApiClient } from '../services/api';
import { useToast } from './ToastContext';

interface AuthContextType {
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: Role | null;
  apiUrl: string;
  isLiveMode: boolean;
  login: (identifier: string, pass: string, portal?: 'ADMIN' | 'USER') => Promise<boolean>;
  logout: () => Promise<void>;
  setApiUrl: (url: string) => void;
}

const SESSION_STORAGE_KEY = 'vendor_tracker_session_auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiUrl, setApiUrlState] = useState<string>(ApiClient.getApiUrl());
  const { success, error, info } = useToast();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsed: Session = JSON.parse(stored);
        if (parsed.Expiry > Date.now()) {
          setSession(parsed);
        } else {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } else {
        // Default login as SuperAdmin for instant initial preview exploration if desired
        // Or leave null to start at login page
      }
    } catch (e) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (identifier: string, pass: string, portal?: 'ADMIN' | 'USER'): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await ApiClient.login(identifier, pass, portal);
      if (res.success && res.data) {
        setSession(res.data);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(res.data));
        success('Welcome back!', `Logged in as ${res.data.Name} (${res.data.Role})`);
        return true;
      } else {
        error('Authentication Failed', res.message || 'Invalid credentials');
        return false;
      }
    } catch (err: any) {
      error('Login Error', err.message || 'Could not connect to authentication service');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (session) {
      await ApiClient.logout(session);
    }
    setSession(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    info('Logged Out', 'You have been signed out safely.');
  };

  const setApiUrl = (url: string) => {
    ApiClient.setApiUrl(url);
    setApiUrlState(url);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: Boolean(session),
        isLoading,
        role: session?.Role || null,
        apiUrl,
        isLiveMode: ApiClient.isLiveConnected(),
        login,
        logout,
        setApiUrl
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
