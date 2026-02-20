import { test, expect } from "@playwright/test";

test("dev server returns a page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Acupuncture/);
});

test("home page renders heading", async ({ page }) => {
  await page.goto("/");
  const heading = page.locator("h1");
  await expect(heading).toBeVisible();
  await expect(heading).toContainText("Acupuncture");
});
