"use client";

import { useAdminAuth } from "@/lib/admin/auth-context";

export function AdminDashboard() {
  const { user, logout } = useAdminAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">CMS Dashboard</h1>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-muted-foreground">
                {user.name ?? user.login}
              </span>
            )}
            <button
              onClick={logout}
              className="rounded-md border border-border px-3 py-1 text-sm text-foreground transition-colors hover:bg-muted"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4">
        <p className="text-muted-foreground">
          Welcome, {user?.login ?? "admin"}! Dashboard content coming soon.
        </p>
      </main>
    </div>
  );
}
