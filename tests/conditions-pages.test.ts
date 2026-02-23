import { describe, it, expect } from "vitest";
import { LANGUAGES } from "@/schemas";
import { getConditionsList, getCondition, getTranslations } from "@/lib/content";

describe("Conditions list page logic", () => {
  it("filters only published conditions", () => {
    const index = getConditionsList();
    const published = index.items.filter((c) => c.published);
    expect(published.length).toBeGreaterThan(0);
    for (const item of published) {
      expect(item.published).toBe(true);
    }
  });

  it("sorts conditions by order", () => {
    const index = getConditionsList();
    const published = index.items
      .filter((c) => c.published)
      .sort((a, b) => a.order - b.order);

    for (let i = 1; i < published.length; i++) {
      expect(published[i].order).toBeGreaterThanOrEqual(published[i - 1].order);
    }
  });

  it("loads condition details for each published item in all languages", () => {
    const index = getConditionsList();
    const published = index.items.filter((c) => c.published);

    for (const item of published) {
      for (const lang of LANGUAGES) {
        const condition = getCondition(item.slug, lang);
        expect(condition.title).toBeTruthy();
        expect(condition.intro).toBeTruthy();
        expect(condition.slug).toBe(item.slug);
      }
    }
  });
});

describe("Condition detail page logic", () => {
  it("has contraindications for conditions that define them", () => {
    const condition = getCondition("back-pain", "en");
    expect(condition.contraindications.length).toBeGreaterThan(0);
    for (const item of condition.contraindications) {
      expect(item).toBeTruthy();
    }
  });

  it("has FAQ items for conditions that define them", () => {
    const condition = getCondition("back-pain", "en");
    expect(condition.faq.length).toBeGreaterThan(0);
    for (const item of condition.faq) {
      expect(item.q).toBeTruthy();
      expect(item.a).toBeTruthy();
    }
  });

  it("has sections for all conditions", () => {
    const index = getConditionsList();
    const published = index.items.filter((c) => c.published);

    for (const item of published) {
      const condition = getCondition(item.slug, "en");
      expect(condition.sections.length).toBeGreaterThan(0);
    }
  });

  it("has valid seo metadata for each condition", () => {
    const index = getConditionsList();
    const published = index.items.filter((c) => c.published);

    for (const item of published) {
      for (const lang of LANGUAGES) {
        const condition = getCondition(item.slug, lang);
        expect(condition.seo.title).toBeTruthy();
        expect(condition.seo.description).toBeTruthy();
      }
    }
  });
});

describe("generateStaticParams for conditions", () => {
  it("returns correct lang x slug combinations for published conditions", () => {
    const index = getConditionsList();
    const publishedItems = index.items.filter((c) => c.published);

    const params = publishedItems.flatMap((item) =>
      LANGUAGES.map((lang) => ({
        lang,
        slug: item.slug,
      })),
    );

    expect(params.length).toBe(publishedItems.length * LANGUAGES.length);

    for (const item of publishedItems) {
      for (const lang of LANGUAGES) {
        expect(params).toContainEqual({ lang, slug: item.slug });
      }
    }
  });
});

describe("Conditions translations", () => {
  it("has backToConditions translation in all languages", () => {
    for (const lang of LANGUAGES) {
      const translations = getTranslations(lang);
      expect(translations.buttons.backToConditions).toBeTruthy();
    }
  });

  it("has conditionsMetaTitle translation in all languages", () => {
    for (const lang of LANGUAGES) {
      const translations = getTranslations(lang);
      expect(translations.buttons.conditionsMetaTitle).toBeTruthy();
    }
  });

  it("has contraindications translation in all languages", () => {
    for (const lang of LANGUAGES) {
      const translations = getTranslations(lang);
      expect(translations.buttons.contraindications).toBeTruthy();
    }
  });

  it("has faqTitle translation in all languages", () => {
    for (const lang of LANGUAGES) {
      const translations = getTranslations(lang);
      expect(translations.buttons.faqTitle).toBeTruthy();
    }
  });
});
