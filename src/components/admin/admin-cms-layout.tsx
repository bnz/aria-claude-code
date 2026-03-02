"use client";

import { useState } from "react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import {
  AdminNavigationProvider,
  useAdminNavigation,
  ADMIN_SECTIONS,
  type AdminSection,
} from "@/lib/admin/navigation-context";
import { AdminSectionContent } from "@/components/admin/admin-section-content";
import { PublishButton, PublishPanel } from "@/components/admin/publish-panel";

function Sidebar({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const { section, setSection } = useAdminNavigation();
  const { user, logout } = useAdminAuth();

  const handleSelect = (key: AdminSection) => {
    setSection(key);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col" data-testid="admin-sidebar">
      <div className="border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold text-foreground">CMS</h1>
      </div>

      <nav className="flex-1 space-y-1 p-2" aria-label="CMS sections">
        {ADMIN_SECTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
              section === key
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            aria-current={section === key ? "page" : undefined}
            data-section={key}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="border-t border-border p-3 space-y-2">
        <div className="text-xs text-muted-foreground">Deploy: idle</div>
        {user && (
          <div className="text-xs text-muted-foreground truncate">
            {user.name ?? user.login}
          </div>
        )}
        <button
          onClick={logout}
          className="w-full rounded-md border border-border px-3 py-1 text-sm text-foreground transition-colors hover:bg-muted"
          data-testid="logout-button"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

function MobileHeader() {
  const { section } = useAdminNavigation();
  const sectionLabel = ADMIN_SECTIONS.find((s) => s.key === section)?.label ?? section;

  return (
    <span className="text-lg font-semibold text-foreground">{sectionLabel}</span>
  );
}

function CmsLayoutInner() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPublishPanel, setShowPublishPanel] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-border md:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-50 h-full w-64 bg-background shadow-lg">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-md p-1 text-foreground hover:bg-muted"
            aria-label="Open menu"
            data-testid="mobile-menu-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <MobileHeader />
          <div className="ml-auto">
            <PublishButton onClick={() => setShowPublishPanel(true)} />
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="hidden md:flex items-center justify-end border-b border-border px-6 py-3">
          <PublishButton onClick={() => setShowPublishPanel(true)} />
        </header>

        <main className="flex-1 p-4 md:p-6">
          {showPublishPanel ? (
            <PublishPanel onClose={() => setShowPublishPanel(false)} />
          ) : (
            <AdminSectionContent />
          )}
        </main>
      </div>
    </div>
  );
}

export function AdminCmsLayout() {
  return (
    <AdminNavigationProvider>
      <CmsLayoutInner />
    </AdminNavigationProvider>
  );
}
