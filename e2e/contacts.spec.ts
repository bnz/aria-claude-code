import { test, expect } from "@playwright/test";

test.describe("Contacts page", () => {
  test("renders in English", async ({ page }) => {
    await page.goto("/en/contacts");
    await expect(page.locator("h1")).toContainText("Contacts");
  });

  test("renders in Latvian", async ({ page }) => {
    await page.goto("/lv/contacts");
    await expect(page.locator("h1")).toContainText("Kontakti");
  });

  test("renders in Russian", async ({ page }) => {
    await page.goto("/ru/contacts");
    await expect(page.locator("h1")).toContainText("Контакты");
  });

  test("displays clickable phone number", async ({ page }) => {
    await page.goto("/en/contacts");
    const phoneLinks = page.locator('a[href="tel:+37120000000"]');
    // CTA button + phone in details section
    expect(await phoneLinks.count()).toBeGreaterThanOrEqual(2);
  });

  test("displays address as text", async ({ page }) => {
    await page.goto("/en/contacts");
    const main = page.locator("main");
    await expect(main.getByText("Brīvības iela 100, Riga")).toBeVisible();
  });

  test("displays work hours", async ({ page }) => {
    await page.goto("/en/contacts");
    const main = page.locator("main");
    await expect(main.getByText("Mon–Fri 10:00–18:00")).toBeVisible();
  });

  test("displays intro text", async ({ page }) => {
    await page.goto("/en/contacts");
    await expect(page.getByText("Call to book a consultation")).toBeVisible();
  });

  test("renders Google Maps iframe", async ({ page }) => {
    await page.goto("/en/contacts");
    const iframe = page.locator("iframe[title='Google Maps']");
    await expect(iframe).toBeVisible();
    const src = await iframe.getAttribute("src");
    expect(src).toContain("google.com/maps");
  });

  test("CTA button is prominent with phone icon", async ({ page }) => {
    await page.goto("/en/contacts");
    const ctaButton = page.getByRole("link", { name: /Call Now/ });
    await expect(ctaButton).toBeVisible();
    await expect(ctaButton).toHaveAttribute("href", "tel:+37120000000");
  });
});
