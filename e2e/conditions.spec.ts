import { test, expect } from "@playwright/test";

test.describe("Conditions list page", () => {
  test("renders in English with correct title", async ({ page }) => {
    await page.goto("/en/conditions");
    await expect(page).toHaveTitle(
      "Conditions We Treat — Acupuncture Clinic",
    );
    await expect(page.locator("h1")).toContainText("Conditions We Treat");
  });

  test("shows condition cards", async ({ page }) => {
    await page.goto("/en/conditions");
    const cards = page.locator("a[href*='/en/conditions/']");
    await expect(cards).toHaveCount(3);
  });

  test("shows all published conditions", async ({ page }) => {
    await page.goto("/en/conditions");
    await expect(
      page.getByText("Back Pain Treatment with Acupuncture"),
    ).toBeVisible();
  });

  test("shows Read More links", async ({ page }) => {
    await page.goto("/en/conditions");
    const readMoreLinks = page.getByText("Read More");
    await expect(readMoreLinks.first()).toBeVisible();
  });

  test("renders in Latvian", async ({ page }) => {
    await page.goto("/lv/conditions");
    await expect(page.locator("h1")).toContainText("Stāvokļi, ko ārstējam");
  });

  test("renders in Russian", async ({ page }) => {
    await page.goto("/ru/conditions");
    await expect(page.locator("h1")).toContainText(
      "Состояния, которые мы лечим",
    );
  });
});

test.describe("Condition detail page", () => {
  test("renders with correct SEO title", async ({ page }) => {
    await page.goto("/en/conditions/back-pain");
    await expect(page).toHaveTitle(
      "Acupuncture for Back Pain — Effective Treatment in Riga",
    );
  });

  test("renders title and intro", async ({ page }) => {
    await page.goto("/en/conditions/back-pain");
    await expect(page.locator("h1")).toContainText(
      "Back Pain Treatment with Acupuncture",
    );
    await expect(
      page.getByText("Back pain is one of the most common reasons"),
    ).toBeVisible();
  });

  test("renders content sections", async ({ page }) => {
    await page.goto("/en/conditions/back-pain");
    await expect(
      page.getByText("How Acupuncture Helps Back Pain"),
    ).toBeVisible();
    await expect(
      page.getByText("Types of Back Pain We Treat"),
    ).toBeVisible();
  });

  test("renders contraindications warning block", async ({ page }) => {
    await page.goto("/en/conditions/back-pain");
    await expect(page.getByText("Contraindications")).toBeVisible();
    await expect(
      page.getByText("Spinal fractures or severe spinal instability"),
    ).toBeVisible();
  });

  test("renders FAQ as question-answer pairs", async ({ page }) => {
    await page.goto("/en/conditions/back-pain");
    await expect(
      page.getByText("Frequently Asked Questions"),
    ).toBeVisible();
    await expect(
      page.getByText("How many sessions are needed for back pain?"),
    ).toBeVisible();
    await expect(
      page.getByText("Most patients need 6-10 sessions"),
    ).toBeVisible();
  });

  test("renders CTA with tel: link", async ({ page }) => {
    await page.goto("/en/conditions/back-pain");
    await expect(page.getByText("Ready to Feel Better?")).toBeVisible();
    const ctaLink = page.locator("article a[href^='tel:']");
    await expect(ctaLink).toBeVisible();
  });

  test("has back to conditions link that navigates correctly", async ({
    page,
  }) => {
    await page.goto("/en/conditions/back-pain");
    const backLink = page.getByText("Back to Conditions");
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/\/en\/conditions$/);
  });

  test("renders in Latvian", async ({ page }) => {
    await page.goto("/lv/conditions/back-pain");
    await expect(page.locator("h1")).toContainText(
      "Muguras sāpju ārstēšana ar akupunktūru",
    );
  });

  test("renders in Russian", async ({ page }) => {
    await page.goto("/ru/conditions/back-pain");
    await expect(page.locator("h1")).toContainText(
      "Лечение боли в спине акупунктурой",
    );
  });
});

test.describe("Condition navigation", () => {
  test("clicking condition card from list goes to detail page", async ({
    page,
  }) => {
    await page.goto("/en/conditions");
    await page.getByText("Back Pain Treatment with Acupuncture").click();
    await expect(page).toHaveURL(/\/en\/conditions\/back-pain$/);
    await expect(page.locator("h1")).toContainText(
      "Back Pain Treatment with Acupuncture",
    );
  });
});
