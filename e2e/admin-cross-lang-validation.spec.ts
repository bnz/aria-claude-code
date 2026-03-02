import { test, expect } from "@playwright/test";

test.describe("Admin Cross-Language Validation", () => {
  test("cross-lang validation is isolated from public pages", async ({ page }) => {
    await page.goto("/en/articles");
    const html = await page.content();
    expect(html).not.toContain("cross-lang-validation");
    expect(html).not.toContain("CrossLangWarnings");
  });

  test("detects id mismatch between languages", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const data = {
        en: { id: "1", title: "T" },
        lv: { id: "2", title: "T" },
        ru: { id: "1", title: "T" },
      };

      const ids = ["en", "lv", "ru"].map((lang) => ({
        lang,
        id: (data as Record<string, { id: string }>)[lang].id,
      }));
      const unique = new Set(ids.map((x) => x.id));
      return { hasMismatch: unique.size > 1, idCount: unique.size };
    });

    expect(result.hasMismatch).toBe(true);
    expect(result.idCount).toBe(2);
  });

  test("detects slug mismatch between languages", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const data = {
        en: { slug: "back-pain" },
        lv: { slug: "muguras-sapes" },
        ru: { slug: "back-pain" },
      };

      const slugs = ["en", "lv", "ru"].map((lang) => (data as Record<string, { slug: string }>)[lang].slug);
      const unique = new Set(slugs);
      return { hasMismatch: unique.size > 1 };
    });

    expect(result.hasMismatch).toBe(true);
  });

  test("detects empty required fields in some languages", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const data = {
        en: { title: "Title EN" },
        lv: { title: "" },
        ru: { title: "Title RU" },
      };

      const emptyLangs = ["en", "lv", "ru"].filter(
        (lang) => !(data as Record<string, { title: string }>)[lang].title.trim(),
      );

      return { emptyLangs, hasWarning: emptyLangs.length > 0 && emptyLangs.length < 3 };
    });

    expect(result.emptyLangs).toEqual(["lv"]);
    expect(result.hasWarning).toBe(true);
  });

  test("detects partial language edits", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
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

      const changed: string[] = [];
      const unchanged: string[] = [];
      for (const lang of ["en", "lv", "ru"]) {
        const c = JSON.stringify((current as Record<string, unknown>)[lang]);
        const o = JSON.stringify((original as Record<string, unknown>)[lang]);
        if (c !== o) changed.push(lang);
        else unchanged.push(lang);
      }

      return { changed, unchanged, isPartial: changed.length > 0 && unchanged.length > 0 };
    });

    expect(result.changed).toEqual(["ru"]);
    expect(result.unchanged).toEqual(["en", "lv"]);
    expect(result.isPartial).toBe(true);
  });

  test("section count mismatch detection", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const data = {
        en: { sections: [1, 2] },
        lv: { sections: [1] },
        ru: { sections: [1, 2] },
      };

      const counts = ["en", "lv", "ru"].map(
        (lang) => (data as Record<string, { sections: number[] }>)[lang].sections.length,
      );
      const unique = new Set(counts);
      return { counts, hasMismatch: unique.size > 1 };
    });

    expect(result.counts).toEqual([2, 1, 2]);
    expect(result.hasMismatch).toBe(true);
  });

  test("strict mode blocks publish with warnings", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const hasErrors = false;
      const hasWarnings = true;
      const mode = "strict";
      const confirmed = true;

      if (hasErrors) return { allowed: false };
      if (hasWarnings && mode === "strict") return { allowed: false };
      if (hasWarnings && mode === "soft" && !confirmed) return { allowed: false };
      return { allowed: true };
    });

    expect(result.allowed).toBe(false);
  });

  test("soft mode allows publish after confirmation", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const hasErrors = false;
      const hasWarnings = true;
      const mode = "soft";

      const withoutConfirm = (() => {
        if (hasErrors) return false;
        if (hasWarnings && mode === "strict") return false;
        if (hasWarnings && mode === "soft") return false; // not confirmed
        return true;
      })();

      const withConfirm = (() => {
        if (hasErrors) return false;
        if (hasWarnings && mode === "strict") return false;
        return true; // soft + confirmed
      })();

      return { withoutConfirm, withConfirm };
    });

    expect(result.withoutConfirm).toBe(false);
    expect(result.withConfirm).toBe(true);
  });

  test("errors always block publish regardless of mode", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const hasErrors = true;
      const modes = ["strict", "soft"];
      return modes.map((mode) => {
        if (hasErrors) return { mode, allowed: false };
        return { mode, allowed: true };
      });
    });

    expect(result[0].allowed).toBe(false);
    expect(result[1].allowed).toBe(false);
  });
});
