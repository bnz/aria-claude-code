export const LANGUAGES = ["en", "lv", "ru"] as const;

export type Language = (typeof LANGUAGES)[number];
