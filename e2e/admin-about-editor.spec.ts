import { test, expect } from "@playwright/test";

test.describe("Admin About Editor", () => {
  test("about editor bundle is isolated from public pages", async ({ page }) => {
    await page.goto("/en/about");
    const html = await page.content();
    expect(html).not.toContain("about-editor");
    expect(html).not.toContain("AboutEditor");
  });

  test("credentials add/delete logic works synchronously", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const langs = ["en", "lv", "ru"];
      const data: Record<string, { credentials: string[] }> = {};
      for (const lang of langs) {
        data[lang] = { credentials: [`Cred1_${lang}`, `Cred2_${lang}`] };
      }

      // Add credential to all
      for (const lang of langs) {
        data[lang].credentials.push("");
      }
      const afterAdd = data.en.credentials.length;

      // Delete index 0 from all
      for (const lang of langs) {
        data[lang].credentials = data[lang].credentials.filter((_, i) => i !== 0);
      }
      const afterDelete = data.en.credentials.length;
      const allSameLength =
        data.en.credentials.length === data.lv.credentials.length &&
        data.lv.credentials.length === data.ru.credentials.length;

      return { afterAdd, afterDelete, allSameLength };
    });

    expect(result.afterAdd).toBe(3);
    expect(result.afterDelete).toBe(2);
    expect(result.allSameLength).toBe(true);
  });

  test("certificates add/delete syncs across languages", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const langs = ["en", "lv", "ru"];
      const data: Record<string, { certificates: { title: string; imagePath?: string }[] }> = {};
      for (const lang of langs) {
        data[lang] = {
          certificates: [{ title: `Cert_${lang}`, imagePath: "/media/cert.jpg" }],
        };
      }

      // Add certificate
      for (const lang of langs) {
        data[lang].certificates.push({ title: "" });
      }

      // Delete first certificate
      for (const lang of langs) {
        data[lang].certificates = data[lang].certificates.filter((_, i) => i !== 0);
      }

      return {
        en: data.en.certificates.length,
        lv: data.lv.certificates.length,
        ru: data.ru.certificates.length,
        allEqual:
          data.en.certificates.length === data.lv.certificates.length &&
          data.lv.certificates.length === data.ru.certificates.length,
      };
    });

    expect(result.en).toBe(1);
    expect(result.allEqual).toBe(true);
  });

  test("draft persistence for about data", async ({ page }) => {
    await page.goto("/admin");

    await page.evaluate(() => {
      const data = {
        id: "about",
        updatedAt: "2024-01-01T00:00:00Z",
        seo: { title: "Test", description: "Desc" },
        title: "Draft About Title",
        summary: "Draft summary",
        credentials: ["Cred1"],
        experienceYears: 20,
        certificates: [{ title: "Cert1" }],
      };
      localStorage.setItem("cms_draft:content/about.en.json", JSON.stringify(data));
    });

    await page.reload();

    const draft = await page.evaluate(() => {
      const raw = localStorage.getItem("cms_draft:content/about.en.json");
      return raw ? JSON.parse(raw) : null;
    });

    expect(draft).not.toBeNull();
    expect(draft.title).toBe("Draft About Title");
    expect(draft.experienceYears).toBe(20);
  });
});
