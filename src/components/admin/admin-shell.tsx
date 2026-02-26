"use client";

import dynamic from "next/dynamic";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { AdminLogin } from "@/components/admin/admin-login";

const AdminDashboard = dynamic(
  () => import("@/components/admin/admin-dashboard").then((m) => m.AdminDashboard),
  { ssr: false },
);

export function AdminShell() {
  const { status } = useAdminAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <AdminLogin />;
  }

  return <AdminDashboard />;
}
