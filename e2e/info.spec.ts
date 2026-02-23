import { test, expect } from "@playwright/test";

test.describe("Info page", () => {
  test("renders in English with correct title", async ({ page }) => {
    await page.goto("/en/info");
    await expect(page).toHaveTitle("About Acupuncture — Traditional Chinese Medicine");
    await expect(page.locator("h1")).toContainText("About Acupuncture");
  });

  test("renders in Latvian", async ({ page }) => {
    await page.goto("/lv/info");
    await expect(page.locator("h1")).toContainText("Par akupunktūru");
  });

  test("renders in Russian", async ({ page }) => {
    await page.goto("/ru/info");
    await expect(page.locator("h1")).toContainText("Об акупунктуре");
  });

  test("renders text sections with titles", async ({ page }) => {
    await page.goto("/en/info");
    await expect(page.getByText("What is Acupuncture?")).toBeVisible();
    await expect(page.getByText("How Does Acupuncture Work?")).toBeVisible();
  });

  test("renders bullets section", async ({ page }) => {
    await page.goto("/en/info");
    await expect(page.getByText("Conditions Treated with Acupuncture")).toBeVisible();
    // Check at least one bullet item
    await expect(page.getByText("Chronic and acute pain")).toBeVisible();
  });

  test("renders image section with caption", async ({ page }) => {
    await page.goto("/en/info");
    const img = page.locator("img[alt='Acupuncture treatment session']");
    await expect(img).toBeVisible();
    await expect(page.getByText("Acupuncture treatment session")).toBeVisible();
  });
});
