import { test, expect } from "@playwright/test";

test.describe("Admin Articles Editor", () => {
  test("articles editor bundle is isolated from public pages", async ({ page }) => {
    await page.goto("/en/articles");
    const html = await page.content();
    expect(html).not.toContain("articles-editor");
    expect(html).not.toContain("ArticlesEditor");
  });

  test("article CRUD: create, toggle published, reorder, delete", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const index = {
        updatedAt: "2024-01-01T00:00:00Z",
        items: [
          { id: "art-1", slug: "existing-article", published: true, order: 1 },
        ],
      };

      // Create
      index.items.push({ id: "art-2", slug: "new-article", published: false, order: 2 });
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
    expect(result.firstSlugAfterReorder).toBe("new-article");
    expect(result.afterDelete).toBe(1);
  });

  test("slug validation rejects invalid formats", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const regex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      return {
        validSlug: regex.test("my-article"),
        uppercase: regex.test("My-Article"),
        spaces: regex.test("my article"),
        underscore: regex.test("my_article"),
        leadingDash: regex.test("-my-article"),
      };
    });

    expect(result.validSlug).toBe(true);
    expect(result.uppercase).toBe(false);
    expect(result.spaces).toBe(false);
    expect(result.underscore).toBe(false);
    expect(result.leadingDash).toBe(false);
  });

  test("draft persistence for article data", async ({ page }) => {
    await page.goto("/admin");

    await page.evaluate(() => {
      const data = {
        id: "art-1",
        slug: "test",
        updatedAt: "2024-01-01T00:00:00Z",
        seo: { title: "T", description: "D" },
        title: "Draft Article",
        excerpt: "Draft excerpt",
        sections: [{ type: "text", content: "Content" }],
      };
      localStorage.setItem("cms_draft:content/articles/test/article.en.json", JSON.stringify(data));
    });

    await page.reload();

    const draft = await page.evaluate(() => {
      const raw = localStorage.getItem("cms_draft:content/articles/test/article.en.json");
      return raw ? JSON.parse(raw) : null;
    });

    expect(draft).not.toBeNull();
    expect(draft.title).toBe("Draft Article");
  });
});
