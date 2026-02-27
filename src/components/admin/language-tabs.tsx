"use client";

import type { Language } from "@/lib/languages";

const LANG_LABELS: Record<Language, string> = {
  en: "EN",
  lv: "LV",
  ru: "RU",
};

const LANG_ORDER: Language[] = ["en", "lv", "ru"];

interface LanguageTabsProps {
  activeLang: Language;
  onLangChange: (lang: Language) => void;
  warnings?: Partial<Record<Language, boolean>>;
}

export function LanguageTabs({ activeLang, onLangChange, warnings }: LanguageTabsProps) {
  return (
    <div className="flex gap-1 border-b border-border" role="tablist" aria-label="Language">
      {LANG_ORDER.map((lang) => (
        <button
          key={lang}
          role="tab"
          aria-selected={activeLang === lang}
          onClick={() => onLangChange(lang)}
          className={`relative px-4 py-2 text-sm font-medium transition-colors ${
            activeLang === lang
              ? "text-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-lang={lang}
        >
          {LANG_LABELS[lang]}
          {warnings?.[lang] && (
            <span className="ml-1 inline-block h-2 w-2 rounded-full bg-yellow-500" aria-label={`Warning for ${lang}`} />
          )}
        </button>
      ))}
    </div>
  );
}
