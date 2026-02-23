import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const pages = [
  { path: "/en", name: "Home EN" },
  { path: "/en/info", name: "Info EN" },
  { path: "/en/about", name: "About EN" },
  { path: "/en/contacts", name: "Contacts EN" },
  { path: "/en/articles", name: "Articles EN" },
  { path: "/en/conditions", name: "Conditions EN" },
  { path: "/en/articles/acupuncture-for-stress", name: "Article detail EN" },
  { path: "/en/conditions/back-pain", name: "Condition detail EN" },
];

test.describe("SEO meta tags", () => {
  for (const page of pages) {
    test(`${page.name} has title and description`, async ({ page: p }) => {
      await p.goto(page.path);
      const title = await p.title();
      expect(title.length).toBeGreaterThan(0);

      const description = p.locator('meta[name="description"]');
      await expect(description).toHaveAttribute("content", /.+/);
    });
  }
});

test.describe("hreflang tags", () => {
  for (const page of pages) {
    test(`${page.name} has hreflang for all 3 languages`, async ({
      page: p,
    }) => {
      await p.goto(page.path);

      for (const lang of ["en", "lv", "ru"]) {
        const hreflang = p.locator(`link[rel="alternate"][hreflang="${lang}"]`);
        await expect(hreflang).toHaveCount(1);
        const href = await hreflang.getAttribute("href");
        expect(href).toContain(`/${lang}`);
      }
    });
  }
});

test.describe("Canonical tags", () => {
  for (const page of pages) {
    test(`${page.name} has canonical pointing to itself`, async ({
      page: p,
    }) => {
      await p.goto(page.path);
      const canonical = p.locator('link[rel="canonical"]');
      await expect(canonical).toHaveCount(1);
      const href = await canonical.getAttribute("href");
      expect(href).toContain(page.path);
    });
  }
});

test.describe("Open Graph tags", () => {
  for (const page of pages) {
    test(`${page.name} has OG title and description`, async ({ page: p }) => {
      await p.goto(page.path);

      const ogTitle = p.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveAttribute("content", /.+/);

      const ogDescription = p.locator('meta[property="og:description"]');
      await expect(ogDescription).toHaveAttribute("content", /.+/);

      const ogUrl = p.locator('meta[property="og:url"]');
      await expect(ogUrl).toHaveAttribute("content", /.+/);
    });
  }
});

test.describe("sitemap.xml", () => {
  test("exists in build output", () => {
    const sitemapPath = path.join(process.cwd(), "out", "sitemap.xml");
    expect(fs.existsSync(sitemapPath)).toBe(true);
  });

  test("contains all language variants of pages", () => {
    const sitemapPath = path.join(process.cwd(), "out", "sitemap.xml");
    const content = fs.readFileSync(sitemapPath, "utf-8");

    // Static pages
    for (const lang of ["en", "lv", "ru"]) {
      expect(content).toContain(`/${lang}</loc>`);
      expect(content).toContain(`/${lang}/info</loc>`);
      expect(content).toContain(`/${lang}/about</loc>`);
      expect(content).toContain(`/${lang}/contacts</loc>`);
      expect(content).toContain(`/${lang}/articles</loc>`);
      expect(content).toContain(`/${lang}/conditions</loc>`);
    }

    // Article detail pages
    expect(content).toContain("/en/articles/acupuncture-for-stress</loc>");
    expect(content).toContain("/en/articles/benefits-of-regular-treatment</loc>");

    // Condition detail pages
    expect(content).toContain("/en/conditions/back-pain</loc>");
    expect(content).toContain("/en/conditions/migraine</loc>");
    expect(content).toContain("/en/conditions/insomnia</loc>");
  });

  test("contains hreflang alternates", () => {
    const sitemapPath = path.join(process.cwd(), "out", "sitemap.xml");
    const content = fs.readFileSync(sitemapPath, "utf-8");

    expect(content).toContain('hreflang="en"');
    expect(content).toContain('hreflang="lv"');
    expect(content).toContain('hreflang="ru"');
  });
});

test.describe("robots.txt", () => {
  test("exists in build output", () => {
    const robotsPath = path.join(process.cwd(), "out", "robots.txt");
    expect(fs.existsSync(robotsPath)).toBe(true);
  });

  test("allows indexing and references sitemap", () => {
    const robotsPath = path.join(process.cwd(), "out", "robots.txt");
    const content = fs.readFileSync(robotsPath, "utf-8");

    expect(content).toContain("Allow: /");
    expect(content).toContain("sitemap.xml");
  });
});
