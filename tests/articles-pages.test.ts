import { describe, it, expect } from "vitest";
import { LANGUAGES } from "@/schemas";
import { getArticlesList, getArticle, getTranslations } from "@/lib/content";

describe("Articles list page logic", () => {
  it("filters only published articles", () => {
    const index = getArticlesList();
    const published = index.items.filter((a) => a.published);
    expect(published.length).toBeGreaterThan(0);
    for (const item of published) {
      expect(item.published).toBe(true);
    }
  });

  it("sorts articles by order", () => {
    const index = getArticlesList();
    const published = index.items
      .filter((a) => a.published)
      .sort((a, b) => a.order - b.order);

    for (let i = 1; i < published.length; i++) {
      expect(published[i].order).toBeGreaterThanOrEqual(published[i - 1].order);
    }
  });

  it("loads article details for each published item in all languages", () => {
    const index = getArticlesList();
    const published = index.items.filter((a) => a.published);

    for (const item of published) {
      for (const lang of LANGUAGES) {
        const article = getArticle(item.slug, lang);
        expect(article.title).toBeTruthy();
        expect(article.excerpt).toBeTruthy();
        expect(article.slug).toBe(item.slug);
      }
    }
  });
});

describe("Article detail page logic", () => {
  it("renders all sections for each article", () => {
    const index = getArticlesList();
    const published = index.items.filter((a) => a.published);

    for (const item of published) {
      const article = getArticle(item.slug, "en");
      expect(article.sections.length).toBeGreaterThan(0);
      for (const section of article.sections) {
        expect(["text", "image"]).toContain(section.type);
      }
    }
  });

  it("has valid seo metadata for each article", () => {
    const index = getArticlesList();
    const published = index.items.filter((a) => a.published);

    for (const item of published) {
      for (const lang of LANGUAGES) {
        const article = getArticle(item.slug, lang);
        expect(article.seo.title).toBeTruthy();
        expect(article.seo.description).toBeTruthy();
      }
    }
  });
});

describe("generateStaticParams for articles", () => {
  it("returns correct lang x slug combinations for published articles", () => {
    const index = getArticlesList();
    const publishedItems = index.items.filter((a) => a.published);

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

describe("Articles translations", () => {
  it("has backToArticles translation in all languages", () => {
    for (const lang of LANGUAGES) {
      const translations = getTranslations(lang);
      expect(translations.buttons.backToArticles).toBeTruthy();
    }
  });

  it("has articlesMetaTitle translation in all languages", () => {
    for (const lang of LANGUAGES) {
      const translations = getTranslations(lang);
      expect(translations.buttons.articlesMetaTitle).toBeTruthy();
    }
  });

  it("has articlesMetaDescription translation in all languages", () => {
    for (const lang of LANGUAGES) {
      const translations = getTranslations(lang);
      expect(translations.buttons.articlesMetaDescription).toBeTruthy();
    }
  });
});
