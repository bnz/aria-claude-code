import { test, expect } from "@playwright/test";

test("root page redirects to /en", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en/);
});

test("english home page renders hero with CTA", async ({ page }) => {
  await page.goto("/en");
  await expect(page).toHaveTitle(/Acupuncture/);
  await expect(page.locator("h1")).toContainText("Professional Acupuncture in Riga");
  // CTA phone link
  const phoneLink = page.locator('a[href^="tel:"]').first();
  await expect(phoneLink).toBeVisible();
  await expect(phoneLink).toHaveAttribute("href", "tel:+37120000000");
});

test("latvian home page renders localized hero", async ({ page }) => {
  await page.goto("/lv");
  await expect(page.locator("h1")).toContainText("Profesionāla akupunktūra Rīgā");
  await expect(page.locator("html")).toHaveAttribute("lang", "lv");
});

test("russian home page renders localized hero", async ({ page }) => {
  await page.goto("/ru");
  await expect(page.locator("h1")).toContainText("Профессиональная акупунктура в Риге");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
});

test("home page shows article previews", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByText("Latest Articles")).toBeVisible();
  await expect(page.getByText("Acupuncture for Stress Relief")).toBeVisible();
  await expect(page.getByText("Benefits of Regular Acupuncture Treatment")).toBeVisible();
});

test("home page shows condition previews", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByText("Conditions We Treat")).toBeVisible();
  await expect(page.getByText("Back Pain Treatment with Acupuncture")).toBeVisible();
  await expect(page.getByText("Migraine Treatment with Acupuncture")).toBeVisible();
  await expect(page.getByText("Insomnia Treatment with Acupuncture")).toBeVisible();
});

test("home page has CTA section with phone", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByText("Ready to Feel Better?")).toBeVisible();
  const ctaPhoneLinks = page.locator('a[href^="tel:"]');
  // At least 2: one in hero, one in CTA section
  expect(await ctaPhoneLinks.count()).toBeGreaterThanOrEqual(2);
});

test("article preview links to article page", async ({ page }) => {
  await page.goto("/en");
  const articleLink = page.getByRole("link", { name: "Acupuncture for Stress Relief" });
  await expect(articleLink).toHaveAttribute("href", "/en/articles/acupuncture-for-stress");
});

test("condition preview links to condition page", async ({ page }) => {
  await page.goto("/en");
  const conditionLink = page
    .getByRole("link", { name: "Back Pain Treatment with Acupuncture" });
  await expect(conditionLink).toHaveAttribute("href", "/en/conditions/back-pain");
});

test("html lang attribute matches route language", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.goto("/lv");
  await expect(page.locator("html")).toHaveAttribute("lang", "lv");

  await page.goto("/ru");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
});
