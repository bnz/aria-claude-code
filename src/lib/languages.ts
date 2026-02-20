import { LANGUAGES, type Language } from "@/schemas";

export { LANGUAGES, type Language };

/** Default language for fallbacks */
export const DEFAULT_LANGUAGE: Language = "en";

/** Generate static params for [lang] routes */
export function generateLangStaticParams(): { lang: Language }[] {
  return LANGUAGES.map((lang) => ({ lang }));
}

/** Check if a string is a valid language */
export function isValidLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value);
}
