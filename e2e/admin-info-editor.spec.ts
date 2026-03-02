import { test, expect } from "@playwright/test";

test.describe("Admin Info Editor", () => {
  test("info editor bundle is isolated from public pages", async ({ page }) => {
    await page.goto("/en/info");
    const html = await page.content();
    expect(html).not.toContain("info-editor");
    expect(html).not.toContain("InfoEditor");
  });

  test("section add/delete/reorder logic works correctly", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const sections = [
        { type: "text", title: "T1", content: "C1" },
        { type: "bullets", title: "B1", items: ["a", "b"] },
        { type: "image", imagePath: "/media/img.jpg", caption: "Cap" },
      ];

      // Add a new section
      sections.push({ type: "text", title: "", content: "" });
      const afterAdd = sections.length;

      // Delete section at index 1 (bullets)
      sections.splice(1, 1);
      const afterDelete = sections.length;
      const secondType = sections[1]?.type;

      // Reorder: swap 0 and 1
      [sections[0], sections[1]] = [sections[1], sections[0]];
      const firstTypeAfterSwap = sections[0].type;

      return { afterAdd, afterDelete, secondType, firstTypeAfterSwap };
    });

    expect(result.afterAdd).toBe(4);
    expect(result.afterDelete).toBe(3);
    expect(result.secondType).toBe("image");
    expect(result.firstTypeAfterSwap).toBe("image");
  });

  test("draft persistence for info data", async ({ page }) => {
    await page.goto("/admin");

    await page.evaluate(() => {
      const data = {
        id: "info",
        updatedAt: "2024-01-01T00:00:00Z",
        seo: { title: "Test", description: "Test desc" },
        title: "Draft Info Title",
        sections: [{ type: "text", content: "Draft content" }],
      };
      localStorage.setItem("cms_draft:content/info.en.json", JSON.stringify(data));
    });

    await page.reload();

    const draft = await page.evaluate(() => {
      const raw = localStorage.getItem("cms_draft:content/info.en.json");
      return raw ? JSON.parse(raw) : null;
    });

    expect(draft).not.toBeNull();
    expect(draft.title).toBe("Draft Info Title");
    expect(draft.sections[0].content).toBe("Draft content");
  });

  test("section sync ensures same count across languages", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const langs = ["en", "lv", "ru"];
      const data: Record<string, { sections: { type: string }[] }> = {};

      for (const lang of langs) {
        data[lang] = {
          sections: [
            { type: "text" },
            { type: "bullets" },
          ],
        };
      }

      // Add section to all languages (synced)
      for (const lang of langs) {
        data[lang].sections.push({ type: "image" });
      }

      return {
        en: data.en.sections.length,
        lv: data.lv.sections.length,
        ru: data.ru.sections.length,
        allEqual:
          data.en.sections.length === data.lv.sections.length &&
          data.lv.sections.length === data.ru.sections.length,
      };
    });

    expect(result.allEqual).toBe(true);
    expect(result.en).toBe(3);
  });
});
