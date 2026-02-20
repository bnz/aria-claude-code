"use client";

import { createContext, useContext } from "react";
import type { Language, Translations } from "@/schemas";

interface I18nContextValue {
  lang: Language;
  translations: Translations;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  lang,
  translations,
  children,
}: {
  lang: Language;
  translations: Translations;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={{ lang, translations }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

export function useTranslations(): Translations {
  return useI18n().translations;
}

export function useLang(): Language {
  return useI18n().lang;
}
