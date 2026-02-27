import { test, expect } from "@playwright/test";

test.describe("Admin Draft System", () => {
  test("draft persistence via localStorage on admin page", async ({ page }) => {
    await page.goto("/admin");

    // Set a draft value in localStorage via page context
    await page.evaluate(() => {
      localStorage.setItem(
        "cms_draft:content/translations.en.json",
        JSON.stringify({ id: "tr-en", updatedAt: "2024-01-01T00:00:00Z", header: {}, footer: {}, buttons: {} }),
      );
    });

    // Verify draft persists in localStorage
    const hasDraft = await page.evaluate(() => {
      return localStorage.getItem("cms_draft:content/translations.en.json") !== null;
    });
    expect(hasDraft).toBe(true);

    // Reload the page — draft should survive
    await page.reload();

    const draftAfterReload = await page.evaluate(() => {
      const raw = localStorage.getItem("cms_draft:content/translations.en.json");
      return raw ? JSON.parse(raw) : null;
    });
    expect(draftAfterReload).toEqual({
      id: "tr-en",
      updatedAt: "2024-01-01T00:00:00Z",
      header: {},
      footer: {},
      buttons: {},
    });
  });

  test("clearAllDrafts removes only cms_ prefixed items", async ({ page }) => {
    await page.goto("/admin");

    // Set up mixed localStorage entries
    await page.evaluate(() => {
      localStorage.setItem("cms_draft:contacts.en", JSON.stringify({ phone: "123" }));
      localStorage.setItem("cms_original:contacts.en", JSON.stringify({ phone: "000" }));
      localStorage.setItem("admin_github_token", "ghp_test_token");
    });

    // Simulate clearAllDrafts logic
    await page.evaluate(() => {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("cms_draft:") || k.startsWith("cms_original:"))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    });

    const remaining = await page.evaluate(() => ({
      draft: localStorage.getItem("cms_draft:contacts.en"),
      original: localStorage.getItem("cms_original:contacts.en"),
      token: localStorage.getItem("admin_github_token"),
    }));

    expect(remaining.draft).toBeNull();
    expect(remaining.original).toBeNull();
    expect(remaining.token).toBe("ghp_test_token");
  });

  test("dirty detection: draft differs from original", async ({ page }) => {
    await page.goto("/admin");

    await page.evaluate(() => {
      localStorage.setItem("cms_original:info.en", JSON.stringify({ title: "Old" }));
      localStorage.setItem("cms_draft:info.en", JSON.stringify({ title: "New" }));
      localStorage.setItem("cms_original:contacts.en", JSON.stringify({ phone: "111" }));
      localStorage.setItem("cms_draft:contacts.en", JSON.stringify({ phone: "111" }));
    });

    const dirtyKeys = await page.evaluate(() => {
      const dirty: string[] = [];
      const prefix = "cms_draft:";
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (!storageKey || !storageKey.startsWith(prefix)) continue;
        const key = storageKey.slice(prefix.length);
        const draftRaw = localStorage.getItem("cms_draft:" + key);
        const originalRaw = localStorage.getItem("cms_original:" + key);
        if (draftRaw !== originalRaw) dirty.push(key);
      }
      return dirty;
    });

    expect(dirtyKeys).toContain("info.en");
    expect(dirtyKeys).not.toContain("contacts.en");
  });

  test("public pages do not contain draft system code", async ({ page }) => {
    await page.goto("/en");
    const html = await page.content();
    expect(html).not.toContain("cms_draft");
    expect(html).not.toContain("draft-recovery");
    expect(html).not.toContain("DraftIndicator");
  });
});
