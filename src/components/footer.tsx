"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n-context";
import type { Contacts } from "@/schemas";

interface FooterProps {
  contacts: Contacts;
}

const NAV_ITEMS = [
  { key: "navInfo", href: "/info" },
  { key: "navArticles", href: "/articles" },
  { key: "navConditions", href: "/conditions" },
  { key: "navAbout", href: "/about" },
  { key: "navContacts", href: "/contacts" },
];

export function Footer({ contacts }: FooterProps) {
  const { lang, translations } = useI18n();

  const currentYear = new Date().getFullYear();
  const copyrightText = (translations.footer.copyright ?? "© {year}").replace(
    "{year}",
    String(currentYear),
  );

  function getNavLabel(key: string): string {
    return translations.header[key] ?? key;
  }

  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Contact info */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {translations.footer.phone ?? "Phone"}
            </h3>
            <a
              href={`tel:${contacts.phone.replace(/\s/g, "")}`}
              className="text-lg font-medium text-accent transition-colors hover:text-accent/80"
            >
              {contacts.phone}
            </a>

            {contacts.workHours && (
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium">{translations.footer.workHours ?? "Hours"}:</span>{" "}
                {contacts.workHours}
              </p>
            )}

            <p className="mt-2 text-sm text-muted-foreground">{contacts.address}</p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Navigation
            </h3>
            <nav aria-label="Footer navigation">
              <ul className="flex flex-col gap-2">
                {NAV_ITEMS.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={`/${lang}${item.href}`}
                      className="text-sm text-foreground/70 transition-colors hover:text-accent"
                    >
                      {getNavLabel(item.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Brand / copyright */}
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-lg font-bold text-accent">Acupuncture</p>
            <p className="mt-2 text-sm text-muted-foreground">{copyrightText}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
