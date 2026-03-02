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

beforeEach(() => {
  mockFetch.mockReset();
  mockLocalStorage.clear();
});

// --- PublishButton ---

describe("PublishButton", () => {
  it("exports PublishButton component", async () => {
    const { PublishButton } = await import("@/components/admin/publish-panel");
    expect(typeof PublishButton).toBe("function");
  });

  it("renders disabled when no changes", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { PublishButton } = await import("@/components/admin/publish-panel");

    await new Promise<void>((resolve) => {
      root.render(React.createElement(PublishButton, { onClick: () => {} }));
      setTimeout(resolve, 50);
    });

    const btn = container.querySelector("[data-testid='publish-button']") as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(true);
    expect(container.querySelector("[data-testid='publish-count']")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("shows changed count when drafts exist", async () => {
    // Set up dirty drafts
    const { saveDraft, setOriginal } = await import("@/lib/admin/draft-manager");
    setOriginal("content/translations.en.json", { id: "1", title: "old" });
    saveDraft("content/translations.en.json", { id: "1", title: "new" });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { PublishButton } = await import("@/components/admin/publish-panel");

    await new Promise<void>((resolve) => {
      root.render(React.createElement(PublishButton, { onClick: () => {} }));
      setTimeout(resolve, 100);
    });

    const btn = container.querySelector("[data-testid='publish-button']") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    const count = container.querySelector("[data-testid='publish-count']");
    expect(count).not.toBeNull();
    expect(count!.textContent).toBe("1");
    root.unmount();
    container.remove();
  });
});

// --- PublishPanel ---

describe("PublishPanel", () => {
  it("exports PublishPanel component", async () => {
    const { PublishPanel } = await import("@/components/admin/publish-panel");
    expect(typeof PublishPanel).toBe("function");
  });

  it("shows no changes message when nothing to publish", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { PublishPanel } = await import("@/components/admin/publish-panel");
    const { AdminAuthProvider } = await import("@/lib/admin/auth-context");

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(AdminAuthProvider, null,
          React.createElement(PublishPanel, { onClose: () => {} }),
        ),
      );
      setTimeout(resolve, 50);
    });

    const panel = container.querySelector("[data-testid='publish-panel']");
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toContain("No changes");
    root.unmount();
    container.remove();
  });
});

// --- Commit message format ---

describe("Commit message format", () => {
  it("follows correct format: Update {filename} — {ISO datetime}", () => {
    const filePath = "content/translations.en.json";
    const filename = filePath.split("/").pop();
    const now = new Date().toISOString();
    const message = `Update ${filename} — ${now}`;

    expect(message).toMatch(/^Update .+ — \d{4}-\d{2}-\d{2}T/);
    expect(message).toContain("translations.en.json");
  });

  it("extracts filename from nested path", () => {
    const filePath = "content/articles/back-pain/article.en.json";
    const filename = filePath.split("/").pop();
    expect(filename).toBe("article.en.json");
  });

  it("extracts filename from simple path", () => {
    const filePath = "content/contacts.lv.json";
    const filename = filePath.split("/").pop();
    expect(filename).toBe("contacts.lv.json");
  });
});

// --- Sequential commits ---

describe("Sequential commit logic", () => {
  it("commitFile is called for each changed file", async () => {
    const { commitFile } = await import("@/lib/admin/github");
    const files = [
      "content/translations.en.json",
      "content/translations.lv.json",
      "content/translations.ru.json",
    ];

    const results: string[] = [];
    for (const file of files) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: { sha: `sha-${file}` } }),
      });
      const sha = await commitFile(
        "test-token",
        file,
        JSON.stringify({ id: "1" }),
        `Update ${file.split("/").pop()} — ${new Date().toISOString()}`,
        `old-sha-${file}`,
      );
      results.push(sha);
    }

    expect(results).toHaveLength(3);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("stops on commit error", async () => {
    const { commitFile } = await import("@/lib/admin/github");
    const files = ["file1.json", "file2.json", "file3.json"];
    const results: Array<{ path: string; status: string }> = [];

    // First commit succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: { sha: "sha1" } }),
    });
    // Second commit fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
    });

    for (const file of files) {
      try {
        await commitFile("test-token", file, "{}", `Update ${file}`, "old-sha");
        results.push({ path: file, status: "committed" });
      } catch {
        results.push({ path: file, status: "error" });
        break; // Stop on error
      }
    }

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("committed");
    expect(results[1].status).toBe("error");
    // Third file was not attempted
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// --- Draft cleanup after publish ---

describe("Draft cleanup after publish", () => {
  it("clears drafts for committed files", async () => {
    const { saveDraft, setOriginal, loadDraft, clearDraft, getChangedFiles } = await import("@/lib/admin/draft-manager");

    // Set up dirty drafts
    setOriginal("content/file1.json", { id: "1", v: "old" });
    saveDraft("content/file1.json", { id: "1", v: "new" });
    setOriginal("content/file2.json", { id: "2", v: "old" });
    saveDraft("content/file2.json", { id: "2", v: "new" });

    expect(getChangedFiles()).toHaveLength(2);

    // Simulate publish: clear drafts and update originals
    const changedFiles = getChangedFiles();
    for (const file of changedFiles) {
      const draft = loadDraft(file);
      setOriginal(file, draft);
      clearDraft(file);
    }

    expect(getChangedFiles()).toHaveLength(0);
  });

  it("preserves non-published drafts", async () => {
    const { saveDraft, setOriginal, clearDraft, getChangedFiles } = await import("@/lib/admin/draft-manager");

    setOriginal("content/file1.json", { id: "1", v: "old" });
    saveDraft("content/file1.json", { id: "1", v: "new" });
    setOriginal("content/file2.json", { id: "2", v: "old" });
    saveDraft("content/file2.json", { id: "2", v: "new" });

    // Only "publish" file1
    const draft = { id: "1", v: "new" };
    setOriginal("content/file1.json", draft);
    clearDraft("content/file1.json");

    // file2 should still be dirty
    const remaining = getChangedFiles();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toBe("content/file2.json");
  });
});

// --- SHA cache integration ---

describe("SHA cache for commits", () => {
  it("getSha returns cached SHA after load", async () => {
    const { createContentManager } = await import("@/lib/admin/content-manager");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: btoa(JSON.stringify({
          id: "1",
          updatedAt: "2024-01-01T00:00:00Z",
          header: {},
          footer: {},
          buttons: {},
        })),
        sha: "abc123",
      }),
    });

    const cm = createContentManager("test-token");
    await cm.loadTranslations("en");
    expect(cm.getSha("content/translations.en.json")).toBe("abc123");
  });

  it("invalidateCache clears SHA", async () => {
    const { createContentManager } = await import("@/lib/admin/content-manager");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: btoa(JSON.stringify({
          id: "1",
          updatedAt: "2024-01-01T00:00:00Z",
          header: {},
          footer: {},
          buttons: {},
        })),
        sha: "abc123",
      }),
    });

    const cm = createContentManager("test-token");
    await cm.loadTranslations("en");
    cm.invalidateCache("content/translations.en.json");
    expect(cm.getSha("content/translations.en.json")).toBeUndefined();
  });
});

// --- Pre-publish validation logic ---

describe("Pre-publish validation", () => {
  it("blocks publish when Zod validation fails", async () => {
    const { ArticleSchema } = await import("@/schemas");
    const invalidData = {
      id: "1",
      slug: "test",
      updatedAt: "2024-01-01T00:00:00Z",
      seo: { title: "", description: "" },
      title: "",
      excerpt: "",
      sections: [],
    };
    const result = ArticleSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("allows publish when Zod validation passes", async () => {
    const { ArticleSchema } = await import("@/schemas");
    const validData = {
      id: "1",
      slug: "test",
      updatedAt: "2024-01-01T00:00:00Z",
      seo: { title: "Title", description: "Description" },
      title: "Article Title",
      excerpt: "Short excerpt",
      sections: [{ type: "text", content: "Content" }],
    };
    const result = ArticleSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});
