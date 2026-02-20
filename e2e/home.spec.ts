import { test, expect } from "@playwright/test";

test("root page redirects to /en", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en/);
});

test("english home page renders", async ({ page }) => {
  await page.goto("/en");
  await expect(page).toHaveTitle(/Acupuncture/);
  const heading = page.locator("h1");
  await expect(heading).toBeVisible();
  await expect(heading).toContainText("Acupuncture");
});

test("latvian home page renders", async ({ page }) => {
  await page.goto("/lv");
  await expect(page).toHaveTitle(/Acupuncture/);
  const html = page.locator("html");
  await expect(html).toHaveAttribute("lang", "lv");
});

test("russian home page renders", async ({ page }) => {
  await page.goto("/ru");
  await expect(page).toHaveTitle(/Acupuncture/);
  const html = page.locator("html");
  await expect(html).toHaveAttribute("lang", "ru");
});

test("html lang attribute matches route language", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.goto("/lv");
  await expect(page.locator("html")).toHaveAttribute("lang", "lv");

  await page.goto("/ru");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
});
