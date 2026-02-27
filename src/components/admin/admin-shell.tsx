"use client";

import dynamic from "next/dynamic";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { AdminLogin } from "@/components/admin/admin-login";

const AdminCmsLayout = dynamic(
  () => import("@/components/admin/admin-cms-layout").then((m) => m.AdminCmsLayout),
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

  return <AdminCmsLayout />;
}
