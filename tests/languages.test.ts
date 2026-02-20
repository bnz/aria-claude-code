import { describe, it, expect } from "vitest";
import {
  LANGUAGES,
  DEFAULT_LANGUAGE,
  generateLangStaticParams,
  isValidLanguage,
} from "@/lib/languages";

describe("languages", () => {
  it("exports LANGUAGES constant", () => {
    expect(LANGUAGES).toEqual(["en", "lv", "ru"]);
  });

  it("exports DEFAULT_LANGUAGE as en", () => {
    expect(DEFAULT_LANGUAGE).toBe("en");
  });

  it("generateLangStaticParams returns params for all languages", () => {
    const params = generateLangStaticParams();
    expect(params).toEqual([{ lang: "en" }, { lang: "lv" }, { lang: "ru" }]);
  });

  it("isValidLanguage returns true for valid languages", () => {
    expect(isValidLanguage("en")).toBe(true);
    expect(isValidLanguage("lv")).toBe(true);
    expect(isValidLanguage("ru")).toBe(true);
  });

  it("isValidLanguage returns false for invalid strings", () => {
    expect(isValidLanguage("fr")).toBe(false);
    expect(isValidLanguage("")).toBe(false);
    expect(isValidLanguage("EN")).toBe(false);
  });
});
