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

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock env
vi.stubEnv("NEXT_PUBLIC_GITHUB_OWNER", "test-owner");
vi.stubEnv("NEXT_PUBLIC_GITHUB_REPO", "test-repo");

// --- Helpers ---

function makeTranslation(lang: string) {
  return {
    id: "translations",
    updatedAt: "2024-01-01T00:00:00Z",
    header: { navHome: `Home_${lang}`, navInfo: `Info_${lang}` },
    footer: { copyright: `Copyright_${lang}` },
    buttons: { callToAction: `CTA_${lang}` },
  };
}

function mockFetchResponse(content: Record<string, unknown>, sha: string) {
  const jsonStr = JSON.stringify(content);
  const base64 = btoa(jsonStr);
  return {
    ok: true,
    json: async () => ({ content: base64, sha }),
  };
}

function setupFetchMocks() {
  // fetchFile calls for en, lv, ru translations
  mockFetch
    .mockResolvedValueOnce(mockFetchResponse(makeTranslation("en"), "sha-en"))
    .mockResolvedValueOnce(mockFetchResponse(makeTranslation("lv"), "sha-lv"))
    .mockResolvedValueOnce(mockFetchResponse(makeTranslation("ru"), "sha-ru"));
}

// We need a wrapper that provides AdminAuthContext
async function createWrapper() {
  const { AdminAuthProvider } = await import("@/lib/admin/auth-context");
  return AdminAuthProvider;
}

// --- Tests ---

describe("TranslationsEditor", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mockFetch.mockReset();
    mockLocalStorage.clear();
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
      setTimeout(resolve, 50);
    });
  }

  it("exports TranslationsEditor component", async () => {
    const { TranslationsEditor } = await import("@/components/admin/translations-editor");
    expect(typeof TranslationsEditor).toBe("function");
  });

  it("renders nothing without auth token (null token)", async () => {
    // TranslationsEditor uses useAdminAuth().token — when token is null,
    // contentManager is null and the component returns null until loading starts.
    // This test verifies it doesn't crash without a token.
    const { TranslationsEditor } = await import("@/components/admin/translations-editor");

    // We need AdminAuthProvider to provide the context
    const AuthProvider = await createWrapper();

    await render(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(TranslationsEditor),
      ),
    );

    // Without a valid token, the editor should not render the main editor UI
    const editor = container.querySelector("[data-testid='translations-editor']");
    expect(editor).toBeNull();
  });
});

// --- Draft Manager Integration Tests ---

describe("TranslationsEditor draft integration", () => {
  it("saveDraft stores translation data to localStorage", async () => {
    const { saveDraft, loadDraft } = await import("@/lib/admin/draft-manager");
    const data = makeTranslation("en");

    saveDraft("content/translations.en.json", data);

    const loaded = loadDraft("content/translations.en.json");
    expect(loaded).toEqual(data);
  });

  it("getDirtyKeys detects changes in translations", async () => {
    const { saveDraft, setOriginal, getDirtyKeys } = await import("@/lib/admin/draft-manager");

    const original = makeTranslation("en");
    setOriginal("content/translations.en.json", original);

    const modified = { ...original, header: { ...original.header, navHome: "Modified" } };
    saveDraft("content/translations.en.json", modified);

    const dirty = getDirtyKeys();
    expect(dirty).toContain("content/translations.en.json");
  });

  it("getDirtyKeys does not include unchanged translations", async () => {
    const { saveDraft, setOriginal, getDirtyKeys } = await import("@/lib/admin/draft-manager");

    const data = makeTranslation("lv");
    setOriginal("content/translations.lv.json", data);
    saveDraft("content/translations.lv.json", data);

    const dirty = getDirtyKeys();
    expect(dirty).not.toContain("content/translations.lv.json");
  });
});

// --- Zod Validation Tests ---

describe("TranslationsSchema validation", () => {
  it("validates correct translation data", async () => {
    const { TranslationsSchema } = await import("@/schemas");
    const data = makeTranslation("en");
    const result = TranslationsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects translation without id", async () => {
    const { TranslationsSchema } = await import("@/schemas");
    const data = {
      updatedAt: "2024-01-01T00:00:00Z",
      header: {},
      footer: {},
      buttons: {},
    };
    const result = TranslationsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects translation with invalid updatedAt", async () => {
    const { TranslationsSchema } = await import("@/schemas");
    const data = {
      id: "translations",
      updatedAt: "not-a-date",
      header: {},
      footer: {},
      buttons: {},
    };
    const result = TranslationsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("allows empty groups (header, footer, buttons)", async () => {
    const { TranslationsSchema } = await import("@/schemas");
    const data = {
      id: "translations",
      updatedAt: "2024-01-01T00:00:00Z",
      header: {},
      footer: {},
      buttons: {},
    };
    const result = TranslationsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

// --- Add/Delete key logic tests ---

describe("Translation key management logic", () => {
  it("adding a key to all languages creates synchronized entries", () => {
    const data = {
      en: makeTranslation("en"),
      lv: makeTranslation("lv"),
      ru: makeTranslation("ru"),
    };

    // Simulate adding "newKey" to header group
    const group = "header" as const;
    const newKey = "newNavItem";

    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = {
        ...data[lang],
        [group]: {
          ...data[lang][group],
          [newKey]: `value_${lang}`,
        },
      };
    }

    expect(data.en.header.newNavItem).toBe("value_en");
    expect(data.lv.header.newNavItem).toBe("value_lv");
    expect(data.ru.header.newNavItem).toBe("value_ru");
  });

  it("deleting a key from all languages removes it synchronously", () => {
    const data = {
      en: makeTranslation("en"),
      lv: makeTranslation("lv"),
      ru: makeTranslation("ru"),
    };

    const group = "header" as const;
    const keyToDelete = "navHome";

    for (const lang of ["en", "lv", "ru"] as const) {
      const groupCopy = { ...data[lang][group] };
      delete groupCopy[keyToDelete];
      data[lang] = {
        ...data[lang],
        [group]: groupCopy,
      };
    }

    expect("navHome" in data.en.header).toBe(false);
    expect("navHome" in data.lv.header).toBe(false);
    expect("navHome" in data.ru.header).toBe(false);
    // Other keys preserved
    expect("navInfo" in data.en.header).toBe(true);
  });
});

// --- DraftRecoveryDialog and DraftIndicator rendering ---

describe("Draft UI components rendering", () => {
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
      setTimeout(resolve, 50);
    });
  }

  it("DraftRecoveryDialog renders with restore and discard buttons", async () => {
    const { DraftRecoveryDialog } = await import("@/components/admin/draft-recovery-dialog");
    const onRestore = vi.fn();
    const onDiscard = vi.fn();

    await render(
      React.createElement(DraftRecoveryDialog, { onRestore, onDiscard }),
    );

    const dialog = container.querySelector("[data-testid='draft-recovery-dialog']");
    expect(dialog).not.toBeNull();

    const restoreBtn = container.querySelector("[data-testid='draft-restore-btn']") as HTMLButtonElement;
    expect(restoreBtn).not.toBeNull();
    expect(restoreBtn.textContent).toContain("Restore");
    restoreBtn.click();
    expect(onRestore).toHaveBeenCalledOnce();

    const discardBtn = container.querySelector("[data-testid='draft-discard-btn']") as HTMLButtonElement;
    expect(discardBtn).not.toBeNull();
    expect(discardBtn.textContent).toContain("Discard");
    discardBtn.click();
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("DraftIndicator shows yellow dot when visible", async () => {
    const { DraftIndicator } = await import("@/components/admin/draft-indicator");

    await render(React.createElement(DraftIndicator, { visible: true }));

    const dot = container.querySelector("[data-testid='draft-indicator']");
    expect(dot).not.toBeNull();
    expect(dot!.getAttribute("aria-label")).toBe("Unsaved changes");
  });

  it("DraftIndicator renders nothing when not visible", async () => {
    const { DraftIndicator } = await import("@/components/admin/draft-indicator");

    await render(React.createElement(DraftIndicator, { visible: false }));

    const dot = container.querySelector("[data-testid='draft-indicator']");
    expect(dot).toBeNull();
  });
});
