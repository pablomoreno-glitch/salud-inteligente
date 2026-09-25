import { createContext, useContext } from "react";
import type { AdminUser } from "../types";

// Kept apart from AdminAuthProvider so Vite fast refresh keeps working.

export interface AdminAuthValue {
  token: string | null;
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
