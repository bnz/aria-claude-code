"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANGUAGES, type Language } from "@/schemas";
import { useLang, useTranslations } from "@/lib/i18n-context";

const LANGUAGE_LABELS: Record<Language, string> = {
  en: "EN",
  lv: "LV",
  ru: "RU",
};

export function LanguageSwitcher() {
  const currentLang = useLang();
  const translations = useTranslations();
  const pathname = usePathname();

  function getLocalizedPath(targetLang: Language): string {
    // Replace the first path segment (language) with the target language
    const segments = pathname.split("/");
    segments[1] = targetLang;
    return segments.join("/");
  }

  return (
    <nav aria-label={translations.buttons.languageSwitcher} className="flex gap-2">
      {LANGUAGES.map((lang) => (
        <Link
          key={lang}
          href={getLocalizedPath(lang)}
          lang={lang}
          aria-current={lang === currentLang ? "page" : undefined}
          className={`px-2 py-1 text-sm font-medium transition-colors ${
            lang === currentLang
              ? "text-foreground underline underline-offset-4"
              : "text-gray-500 hover:text-foreground"
          }`}
        >
          {LANGUAGE_LABELS[lang]}
        </Link>
      ))}
    </nav>
  );
}
