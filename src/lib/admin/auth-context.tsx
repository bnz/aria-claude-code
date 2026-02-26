"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { validateToken, checkRepoAccess } from "@/lib/admin/github";
import type { GitHubUser } from "@/lib/admin/github";

type AuthStatus = "loading" | "unauthenticated" | "authenticated";

interface AdminAuthContextValue {
  token: string | null;
  user: GitHubUser | null;
  status: AuthStatus;
  login: (token: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const SESSION_KEY = "admin_github_token";

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const validateAndSetToken = useCallback(async (t: string): Promise<boolean> => {
    try {
      const githubUser = await validateToken(t);

      const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER;
      const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;
      if (owner && repo) {
        const hasAccess = await checkRepoAccess(t, owner, repo);
        if (!hasAccess) {
          setError("Token does not have access to the repository");
          return false;
        }
      }

      setToken(t);
      setUser(githubUser);
      setStatus("authenticated");
      setError(null);
      return true;
    } catch {
      setError("Invalid token");
      return false;
    }
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      validateAndSetToken(stored).then((valid) => {
        if (!valid) {
          sessionStorage.removeItem(SESSION_KEY);
          setStatus("unauthenticated");
        }
      });
    } else {
      setStatus("unauthenticated");
    }
  }, [validateAndSetToken]);

  const login = useCallback(
    async (t: string) => {
      setStatus("loading");
      setError(null);
      const valid = await validateAndSetToken(t);
      if (valid) {
        sessionStorage.setItem(SESSION_KEY, t);
      } else {
        setStatus("unauthenticated");
      }
    },
    [validateAndSetToken],
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
    setError(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ token, user, status, login, logout, error }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return ctx;
}
