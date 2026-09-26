import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api/client';
import type { LoginRequest, LoginResponse, UserDto, UserRole } from '../api/types';

interface AuthState {
  user: UserDto | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  has: (...roles: UserRole[]) => boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

/** Email + password sign-in; the API returns a signed token kept in localStorage (T122). SSO/OIDC is T100. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState<boolean>(!!getToken());

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    window.location.hash = '#/';
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (!getToken()) return;
    api
      .get<UserDto>('/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const res = await api.post<LoginResponse>('/auth/login', credentials);
    setToken(res.token);
    setUser(res.user);
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
