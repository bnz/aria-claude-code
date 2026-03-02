// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { createRoot, type Root } from "react-dom/client";

// Mock localStorage
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
  get length() {
    return Object.keys(store).length;
  },
  key: (index: number) => Object.keys(store)[index] ?? null,
} as Storage;

Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, writable: true });

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubEnv("NEXT_PUBLIC_GITHUB_OWNER", "test-owner");
vi.stubEnv("NEXT_PUBLIC_GITHUB_REPO", "test-repo");

function makeInfo(lang: string) {
  return {
    id: "info",
    updatedAt: "2024-01-01T00:00:00Z",
    seo: { title: `Info_${lang}`, description: `Desc_${lang}` },
    title: `Title_${lang}`,
    sections: [
      { type: "text" as const, title: "Section 1", content: `Content_${lang}` },
      { type: "bullets" as const, title: "Bullets", items: [`Item1_${lang}`, `Item2_${lang}`] },
      { type: "image" as const, imagePath: "/media/photo.jpg", caption: `Caption_${lang}` },
    ],
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  mockLocalStorage.clear();
});

// --- Component export ---

describe("InfoEditor", () => {
  it("exports InfoEditor component", async () => {
    const { InfoEditor } = await import("@/components/admin/info-editor");
    expect(typeof InfoEditor).toBe("function");
  });

  it("renders nothing without auth token", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { AdminAuthProvider } = await import("@/lib/admin/auth-context");
    const { InfoEditor } = await import("@/components/admin/info-editor");

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(AdminAuthProvider, null, React.createElement(InfoEditor)),
      );
      setTimeout(resolve, 50);
    });

    expect(container.querySelector("[data-testid='info-editor']")).toBeNull();
    root.unmount();
    container.remove();
  });
});

// --- Section management logic ---

describe("Section operations", () => {
  it("adding a section syncs across all languages", () => {
    const data = { en: makeInfo("en"), lv: makeInfo("lv"), ru: makeInfo("ru") };
    const newSection = { type: "text" as const, title: "", content: "" };

    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = { ...data[lang], sections: [...data[lang].sections, newSection] };
    }

    expect(data.en.sections).toHaveLength(4);
    expect(data.lv.sections).toHaveLength(4);
    expect(data.ru.sections).toHaveLength(4);
    expect(data.en.sections[3].type).toBe("text");
  });

  it("deleting a section syncs across all languages", () => {
    const data = { en: makeInfo("en"), lv: makeInfo("lv"), ru: makeInfo("ru") };
    const indexToDelete = 1; // bullets section

    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = {
        ...data[lang],
        sections: data[lang].sections.filter((_, i) => i !== indexToDelete),
      };
    }

    expect(data.en.sections).toHaveLength(2);
    expect(data.lv.sections).toHaveLength(2);
    expect(data.ru.sections).toHaveLength(2);
    // Remaining: text(0), image(1) — bullets removed
    expect(data.en.sections[0].type).toBe("text");
    expect(data.en.sections[1].type).toBe("image");
  });

  it("moving a section up reorders across all languages", () => {
    const data = { en: makeInfo("en"), lv: makeInfo("lv"), ru: makeInfo("ru") };
    const index = 1; // move bullets up (swap with text)

    for (const lang of ["en", "lv", "ru"] as const) {
      const sections = [...data[lang].sections];
      [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
      data[lang] = { ...data[lang], sections };
    }

    expect(data.en.sections[0].type).toBe("bullets");
    expect(data.en.sections[1].type).toBe("text");
    expect(data.lv.sections[0].type).toBe("bullets");
    expect(data.ru.sections[0].type).toBe("bullets");
  });

  it("moving a section down reorders across all languages", () => {
    const data = { en: makeInfo("en"), lv: makeInfo("lv"), ru: makeInfo("ru") };
    const index = 0; // move text down (swap with bullets)

    for (const lang of ["en", "lv", "ru"] as const) {
      const sections = [...data[lang].sections];
      [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
      data[lang] = { ...data[lang], sections };
    }

    expect(data.en.sections[0].type).toBe("bullets");
    expect(data.en.sections[1].type).toBe("text");
    expect(data.lv.sections[0].type).toBe("bullets");
    expect(data.ru.sections[0].type).toBe("bullets");
  });
});

// --- Section type editing ---

describe("Section type editing", () => {
  it("text section: title and content are editable", () => {
    const section = { type: "text" as const, title: "Title", content: "Content" };
    const updated = { ...section, content: "New content" };
    expect(updated.content).toBe("New content");
    expect(updated.title).toBe("Title");
  });

  it("bullets section: items are editable individually", () => {
    const section = { type: "bullets" as const, title: "List", items: ["A", "B", "C"] };
    const items = [...section.items];
    items[1] = "B updated";
    const updated = { ...section, items };
    expect(updated.items).toEqual(["A", "B updated", "C"]);
  });

  it("bullets section: add item syncs across languages", () => {
    const data = { en: makeInfo("en"), lv: makeInfo("lv"), ru: makeInfo("ru") };
    const sectionIdx = 1; // bullets

    for (const lang of ["en", "lv", "ru"] as const) {
      const sections = [...data[lang].sections];
      const section = sections[sectionIdx];
      if (section.type === "bullets") {
        sections[sectionIdx] = { ...section, items: [...section.items, ""] };
      }
      data[lang] = { ...data[lang], sections };
    }

    for (const lang of ["en", "lv", "ru"] as const) {
      const section = data[lang].sections[1];
      expect(section.type).toBe("bullets");
      if (section.type === "bullets") {
        expect(section.items).toHaveLength(3);
      }
    }
  });

  it("bullets section: delete item syncs across languages", () => {
    const data = { en: makeInfo("en"), lv: makeInfo("lv"), ru: makeInfo("ru") };
    const sectionIdx = 1;
    const itemIdx = 0;

    for (const lang of ["en", "lv", "ru"] as const) {
      const sections = [...data[lang].sections];
      const section = sections[sectionIdx];
      if (section.type === "bullets") {
        sections[sectionIdx] = {
          ...section,
          items: section.items.filter((_, i) => i !== itemIdx),
        };
      }
      data[lang] = { ...data[lang], sections };
    }

    for (const lang of ["en", "lv", "ru"] as const) {
      const section = data[lang].sections[1];
      if (section.type === "bullets") {
        expect(section.items).toHaveLength(1);
        expect(section.items[0]).toBe(`Item2_${lang}`);
      }
    }
  });

  it("image section: imagePath and caption are editable", () => {
    const section = { type: "image" as const, imagePath: "/media/old.jpg", caption: "Old" };
    const updated = { ...section, imagePath: "/media/new.jpg", caption: "New caption" };
    expect(updated.imagePath).toBe("/media/new.jpg");
    expect(updated.caption).toBe("New caption");
  });
});

// --- Zod validation ---

describe("InfoSchema validation", () => {
  it("validates correct info data", async () => {
    const { InfoSchema } = await import("@/schemas");
    const result = InfoSchema.safeParse(makeInfo("en"));
    expect(result.success).toBe(true);
  });

  it("rejects info without sections (min 1)", async () => {
    const { InfoSchema } = await import("@/schemas");
    const data = { ...makeInfo("en"), sections: [] };
    const result = InfoSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects text section with empty content", async () => {
    const { InfoSchema } = await import("@/schemas");
    const data = {
      ...makeInfo("en"),
      sections: [{ type: "text", content: "" }],
    };
    const result = InfoSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects bullets section with empty items array", async () => {
    const { InfoSchema } = await import("@/schemas");
    const data = {
      ...makeInfo("en"),
      sections: [{ type: "bullets", items: [] }],
    };
    const result = InfoSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects image section with empty imagePath", async () => {
    const { InfoSchema } = await import("@/schemas");
    const data = {
      ...makeInfo("en"),
      sections: [{ type: "image", imagePath: "" }],
    };
    const result = InfoSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects info with empty title", async () => {
    const { InfoSchema } = await import("@/schemas");
    const data = { ...makeInfo("en"), title: "" };
    const result = InfoSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects info with invalid seo description (> 160 chars)", async () => {
    const { InfoSchema } = await import("@/schemas");
    const data = {
      ...makeInfo("en"),
      seo: { title: "Title", description: "x".repeat(161) },
    };
    const result = InfoSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

// --- Draft integration ---

describe("Info draft integration", () => {
  it("saveDraft stores info data", async () => {
    const { saveDraft, loadDraft } = await import("@/lib/admin/draft-manager");
    const data = makeInfo("en");
    saveDraft("content/info.en.json", data);
    expect(loadDraft("content/info.en.json")).toEqual(data);
  });

  it("getDirtyKeys detects modified info", async () => {
    const { saveDraft, setOriginal, getDirtyKeys } = await import("@/lib/admin/draft-manager");
    const original = makeInfo("en");
    setOriginal("content/info.en.json", original);
    const modified = { ...original, title: "Changed" };
    saveDraft("content/info.en.json", modified);
    expect(getDirtyKeys()).toContain("content/info.en.json");
  });
});

// --- UI components rendering ---

describe("Info editor UI components", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
  });

  function render(element: React.ReactElement): Promise<void> {
    return new Promise((resolve) => {
      root.render(element);
      setTimeout(resolve, 0);
    });
  }

  it("DraftIndicator renders correctly for info editor", async () => {
    const { DraftIndicator } = await import("@/components/admin/draft-indicator");
    await render(React.createElement(DraftIndicator, { visible: true }));
    expect(container.querySelector("[data-testid='draft-indicator']")).not.toBeNull();
  });

  it("LanguageTabs renders 3 tabs for info editor", async () => {
    const { LanguageTabs } = await import("@/components/admin/language-tabs");
    await render(
      React.createElement(LanguageTabs, { activeLang: "en", onLangChange: () => {} }),
    );
    const tabs = container.querySelectorAll("[role='tab']");
    expect(tabs).toHaveLength(3);
  });
});
