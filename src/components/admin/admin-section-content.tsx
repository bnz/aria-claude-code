"use client";

import { useAdminNavigation, type AdminSection } from "@/lib/admin/navigation-context";
import { AdminCard } from "@/components/admin/ui";
import { TranslationsEditor } from "@/components/admin/translations-editor";
import { ContactsEditor } from "@/components/admin/contacts-editor";
import { InfoEditor } from "@/components/admin/info-editor";

const SECTION_TITLES: Record<AdminSection, string> = {
  translations: "Translations",
  articles: "Articles",
  conditions: "Conditions",
  info: "Info Sections",
  contacts: "Contacts",
  about: "About / Specialist",
};

export function AdminSectionContent() {
  const { section } = useAdminNavigation();

  if (section === "translations") {
    return <TranslationsEditor />;
  }

  if (section === "contacts") {
    return <ContactsEditor />;
  }

  if (section === "info") {
    return <InfoEditor />;
  }

  return (
    <AdminCard title={SECTION_TITLES[section]}>
      <p className="text-muted-foreground">
        Editor for &quot;{section}&quot; will be implemented in a future prompt.
      </p>
    </AdminCard>
  );
}
