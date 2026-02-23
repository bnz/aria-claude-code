import { test, expect } from "@playwright/test";

test.describe("Articles list page", () => {
  test("renders in English with correct title", async ({ page }) => {
    await page.goto("/en/articles");
    await expect(page).toHaveTitle("Articles — Acupuncture Clinic");
    await expect(page.locator("h1")).toContainText("Articles");
  });

  test("shows article cards with titles and excerpts", async ({ page }) => {
    await page.goto("/en/articles");
    const cards = page.locator("a[href*='/en/articles/']");
    await expect(cards).toHaveCount(2);

    await expect(page.getByText("Acupuncture for Stress Relief")).toBeVisible();
    await expect(
      page.getByText("Benefits of Regular Acupuncture Treatment"),
    ).toBeVisible();
  });

  test("shows Read More links", async ({ page }) => {
    await page.goto("/en/articles");
    const readMoreLinks = page.getByText("Read More");
    await expect(readMoreLinks.first()).toBeVisible();
  });

  test("renders in Latvian", async ({ page }) => {
    await page.goto("/lv/articles");
    await expect(page.locator("h1")).toContainText("Raksti");
  });

  test("renders in Russian", async ({ page }) => {
    await page.goto("/ru/articles");
    await expect(page.locator("h1")).toContainText("Статьи");
  });
});

test.describe("Article detail page", () => {
  test("renders article with correct content", async ({ page }) => {
    await page.goto("/en/articles/acupuncture-for-stress");
    await expect(page).toHaveTitle(
      "Acupuncture for Stress Relief — How It Works",
    );
    await expect(page.locator("h1")).toContainText(
      "Acupuncture for Stress Relief",
    );
  });

  test("shows article sections", async ({ page }) => {
    await page.goto("/en/articles/acupuncture-for-stress");
    await expect(
      page.getByText("Stress is one of the most common health concerns"),
    ).toBeVisible();
  });

  test("shows hero image", async ({ page }) => {
    await page.goto("/en/articles/acupuncture-for-stress");
    const heroImg = page.locator("article img").first();
    await expect(heroImg).toBeVisible();
  });

  test("has back to articles link that navigates correctly", async ({
    page,
  }) => {
    await page.goto("/en/articles/acupuncture-for-stress");
    const backLink = page.getByText("Back to Articles");
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/\/en\/articles$/);
  });

  test("renders in Latvian", async ({ page }) => {
    await page.goto("/lv/articles/acupuncture-for-stress");
    await expect(page.locator("h1")).toContainText(
      "Akupunktūra stresa mazināšanai",
    );
  });

  test("renders in Russian", async ({ page }) => {
    await page.goto("/ru/articles/acupuncture-for-stress");
    await expect(page.locator("h1")).toContainText(
      "Акупунктура для снятия стресса",
    );
  });
});

test.describe("Article navigation", () => {
  test("clicking article card from list goes to detail page", async ({
    page,
  }) => {
    await page.goto("/en/articles");
    await page.getByText("Acupuncture for Stress Relief").click();
    await expect(page).toHaveURL(/\/en\/articles\/acupuncture-for-stress$/);
    await expect(page.locator("h1")).toContainText(
      "Acupuncture for Stress Relief",
    );
  });
});
