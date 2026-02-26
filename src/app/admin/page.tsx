"use client";

import dynamic from "next/dynamic";

const AdminShell = dynamic(
  () => import("@/components/admin/admin-shell").then((m) => m.AdminShell),
  { ssr: false },
);

export default function AdminPage() {
  return <AdminShell />;
}
