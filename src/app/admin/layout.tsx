"use client";

import "../globals.css";
import { AdminAuthProvider } from "@/lib/admin/auth-context";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </body>
    </html>
  );
}
