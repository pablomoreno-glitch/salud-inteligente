import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, getAdminToken, setAdminToken } from "../lib/api";
import type { AdminUser } from "../types";
import { AdminAuthContext, type AdminAuthValue } from "./auth";

interface LoginResponse {
  token: string;
  user: AdminUser;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAdminToken());
  const [user, setUser] = useState<AdminUser | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<LoginResponse>("/admin/login", {
      email,
      password,
    });
    setAdminToken(response.token);
    setToken(response.token);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    api.post("/admin/logout", undefined, true).catch(() => undefined);
    setAdminToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AdminAuthValue>(
    () => ({ token, user, isAuthenticated: Boolean(token), login, logout }),
    [token, user, login, logout],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}
