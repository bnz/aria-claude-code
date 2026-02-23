import { test, expect } from "@playwright/test";

test.describe("Header", () => {
  test("renders navigation links in English", async ({ page }) => {
    await page.goto("/en");
    const header = page.locator("header");
    await expect(header).toBeVisible();
    await expect(header.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(header.getByRole("link", { name: "About Acupuncture" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Articles" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Conditions" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Contacts" })).toBeVisible();
  });

  test("renders navigation links in Latvian", async ({ page }) => {
    await page.goto("/lv");
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Sākums" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Par akupunktūru" })).toBeVisible();
  });

  test("renders navigation links in Russian", async ({ page }) => {
    await page.goto("/ru");
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Главная" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Об акупунктуре" })).toBeVisible();
  });

  test("language switcher is visible on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/en");
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "EN" })).toBeVisible();
    await expect(header.getByRole("link", { name: "LV" })).toBeVisible();
    await expect(header.getByRole("link", { name: "RU" })).toBeVisible();
  });

  test("mobile menu opens and closes", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/en");

    // Desktop nav should be hidden on mobile
    const desktopNav = page.locator("header nav").first();
    await expect(desktopNav).toBeHidden();

    // Open mobile menu
    const burger = page.getByLabel("Open menu");
    await expect(burger).toBeVisible();
    await burger.click();

    // Mobile nav should now be visible
    const mobileNav = page.locator("header").getByLabel("Mobile navigation");
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "Home" })).toBeVisible();

    // Close mobile menu
    const closeBtn = page.getByLabel("Close menu");
    await closeBtn.click();
    await expect(mobileNav).toBeHidden();
  });
});

test.describe("Footer", () => {
  test("renders clickable phone number", async ({ page }) => {
    await page.goto("/en");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    const phoneLink = footer.getByRole("link", { name: "+371 20000000" });
    await expect(phoneLink).toBeVisible();
    await expect(phoneLink).toHaveAttribute("href", "tel:+37120000000");
  });

  test("renders copyright with current year", async ({ page }) => {
    await page.goto("/en");
    const footer = page.locator("footer");
    const year = new Date().getFullYear().toString();
    await expect(footer).toContainText(year);
    await expect(footer).toContainText("Acupuncture Clinic");
  });

  test("renders footer navigation links", async ({ page }) => {
    await page.goto("/en");
    const footerNav = page.locator("footer").getByLabel("Footer navigation");
    await expect(footerNav.getByRole("link", { name: "About Acupuncture" })).toBeVisible();
    await expect(footerNav.getByRole("link", { name: "Contacts" })).toBeVisible();
  });

  test("renders address", async ({ page }) => {
    await page.goto("/en");
    const footer = page.locator("footer");
    await expect(footer).toContainText("Riga");
  });
});

test.describe("Dark mode", () => {
  test("applies dark colors when prefers-color-scheme is dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/en");
    const body = page.locator("body");
    const bgColor = await body.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    // Dark background should be very dark (close to #0a0a0a = rgb(10, 10, 10))
    expect(bgColor).toMatch(/rgb\(\s*10\s*,\s*10\s*,\s*10\s*\)/);
  });

  test("applies light colors when prefers-color-scheme is light", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/en");
    const body = page.locator("body");
    const bgColor = await body.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    // Light background should be white (rgb(255, 255, 255))
    expect(bgColor).toMatch(/rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/);
  });
});
