import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  LANGUAGES,
  TranslationsSchema,
  ContactsSchema,
  InfoSchema,
  AboutSchema,
  ArticlesIndexSchema,
  ArticleSchema,
  ConditionsIndexSchema,
  ConditionSchema,
} from "@/schemas";

const CONTENT_DIR = path.resolve(__dirname, "../content");

function loadJson(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

describe("Translations JSON validation", () => {
  for (const lang of LANGUAGES) {
    it(`translations.${lang}.json passes Zod validation`, () => {
      const data = loadJson(path.join(CONTENT_DIR, `translations.${lang}.json`));
      const result = TranslationsSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  }

  it("all translations have the same id", () => {
    const ids = LANGUAGES.map((lang) => {
      const data = loadJson(path.join(CONTENT_DIR, `translations.${lang}.json`));
      return (data as { id: string }).id;
    });
    expect(new Set(ids).size).toBe(1);
  });
});

describe("Contacts JSON validation", () => {
  for (const lang of LANGUAGES) {
    it(`contacts.${lang}.json passes Zod validation`, () => {
      const data = loadJson(path.join(CONTENT_DIR, `contacts.${lang}.json`));
      const result = ContactsSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  }

  it("all contacts have the same id", () => {
    const ids = LANGUAGES.map((lang) => {
      const data = loadJson(path.join(CONTENT_DIR, `contacts.${lang}.json`));
      return (data as { id: string }).id;
    });
    expect(new Set(ids).size).toBe(1);
  });
});

describe("Info JSON validation", () => {
  for (const lang of LANGUAGES) {
    it(`info.${lang}.json passes Zod validation`, () => {
      const data = loadJson(path.join(CONTENT_DIR, `info.${lang}.json`));
      const result = InfoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  }

  it("all info have the same id", () => {
    const ids = LANGUAGES.map((lang) => {
      const data = loadJson(path.join(CONTENT_DIR, `info.${lang}.json`));
      return (data as { id: string }).id;
    });
    expect(new Set(ids).size).toBe(1);
  });
});

describe("About JSON validation", () => {
  for (const lang of LANGUAGES) {
    it(`about.${lang}.json passes Zod validation`, () => {
      const data = loadJson(path.join(CONTENT_DIR, `about.${lang}.json`));
      const result = AboutSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  }

  it("all about have the same id", () => {
    const ids = LANGUAGES.map((lang) => {
      const data = loadJson(path.join(CONTENT_DIR, `about.${lang}.json`));
      return (data as { id: string }).id;
    });
    expect(new Set(ids).size).toBe(1);
  });
});

describe("Articles index JSON validation", () => {
  it("articles/index.json passes Zod validation", () => {
    const data = loadJson(path.join(CONTENT_DIR, "articles/index.json"));
    const result = ArticlesIndexSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("Article content JSON validation", () => {
  const indexData = loadJson(path.join(CONTENT_DIR, "articles/index.json")) as {
    items: { slug: string; id: string }[];
  };

  for (const item of indexData.items) {
    for (const lang of LANGUAGES) {
      it(`articles/${item.slug}/article.${lang}.json passes Zod validation`, () => {
        const data = loadJson(
          path.join(CONTENT_DIR, `articles/${item.slug}/article.${lang}.json`),
        );
        const result = ArticleSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    }

    it(`articles/${item.slug} — id and slug match across languages`, () => {
      const entries = LANGUAGES.map((lang) =>
        loadJson(
          path.join(CONTENT_DIR, `articles/${item.slug}/article.${lang}.json`),
        ) as { id: string; slug: string },
      );

      const ids = entries.map((e) => e.id);
      const slugs = entries.map((e) => e.slug);
      expect(new Set(ids).size).toBe(1);
      expect(new Set(slugs).size).toBe(1);
      expect(ids[0]).toBe(item.id);
      expect(slugs[0]).toBe(item.slug);
    });
  }
});

describe("Conditions index JSON validation", () => {
  it("conditions/index.json passes Zod validation", () => {
    const data = loadJson(path.join(CONTENT_DIR, "conditions/index.json"));
    const result = ConditionsIndexSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("Condition content JSON validation", () => {
  const indexData = loadJson(path.join(CONTENT_DIR, "conditions/index.json")) as {
    items: { slug: string; id: string }[];
  };

  for (const item of indexData.items) {
    for (const lang of LANGUAGES) {
      it(`conditions/${item.slug}/condition.${lang}.json passes Zod validation`, () => {
        const data = loadJson(
          path.join(CONTENT_DIR, `conditions/${item.slug}/condition.${lang}.json`),
        );
        const result = ConditionSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    }

    it(`conditions/${item.slug} — id and slug match across languages`, () => {
      const entries = LANGUAGES.map((lang) =>
        loadJson(
          path.join(CONTENT_DIR, `conditions/${item.slug}/condition.${lang}.json`),
        ) as { id: string; slug: string },
      );

      const ids = entries.map((e) => e.id);
      const slugs = entries.map((e) => e.slug);
      expect(new Set(ids).size).toBe(1);
      expect(new Set(slugs).size).toBe(1);
      expect(ids[0]).toBe(item.id);
      expect(slugs[0]).toBe(item.slug);
    });
  }
});
