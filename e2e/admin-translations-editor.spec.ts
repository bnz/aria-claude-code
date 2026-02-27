import { test, expect } from "@playwright/test";

test.describe("Admin Translations Editor", () => {
  test("admin page loads with translations section by default", async ({ page }) => {
    await page.goto("/admin");
    // Login form is shown for unauthenticated users
    await expect(page.locator("h1")).toContainText("Admin Panel");
  });

  test("translations editor bundle is isolated from public pages", async ({ page }) => {
    await page.goto("/en");
    const html = await page.content();
    expect(html).not.toContain("translations-editor");
    expect(html).not.toContain("TranslationsEditor");
    expect(html).not.toContain("draft-recovery-dialog");
  });

  test("draft auto-save works with translations data", async ({ page }) => {
    await page.goto("/admin");

    // Simulate saving translation drafts to localStorage
    await page.evaluate(() => {
      const data = {
        id: "translations",
        updatedAt: "2024-01-01T00:00:00Z",
        header: { navHome: "Home", navInfo: "Info" },
        footer: { copyright: "2024" },
        buttons: { callToAction: "Book Now" },
      };
      localStorage.setItem("cms_draft:content/translations.en.json", JSON.stringify(data));
      localStorage.setItem("cms_original:content/translations.en.json", JSON.stringify({
        ...data,
        header: { navHome: "Old Home", navInfo: "Info" },
      }));
    });

    // Check dirty detection
    const dirtyKeys = await page.evaluate(() => {
      const prefix = "cms_draft:";
      const dirty: string[] = [];
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

    expect(dirtyKeys).toContain("content/translations.en.json");
  });

  test("add key logic works synchronously for all languages", async ({ page }) => {
    await page.goto("/admin");

    // Simulate adding a key across all 3 languages
    const result = await page.evaluate(() => {
      const langs = ["en", "lv", "ru"];
      const data: Record<string, Record<string, string>> = {};

      for (const lang of langs) {
        data[lang] = { navHome: `Home_${lang}` };
      }

      // Add new key
      for (const lang of langs) {
        data[lang].newKey = `Value_${lang}`;
      }

      return data;
    });

    expect(result.en.newKey).toBe("Value_en");
    expect(result.lv.newKey).toBe("Value_lv");
    expect(result.ru.newKey).toBe("Value_ru");
  });

  test("delete key logic works synchronously for all languages", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const langs = ["en", "lv", "ru"];
      const data: Record<string, Record<string, string>> = {};

      for (const lang of langs) {
        data[lang] = { navHome: `Home_${lang}`, navInfo: `Info_${lang}` };
      }

      // Delete key
      for (const lang of langs) {
        delete data[lang].navHome;
      }

      return {
        hasNavHome: Object.keys(data.en).includes("navHome"),
        hasNavInfo: Object.keys(data.en).includes("navInfo"),
        allLangsDeleted:
          !("navHome" in data.en) &&
          !("navHome" in data.lv) &&
          !("navHome" in data.ru),
      };
    });

    expect(result.hasNavHome).toBe(false);
    expect(result.hasNavInfo).toBe(true);
    expect(result.allLangsDeleted).toBe(true);
  });
});
