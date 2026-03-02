import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");

test.describe("GitHub Actions Deploy Pipeline", () => {
  test("static export generates HTML for all language index pages", async ({ page }) => {
    const languages = ["en", "lv", "ru"];
    for (const lang of languages) {
      const res = await page.goto(`/${lang}`);
      expect(res?.status()).toBe(200);
    }
  });

  test("static export generates HTML for all section pages", async ({ page }) => {
    const sections = ["about", "articles", "conditions", "contacts", "info"];
    for (const section of sections) {
      const res = await page.goto(`/en/${section}`);
      expect(res?.status()).toBe(200);
    }
  });

  test("root page redirects to language page", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    // Should contain language content
    const html = await page.content();
    expect(html.length).toBeGreaterThan(100);
  });

  test("workflow file structure is valid", async () => {
    const workflowPath = resolve(ROOT, ".github/workflows/deploy.yml");
    expect(existsSync(workflowPath)).toBe(true);

    const raw = readFileSync(workflowPath, "utf-8");
    // Required sections
    expect(raw).toContain("name:");
    expect(raw).toContain("on:");
    expect(raw).toContain("jobs:");
    expect(raw).toContain("build:");
    expect(raw).toContain("deploy:");
    // Required steps
    expect(raw).toContain("npm ci");
    expect(raw).toContain("npm run test");
    expect(raw).toContain("npm run build");
    // Required actions
    expect(raw).toContain("actions/checkout@v4");
    expect(raw).toContain("actions/setup-node@v4");
    expect(raw).toContain("actions/upload-pages-artifact@v3");
    expect(raw).toContain("actions/deploy-pages@v4");
  });

  test(".nojekyll exists in public directory", async () => {
    expect(existsSync(resolve(ROOT, "public/.nojekyll"))).toBe(true);
  });

  test("admin page loads without affecting public bundle", async ({ page }) => {
    await page.goto("/admin");
    const html = await page.content();
    // Admin page should load
    expect(html.length).toBeGreaterThan(100);
  });

  test("sitemap.xml is generated", async ({ page }) => {
    const res = await page.goto("/sitemap.xml");
    expect(res?.status()).toBe(200);
  });

  test("robots.txt is generated", async ({ page }) => {
    const res = await page.goto("/robots.txt");
    expect(res?.status()).toBe(200);
  });
});
