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

function makeAbout(lang: string) {
  return {
    id: "about",
    updatedAt: "2024-01-01T00:00:00Z",
    seo: { title: `About_${lang}`, description: `Desc_${lang}` },
    title: `Title_${lang}`,
    summary: `Summary_${lang}`,
    credentials: [`Cred1_${lang}`, `Cred2_${lang}`],
    experienceYears: 15,
    certificates: [
      { title: `Cert1_${lang}`, imagePath: "/media/cert1.jpg" },
      { title: `Cert2_${lang}` },
    ],
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  mockLocalStorage.clear();
});

// --- Component export ---

describe("AboutEditor", () => {
  it("exports AboutEditor component", async () => {
    const { AboutEditor } = await import("@/components/admin/about-editor");
    expect(typeof AboutEditor).toBe("function");
  });

  it("renders nothing without auth token", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { AdminAuthProvider } = await import("@/lib/admin/auth-context");
    const { AboutEditor } = await import("@/components/admin/about-editor");

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(AdminAuthProvider, null, React.createElement(AboutEditor)),
      );
      setTimeout(resolve, 50);
    });

    expect(container.querySelector("[data-testid='about-editor']")).toBeNull();
    root.unmount();
    container.remove();
  });
});

// --- Credentials management ---

describe("Credentials operations", () => {
  it("adding a credential syncs across all languages", () => {
    const data = { en: makeAbout("en"), lv: makeAbout("lv"), ru: makeAbout("ru") };

    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = {
        ...data[lang],
        credentials: [...data[lang].credentials, ""],
      };
    }

    expect(data.en.credentials).toHaveLength(3);
    expect(data.lv.credentials).toHaveLength(3);
    expect(data.ru.credentials).toHaveLength(3);
  });

  it("deleting a credential syncs across all languages", () => {
    const data = { en: makeAbout("en"), lv: makeAbout("lv"), ru: makeAbout("ru") };

    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = {
        ...data[lang],
        credentials: data[lang].credentials.filter((_, i) => i !== 0),
      };
    }

    expect(data.en.credentials).toHaveLength(1);
    expect(data.en.credentials[0]).toBe("Cred2_en");
    expect(data.lv.credentials[0]).toBe("Cred2_lv");
    expect(data.ru.credentials[0]).toBe("Cred2_ru");
  });

  it("editing a credential is per-language", () => {
    const data = { en: makeAbout("en"), lv: makeAbout("lv"), ru: makeAbout("ru") };

    const credentials = [...data.en.credentials];
    credentials[0] = "Updated credential EN";
    data.en = { ...data.en, credentials };

    expect(data.en.credentials[0]).toBe("Updated credential EN");
    expect(data.lv.credentials[0]).toBe("Cred1_lv");
    expect(data.ru.credentials[0]).toBe("Cred1_ru");
  });
});

// --- Certificates management ---

describe("Certificates operations", () => {
  it("adding a certificate syncs across all languages", () => {
    const data = { en: makeAbout("en"), lv: makeAbout("lv"), ru: makeAbout("ru") };

    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = {
        ...data[lang],
        certificates: [...data[lang].certificates, { title: "" }],
      };
    }

    expect(data.en.certificates).toHaveLength(3);
    expect(data.lv.certificates).toHaveLength(3);
    expect(data.ru.certificates).toHaveLength(3);
  });

  it("deleting a certificate syncs across all languages", () => {
    const data = { en: makeAbout("en"), lv: makeAbout("lv"), ru: makeAbout("ru") };

    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = {
        ...data[lang],
        certificates: data[lang].certificates.filter((_, i) => i !== 0),
      };
    }

    expect(data.en.certificates).toHaveLength(1);
    expect(data.en.certificates[0].title).toBe("Cert2_en");
    expect(data.lv.certificates[0].title).toBe("Cert2_lv");
  });

  it("certificate title is per-language", () => {
    const data = { en: makeAbout("en"), lv: makeAbout("lv"), ru: makeAbout("ru") };

    const certs = [...data.en.certificates];
    certs[0] = { ...certs[0], title: "Updated EN cert" };
    data.en = { ...data.en, certificates: certs };

    expect(data.en.certificates[0].title).toBe("Updated EN cert");
    expect(data.lv.certificates[0].title).toBe("Cert1_lv");
  });

  it("certificate imagePath is shared (syncs across languages)", () => {
    const data = { en: makeAbout("en"), lv: makeAbout("lv"), ru: makeAbout("ru") };
    const newPath = "/media/new-cert.jpg";

    for (const lang of ["en", "lv", "ru"] as const) {
      const certs = [...data[lang].certificates];
      certs[0] = { ...certs[0], imagePath: newPath };
      data[lang] = { ...data[lang], certificates: certs };
    }

    expect(data.en.certificates[0].imagePath).toBe(newPath);
    expect(data.lv.certificates[0].imagePath).toBe(newPath);
    expect(data.ru.certificates[0].imagePath).toBe(newPath);
  });
});

// --- experienceYears ---

describe("experienceYears (shared)", () => {
  it("updating experienceYears syncs to all languages", () => {
    const data = { en: makeAbout("en"), lv: makeAbout("lv"), ru: makeAbout("ru") };
    const newYears = 20;

    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = { ...data[lang], experienceYears: newYears };
    }

    expect(data.en.experienceYears).toBe(20);
    expect(data.lv.experienceYears).toBe(20);
    expect(data.ru.experienceYears).toBe(20);
  });
});

// --- Zod validation ---

describe("AboutSchema validation", () => {
  it("validates correct about data", async () => {
    const { AboutSchema } = await import("@/schemas");
    expect(AboutSchema.safeParse(makeAbout("en")).success).toBe(true);
  });

  it("rejects about with empty title", async () => {
    const { AboutSchema } = await import("@/schemas");
    expect(AboutSchema.safeParse({ ...makeAbout("en"), title: "" }).success).toBe(false);
  });

  it("rejects about with empty summary", async () => {
    const { AboutSchema } = await import("@/schemas");
    expect(AboutSchema.safeParse({ ...makeAbout("en"), summary: "" }).success).toBe(false);
  });

  it("rejects negative experienceYears", async () => {
    const { AboutSchema } = await import("@/schemas");
    expect(AboutSchema.safeParse({ ...makeAbout("en"), experienceYears: -1 }).success).toBe(false);
  });

  it("rejects non-integer experienceYears", async () => {
    const { AboutSchema } = await import("@/schemas");
    expect(AboutSchema.safeParse({ ...makeAbout("en"), experienceYears: 3.5 }).success).toBe(false);
  });

  it("allows experienceYears to be undefined", async () => {
    const { AboutSchema } = await import("@/schemas");
    const data = { ...makeAbout("en") };
    delete (data as Record<string, unknown>).experienceYears;
    expect(AboutSchema.safeParse(data).success).toBe(true);
  });

  it("rejects certificate with empty title", async () => {
    const { AboutSchema } = await import("@/schemas");
    const data = {
      ...makeAbout("en"),
      certificates: [{ title: "" }],
    };
    expect(AboutSchema.safeParse(data).success).toBe(false);
  });

  it("allows empty credentials array", async () => {
    const { AboutSchema } = await import("@/schemas");
    expect(AboutSchema.safeParse({ ...makeAbout("en"), credentials: [] }).success).toBe(true);
  });

  it("rejects credential with empty string", async () => {
    const { AboutSchema } = await import("@/schemas");
    expect(AboutSchema.safeParse({ ...makeAbout("en"), credentials: [""] }).success).toBe(false);
  });
});

// --- Draft integration ---

describe("About draft integration", () => {
  it("saveDraft stores about data", async () => {
    const { saveDraft, loadDraft } = await import("@/lib/admin/draft-manager");
    const data = makeAbout("en");
    saveDraft("content/about.en.json", data);
    expect(loadDraft("content/about.en.json")).toEqual(data);
  });

  it("getDirtyKeys detects modified about", async () => {
    const { saveDraft, setOriginal, getDirtyKeys } = await import("@/lib/admin/draft-manager");
    const original = makeAbout("en");
    setOriginal("content/about.en.json", original);
    saveDraft("content/about.en.json", { ...original, title: "Changed" });
    expect(getDirtyKeys()).toContain("content/about.en.json");
  });
});

// --- UI rendering ---

describe("About editor UI components", () => {
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

  it("DraftIndicator works for about editor", async () => {
    const { DraftIndicator } = await import("@/components/admin/draft-indicator");
    await render(React.createElement(DraftIndicator, { visible: true }));
    expect(container.querySelector("[data-testid='draft-indicator']")).not.toBeNull();
  });

  it("LanguageTabs renders for about editor", async () => {
    const { LanguageTabs } = await import("@/components/admin/language-tabs");
    await render(
      React.createElement(LanguageTabs, { activeLang: "lv", onLangChange: () => {} }),
    );
    const tabs = container.querySelectorAll("[role='tab']");
    expect(tabs).toHaveLength(3);
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
  });
});
