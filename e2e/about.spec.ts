import { test, expect } from "@playwright/test";

test.describe("About page", () => {
  test("renders in English with SEO title", async ({ page }) => {
    await page.goto("/en/about");
    await expect(page).toHaveTitle("About the Specialist — Acupuncture in Riga");
    await expect(page.locator("h1")).toContainText("About the Specialist");
  });

  test("renders in Latvian", async ({ page }) => {
    await page.goto("/lv/about");
    await expect(page.locator("h1")).toContainText("Par speciālistu");
  });

  test("renders in Russian", async ({ page }) => {
    await page.goto("/ru/about");
    await expect(page.locator("h1")).toContainText("О специалисте");
  });

  test("displays summary text", async ({ page }) => {
    await page.goto("/en/about");
    await expect(page.getByText("certified acupuncture practitioner")).toBeVisible();
  });

  test("displays experience years", async ({ page }) => {
    await page.goto("/en/about");
    await expect(page.getByText("15+")).toBeVisible();
    await expect(page.getByText("years of experience", { exact: true })).toBeVisible();
  });

  test("displays credentials list", async ({ page }) => {
    await page.goto("/en/about");
    await expect(page.getByText("Credentials")).toBeVisible();
    await expect(page.getByText("Licensed Acupuncturist (Latvia)")).toBeVisible();
    await expect(
      page.getByText("Doctor of Traditional Chinese Medicine"),
    ).toBeVisible();
    await expect(
      page.getByText("Member of the European Traditional Chinese Medicine Association"),
    ).toBeVisible();
  });

  test("displays certificates with images", async ({ page }) => {
    await page.goto("/en/about");
    await expect(page.getByText("Certificates")).toBeVisible();
    await expect(page.getByText("Diploma in Traditional Chinese Medicine")).toBeVisible();
    await expect(page.getByText("Advanced Acupuncture Certification")).toBeVisible();
    // Certificate without image still renders
    await expect(page.getByText("Pain Management Specialization")).toBeVisible();
  });

  test("certificate images are rendered", async ({ page }) => {
    await page.goto("/en/about");
    const certImages = page.locator("img[alt='Diploma in Traditional Chinese Medicine']");
    await expect(certImages).toBeVisible();
  });
});
