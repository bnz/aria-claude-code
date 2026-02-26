"use client";

import { useState } from "react";
import { useAdminAuth } from "@/lib/admin/auth-context";

export function AdminLogin() {
  const { login, error, status } = useAdminAuth();
  const [tokenInput, setTokenInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    await login(tokenInput.trim());
  };

  const isLoading = status === "loading";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with a GitHub Personal Access Token
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-foreground">
              Personal Access Token
            </label>
            <input
              id="token"
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              disabled={isLoading}
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !tokenInput.trim()}
            className="w-full rounded-md bg-accent px-4 py-2 text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Need a token?{" "}
          <a
            href="https://github.com/settings/tokens?type=beta"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline"
          >
            Create a fine-grained PAT
          </a>{" "}
          with repository content access.
        </p>
      </div>
    </div>
  );
}
