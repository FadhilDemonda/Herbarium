import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => api.getSession());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    // Listen to 401 UNAUTHORIZED from client.js
    const unsubscribe = api.onUnauthorized(() => {
      setSessionState(null);
      setIsLoginModalOpen(true);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await api.login(username, password);
    setSessionState({
      token: data.token,
      username: data.username,
      expiresAt: data.expiresAt,
    });
    setIsLoginModalOpen(false);

    // Execute pending retry action if any
    if (pendingAction) {
      try {
        await pendingAction();
      } catch (err) {
        console.error('Pending action failed after login:', err);
      } finally {
        setPendingAction(null);
      }
    }
    return data;
  }, [pendingAction]);

  const logout = useCallback(async () => {
    await api.logout();
    setSessionState(null);
  }, []);

  const openLoginModal = useCallback((retryAction = null) => {
    if (retryAction) {
      setPendingAction(() => retryAction);
    }
    setIsLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false);
    setPendingAction(null);
  }, []);

  const value = {
    user: session?.username || null,
    isLoggedIn: !!session?.token,
    login,
    logout,
    isLoginModalOpen,
    openLoginModal,
    closeLoginModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
