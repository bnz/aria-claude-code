import { describe, it, expect } from "vitest";
import {
  LANGUAGES,
  SeoSchema,
  TranslationsSchema,
  ContactsSchema,
  InfoSectionSchema,
  InfoSchema,
  AboutSchema,
  ArticlesIndexSchema,
  ArticleSectionSchema,
  ArticleSchema,
  ConditionsIndexSchema,
  ConditionSchema,
} from "@/schemas";

const VALID_DATETIME = "2026-02-19T12:00:00.000Z";

const validSeo = {
  title: "Page Title",
  description: "Page description for SEO",
};

describe("LANGUAGES", () => {
  it("contains en, lv, ru", () => {
    expect(LANGUAGES).toEqual(["en", "lv", "ru"]);
  });
});

describe("SeoSchema", () => {
  it("accepts valid data", () => {
    const result = SeoSchema.safeParse(validSeo);
    expect(result.success).toBe(true);
  });

  it("accepts optional fields", () => {
    const result = SeoSchema.safeParse({
      ...validSeo,
      canonical: "https://example.com/page",
      ogImagePath: "/media/og.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = SeoSchema.safeParse({ ...validSeo, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects description over 320 chars", () => {
    const result = SeoSchema.safeParse({
      ...validSeo,
      description: "a".repeat(321),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid canonical URL", () => {
    const result = SeoSchema.safeParse({
      ...validSeo,
      canonical: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing title", () => {
    const result = SeoSchema.safeParse({ description: "desc" });
    expect(result.success).toBe(false);
  });
});

describe("TranslationsSchema", () => {
  const valid = {
    id: "translations",
    updatedAt: VALID_DATETIME,
    header: { navHome: "Home" },
    footer: { copyright: "© {year}" },
    buttons: { callToAction: "Book" },
  };

  it("accepts valid data", () => {
    const result = TranslationsSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("defaults empty records", () => {
    const result = TranslationsSchema.safeParse({
      id: "translations",
      updatedAt: VALID_DATETIME,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.header).toEqual({});
      expect(result.data.footer).toEqual({});
      expect(result.data.buttons).toEqual({});
    }
  });

  it("rejects invalid datetime", () => {
    const result = TranslationsSchema.safeParse({
      ...valid,
      updatedAt: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});

describe("ContactsSchema", () => {
  const valid = {
    id: "contacts",
    updatedAt: VALID_DATETIME,
    phone: "+371 20000000",
    address: "Riga, Latvia",
  };

  it("accepts valid data", () => {
    expect(ContactsSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts optional fields", () => {
    const result = ContactsSchema.safeParse({
      ...valid,
      mapEmbedUrl: "https://maps.google.com/embed?q=riga",
      introText: "Call us",
      workHours: "Mon-Fri 10-18",
    });
    expect(result.success).toBe(true);
  });

  it("rejects phone shorter than 3 chars", () => {
    expect(ContactsSchema.safeParse({ ...valid, phone: "12" }).success).toBe(false);
  });

  it("rejects address shorter than 3 chars", () => {
    expect(ContactsSchema.safeParse({ ...valid, address: "ab" }).success).toBe(false);
  });

  it("rejects invalid mapEmbedUrl", () => {
    expect(
      ContactsSchema.safeParse({ ...valid, mapEmbedUrl: "not-url" }).success,
    ).toBe(false);
  });
});

describe("InfoSectionSchema", () => {
  it("accepts text section", () => {
    expect(
      InfoSectionSchema.safeParse({ type: "text", content: "Hello" }).success,
    ).toBe(true);
  });

  it("accepts text section with title", () => {
    expect(
      InfoSectionSchema.safeParse({ type: "text", title: "Title", content: "Hello" }).success,
    ).toBe(true);
  });

  it("accepts bullets section", () => {
    expect(
      InfoSectionSchema.safeParse({ type: "bullets", items: ["one", "two"] }).success,
    ).toBe(true);
  });

  it("rejects bullets with empty items array", () => {
    expect(
      InfoSectionSchema.safeParse({ type: "bullets", items: [] }).success,
    ).toBe(false);
  });

  it("rejects bullets with empty string item", () => {
    expect(
      InfoSectionSchema.safeParse({ type: "bullets", items: [""] }).success,
    ).toBe(false);
  });

  it("accepts image section", () => {
    expect(
      InfoSectionSchema.safeParse({ type: "image", imagePath: "/media/img.jpg" }).success,
    ).toBe(true);
  });

  it("rejects image with empty imagePath", () => {
    expect(
      InfoSectionSchema.safeParse({ type: "image", imagePath: "" }).success,
    ).toBe(false);
  });

  it("rejects unknown type", () => {
    expect(
      InfoSectionSchema.safeParse({ type: "video", url: "http://example.com" }).success,
    ).toBe(false);
  });
});

describe("InfoSchema", () => {
  const valid = {
    id: "info",
    updatedAt: VALID_DATETIME,
    seo: validSeo,
    title: "About Acupuncture",
    sections: [{ type: "text" as const, content: "Introduction text" }],
  };

  it("accepts valid data", () => {
    expect(InfoSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty sections", () => {
    expect(InfoSchema.safeParse({ ...valid, sections: [] }).success).toBe(false);
  });

  it("rejects missing title", () => {
    const { title: _, ...noTitle } = valid;
    expect(InfoSchema.safeParse(noTitle).success).toBe(false);
  });
});

describe("AboutSchema", () => {
  const valid = {
    id: "about",
    updatedAt: VALID_DATETIME,
    seo: validSeo,
    title: "About Me",
    summary: "Expert acupuncturist",
  };

  it("accepts valid data", () => {
    expect(AboutSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults credentials and certificates", () => {
    const result = AboutSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.credentials).toEqual([]);
      expect(result.data.certificates).toEqual([]);
    }
  });

  it("accepts full data with credentials and certificates", () => {
    const result = AboutSchema.safeParse({
      ...valid,
      credentials: ["MD", "Licensed Acupuncturist"],
      experienceYears: 15,
      certificates: [
        { title: "TCM Certificate", imagePath: "/media/cert.jpg" },
        { title: "Another Cert" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative experienceYears", () => {
    expect(
      AboutSchema.safeParse({ ...valid, experienceYears: -1 }).success,
    ).toBe(false);
  });

  it("rejects non-integer experienceYears", () => {
    expect(
      AboutSchema.safeParse({ ...valid, experienceYears: 5.5 }).success,
    ).toBe(false);
  });

  it("rejects empty summary", () => {
    expect(AboutSchema.safeParse({ ...valid, summary: "" }).success).toBe(false);
  });
});

describe("ArticlesIndexSchema", () => {
  it("accepts valid data", () => {
    const result = ArticlesIndexSchema.safeParse({
      updatedAt: VALID_DATETIME,
      items: [{ id: "1", slug: "my-article", published: true, order: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it("defaults items to empty array", () => {
    const result = ArticlesIndexSchema.safeParse({ updatedAt: VALID_DATETIME });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toEqual([]);
    }
  });

  it("defaults published and order", () => {
    const result = ArticlesIndexSchema.safeParse({
      updatedAt: VALID_DATETIME,
      items: [{ id: "1", slug: "test" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].published).toBe(true);
      expect(result.data.items[0].order).toBe(0);
    }
  });

  it("rejects empty slug", () => {
    const result = ArticlesIndexSchema.safeParse({
      updatedAt: VALID_DATETIME,
      items: [{ id: "1", slug: "" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("ArticleSectionSchema", () => {
  it("accepts text section", () => {
    expect(
      ArticleSectionSchema.safeParse({ type: "text", content: "Hello" }).success,
    ).toBe(true);
  });

  it("accepts image section", () => {
    expect(
      ArticleSectionSchema.safeParse({ type: "image", imagePath: "/media/img.jpg" }).success,
    ).toBe(true);
  });

  it("rejects empty content", () => {
    expect(
      ArticleSectionSchema.safeParse({ type: "text", content: "" }).success,
    ).toBe(false);
  });
});

describe("ArticleSchema", () => {
  const valid = {
    id: "1",
    slug: "my-article",
    updatedAt: VALID_DATETIME,
    seo: validSeo,
    title: "Article Title",
    excerpt: "Short excerpt",
    sections: [{ type: "text" as const, content: "Body text" }],
  };

  it("accepts valid data", () => {
    expect(ArticleSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects excerpt over 280 chars", () => {
    expect(
      ArticleSchema.safeParse({ ...valid, excerpt: "a".repeat(281) }).success,
    ).toBe(false);
  });

  it("rejects empty sections", () => {
    expect(
      ArticleSchema.safeParse({ ...valid, sections: [] }).success,
    ).toBe(false);
  });

  it("accepts optional heroImagePath", () => {
    expect(
      ArticleSchema.safeParse({ ...valid, heroImagePath: "/media/hero.jpg" }).success,
    ).toBe(true);
  });
});

describe("ConditionsIndexSchema", () => {
  it("accepts valid data", () => {
    const result = ConditionsIndexSchema.safeParse({
      updatedAt: VALID_DATETIME,
      items: [{ id: "1", slug: "back-pain", published: true, order: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it("defaults items to empty array", () => {
    const result = ConditionsIndexSchema.safeParse({ updatedAt: VALID_DATETIME });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toEqual([]);
    }
  });
});

describe("ConditionSchema", () => {
  const valid = {
    id: "1",
    slug: "back-pain",
    updatedAt: VALID_DATETIME,
    seo: validSeo,
    title: "Back Pain",
    intro: "Acupuncture helps with back pain.",
    sections: [{ type: "text" as const, content: "Details about treatment" }],
  };

  it("accepts valid data", () => {
    expect(ConditionSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults contraindications and faq", () => {
    const result = ConditionSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contraindications).toEqual([]);
      expect(result.data.faq).toEqual([]);
    }
  });

  it("accepts full data with faq and contraindications", () => {
    const result = ConditionSchema.safeParse({
      ...valid,
      contraindications: ["Pregnancy", "Blood disorders"],
      faq: [
        { q: "How many sessions?", a: "Usually 5-10 sessions." },
        { q: "Is it painful?", a: "Minimal discomfort." },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects faq with empty question", () => {
    expect(
      ConditionSchema.safeParse({
        ...valid,
        faq: [{ q: "", a: "Answer" }],
      }).success,
    ).toBe(false);
  });

  it("rejects faq with empty answer", () => {
    expect(
      ConditionSchema.safeParse({
        ...valid,
        faq: [{ q: "Question?", a: "" }],
      }).success,
    ).toBe(false);
  });

  it("rejects empty intro", () => {
    expect(ConditionSchema.safeParse({ ...valid, intro: "" }).success).toBe(false);
  });

  it("rejects empty sections", () => {
    expect(ConditionSchema.safeParse({ ...valid, sections: [] }).success).toBe(false);
  });
});
