"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type AdminSection =
  | "translations"
  | "articles"
  | "conditions"
  | "info"
  | "contacts"
  | "about";

export const ADMIN_SECTIONS: { key: AdminSection; label: string }[] = [
  { key: "translations", label: "Translations" },
  { key: "articles", label: "Articles" },
  { key: "conditions", label: "Conditions" },
  { key: "info", label: "Info" },
  { key: "contacts", label: "Contacts" },
  { key: "about", label: "About" },
];

interface AdminNavigationContextValue {
  section: AdminSection;
  setSection: (section: AdminSection) => void;
}

const AdminNavigationContext = createContext<AdminNavigationContextValue | null>(null);

export function AdminNavigationProvider({ children }: { children: React.ReactNode }) {
  const [section, setSectionState] = useState<AdminSection>("translations");

  const setSection = useCallback((s: AdminSection) => {
    setSectionState(s);
  }, []);

  return (
    <AdminNavigationContext.Provider value={{ section, setSection }}>
      {children}
    </AdminNavigationContext.Provider>
  );
}

export function useAdminNavigation(): AdminNavigationContextValue {
  const ctx = useContext(AdminNavigationContext);
  if (!ctx) {
    throw new Error("useAdminNavigation must be used within an AdminNavigationProvider");
  }
  return ctx;
}
