import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, setAuthTokenGetter } from "@workspace/api-client-react";

export type UserRole =
  | "super_admin"
  | "manager"
  | "cashier"
  | "billing"
  | "staff";

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],
  manager: [
    "dashboard",
    "pos",
    "products",
    "inventory",
    "categories",
    "suppliers",
    "purchases",
    "sales",
    "customers",
    "employees",
    "attendance",
    "leaves",
    "payroll",
    "expenses",
    "notifications",
    "ai-insights",
    "ai-assistant",
    "audit-logs",
  ],
  cashier: ["pos", "sales", "customers", "notifications"],
  billing: ["pos", "sales", "customers", "notifications"],
  staff: ["pos"],
};

export function hasPermission(
  role: string | undefined,
  permission: string,
): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role] ?? ["pos"];
  return perms.includes("*") || perms.includes(permission);
}

type AuthContextType = {
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  logout: () => void;
  can: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(
    localStorage.getItem("store_auth_token"),
  );

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("store_auth_token"));
  }, []);

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem("store_auth_token", newToken);
    } else {
      localStorage.removeItem("store_auth_token");
    }
  };

  const {
    data: user,
    isLoading,
    error,
  } = useGetMe({
    query: {
      queryKey: ["/api/auth/me"] as const,
      enabled: !!token,
      retry: false,
    },
  });

  useEffect(() => {
    if (error) setToken(null);
  }, [error]);

  const can = (permission: string) =>
    hasPermission((user as any)?.role, permission);

  const logout = () => setToken(null);

  return (
    <AuthContext.Provider
      value={{
        token,
        setToken,
        isAuthenticated: !!token && !!user,
        isLoading,
        user: user || null,
        logout,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined)
    throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
