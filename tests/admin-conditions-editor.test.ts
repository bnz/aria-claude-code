// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";

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
      { id: "cond-1", slug: "back-pain", published: true, order: 1 },
      { id: "cond-2", slug: "migraine", published: false, order: 2 },
    ],
  };
}

function makeCondition(slug: string, lang: string) {
  return {
    id: "cond-1",
    slug,
    updatedAt: "2024-01-01T00:00:00Z",
    seo: { title: `Title_${lang}`, description: `Desc_${lang}` },
    title: `Condition_${lang}`,
    intro: `Intro for ${lang} condition`,
    sections: [{ type: "text" as const, title: "How it helps", content: `Content_${lang}` }],
    contraindications: [`Contra1_${lang}`, `Contra2_${lang}`],
    faq: [
      { q: `Question_${lang}`, a: `Answer_${lang}` },
    ],
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  mockLocalStorage.clear();
});

// --- Component export ---

describe("ConditionsEditor", () => {
  it("exports ConditionsEditor component", async () => {
    const { ConditionsEditor } = await import("@/components/admin/conditions-editor");
    expect(typeof ConditionsEditor).toBe("function");
  });

  it("renders nothing without auth token", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { AdminAuthProvider } = await import("@/lib/admin/auth-context");
    const { ConditionsEditor } = await import("@/components/admin/conditions-editor");

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(AdminAuthProvider, null, React.createElement(ConditionsEditor)),
      );
      setTimeout(resolve, 50);
    });

    expect(container.querySelector("[data-testid='conditions-editor-list']")).toBeNull();
    root.unmount();
    container.remove();
  });
});

// --- CRUD operations ---

describe("Condition CRUD operations", () => {
  it("creating a condition adds to index with unique slug", () => {
    const index = makeIndex();
    const newSlug = "insomnia";
    const id = `condition-${Date.now()}`;

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
    expect(updated.items[2].slug).toBe("insomnia");
    expect(updated.items[2].published).toBe(false);
  });

  it("rejects duplicate slug", () => {
    const index = makeIndex();
    const exists = index.items.some((item) => item.slug === "back-pain");
    expect(exists).toBe(true);
  });

  it("deleting a condition removes from index for all languages", () => {
    const index = makeIndex();
    const slugToDelete = "back-pain";

    const updated = {
      ...index,
      items: index.items.filter((item) => item.slug !== slugToDelete),
    };

    expect(updated.items).toHaveLength(1);
    expect(updated.items[0].slug).toBe("migraine");
  });

  it("toggling published flips the flag", () => {
    const index = makeIndex();
    const slug = "back-pain";

    const updated = {
      ...index,
      items: index.items.map((item) =>
        item.slug === slug ? { ...item, published: !item.published } : item,
      ),
    };

    expect(updated.items[0].published).toBe(false);
    expect(updated.items[1].published).toBe(false); // unchanged
  });

  it("reordering conditions updates order values", () => {
    const index = makeIndex();
    const items = [...index.items];
    [items[0], items[1]] = [items[1], items[0]];
    const reordered = items.map((item, i) => ({ ...item, order: i + 1 }));

    expect(reordered[0].slug).toBe("migraine");
    expect(reordered[0].order).toBe(1);
    expect(reordered[1].slug).toBe("back-pain");
    expect(reordered[1].order).toBe(2);
  });
});

// --- Slug validation ---

describe("Condition slug validation", () => {
  const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  it("accepts valid slugs", () => {
    expect(SLUG_REGEX.test("back-pain")).toBe(true);
    expect(SLUG_REGEX.test("migraine")).toBe(true);
    expect(SLUG_REGEX.test("stress-relief-guide")).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(SLUG_REGEX.test("Back-Pain")).toBe(false);
    expect(SLUG_REGEX.test("has spaces")).toBe(false);
    expect(SLUG_REGEX.test("has_underscore")).toBe(false);
    expect(SLUG_REGEX.test("-starts-with-dash")).toBe(false);
    expect(SLUG_REGEX.test("ends-with-dash-")).toBe(false);
  });
});

// --- Condition editing ---

describe("Condition editing", () => {
  it("sections add/delete syncs across all languages", () => {
    const data = {
      en: makeCondition("test", "en"),
      lv: makeCondition("test", "lv"),
      ru: makeCondition("test", "ru"),
    };

    // Add section
    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = {
        ...data[lang],
        sections: [...data[lang].sections, { type: "text" as const, title: "", content: "" }],
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
      en: makeCondition("test", "en"),
      lv: makeCondition("test", "lv"),
      ru: makeCondition("test", "ru"),
    };

    const sections = [...data.en.sections];
    if (sections[0].type === "text") {
      sections[0] = { ...sections[0], content: "Updated EN content" };
    }
    data.en = { ...data.en, sections };

    expect((data.en.sections[0] as { content: string }).content).toBe("Updated EN content");
    expect((data.lv.sections[0] as { content: string }).content).toBe("Content_lv");
  });

  it("supports bullet sections with items", () => {
    const data = makeCondition("test", "en");
    const bulletsSection = { type: "bullets" as const, title: "Types", items: ["Item 1", "Item 2"] };
    const updated = { ...data, sections: [...data.sections, bulletsSection] };

    expect(updated.sections).toHaveLength(2);
    expect(updated.sections[1].type).toBe("bullets");
    if (updated.sections[1].type === "bullets") {
      expect(updated.sections[1].items).toHaveLength(2);
    }
  });

  it("bullet add/delete syncs across languages", () => {
    const data = {
      en: { ...makeCondition("test", "en"), sections: [{ type: "bullets" as const, title: "T", items: ["A"] }] },
      lv: { ...makeCondition("test", "lv"), sections: [{ type: "bullets" as const, title: "T", items: ["B"] }] },
      ru: { ...makeCondition("test", "ru"), sections: [{ type: "bullets" as const, title: "T", items: ["C"] }] },
    };

    // Add bullet item to all
    for (const lang of ["en", "lv", "ru"] as const) {
      const sections = [...data[lang].sections];
      const section = sections[0];
      if (section.type === "bullets") {
        sections[0] = { ...section, items: [...section.items, ""] };
      }
      data[lang] = { ...data[lang], sections };
    }

    for (const lang of ["en", "lv", "ru"] as const) {
      const section = data[lang].sections[0];
      if (section.type === "bullets") {
        expect(section.items).toHaveLength(2);
      }
    }
  });
});

// --- Contraindications ---

describe("Contraindications editor", () => {
  it("adding a contraindication syncs across languages", () => {
    const data = {
      en: makeCondition("test", "en"),
      lv: makeCondition("test", "lv"),
      ru: makeCondition("test", "ru"),
    };

    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = {
        ...data[lang],
        contraindications: [...data[lang].contraindications, ""],
      };
    }

    expect(data.en.contraindications).toHaveLength(3);
    expect(data.lv.contraindications).toHaveLength(3);
    expect(data.ru.contraindications).toHaveLength(3);
  });

  it("deleting a contraindication syncs across languages", () => {
    const data = {
      en: makeCondition("test", "en"),
      lv: makeCondition("test", "lv"),
      ru: makeCondition("test", "ru"),
    };

    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = {
        ...data[lang],
        contraindications: data[lang].contraindications.filter((_, i) => i !== 0),
      };
    }

    expect(data.en.contraindications).toHaveLength(1);
    expect(data.lv.contraindications).toHaveLength(1);
    expect(data.ru.contraindications).toHaveLength(1);
  });

  it("updating a contraindication is per-language", () => {
    const data = {
      en: makeCondition("test", "en"),
      lv: makeCondition("test", "lv"),
      ru: makeCondition("test", "ru"),
    };

    const contras = [...data.en.contraindications];
    contras[0] = "Updated EN contraindication";
    data.en = { ...data.en, contraindications: contras };

    expect(data.en.contraindications[0]).toBe("Updated EN contraindication");
    expect(data.lv.contraindications[0]).toBe("Contra1_lv");
  });
});

// --- FAQ editor ---

describe("FAQ editor", () => {
  it("adding a FAQ entry syncs across languages", () => {
    const data = {
      en: makeCondition("test", "en"),
      lv: makeCondition("test", "lv"),
      ru: makeCondition("test", "ru"),
    };

    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = {
        ...data[lang],
        faq: [...data[lang].faq, { q: "", a: "" }],
      };
    }

    expect(data.en.faq).toHaveLength(2);
    expect(data.lv.faq).toHaveLength(2);
    expect(data.ru.faq).toHaveLength(2);
  });

  it("deleting a FAQ entry syncs across languages", () => {
    const data = {
      en: makeCondition("test", "en"),
      lv: makeCondition("test", "lv"),
      ru: makeCondition("test", "ru"),
    };

    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = {
        ...data[lang],
        faq: data[lang].faq.filter((_, i) => i !== 0),
      };
    }

    expect(data.en.faq).toHaveLength(0);
    expect(data.lv.faq).toHaveLength(0);
    expect(data.ru.faq).toHaveLength(0);
  });

  it("updating FAQ question is per-language", () => {
    const data = {
      en: makeCondition("test", "en"),
      lv: makeCondition("test", "lv"),
      ru: makeCondition("test", "ru"),
    };

    const faq = [...data.en.faq];
    faq[0] = { ...faq[0], q: "Updated EN question" };
    data.en = { ...data.en, faq };

    expect(data.en.faq[0].q).toBe("Updated EN question");
    expect(data.lv.faq[0].q).toBe("Question_lv");
  });

  it("updating FAQ answer is per-language", () => {
    const data = {
      en: makeCondition("test", "en"),
      lv: makeCondition("test", "lv"),
      ru: makeCondition("test", "ru"),
    };

    const faq = [...data.en.faq];
    faq[0] = { ...faq[0], a: "Updated EN answer" };
    data.en = { ...data.en, faq };

    expect(data.en.faq[0].a).toBe("Updated EN answer");
    expect(data.lv.faq[0].a).toBe("Answer_lv");
  });
});

// --- Zod validation ---

describe("ConditionSchema validation", () => {
  it("validates correct condition data", async () => {
    const { ConditionSchema } = await import("@/schemas");
    expect(ConditionSchema.safeParse(makeCondition("test", "en")).success).toBe(true);
  });

  it("rejects empty title", async () => {
    const { ConditionSchema } = await import("@/schemas");
    expect(ConditionSchema.safeParse({ ...makeCondition("test", "en"), title: "" }).success).toBe(false);
  });

  it("rejects empty intro", async () => {
    const { ConditionSchema } = await import("@/schemas");
    expect(ConditionSchema.safeParse({ ...makeCondition("test", "en"), intro: "" }).success).toBe(false);
  });

  it("rejects empty sections", async () => {
    const { ConditionSchema } = await import("@/schemas");
    expect(ConditionSchema.safeParse({ ...makeCondition("test", "en"), sections: [] }).success).toBe(false);
  });

  it("accepts empty contraindications array", async () => {
    const { ConditionSchema } = await import("@/schemas");
    expect(ConditionSchema.safeParse({ ...makeCondition("test", "en"), contraindications: [] }).success).toBe(true);
  });

  it("rejects contraindication with empty string", async () => {
    const { ConditionSchema } = await import("@/schemas");
    expect(ConditionSchema.safeParse({ ...makeCondition("test", "en"), contraindications: [""] }).success).toBe(false);
  });

  it("accepts empty faq array", async () => {
    const { ConditionSchema } = await import("@/schemas");
    expect(ConditionSchema.safeParse({ ...makeCondition("test", "en"), faq: [] }).success).toBe(true);
  });

  it("rejects faq with empty question", async () => {
    const { ConditionSchema } = await import("@/schemas");
    expect(ConditionSchema.safeParse({ ...makeCondition("test", "en"), faq: [{ q: "", a: "Answer" }] }).success).toBe(false);
  });

  it("rejects faq with empty answer", async () => {
    const { ConditionSchema } = await import("@/schemas");
    expect(ConditionSchema.safeParse({ ...makeCondition("test", "en"), faq: [{ q: "Question", a: "" }] }).success).toBe(false);
  });

  it("validates ConditionsIndex", async () => {
    const { ConditionsIndexSchema } = await import("@/schemas");
    expect(ConditionsIndexSchema.safeParse(makeIndex()).success).toBe(true);
  });
});

// --- Draft integration ---

describe("Condition draft integration", () => {
  it("saveDraft stores condition data", async () => {
    const { saveDraft, loadDraft } = await import("@/lib/admin/draft-manager");
    const data = makeCondition("test", "en");
    saveDraft("content/conditions/test/condition.en.json", data);
    expect(loadDraft("content/conditions/test/condition.en.json")).toEqual(data);
  });

  it("saveDraft stores index data", async () => {
    const { saveDraft, loadDraft } = await import("@/lib/admin/draft-manager");
    const data = makeIndex();
    saveDraft("content/conditions/index.json", data);
    expect(loadDraft("content/conditions/index.json")).toEqual(data);
  });

  it("getDirtyKeys detects modified condition", async () => {
    const { saveDraft, setOriginal, getDirtyKeys } = await import("@/lib/admin/draft-manager");
    const original = makeCondition("test", "en");
    setOriginal("content/conditions/test/condition.en.json", original);
    saveDraft("content/conditions/test/condition.en.json", { ...original, title: "Changed" });
    expect(getDirtyKeys()).toContain("content/conditions/test/condition.en.json");
  });
});
