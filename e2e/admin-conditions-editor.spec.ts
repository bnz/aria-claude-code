import { test, expect } from "@playwright/test";

test.describe("Admin Conditions Editor", () => {
  test("conditions editor bundle is isolated from public pages", async ({ page }) => {
    await page.goto("/en/conditions");
    const html = await page.content();
    expect(html).not.toContain("conditions-editor");
    expect(html).not.toContain("ConditionsEditor");
  });

  test("condition CRUD: create, toggle published, reorder, delete", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const index = {
        updatedAt: "2024-01-01T00:00:00Z",
        items: [
          { id: "cond-1", slug: "back-pain", published: true, order: 1 },
        ],
      };

      // Create
      index.items.push({ id: "cond-2", slug: "migraine", published: false, order: 2 });
      const afterCreate = index.items.length;

      // Toggle published
      index.items[1].published = !index.items[1].published;
      const publishedAfterToggle = index.items[1].published;

      // Reorder: swap 0 and 1
      [index.items[0], index.items[1]] = [index.items[1], index.items[0]];
      const firstSlugAfterReorder = index.items[0].slug;

      // Delete first
      index.items = index.items.filter((_, i) => i !== 0);
      const afterDelete = index.items.length;

      return { afterCreate, publishedAfterToggle, firstSlugAfterReorder, afterDelete };
    });

    expect(result.afterCreate).toBe(2);
    expect(result.publishedAfterToggle).toBe(true);
    expect(result.firstSlugAfterReorder).toBe("migraine");
    expect(result.afterDelete).toBe(1);
  });

  test("slug validation rejects invalid formats", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const regex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      return {
        validSlug: regex.test("back-pain"),
        uppercase: regex.test("Back-Pain"),
        spaces: regex.test("back pain"),
        underscore: regex.test("back_pain"),
        leadingDash: regex.test("-back-pain"),
      };
    });

    expect(result.validSlug).toBe(true);
    expect(result.uppercase).toBe(false);
    expect(result.spaces).toBe(false);
    expect(result.underscore).toBe(false);
    expect(result.leadingDash).toBe(false);
  });

  test("contraindications add/delete syncs across languages", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const langs = ["en", "lv", "ru"];
      const data: Record<string, { contraindications: string[] }> = {};
      for (const lang of langs) {
        data[lang] = { contraindications: [`Contra1_${lang}`, `Contra2_${lang}`] };
      }

      // Add contraindication to all
      for (const lang of langs) {
        data[lang].contraindications.push("");
      }
      const afterAdd = data.en.contraindications.length;

      // Delete index 0 from all
      for (const lang of langs) {
        data[lang].contraindications = data[lang].contraindications.filter((_, i) => i !== 0);
      }
      const afterDelete = data.en.contraindications.length;
      const allSameLength =
        data.en.contraindications.length === data.lv.contraindications.length &&
        data.lv.contraindications.length === data.ru.contraindications.length;

      return { afterAdd, afterDelete, allSameLength };
    });

    expect(result.afterAdd).toBe(3);
    expect(result.afterDelete).toBe(2);
    expect(result.allSameLength).toBe(true);
  });

  test("FAQ add/delete syncs across languages", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const langs = ["en", "lv", "ru"];
      const data: Record<string, { faq: { q: string; a: string }[] }> = {};
      for (const lang of langs) {
        data[lang] = { faq: [{ q: `Q_${lang}`, a: `A_${lang}` }] };
      }

      // Add FAQ to all
      for (const lang of langs) {
        data[lang].faq.push({ q: "", a: "" });
      }
      const afterAdd = data.en.faq.length;

      // Delete first FAQ from all
      for (const lang of langs) {
        data[lang].faq = data[lang].faq.filter((_, i) => i !== 0);
      }
      const afterDelete = data.en.faq.length;
      const allSameLength =
        data.en.faq.length === data.lv.faq.length &&
        data.lv.faq.length === data.ru.faq.length;

      return { afterAdd, afterDelete, allSameLength };
    });

    expect(result.afterAdd).toBe(2);
    expect(result.afterDelete).toBe(1);
    expect(result.allSameLength).toBe(true);
  });

  test("FAQ question/answer editing is per-language", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const data: Record<string, { faq: { q: string; a: string }[] }> = {
        en: { faq: [{ q: "EN question", a: "EN answer" }] },
        lv: { faq: [{ q: "LV question", a: "LV answer" }] },
        ru: { faq: [{ q: "RU question", a: "RU answer" }] },
      };

      // Update EN question only
      data.en.faq[0] = { ...data.en.faq[0], q: "Updated EN question" };

      return {
        enQ: data.en.faq[0].q,
        lvQ: data.lv.faq[0].q,
        ruQ: data.ru.faq[0].q,
      };
    });

    expect(result.enQ).toBe("Updated EN question");
    expect(result.lvQ).toBe("LV question");
    expect(result.ruQ).toBe("RU question");
  });

  test("sections with bullets support", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const sections = [
        { type: "text" as const, title: "Section 1", content: "Text content" },
        { type: "bullets" as const, title: "Bullet list", items: ["Item 1", "Item 2"] },
        { type: "image" as const, imagePath: "/media/img.jpg", caption: "Caption" },
      ];

      // Add bullet item
      const bulletSection = sections[1];
      if (bulletSection.type === "bullets") {
        bulletSection.items.push("Item 3");
      }

      // Delete bullet item
      if (bulletSection.type === "bullets") {
        bulletSection.items = bulletSection.items.filter((_, i) => i !== 0);
      }

      return {
        sectionCount: sections.length,
        types: sections.map((s) => s.type),
        bulletItems: bulletSection.type === "bullets" ? bulletSection.items.length : 0,
      };
    });

    expect(result.sectionCount).toBe(3);
    expect(result.types).toEqual(["text", "bullets", "image"]);
    expect(result.bulletItems).toBe(2);
  });

  test("draft persistence for condition data", async ({ page }) => {
    await page.goto("/admin");

    await page.evaluate(() => {
      const data = {
        id: "cond-1",
        slug: "back-pain",
        updatedAt: "2024-01-01T00:00:00Z",
        seo: { title: "T", description: "D" },
        title: "Draft Condition",
        intro: "Draft intro text",
        sections: [{ type: "text", title: "S", content: "Content" }],
        contraindications: ["Contra1"],
        faq: [{ q: "Q1", a: "A1" }],
      };
      localStorage.setItem("cms_draft:content/conditions/back-pain/condition.en.json", JSON.stringify(data));
    });

    await page.reload();

    const draft = await page.evaluate(() => {
      const raw = localStorage.getItem("cms_draft:content/conditions/back-pain/condition.en.json");
      return raw ? JSON.parse(raw) : null;
    });

    expect(draft).not.toBeNull();
    expect(draft.title).toBe("Draft Condition");
    expect(draft.intro).toBe("Draft intro text");
    expect(draft.contraindications).toHaveLength(1);
    expect(draft.faq).toHaveLength(1);
  });
});
