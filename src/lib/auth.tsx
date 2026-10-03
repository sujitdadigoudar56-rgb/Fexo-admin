"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearToken, getToken, request, setToken, UNAUTHORIZED_EVENT } from "./api";
import type { StaffUser } from "./types";

type AuthState = {
  user: StaffUser | null;
  // false until the stored token has been checked against /auth/me/.
  ready: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!getToken()) return;
      try {
        const me = await api.get<StaffUser>("/auth/me/");
        if (!cancelled) setUser(me);
      } catch {
        clearToken();
      }
    };
    check().finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      clearToken();
      setUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const res = await request<{ token: string; user: StaffUser }>("/auth/login/", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    setToken(res.token, remember);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout/");
    } catch {
      // Token may already be invalid — sign out locally regardless.
    }
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
