import { test, expect } from "@playwright/test";

test.describe("Admin authentication page", () => {
  test("/admin page loads and shows login form", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("h1")).toContainText("Admin Panel");
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("login form has token input and submit button", async ({ page }) => {
    await page.goto("/admin");
    const tokenInput = page.locator("#token");
    await expect(tokenInput).toBeVisible();
    await expect(tokenInput).toHaveAttribute("type", "password");

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toContainText("Sign in");
  });

  test("admin page does not show public header or footer", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("header nav")).not.toBeVisible();
    const footer = page.locator("footer");
    await expect(footer).toHaveCount(0);
  });

  test("admin page has link to create PAT", async ({ page }) => {
    await page.goto("/admin");
    const patLink = page.locator('a[href*="github.com/settings/tokens"]');
    await expect(patLink).toBeVisible();
    await expect(patLink).toHaveAttribute("target", "_blank");
  });

  test("submit button is disabled when token input is empty", async ({ page }) => {
    await page.goto("/admin");
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });
});

test.describe("Admin bundle isolation", () => {
  test("public pages do not contain admin login elements", async ({ page }) => {
    await page.goto("/en");
    const html = await page.content();
    expect(html).not.toContain("Admin Panel");
    expect(html).not.toContain("Personal Access Token");
  });
});
