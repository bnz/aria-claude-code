import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { LANGUAGES } from "@/schemas";
import {
  getTranslations,
  getContacts,
  getInfo,
  getAbout,
  getArticlesList,
  getArticle,
  getConditionsList,
  getCondition,
  getAllLanguageVersions,
} from "@/lib/content";

describe("getTranslations", () => {
  for (const lang of LANGUAGES) {
    it(`loads and validates translations for ${lang}`, () => {
      const result = getTranslations(lang);
      expect(result.id).toBe("translations");
      expect(result.header).toBeDefined();
      expect(result.footer).toBeDefined();
      expect(result.buttons).toBeDefined();
    });
  }
});

describe("getContacts", () => {
  for (const lang of LANGUAGES) {
    it(`loads and validates contacts for ${lang}`, () => {
      const result = getContacts(lang);
      expect(result.id).toBe("contacts");
      expect(result.phone).toBeTruthy();
      expect(result.address).toBeTruthy();
    });
  }
});

describe("getInfo", () => {
  for (const lang of LANGUAGES) {
    it(`loads and validates info for ${lang}`, () => {
      const result = getInfo(lang);
      expect(result.id).toBe("info");
      expect(result.title).toBeTruthy();
      expect(result.sections.length).toBeGreaterThan(0);
    });
  }
});

describe("getAbout", () => {
  for (const lang of LANGUAGES) {
    it(`loads and validates about for ${lang}`, () => {
      const result = getAbout(lang);
      expect(result.id).toBe("about");
      expect(result.title).toBeTruthy();
      expect(result.summary).toBeTruthy();
    });
  }
});

describe("getArticlesList", () => {
  it("loads and validates articles index", () => {
    const result = getArticlesList();
    expect(result.items.length).toBe(2);
    expect(result.items[0].slug).toBeTruthy();
  });
});

describe("getArticle", () => {
  const index = getArticlesList();

  for (const item of index.items) {
    for (const lang of LANGUAGES) {
      it(`loads article ${item.slug} for ${lang}`, () => {
        const result = getArticle(item.slug, lang);
        expect(result.id).toBe(item.id);
        expect(result.slug).toBe(item.slug);
        expect(result.title).toBeTruthy();
        expect(result.sections.length).toBeGreaterThan(0);
      });
    }
  }

  it("throws for non-existent article slug", () => {
    expect(() => getArticle("non-existent-slug", "en")).toThrow("Content file not found");
  });
});

describe("getConditionsList", () => {
  it("loads and validates conditions index", () => {
    const result = getConditionsList();
    expect(result.items.length).toBe(3);
    expect(result.items[0].slug).toBeTruthy();
  });
});

describe("getCondition", () => {
  const index = getConditionsList();

  for (const item of index.items) {
    for (const lang of LANGUAGES) {
      it(`loads condition ${item.slug} for ${lang}`, () => {
        const result = getCondition(item.slug, lang);
        expect(result.id).toBe(item.id);
        expect(result.slug).toBe(item.slug);
        expect(result.title).toBeTruthy();
        expect(result.sections.length).toBeGreaterThan(0);
      });
    }
  }

  it("throws for non-existent condition slug", () => {
    expect(() => getCondition("non-existent-slug", "en")).toThrow("Content file not found");
  });
});

describe("getAllLanguageVersions", () => {
  it("loads all 3 language versions of translations", () => {
    const result = getAllLanguageVersions(getTranslations);
    expect(Object.keys(result)).toEqual(["en", "lv", "ru"]);
    expect(result.en.id).toBe("translations");
    expect(result.lv.id).toBe("translations");
    expect(result.ru.id).toBe("translations");
  });

  it("loads all 3 language versions of a specific article", () => {
    const result = getAllLanguageVersions((lang) => getArticle("acupuncture-for-stress", lang));
    expect(result.en.slug).toBe("acupuncture-for-stress");
    expect(result.lv.slug).toBe("acupuncture-for-stress");
    expect(result.ru.slug).toBe("acupuncture-for-stress");
  });
});

describe("Error handling", () => {
  it("throws descriptive error for invalid JSON", () => {
    const badPath = path.join(process.cwd(), "content", "translations.en.json");
    const original = fs.readFileSync(badPath, "utf-8");

    try {
      fs.writeFileSync(badPath, "{ invalid json }", "utf-8");
      expect(() => getTranslations("en")).toThrow("Invalid JSON");
    } finally {
      fs.writeFileSync(badPath, original, "utf-8");
    }
  });

  it("throws descriptive error for schema validation failure", () => {
    const badPath = path.join(process.cwd(), "content", "translations.en.json");
    const original = fs.readFileSync(badPath, "utf-8");

    try {
      fs.writeFileSync(badPath, JSON.stringify({ wrong: "data" }), "utf-8");
      expect(() => getTranslations("en")).toThrow("Validation failed");
    } finally {
      fs.writeFileSync(badPath, original, "utf-8");
    }
  });
});
