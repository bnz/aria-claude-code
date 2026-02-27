import { describe, it, expect, beforeEach } from "vitest";
import {
  saveDraft,
  loadDraft,
  hasDraft,
  clearDraft,
  clearAllDrafts,
  setOriginal,
  getDirtyKeys,
  getChangedFiles,
  invalidateOriginal,
} from "@/lib/admin/draft-manager";

// Mock localStorage for node environment
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

beforeEach(() => {
  mockLocalStorage.clear();
});

// --- saveDraft / loadDraft ---

describe("saveDraft / loadDraft", () => {
  it("saves and loads a draft object", () => {
    const data = { id: "tr-en", title: "Hello" };
    saveDraft("translations.en", data);

    const loaded = loadDraft("translations.en");
    expect(loaded).toEqual(data);
  });

  it("returns null when no draft exists", () => {
    expect(loadDraft("nonexistent")).toBeNull();
  });

  it("overwrites existing draft on re-save", () => {
    saveDraft("contacts.en", { phone: "123" });
    saveDraft("contacts.en", { phone: "456" });

    const loaded = loadDraft("contacts.en");
    expect(loaded).toEqual({ phone: "456" });
  });

  it("handles complex nested data", () => {
    const data = {
      id: "art-1",
      sections: [
        { type: "text", content: "paragraph" },
        { type: "image", imagePath: "/media/photo.jpg" },
      ],
    };
    saveDraft("articles/stress/article.en", data);

    const loaded = loadDraft("articles/stress/article.en");
    expect(loaded).toEqual(data);
  });
});

// --- hasDraft ---

describe("hasDraft", () => {
  it("returns true when draft exists", () => {
    saveDraft("info.en", { title: "Info" });
    expect(hasDraft("info.en")).toBe(true);
  });

  it("returns false when no draft exists", () => {
    expect(hasDraft("missing")).toBe(false);
  });
});

// --- clearDraft ---

describe("clearDraft", () => {
  it("removes specific draft", () => {
    saveDraft("contacts.en", { phone: "123" });
    saveDraft("contacts.lv", { phone: "456" });

    clearDraft("contacts.en");

    expect(hasDraft("contacts.en")).toBe(false);
    expect(hasDraft("contacts.lv")).toBe(true);
  });

  it("also removes the original for the same key", () => {
    saveDraft("info.en", { title: "Draft" });
    setOriginal("info.en", { title: "Original" });

    clearDraft("info.en");

    expect(hasDraft("info.en")).toBe(false);
    expect(localStorage.getItem("cms_original:info.en")).toBeNull();
  });
});

// --- clearAllDrafts ---

describe("clearAllDrafts", () => {
  it("removes all drafts and originals", () => {
    saveDraft("contacts.en", { phone: "1" });
    saveDraft("info.lv", { title: "Info" });
    setOriginal("contacts.en", { phone: "0" });
    setOriginal("info.lv", { title: "Old" });

    // Add a non-draft item to verify it's not removed
    localStorage.setItem("admin_github_token", "ghp_test");

    clearAllDrafts();

    expect(hasDraft("contacts.en")).toBe(false);
    expect(hasDraft("info.lv")).toBe(false);
    expect(localStorage.getItem("cms_original:contacts.en")).toBeNull();
    expect(localStorage.getItem("cms_original:info.lv")).toBeNull();
    // Non-draft items should be preserved
    expect(localStorage.getItem("admin_github_token")).toBe("ghp_test");
  });
});

// --- setOriginal / getDirtyKeys ---

describe("getDirtyKeys", () => {
  it("returns empty array when no drafts exist", () => {
    expect(getDirtyKeys()).toEqual([]);
  });

  it("returns keys where draft differs from original", () => {
    setOriginal("contacts.en", { phone: "111" });
    saveDraft("contacts.en", { phone: "222" });

    setOriginal("info.en", { title: "Same" });
    saveDraft("info.en", { title: "Same" });

    const dirty = getDirtyKeys();
    expect(dirty).toContain("contacts.en");
    expect(dirty).not.toContain("info.en");
  });

  it("treats draft without original as dirty", () => {
    saveDraft("new-file.json", { content: "new" });

    const dirty = getDirtyKeys();
    expect(dirty).toContain("new-file.json");
  });

  it("returns multiple dirty keys", () => {
    setOriginal("a", { v: 1 });
    saveDraft("a", { v: 2 });

    setOriginal("b", { v: 3 });
    saveDraft("b", { v: 4 });

    setOriginal("c", { v: 5 });
    saveDraft("c", { v: 5 });

    const dirty = getDirtyKeys();
    expect(dirty).toHaveLength(2);
    expect(dirty).toContain("a");
    expect(dirty).toContain("b");
  });
});

// --- getChangedFiles ---

describe("getChangedFiles", () => {
  it("returns the same result as getDirtyKeys", () => {
    setOriginal("contacts.en", { phone: "111" });
    saveDraft("contacts.en", { phone: "222" });

    expect(getChangedFiles()).toEqual(getDirtyKeys());
  });
});

// --- invalidateOriginal ---

describe("invalidateOriginal", () => {
  it("removes only the original, not the draft", () => {
    setOriginal("info.en", { title: "Original" });
    saveDraft("info.en", { title: "Draft" });

    invalidateOriginal("info.en");

    expect(localStorage.getItem("cms_original:info.en")).toBeNull();
    expect(hasDraft("info.en")).toBe(true);
  });
});

// --- Draft recovery scenario ---

describe("Draft recovery after reload", () => {
  it("draft persists and can be recovered", () => {
    // Simulate: user edits data and it gets auto-saved
    const editedData = {
      id: "tr-en",
      updatedAt: "2024-01-01T00:00:00Z",
      header: { home: "Home Page" },
      footer: {},
      buttons: { submit: "Send" },
    };
    saveDraft("content/translations.en.json", editedData);

    // Simulate: page reload — draft is still there
    expect(hasDraft("content/translations.en.json")).toBe(true);

    const recovered = loadDraft("content/translations.en.json");
    expect(recovered).toEqual(editedData);
  });

  it("clearing draft removes it permanently", () => {
    saveDraft("content/info.lv.json", { title: "Draft" });
    clearDraft("content/info.lv.json");

    expect(hasDraft("content/info.lv.json")).toBe(false);
    expect(loadDraft("content/info.lv.json")).toBeNull();
  });
});
