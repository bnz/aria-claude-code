import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test.describe("Font loading", () => {
  test("page uses font-display: swap via next/font", async ({ page }) => {
    await page.goto("/en");
    const fontFaces = await page.evaluate(() => {
      const styles = Array.from(document.querySelectorAll("style"));
      return styles.map((s) => s.textContent).join("\n");
    });
    expect(fontFaces).toContain("font-display:swap");
  });

  test("html element has font class", async ({ page }) => {
    await page.goto("/en");
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toBeTruthy();
    expect(htmlClass!.length).toBeGreaterThan(0);
  });
});

test.describe("Image optimization", () => {
  test("article hero image is not lazy-loaded (priority)", async ({ page }) => {
    await page.goto("/en/articles/acupuncture-for-stress");
    const heroImg = page.locator("article img").first();
    await expect(heroImg).toBeVisible();
    const loading = await heroImg.getAttribute("loading");
    expect(loading).not.toBe("lazy");
  });

  test("all images use next/image (have data-nimg attribute)", async ({
    page,
  }) => {
    await page.goto("/en/info");
    const images = page.locator("main img");
    const count = await images.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const attr = await images.nth(i).getAttribute("data-nimg");
      expect(attr).toBeTruthy();
    }
  });
});

test.describe("Admin bundle isolation", () => {
  test("public page HTML does not contain admin module references", async ({
    page,
  }) => {
    await page.goto("/en");
    const html = await page.content();
    expect(html).not.toContain("/admin/");
    expect(html).not.toContain("components/admin");
  });

  test("no admin JS chunks loaded on public pages", () => {
    const outDir = path.join(process.cwd(), "out");
    const chunksDir = path.join(outDir, "_next", "static", "chunks");
    if (fs.existsSync(chunksDir)) {
      const files = fs.readdirSync(chunksDir);
      const adminChunks = files.filter((f) => f.includes("admin"));
      expect(adminChunks.length).toBe(0);
    }
  });
});
