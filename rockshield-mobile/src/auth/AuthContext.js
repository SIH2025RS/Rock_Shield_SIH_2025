// @ts-nocheck
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { apiGetAuth } from '@/src/api/client';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        if (!isLoaded || !isSignedIn) {
          if (!cancelled) setUser(null);
          return;
        }

        const jwt = await getToken({ template: 'backend' });
        // Add a cache-busting query param to avoid 304 responses from /api/me
        const me = await apiGetAuth(`/api/me?ts=${Date.now()}`, jwt);

        if (!cancelled && me) {
          setUser({
            id: me.id ?? null,
            role: me.role ?? null,
            name: me.fullName ?? null,
            email: me.email ?? null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setUser(null);
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  const value = {
    user,
    role: user?.role ?? null,
    setAuth: (nextUser) => {
      setUser(nextUser);
    },
    logout: () => {
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
