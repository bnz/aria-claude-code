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

vi.stubEnv("NEXT_PUBLIC_GITHUB_OWNER", "test-owner");
vi.stubEnv("NEXT_PUBLIC_GITHUB_REPO", "test-repo");

beforeEach(() => {
  mockLocalStorage.clear();
});

// --- validateCrossLang ---

describe("validateCrossLang", () => {
  it("returns valid for consistent data", async () => {
    const { validateCrossLang } = await import("@/lib/admin/cross-lang-validation");
    const data = {
      en: { id: "1", slug: "test", title: "Title EN", seo: { title: "SEO EN", description: "Desc EN" }, sections: [{ type: "text", content: "C" }] },
      lv: { id: "1", slug: "test", title: "Title LV", seo: { title: "SEO LV", description: "Desc LV" }, sections: [{ type: "text", content: "C" }] },
      ru: { id: "1", slug: "test", title: "Title RU", seo: { title: "SEO RU", description: "Desc RU" }, sections: [{ type: "text", content: "C" }] },
    };
    const result = validateCrossLang("article", data);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("detects id mismatch between languages", async () => {
    const { validateCrossLang } = await import("@/lib/admin/cross-lang-validation");
    const data = {
      en: { id: "1", title: "T" },
      lv: { id: "2", title: "T" },
      ru: { id: "1", title: "T" },
    };
    const result = validateCrossLang("translations", data);
    expect(result.valid).toBe(false);
    const idIssue = result.issues.find((i) => i.field === "id");
    expect(idIssue).toBeDefined();
    expect(idIssue!.severity).toBe("error");
    expect(idIssue!.message).toContain("mismatch");
  });

  it("detects slug mismatch between languages", async () => {
    const { validateCrossLang } = await import("@/lib/admin/cross-lang-validation");
    const data = {
      en: { id: "1", slug: "back-pain", title: "T" },
      lv: { id: "1", slug: "muguras-sapes", title: "T" },
      ru: { id: "1", slug: "back-pain", title: "T" },
    };
    const result = validateCrossLang("condition", data);
    expect(result.valid).toBe(false);
    const slugIssue = result.issues.find((i) => i.field === "slug");
    expect(slugIssue).toBeDefined();
    expect(slugIssue!.severity).toBe("error");
  });

  it("warns when required field empty in one language", async () => {
    const { validateCrossLang } = await import("@/lib/admin/cross-lang-validation");
    const data = {
      en: { id: "1", title: "Title EN", excerpt: "Excerpt EN", seo: { title: "S", description: "D" }, sections: [{ type: "text" }] },
      lv: { id: "1", title: "", excerpt: "Excerpt LV", seo: { title: "S", description: "D" }, sections: [{ type: "text" }] },
      ru: { id: "1", title: "Title RU", excerpt: "Excerpt RU", seo: { title: "S", description: "D" }, sections: [{ type: "text" }] },
    };
    const result = validateCrossLang("article", data);
    const titleWarning = result.issues.find((i) => i.field === "title");
    expect(titleWarning).toBeDefined();
    expect(titleWarning!.severity).toBe("warning");
    expect(titleWarning!.message).toContain("LV");
    expect(titleWarning!.languages).toContain("lv");
  });

  it("warns when SEO title empty in some languages", async () => {
    const { validateCrossLang } = await import("@/lib/admin/cross-lang-validation");
    const data = {
      en: { id: "1", title: "T", seo: { title: "SEO Title", description: "D" }, sections: [{ type: "text" }] },
      lv: { id: "1", title: "T", seo: { title: "", description: "D" }, sections: [{ type: "text" }] },
      ru: { id: "1", title: "T", seo: { title: "", description: "D" }, sections: [{ type: "text" }] },
    };
    const result = validateCrossLang("info", data);
    const seoWarning = result.issues.find((i) => i.field === "seo.title");
    expect(seoWarning).toBeDefined();
    expect(seoWarning!.severity).toBe("warning");
    expect(seoWarning!.languages).toContain("lv");
    expect(seoWarning!.languages).toContain("ru");
  });

  it("warns when SEO description empty in some languages", async () => {
    const { validateCrossLang } = await import("@/lib/admin/cross-lang-validation");
    const data = {
      en: { id: "1", title: "T", seo: { title: "S", description: "Desc" }, sections: [{ type: "text" }] },
      lv: { id: "1", title: "T", seo: { title: "S", description: "" }, sections: [{ type: "text" }] },
      ru: { id: "1", title: "T", seo: { title: "S", description: "Desc" }, sections: [{ type: "text" }] },
    };
    const result = validateCrossLang("info", data);
    const seoWarning = result.issues.find((i) => i.field === "seo.description");
    expect(seoWarning).toBeDefined();
    expect(seoWarning!.languages).toContain("lv");
  });

  it("detects section count mismatch for articles", async () => {
    const { validateCrossLang } = await import("@/lib/admin/cross-lang-validation");
    const data = {
      en: { id: "1", title: "T", excerpt: "E", seo: { title: "S", description: "D" }, sections: [{ type: "text" }, { type: "text" }] },
      lv: { id: "1", title: "T", excerpt: "E", seo: { title: "S", description: "D" }, sections: [{ type: "text" }] },
      ru: { id: "1", title: "T", excerpt: "E", seo: { title: "S", description: "D" }, sections: [{ type: "text" }, { type: "text" }] },
    };
    const result = validateCrossLang("article", data);
    expect(result.valid).toBe(false);
    const sectionIssue = result.issues.find((i) => i.field === "sections");
    expect(sectionIssue).toBeDefined();
    expect(sectionIssue!.severity).toBe("error");
    expect(sectionIssue!.message).toContain("mismatch");
  });

  it("detects section count mismatch for conditions", async () => {
    const { validateCrossLang } = await import("@/lib/admin/cross-lang-validation");
    const data = {
      en: { id: "1", title: "T", intro: "I", seo: { title: "S", description: "D" }, sections: [{ type: "text" }], faq: [], contraindications: [] },
      lv: { id: "1", title: "T", intro: "I", seo: { title: "S", description: "D" }, sections: [{ type: "text" }, { type: "bullets" }], faq: [], contraindications: [] },
      ru: { id: "1", title: "T", intro: "I", seo: { title: "S", description: "D" }, sections: [{ type: "text" }], faq: [], contraindications: [] },
    };
    const result = validateCrossLang("condition", data);
    const sectionIssue = result.issues.find((i) => i.field === "sections");
    expect(sectionIssue).toBeDefined();
    expect(sectionIssue!.severity).toBe("error");
  });

  it("does not check section count for non-sectioned entities", async () => {
    const { validateCrossLang } = await import("@/lib/admin/cross-lang-validation");
    const data = {
      en: { id: "1", phone: "123", address: "A", sections: [1, 2] },
      lv: { id: "1", phone: "123", address: "B", sections: [1] },
      ru: { id: "1", phone: "123", address: "C", sections: [1, 2] },
    };
    const result = validateCrossLang("contacts", data);
    const sectionIssue = result.issues.find((i) => i.field === "sections");
    expect(sectionIssue).toBeUndefined();
  });

  it("skips SEO check for entities without SEO", async () => {
    const { validateCrossLang } = await import("@/lib/admin/cross-lang-validation");
    const data = {
      en: { id: "1", phone: "123", address: "A" },
      lv: { id: "1", phone: "123", address: "B" },
      ru: { id: "1", phone: "123", address: "C" },
    };
    const result = validateCrossLang("contacts", data);
    const seoIssues = result.issues.filter((i) => i.field.startsWith("seo."));
    expect(seoIssues).toHaveLength(0);
  });

  it("validates about entity with summary field", async () => {
    const { validateCrossLang } = await import("@/lib/admin/cross-lang-validation");
    const data = {
      en: { id: "about", title: "Title", summary: "Summary EN", seo: { title: "S", description: "D" } },
      lv: { id: "about", title: "Title", summary: "", seo: { title: "S", description: "D" } },
      ru: { id: "about", title: "Title", summary: "Summary RU", seo: { title: "S", description: "D" } },
    };
    const result = validateCrossLang("about", data);
    const summaryWarning = result.issues.find((i) => i.field === "summary");
    expect(summaryWarning).toBeDefined();
    expect(summaryWarning!.languages).toContain("lv");
  });

  it("validates condition entity with intro field", async () => {
    const { validateCrossLang } = await import("@/lib/admin/cross-lang-validation");
    const data = {
      en: { id: "1", slug: "test", title: "T", intro: "Intro EN", seo: { title: "S", description: "D" }, sections: [{ type: "text" }] },
      lv: { id: "1", slug: "test", title: "T", intro: "Intro LV", seo: { title: "S", description: "D" }, sections: [{ type: "text" }] },
      ru: { id: "1", slug: "test", title: "T", intro: "", seo: { title: "S", description: "D" }, sections: [{ type: "text" }] },
    };
    const result = validateCrossLang("condition", data);
    const introWarning = result.issues.find((i) => i.field === "intro");
    expect(introWarning).toBeDefined();
    expect(introWarning!.languages).toContain("ru");
  });
});

// --- detectPartialEdit ---

describe("detectPartialEdit", () => {
  it("returns null when all languages changed", async () => {
    const { detectPartialEdit } = await import("@/lib/admin/cross-lang-validation");
    const original = {
      en: { id: "1", title: "old" },
      lv: { id: "1", title: "old" },
      ru: { id: "1", title: "old" },
    };
    const current = {
      en: { id: "1", title: "new" },
      lv: { id: "1", title: "new" },
      ru: { id: "1", title: "new" },
    };
    expect(detectPartialEdit(current, original)).toBeNull();
  });

  it("returns null when no languages changed", async () => {
    const { detectPartialEdit } = await import("@/lib/admin/cross-lang-validation");
    const data = {
      en: { id: "1", title: "same" },
      lv: { id: "1", title: "same" },
      ru: { id: "1", title: "same" },
    };
    expect(detectPartialEdit(data, data)).toBeNull();
  });

  it("detects when only one language changed", async () => {
    const { detectPartialEdit } = await import("@/lib/admin/cross-lang-validation");
    const original = {
      en: { id: "1", title: "old" },
      lv: { id: "1", title: "old" },
      ru: { id: "1", title: "old" },
    };
    const current = {
      en: { id: "1", title: "old" },
      lv: { id: "1", title: "old" },
      ru: { id: "1", title: "new" },
    };
    const issue = detectPartialEdit(current, original);
    expect(issue).not.toBeNull();
    expect(issue!.severity).toBe("warning");
    expect(issue!.message).toContain("RU");
    expect(issue!.message).toContain("EN");
    expect(issue!.message).toContain("LV");
    expect(issue!.languages).toContain("en");
    expect(issue!.languages).toContain("lv");
  });

  it("detects when two languages changed but one did not", async () => {
    const { detectPartialEdit } = await import("@/lib/admin/cross-lang-validation");
    const original = {
      en: { id: "1", title: "old" },
      lv: { id: "1", title: "old" },
      ru: { id: "1", title: "old" },
    };
    const current = {
      en: { id: "1", title: "new" },
      lv: { id: "1", title: "old" },
      ru: { id: "1", title: "new" },
    };
    const issue = detectPartialEdit(current, original);
    expect(issue).not.toBeNull();
    expect(issue!.message).toContain("EN");
    expect(issue!.message).toContain("RU");
    expect(issue!.languages).toContain("lv");
  });
});

// --- canPublish ---

describe("canPublish", () => {
  it("allows publish with no issues", async () => {
    const { canPublish } = await import("@/lib/admin/cross-lang-validation");
    const result = { valid: true, issues: [] };
    expect(canPublish(result, "strict", false)).toBe(true);
    expect(canPublish(result, "soft", false)).toBe(true);
  });

  it("blocks publish with errors regardless of mode", async () => {
    const { canPublish } = await import("@/lib/admin/cross-lang-validation");
    const result = {
      valid: false,
      issues: [{ severity: "error" as const, field: "id", message: "ID mismatch" }],
    };
    expect(canPublish(result, "strict", true)).toBe(false);
    expect(canPublish(result, "soft", true)).toBe(false);
  });

  it("blocks publish in strict mode with warnings", async () => {
    const { canPublish } = await import("@/lib/admin/cross-lang-validation");
    const result = {
      valid: true,
      issues: [{ severity: "warning" as const, field: "title", message: "empty in LV" }],
    };
    expect(canPublish(result, "strict", false)).toBe(false);
    expect(canPublish(result, "strict", true)).toBe(false);
  });

  it("blocks publish in soft mode without confirmation", async () => {
    const { canPublish } = await import("@/lib/admin/cross-lang-validation");
    const result = {
      valid: true,
      issues: [{ severity: "warning" as const, field: "title", message: "empty in LV" }],
    };
    expect(canPublish(result, "soft", false)).toBe(false);
  });

  it("allows publish in soft mode with confirmation", async () => {
    const { canPublish } = await import("@/lib/admin/cross-lang-validation");
    const result = {
      valid: true,
      issues: [{ severity: "warning" as const, field: "title", message: "empty in LV" }],
    };
    expect(canPublish(result, "soft", true)).toBe(true);
  });
});

// --- CrossLangWarnings component ---

describe("CrossLangWarnings component", () => {
  it("exports CrossLangWarnings", async () => {
    const { CrossLangWarnings } = await import("@/components/admin/cross-lang-warnings");
    expect(typeof CrossLangWarnings).toBe("function");
  });

  it("renders nothing when no issues", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { CrossLangWarnings } = await import("@/components/admin/cross-lang-warnings");

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(CrossLangWarnings, {
          result: { valid: true, issues: [] },
          mode: "soft",
        }),
      );
      setTimeout(resolve, 50);
    });

    expect(container.querySelector("[data-testid='cross-lang-warnings']")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("renders errors", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { CrossLangWarnings } = await import("@/components/admin/cross-lang-warnings");

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(CrossLangWarnings, {
          result: {
            valid: false,
            issues: [
              { severity: "error", field: "id", message: "ID mismatch: en=\"1\", lv=\"2\"" },
            ],
          },
          mode: "soft",
        }),
      );
      setTimeout(resolve, 50);
    });

    const errorsDiv = container.querySelector("[data-testid='cross-lang-errors']");
    expect(errorsDiv).not.toBeNull();
    expect(container.querySelector("[data-testid='cross-lang-error-0']")?.textContent).toContain("ID mismatch");
    expect(container.querySelector("[data-testid='cross-lang-blocked']")).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("renders warnings with confirm button in soft mode", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { CrossLangWarnings } = await import("@/components/admin/cross-lang-warnings");

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(CrossLangWarnings, {
          result: {
            valid: true,
            issues: [
              { severity: "warning", field: "title", message: "\"title\" is empty in LV" },
            ],
          },
          mode: "soft",
        }),
      );
      setTimeout(resolve, 50);
    });

    const warningsList = container.querySelector("[data-testid='cross-lang-warnings-list']");
    expect(warningsList).not.toBeNull();
    expect(container.querySelector("[data-testid='cross-lang-warning-0']")?.textContent).toContain("empty in LV");
    expect(container.querySelector("[data-testid='cross-lang-confirm-prompt']")).not.toBeNull();
    expect(container.querySelector("[data-testid='cross-lang-confirm-button']")).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it("shows strict blocked message in strict mode with warnings", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { CrossLangWarnings } = await import("@/components/admin/cross-lang-warnings");

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(CrossLangWarnings, {
          result: {
            valid: true,
            issues: [
              { severity: "warning", field: "title", message: "\"title\" is empty in LV" },
            ],
          },
          mode: "strict",
        }),
      );
      setTimeout(resolve, 50);
    });

    expect(container.querySelector("[data-testid='cross-lang-strict-blocked']")).not.toBeNull();
    expect(container.querySelector("[data-testid='cross-lang-confirm-prompt']")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("shows mode indicator", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { CrossLangWarnings } = await import("@/components/admin/cross-lang-warnings");

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(CrossLangWarnings, {
          result: {
            valid: true,
            issues: [{ severity: "warning", field: "x", message: "test" }],
          },
          mode: "soft",
        }),
      );
      setTimeout(resolve, 50);
    });

    const modeEl = container.querySelector("[data-testid='cross-lang-mode']");
    expect(modeEl).not.toBeNull();
    expect(modeEl!.textContent).toContain("Soft");
    root.unmount();
    container.remove();
  });
});

// --- FieldWarningIcon ---

describe("FieldWarningIcon", () => {
  it("renders nothing when hasWarning is false", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { FieldWarningIcon } = await import("@/components/admin/cross-lang-warnings");

    await new Promise<void>((resolve) => {
      root.render(React.createElement(FieldWarningIcon, { hasWarning: false }));
      setTimeout(resolve, 50);
    });

    expect(container.querySelector("[data-testid='field-warning-icon']")).toBeNull();
    root.unmount();
    container.remove();
  });

  it("renders warning icon when hasWarning is true", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { FieldWarningIcon } = await import("@/components/admin/cross-lang-warnings");

    await new Promise<void>((resolve) => {
      root.render(React.createElement(FieldWarningIcon, { hasWarning: true }));
      setTimeout(resolve, 50);
    });

    expect(container.querySelector("[data-testid='field-warning-icon']")).not.toBeNull();
    root.unmount();
    container.remove();
  });
});
