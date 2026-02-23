import { test, expect } from "@playwright/test";

/** Extract and parse JSON-LD scripts from a page */
async function getJsonLdScripts(
  page: import("@playwright/test").Page,
): Promise<Record<string, unknown>[]> {
  return page.evaluate(() => {
    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    return Array.from(scripts).map((s) => JSON.parse(s.textContent ?? "{}"));
  });
}

test.describe("MedicalBusiness JSON-LD (layout)", () => {
  test("is present on home page", async ({ page }) => {
    await page.goto("/en");
    const jsonLds = await getJsonLdScripts(page);
    const medical = jsonLds.find((j) => j["@type"] === "MedicalBusiness");
    expect(medical).toBeDefined();
    expect(medical!.name).toBeTruthy();
    expect(medical!.telephone).toBeTruthy();
    expect(medical!.address).toBeDefined();
    expect(medical!.geo).toBeDefined();
  });

  test("is present on all pages", async ({ page }) => {
    for (const path of ["/en/info", "/en/about", "/en/contacts"]) {
      await page.goto(path);
      const jsonLds = await getJsonLdScripts(page);
      const medical = jsonLds.find((j) => j["@type"] === "MedicalBusiness");
      expect(medical).toBeDefined();
    }
  });
});

test.describe("Physician JSON-LD (about page)", () => {
  test("is present on about page", async ({ page }) => {
    await page.goto("/en/about");
    const jsonLds = await getJsonLdScripts(page);
    const physician = jsonLds.find((j) => j["@type"] === "Physician");
    expect(physician).toBeDefined();
    expect(physician!.name).toBeTruthy();
    expect(physician!.description).toBeTruthy();
    expect(physician!.medicalSpecialty).toBe("Acupuncture");
  });

  test("includes credentials", async ({ page }) => {
    await page.goto("/en/about");
    const jsonLds = await getJsonLdScripts(page);
    const physician = jsonLds.find((j) => j["@type"] === "Physician");
    expect(physician!.hasCredential).toBeDefined();
    const creds = physician!.hasCredential as Array<Record<string, unknown>>;
    expect(creds.length).toBeGreaterThan(0);
  });
});

test.describe("FAQPage JSON-LD (condition pages)", () => {
  test("is present on condition detail page", async ({ page }) => {
    await page.goto("/en/conditions/back-pain");
    const jsonLds = await getJsonLdScripts(page);
    const faq = jsonLds.find((j) => j["@type"] === "FAQPage");
    expect(faq).toBeDefined();
  });

  test("contains questions from FAQ array", async ({ page }) => {
    await page.goto("/en/conditions/back-pain");
    const jsonLds = await getJsonLdScripts(page);
    const faq = jsonLds.find((j) => j["@type"] === "FAQPage");
    const mainEntity = faq!.mainEntity as Array<Record<string, unknown>>;
    expect(mainEntity.length).toBeGreaterThan(0);
    expect(mainEntity[0]["@type"]).toBe("Question");
    expect(mainEntity[0].name).toBeTruthy();
  });
});

test.describe("Article JSON-LD (article pages)", () => {
  test("is present on article detail page", async ({ page }) => {
    await page.goto("/en/articles/acupuncture-for-stress");
    const jsonLds = await getJsonLdScripts(page);
    const article = jsonLds.find((j) => j["@type"] === "Article");
    expect(article).toBeDefined();
    expect(article!.headline).toBeTruthy();
    expect(article!.dateModified).toBeTruthy();
    expect(article!.author).toBeDefined();
  });

  test("has correct headline", async ({ page }) => {
    await page.goto("/en/articles/acupuncture-for-stress");
    const jsonLds = await getJsonLdScripts(page);
    const article = jsonLds.find((j) => j["@type"] === "Article");
    expect(article!.headline).toBe("Acupuncture for Stress Relief");
  });
});
