import { describe, it, expect } from "vitest";
import { generateLangStaticParams, isValidLanguage } from "@/lib/languages";
import { LANGUAGES } from "@/schemas";

describe("generateStaticParams for i18n routing", () => {
  it("returns params for all 3 languages", () => {
    const params = generateLangStaticParams();
    expect(params).toHaveLength(3);
    expect(params.map((p) => p.lang)).toEqual(["en", "lv", "ru"]);
  });

  it("each param has a valid language", () => {
    const params = generateLangStaticParams();
    for (const param of params) {
      expect(isValidLanguage(param.lang)).toBe(true);
    }
  });
});

describe("LanguageSwitcher link generation", () => {
  function getLocalizedPath(pathname: string, targetLang: string): string {
    const segments = pathname.split("/");
    segments[1] = targetLang;
    return segments.join("/");
  }

  it("switches language on root page", () => {
    expect(getLocalizedPath("/en", "lv")).toBe("/lv");
    expect(getLocalizedPath("/en", "ru")).toBe("/ru");
  });

  it("preserves nested path when switching language", () => {
    expect(getLocalizedPath("/en/articles", "lv")).toBe("/lv/articles");
    expect(getLocalizedPath("/en/conditions/back-pain", "ru")).toBe("/ru/conditions/back-pain");
  });

  it("handles all language combinations", () => {
    for (const from of LANGUAGES) {
      for (const to of LANGUAGES) {
        const result = getLocalizedPath(`/${from}/info`, to);
        expect(result).toBe(`/${to}/info`);
      }
    }
  });
});
