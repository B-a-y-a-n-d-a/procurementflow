import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getDemoUserId, setDemoUserId } from '../api/client';
import type { UserDto, UserRole } from '../api/types';

interface AuthState {
  user: UserDto | null;
  loading: boolean;
  login: (userId: string) => Promise<void>;
  logout: () => void;
  has: (...roles: UserRole[]) => boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

/** DEMO persona auth (X-Demo-User header). Production would use OIDC - see tasks T100. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState<boolean>(!!getDemoUserId());

  useEffect(() => {
    if (!getDemoUserId()) return;
    api
      .get<UserDto>('/auth/me')
      .then(setUser)
      .catch(() => setDemoUserId(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (userId: string) => {
    setDemoUserId(userId);
    const me = await api.get<UserDto>('/auth/me');
    setUser(me);
    window.location.hash = '#/';
  }, []);

  const logout = useCallback(() => {
    setDemoUserId(null);
    setUser(null);
    window.location.hash = '#/';
  }, []);

  const has = useCallback((...roles: UserRole[]) => !!user && roles.includes(user.role), [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, has, isStaff: !!user && user.role !== 'PROVIDER' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Non-null user for pages rendered behind the login gate. */
export function useUser(): UserDto {
  const { user } = useAuth();
  if (!user) throw new Error('Not signed in');
  return user;
}
