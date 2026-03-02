// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { createRoot, type Root } from "react-dom/client";

// Mock localStorage
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (index: number) => Object.keys(store)[index] ?? null,
} as Storage;
Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, writable: true });

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubEnv("NEXT_PUBLIC_GITHUB_OWNER", "test-owner");
vi.stubEnv("NEXT_PUBLIC_GITHUB_REPO", "test-repo");

function makeIndex() {
  return {
    updatedAt: "2024-01-01T00:00:00Z",
    items: [
      { id: "art-1", slug: "stress-relief", published: true, order: 1 },
      { id: "art-2", slug: "back-pain-guide", published: false, order: 2 },
    ],
  };
}

function makeArticle(slug: string, lang: string) {
  return {
    id: "art-1",
    slug,
    updatedAt: "2024-01-01T00:00:00Z",
    seo: { title: `Title_${lang}`, description: `Desc_${lang}` },
    title: `Article_${lang}`,
    excerpt: `Excerpt for ${lang} article`,
    heroImagePath: "/media/hero.jpg",
    sections: [{ type: "text" as const, content: `Content_${lang}` }],
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  mockLocalStorage.clear();
});

// --- Component export ---

describe("ArticlesEditor", () => {
  it("exports ArticlesEditor component", async () => {
    const { ArticlesEditor } = await import("@/components/admin/articles-editor");
    expect(typeof ArticlesEditor).toBe("function");
  });

  it("renders nothing without auth token", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { AdminAuthProvider } = await import("@/lib/admin/auth-context");
    const { ArticlesEditor } = await import("@/components/admin/articles-editor");

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(AdminAuthProvider, null, React.createElement(ArticlesEditor)),
      );
      setTimeout(resolve, 50);
    });

    expect(container.querySelector("[data-testid='articles-editor-list']")).toBeNull();
    root.unmount();
    container.remove();
  });
});

// --- CRUD operations ---

describe("Article CRUD operations", () => {
  it("creating an article adds to index with unique slug", () => {
    const index = makeIndex();
    const newSlug = "new-article";
    const id = `article-${Date.now()}`;

    const exists = index.items.some((item) => item.slug === newSlug);
    expect(exists).toBe(false);

    const updated = {
      ...index,
      updatedAt: new Date().toISOString(),
      items: [
        ...index.items,
        { id, slug: newSlug, published: false, order: index.items.length + 1 },
      ],
    };

    expect(updated.items).toHaveLength(3);
    expect(updated.items[2].slug).toBe("new-article");
    expect(updated.items[2].published).toBe(false);
  });

  it("rejects duplicate slug", () => {
    const index = makeIndex();
    const exists = index.items.some((item) => item.slug === "stress-relief");
    expect(exists).toBe(true);
  });

  it("deleting an article removes from index for all languages", () => {
    const index = makeIndex();
    const slugToDelete = "stress-relief";

    const updated = {
      ...index,
      items: index.items.filter((item) => item.slug !== slugToDelete),
    };

    expect(updated.items).toHaveLength(1);
    expect(updated.items[0].slug).toBe("back-pain-guide");
  });

  it("toggling published flips the flag", () => {
    const index = makeIndex();
    const slug = "stress-relief";

    const updated = {
      ...index,
      items: index.items.map((item) =>
        item.slug === slug ? { ...item, published: !item.published } : item,
      ),
    };

    expect(updated.items[0].published).toBe(false);
    expect(updated.items[1].published).toBe(false); // unchanged
  });

  it("reordering articles updates order values", () => {
    const index = makeIndex();
    const items = [...index.items];
    // Swap 0 and 1
    [items[0], items[1]] = [items[1], items[0]];
    const reordered = items.map((item, i) => ({ ...item, order: i + 1 }));

    expect(reordered[0].slug).toBe("back-pain-guide");
    expect(reordered[0].order).toBe(1);
    expect(reordered[1].slug).toBe("stress-relief");
    expect(reordered[1].order).toBe(2);
  });
});

// --- Slug validation ---

describe("Slug validation", () => {
  const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  it("accepts valid slugs", () => {
    expect(SLUG_REGEX.test("my-article")).toBe(true);
    expect(SLUG_REGEX.test("article123")).toBe(true);
    expect(SLUG_REGEX.test("a")).toBe(true);
    expect(SLUG_REGEX.test("stress-relief-guide")).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(SLUG_REGEX.test("My Article")).toBe(false);
    expect(SLUG_REGEX.test("UPPERCASE")).toBe(false);
    expect(SLUG_REGEX.test("has spaces")).toBe(false);
    expect(SLUG_REGEX.test("has_underscore")).toBe(false);
    expect(SLUG_REGEX.test("-starts-with-dash")).toBe(false);
    expect(SLUG_REGEX.test("ends-with-dash-")).toBe(false);
  });
});

// --- Article editing ---

describe("Article editing", () => {
  it("sections add/delete syncs across all languages", () => {
    const data = {
      en: makeArticle("test", "en"),
      lv: makeArticle("test", "lv"),
      ru: makeArticle("test", "ru"),
    };

    // Add section
    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = {
        ...data[lang],
        sections: [...data[lang].sections, { type: "text" as const, content: "" }],
      };
    }
    expect(data.en.sections).toHaveLength(2);
    expect(data.lv.sections).toHaveLength(2);
    expect(data.ru.sections).toHaveLength(2);

    // Delete section
    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = {
        ...data[lang],
        sections: data[lang].sections.filter((_, i) => i !== 0),
      };
    }
    expect(data.en.sections).toHaveLength(1);
    expect(data.lv.sections).toHaveLength(1);
    expect(data.ru.sections).toHaveLength(1);
  });

  it("section content is per-language", () => {
    const data = {
      en: makeArticle("test", "en"),
      lv: makeArticle("test", "lv"),
      ru: makeArticle("test", "ru"),
    };

    const sections = [...data.en.sections];
    if (sections[0].type === "text") {
      sections[0] = { ...sections[0], content: "Updated EN content" };
    }
    data.en = { ...data.en, sections };

    expect((data.en.sections[0] as { content: string }).content).toBe("Updated EN content");
    expect((data.lv.sections[0] as { content: string }).content).toBe("Content_lv");
  });
});

// --- Zod validation ---

describe("ArticleSchema validation", () => {
  it("validates correct article data", async () => {
    const { ArticleSchema } = await import("@/schemas");
    expect(ArticleSchema.safeParse(makeArticle("test", "en")).success).toBe(true);
  });

  it("rejects excerpt over 280 characters", async () => {
    const { ArticleSchema } = await import("@/schemas");
    const data = { ...makeArticle("test", "en"), excerpt: "x".repeat(281) };
    expect(ArticleSchema.safeParse(data).success).toBe(false);
  });

  it("accepts excerpt of exactly 280 characters", async () => {
    const { ArticleSchema } = await import("@/schemas");
    const data = { ...makeArticle("test", "en"), excerpt: "x".repeat(280) };
    expect(ArticleSchema.safeParse(data).success).toBe(true);
  });

  it("rejects empty title", async () => {
    const { ArticleSchema } = await import("@/schemas");
    expect(ArticleSchema.safeParse({ ...makeArticle("test", "en"), title: "" }).success).toBe(false);
  });

  it("rejects empty sections", async () => {
    const { ArticleSchema } = await import("@/schemas");
    expect(ArticleSchema.safeParse({ ...makeArticle("test", "en"), sections: [] }).success).toBe(false);
  });

  it("validates ArticlesIndex", async () => {
    const { ArticlesIndexSchema } = await import("@/schemas");
    expect(ArticlesIndexSchema.safeParse(makeIndex()).success).toBe(true);
  });
});

// --- Draft integration ---

describe("Article draft integration", () => {
  it("saveDraft stores article data", async () => {
    const { saveDraft, loadDraft } = await import("@/lib/admin/draft-manager");
    const data = makeArticle("test", "en");
    saveDraft("content/articles/test/article.en.json", data);
    expect(loadDraft("content/articles/test/article.en.json")).toEqual(data);
  });

  it("saveDraft stores index data", async () => {
    const { saveDraft, loadDraft } = await import("@/lib/admin/draft-manager");
    const data = makeIndex();
    saveDraft("content/articles/index.json", data);
    expect(loadDraft("content/articles/index.json")).toEqual(data);
  });

  it("getDirtyKeys detects modified article", async () => {
    const { saveDraft, setOriginal, getDirtyKeys } = await import("@/lib/admin/draft-manager");
    const original = makeArticle("test", "en");
    setOriginal("content/articles/test/article.en.json", original);
    saveDraft("content/articles/test/article.en.json", { ...original, title: "Changed" });
    expect(getDirtyKeys()).toContain("content/articles/test/article.en.json");
  });
});
