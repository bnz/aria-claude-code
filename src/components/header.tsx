"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";

interface NavItem {
  key: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "navHome", href: "" },
  { key: "navInfo", href: "/info" },
  { key: "navArticles", href: "/articles" },
  { key: "navConditions", href: "/conditions" },
  { key: "navAbout", href: "/about" },
  { key: "navContacts", href: "/contacts" },
];

export function Header() {
  const { lang, translations } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = translations.buttons;

  function getNavLabel(key: string): string {
    return translations.header[key] ?? key;
  }

  function getNavHref(item: NavItem): string {
    return `/${lang}${item.href}`;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo / site name */}
        <Link href={`/${lang}`} className="text-lg font-bold text-accent">
          {t.siteName}
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-6 md:flex" aria-label={t.mainNavigation}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={getNavHref(item)}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-accent"
            >
              {getNavLabel(item.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <LanguageSwitcher />
        </div>

        {/* Mobile burger button */}
        <button
          type="button"
          className="flex items-center justify-center rounded-md p-2 text-foreground md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? t.closeMenu : t.openMenu}
        >
          {mobileMenuOpen ? (
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <nav className="border-t border-border px-4 pb-4 md:hidden" aria-label={t.mobileNavigation}>
          <ul className="flex flex-col gap-1 pt-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link
                  href={getNavHref(item)}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-accent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {getNavLabel(item.key)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-border pt-3">
            <LanguageSwitcher />
          </div>
        </nav>
      )}
    </header>
  );
}
