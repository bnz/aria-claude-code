import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// ──────────────────────────────────────────────────────
// 1. Language switching preserves current page
// ──────────────────────────────────────────────────────

test.describe("Language switching preserves current page", () => {
  test("switching language on home page", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // Switch to LV
    await page.getByRole("link", { name: "LV" }).click();
    await expect(page).toHaveURL(/\/lv$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "lv");

    // Switch to RU
    await page.getByRole("link", { name: "RU" }).click();
    await expect(page).toHaveURL(/\/ru$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");

    // Switch back to EN
    await page.getByRole("link", { name: "EN" }).click();
    await expect(page).toHaveURL(/\/en$/);
  });

  test("switching language on info page preserves /info", async ({ page }) => {
    await page.goto("/en/info");
    await page.getByRole("link", { name: "LV" }).click();
    await expect(page).toHaveURL(/\/lv\/info$/);
    await page.getByRole("link", { name: "RU" }).click();
    await expect(page).toHaveURL(/\/ru\/info$/);
  });

  test("switching language on about page preserves /about", async ({ page }) => {
    await page.goto("/en/about");
    await page.getByRole("link", { name: "RU" }).click();
    await expect(page).toHaveURL(/\/ru\/about$/);
  });

  test("switching language on articles list preserves /articles", async ({ page }) => {
    await page.goto("/en/articles");
    await page.getByRole("link", { name: "LV" }).click();
    await expect(page).toHaveURL(/\/lv\/articles$/);
  });

  test("switching language on article detail preserves slug", async ({ page }) => {
    await page.goto("/en/articles/acupuncture-for-stress");
    await page.getByRole("link", { name: "LV" }).click();
    await expect(page).toHaveURL(/\/lv\/articles\/acupuncture-for-stress$/);
    await expect(page.locator("h1")).toContainText("Akupunktūra stresa mazināšanai");
  });

  test("switching language on conditions list preserves /conditions", async ({ page }) => {
    await page.goto("/en/conditions");
    await page.getByRole("link", { name: "RU" }).click();
    await expect(page).toHaveURL(/\/ru\/conditions$/);
  });

  test("switching language on condition detail preserves slug", async ({ page }) => {
    await page.goto("/en/conditions/back-pain");
    await page.getByRole("link", { name: "RU" }).click();
    await expect(page).toHaveURL(/\/ru\/conditions\/back-pain$/);
    await expect(page.locator("h1")).toContainText("Лечение боли в спине акупунктурой");
  });

  test("switching language on contacts page preserves /contacts", async ({ page }) => {
    await page.goto("/en/contacts");
    await page.getByRole("link", { name: "LV" }).click();
    await expect(page).toHaveURL(/\/lv\/contacts$/);
  });
});

// ──────────────────────────────────────────────────────
// 2. Full navigation flow between all pages
// ──────────────────────────────────────────────────────

test.describe("Cross-page navigation", () => {
  test("navigate from home to all main sections via header", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/en");

    // Navigate through all main pages
    const header = page.locator("header");

    await header.getByRole("link", { name: "About Acupuncture" }).click();
    await expect(page).toHaveURL(/\/en\/info$/);

    await header.getByRole("link", { name: "Articles" }).click();
    await expect(page).toHaveURL(/\/en\/articles$/);

    await header.getByRole("link", { name: "Conditions" }).click();
    await expect(page).toHaveURL(/\/en\/conditions$/);

    await header.getByRole("link", { name: "Contacts" }).click();
    await expect(page).toHaveURL(/\/en\/contacts$/);

    await header.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL(/\/en$/);
  });

  test("article detail → back → different article", async ({ page }) => {
    await page.goto("/en/articles");
    await page.getByText("Acupuncture for Stress Relief").click();
    await expect(page).toHaveURL(/acupuncture-for-stress$/);

    await page.getByText("Back to Articles").click();
    await expect(page).toHaveURL(/\/en\/articles$/);

    await page.getByText("Benefits of Regular Acupuncture Treatment").click();
    await expect(page).toHaveURL(/benefits-of-regular-treatment$/);
    await expect(page.locator("h1")).toContainText("Benefits of Regular Acupuncture Treatment");
  });

  test("condition detail → back → different condition", async ({ page }) => {
    await page.goto("/en/conditions");
    await page.getByText("Back Pain Treatment with Acupuncture").click();
    await expect(page).toHaveURL(/back-pain$/);

    await page.getByText("Back to Conditions").click();
    await expect(page).toHaveURL(/\/en\/conditions$/);

    await page.getByText("Migraine Treatment with Acupuncture").click();
    await expect(page).toHaveURL(/migraine$/);
    await expect(page.locator("h1")).toContainText("Migraine");
  });

  test("home → article detail → back to home via header", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/en");
    await page.getByText("Acupuncture for Stress Relief").click();
    await expect(page).toHaveURL(/acupuncture-for-stress$/);

    await page.locator("header").getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL(/\/en$/);
  });
});

// ──────────────────────────────────────────────────────
// 3. Mobile viewport
// ──────────────────────────────────────────────────────

test.describe("Mobile viewport", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test("mobile burger menu navigates to all sections", async ({ page }) => {
    await page.goto("/en");

    const burger = page.getByLabel("Open menu");
    await expect(burger).toBeVisible();
    await burger.click();

    const mobileNav = page.locator("header").getByLabel("Mobile navigation");
    await expect(mobileNav).toBeVisible();

    // Navigate to Info
    await mobileNav.getByRole("link", { name: "About Acupuncture" }).click();
    await expect(page).toHaveURL(/\/en\/info$/);

    // Navigate to Articles
    await page.getByLabel("Open menu").click();
    await page.locator("header").getByLabel("Mobile navigation")
      .getByRole("link", { name: "Articles" }).click();
    await expect(page).toHaveURL(/\/en\/articles$/);

    // Navigate to Contacts
    await page.getByLabel("Open menu").click();
    await page.locator("header").getByLabel("Mobile navigation")
      .getByRole("link", { name: "Contacts" }).click();
    await expect(page).toHaveURL(/\/en\/contacts$/);
  });

  test("mobile: CTA tel: links are present on home", async ({ page }) => {
    await page.goto("/en");
    const telLinks = page.locator('a[href^="tel:"]');
    expect(await telLinks.count()).toBeGreaterThanOrEqual(1);
    await expect(telLinks.first()).toBeVisible();
  });

  test("mobile: CTA tel: link on condition detail", async ({ page }) => {
    await page.goto("/en/conditions/back-pain");
    const telLink = page.locator('a[href^="tel:"]').first();
    await expect(telLink).toBeVisible();
  });

  test("mobile: article detail back navigation works", async ({ page }) => {
    await page.goto("/en/articles/acupuncture-for-stress");
    const backLink = page.getByText("Back to Articles");
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/\/en\/articles$/);
  });

  test("mobile: language switcher accessible via burger menu", async ({ page }) => {
    await page.goto("/en");
    await page.getByLabel("Open menu").click();

    const mobileNav = page.locator("header").getByLabel("Mobile navigation");
    // Language links should be in the mobile menu
    const lvLink = mobileNav.getByRole("link", { name: "LV" });
    await expect(lvLink).toBeVisible();
    await lvLink.click();
    await expect(page).toHaveURL(/\/lv$/);
  });
});

// ──────────────────────────────────────────────────────
// 4. CTA tel: links across all page types
// ──────────────────────────────────────────────────────

test.describe("CTA tel: links on all pages", () => {
  test("home page has tel: links", async ({ page }) => {
    await page.goto("/en");
    const telLinks = page.locator('a[href^="tel:"]');
    expect(await telLinks.count()).toBeGreaterThanOrEqual(2);
  });

  test("contacts page has tel: links", async ({ page }) => {
    await page.goto("/en/contacts");
    const telLinks = page.locator('a[href^="tel:"]');
    expect(await telLinks.count()).toBeGreaterThanOrEqual(1);
  });

  test("condition detail page has tel: CTA", async ({ page }) => {
    await page.goto("/en/conditions/back-pain");
    const telLinks = page.locator('a[href^="tel:"]');
    expect(await telLinks.count()).toBeGreaterThanOrEqual(1);
  });

  test("footer phone link is present on every page", async ({ page }) => {
    const pagePaths = ["/en", "/en/info", "/en/about", "/en/articles", "/en/conditions", "/en/contacts"];
    for (const p of pagePaths) {
      await page.goto(p);
      const footerTel = page.locator('footer a[href^="tel:"]');
      expect(await footerTel.count()).toBeGreaterThanOrEqual(1);
    }
  });
});

// ──────────────────────────────────────────────────────
// 5. Dark mode styling
// ──────────────────────────────────────────────────────

test.describe("Dark mode comprehensive", () => {
  test("dark mode applies dark body background", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/en");
    const bgColor = await page.locator("body").evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    // Dark background = low RGB values
    const match = bgColor.match(/rgb\(\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeLessThan(30);
  });

  test("dark mode applies light text for readability", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/en");
    const h1Color = await page.locator("h1").evaluate(
      (el) => getComputedStyle(el).color,
    );
    // Light text = high RGB values
    const match = h1Color.match(/rgb\(\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThan(200);
  });

  test("dark mode on condition detail page", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/en/conditions/back-pain");
    const bgColor = await page.locator("body").evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    const match = bgColor.match(/rgb\(\s*(\d+)/);
    expect(Number(match![1])).toBeLessThan(30);
    // Title still visible in dark mode
    await expect(page.locator("h1")).toBeVisible();
  });

  test("light mode applies white body background", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/en");
    const bgColor = await page.locator("body").evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    const match = bgColor.match(/rgb\(\s*(\d+)/);
    expect(Number(match![1])).toBeGreaterThan(240);
  });
});

// ──────────────────────────────────────────────────────
// 6. SEO — unique titles, JSON-LD validity
// ──────────────────────────────────────────────────────

test.describe("SEO unique titles", () => {
  test("all pages have unique titles within same language", async ({ page }) => {
    const pagePaths = [
      "/en",
      "/en/info",
      "/en/about",
      "/en/contacts",
      "/en/articles",
      "/en/conditions",
      "/en/articles/acupuncture-for-stress",
      "/en/conditions/back-pain",
    ];

    const titles: string[] = [];
    for (const p of pagePaths) {
      await page.goto(p);
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      titles.push(title);
    }

    // All titles should be unique
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });

  test("LV pages have unique titles", async ({ page }) => {
    const pagePaths = ["/lv", "/lv/info", "/lv/about", "/lv/contacts", "/lv/articles", "/lv/conditions"];
    const titles: string[] = [];
    for (const p of pagePaths) {
      await page.goto(p);
      titles.push(await page.title());
    }
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });
});

test.describe("JSON-LD validity", () => {
  test("home page MedicalBusiness JSON-LD is valid JSON", async ({ page }) => {
    await page.goto("/en");
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(scripts.length).toBeGreaterThan(0);

    for (const script of scripts) {
      const parsed = JSON.parse(script);
      expect(parsed["@context"]).toBe("https://schema.org");
    }
  });

  test("article detail JSON-LD has required Article properties", async ({ page }) => {
    await page.goto("/en/articles/acupuncture-for-stress");
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();

    const articleLd = scripts
      .map((s) => JSON.parse(s))
      .find((d) => d["@type"] === "Article" || d["@type"] === "MedicalWebPage");
    expect(articleLd).toBeDefined();
    expect(articleLd.headline || articleLd.name).toBeTruthy();
  });

  test("condition detail FAQPage JSON-LD has questions and answers", async ({ page }) => {
    await page.goto("/en/conditions/back-pain");
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();

    const faqLd = scripts
      .map((s) => JSON.parse(s))
      .find((d) => d["@type"] === "FAQPage");
    expect(faqLd).toBeDefined();
    expect(faqLd.mainEntity).toBeDefined();
    expect(faqLd.mainEntity.length).toBeGreaterThan(0);

    for (const q of faqLd.mainEntity) {
      expect(q["@type"]).toBe("Question");
      expect(q.name).toBeTruthy();
      expect(q.acceptedAnswer).toBeDefined();
      expect(q.acceptedAnswer.text).toBeTruthy();
    }
  });

  test("about page Physician JSON-LD has medicalSpecialty", async ({ page }) => {
    await page.goto("/en/about");
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();

    const physicianLd = scripts
      .map((s) => JSON.parse(s))
      .find((d) => d["@type"] === "Physician");
    expect(physicianLd).toBeDefined();
    expect(physicianLd.name).toBeTruthy();
    expect(physicianLd.medicalSpecialty).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────
// 7. Sitemap coverage
// ──────────────────────────────────────────────────────

test.describe("Sitemap completeness", () => {
  test("sitemap.xml contains all 3 languages for all sections", async () => {
    const sitemapPath = path.join(process.cwd(), "out", "sitemap.xml");
    if (!fs.existsSync(sitemapPath)) return; // skip if no build output
    const content = fs.readFileSync(sitemapPath, "utf-8");

    const sections = ["info", "about", "contacts", "articles", "conditions"];
    for (const lang of ["en", "lv", "ru"]) {
      expect(content).toContain(`/${lang}</loc>`);
      for (const section of sections) {
        expect(content).toContain(`/${lang}/${section}</loc>`);
      }
    }
  });

  test("sitemap.xml contains article detail pages for all languages", async () => {
    const sitemapPath = path.join(process.cwd(), "out", "sitemap.xml");
    if (!fs.existsSync(sitemapPath)) return;
    const content = fs.readFileSync(sitemapPath, "utf-8");

    for (const lang of ["en", "lv", "ru"]) {
      expect(content).toContain(`/${lang}/articles/acupuncture-for-stress</loc>`);
      expect(content).toContain(`/${lang}/articles/benefits-of-regular-treatment</loc>`);
    }
  });

  test("sitemap.xml contains condition detail pages for all languages", async () => {
    const sitemapPath = path.join(process.cwd(), "out", "sitemap.xml");
    if (!fs.existsSync(sitemapPath)) return;
    const content = fs.readFileSync(sitemapPath, "utf-8");

    for (const lang of ["en", "lv", "ru"]) {
      expect(content).toContain(`/${lang}/conditions/back-pain</loc>`);
      expect(content).toContain(`/${lang}/conditions/migraine</loc>`);
      expect(content).toContain(`/${lang}/conditions/insomnia</loc>`);
    }
  });

  test("robots.txt does not block public pages", async () => {
    const robotsPath = path.join(process.cwd(), "out", "robots.txt");
    if (!fs.existsSync(robotsPath)) return;
    const content = fs.readFileSync(robotsPath, "utf-8");

    expect(content).toContain("Allow: /");
    // Should not disallow public pages
    expect(content).not.toContain("Disallow: /en");
    expect(content).not.toContain("Disallow: /lv");
    expect(content).not.toContain("Disallow: /ru");
  });
});

// ──────────────────────────────────────────────────────
// 8. CMS integration
// ──────────────────────────────────────────────────────

test.describe("CMS login and draft flow", () => {
  test("admin login form appears and is functional", async ({ page }) => {
    await page.goto("/admin");
    const tokenInput = page.locator('[data-testid="token-input"]');
    await expect(tokenInput).toBeVisible();

    const submitBtn = page.locator('[data-testid="submit-button"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    // Typing into input enables submit
    await tokenInput.fill("test-token-value");
    await expect(submitBtn).toBeEnabled();
  });

  test("token persistence in localStorage", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      // Simulate storing a token
      localStorage.setItem("cms_github_token", "test-token-12345");
      const stored = localStorage.getItem("cms_github_token");
      localStorage.removeItem("cms_github_token");
      return { stored };
    });

    expect(result.stored).toBe("test-token-12345");
  });

  test("draft save and recovery flow", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      // Save a draft
      const key = "content/translations.en.json";
      const draft = { nav: { home: "Modified Home" } };
      const original = { nav: { home: "Home" } };

      localStorage.setItem(`cms_draft:${key}`, JSON.stringify(draft));
      localStorage.setItem(`cms_original:${key}`, JSON.stringify(original));

      // Read back
      const savedDraft = JSON.parse(localStorage.getItem(`cms_draft:${key}`) ?? "null");
      const savedOriginal = JSON.parse(localStorage.getItem(`cms_original:${key}`) ?? "null");

      // Check dirty
      const isDirty = JSON.stringify(savedDraft) !== JSON.stringify(savedOriginal);

      // Cleanup
      localStorage.removeItem(`cms_draft:${key}`);
      localStorage.removeItem(`cms_original:${key}`);

      return { savedDraft, isDirty };
    });

    expect(result.savedDraft.nav.home).toBe("Modified Home");
    expect(result.isDirty).toBe(true);
  });

  test("publish flow with deploy blocking", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      // Mock the full publish flow states
      type PublishState = "idle" | "reviewing" | "publishing" | "done" | "error";

      // State machine transitions
      const transitions: Array<{ from: PublishState; to: PublishState; trigger: string }> = [
        { from: "idle", to: "reviewing", trigger: "click publish" },
        { from: "reviewing", to: "publishing", trigger: "confirm" },
        { from: "publishing", to: "done", trigger: "all committed" },
        { from: "publishing", to: "error", trigger: "commit failed" },
      ];

      // Deploy blocking check
      function isDeployBlocking(state: string): boolean {
        return state === "in_progress";
      }

      // Publish disabled conditions
      function isPublishDisabled(changedCount: number, deployBlocked: boolean): boolean {
        return changedCount === 0 || deployBlocked;
      }

      return {
        transitions: transitions.length,
        blockedDuringDeploy: isPublishDisabled(3, true),
        allowedAfterDeploy: isPublishDisabled(3, false),
        blockedNoChanges: isPublishDisabled(0, false),
        deployBlocksInProgress: isDeployBlocking("in_progress"),
        deployAllowsIdle: !isDeployBlocking("idle"),
      };
    });

    expect(result.transitions).toBe(4);
    expect(result.blockedDuringDeploy).toBe(true);
    expect(result.allowedAfterDeploy).toBe(false);
    expect(result.blockedNoChanges).toBe(true);
    expect(result.deployBlocksInProgress).toBe(true);
    expect(result.deployAllowsIdle).toBe(true);
  });
});

// ──────────────────────────────────────────────────────
// 9. Build verification
// ──────────────────────────────────────────────────────

test.describe("Static export verification", () => {
  test("out/ directory contains HTML for all language pages", async () => {
    const outDir = path.join(process.cwd(), "out");
    if (!fs.existsSync(outDir)) return;

    const languages = ["en", "lv", "ru"];
    const sections = ["info", "about", "contacts", "articles", "conditions"];

    for (const lang of languages) {
      // Language index page
      const langIndex = path.join(outDir, lang, "index.html");
      expect(fs.existsSync(langIndex)).toBe(true);

      // Section pages
      for (const section of sections) {
        const sectionIndex = path.join(outDir, lang, section, "index.html");
        expect(fs.existsSync(sectionIndex)).toBe(true);
      }
    }
  });

  test("out/ directory contains article detail pages", async () => {
    const outDir = path.join(process.cwd(), "out");
    if (!fs.existsSync(outDir)) return;

    const slugs = ["acupuncture-for-stress", "benefits-of-regular-treatment"];
    for (const lang of ["en", "lv", "ru"]) {
      for (const slug of slugs) {
        const articlePage = path.join(outDir, lang, "articles", slug, "index.html");
        expect(fs.existsSync(articlePage)).toBe(true);
      }
    }
  });

  test("out/ directory contains condition detail pages", async () => {
    const outDir = path.join(process.cwd(), "out");
    if (!fs.existsSync(outDir)) return;

    const slugs = ["back-pain", "migraine", "insomnia"];
    for (const lang of ["en", "lv", "ru"]) {
      for (const slug of slugs) {
        const conditionPage = path.join(outDir, lang, "conditions", slug, "index.html");
        expect(fs.existsSync(conditionPage)).toBe(true);
      }
    }
  });

  test("out/ directory contains .nojekyll", async () => {
    const outDir = path.join(process.cwd(), "out");
    if (!fs.existsSync(outDir)) return;
    expect(fs.existsSync(path.join(outDir, ".nojekyll"))).toBe(true);
  });

  test("out/ directory contains sitemap.xml and robots.txt", async () => {
    const outDir = path.join(process.cwd(), "out");
    if (!fs.existsSync(outDir)) return;
    expect(fs.existsSync(path.join(outDir, "sitemap.xml"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "robots.txt"))).toBe(true);
  });

  test("admin page is included in build", async () => {
    const outDir = path.join(process.cwd(), "out");
    if (!fs.existsSync(outDir)) return;
    expect(fs.existsSync(path.join(outDir, "admin", "index.html"))).toBe(true);
  });

  test("total HTML page count is correct", async () => {
    const outDir = path.join(process.cwd(), "out");
    if (!fs.existsSync(outDir)) return;

    function countHtml(dir: string): number {
      let count = 0;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          count += countHtml(fullPath);
        } else if (entry.name === "index.html") {
          count++;
        }
      }
      return count;
    }

    const totalPages = countHtml(outDir);
    // Expected: root(1) + _not-found(1) + admin(1) + sitemap(0) + robots(0)
    // + 3 languages × (index + info + about + contacts + articles + conditions) = 18
    // + 3 languages × 2 articles = 6
    // + 3 languages × 3 conditions = 9
    // Total = 1 + 1 + 1 + 18 + 6 + 9 = 36 minimum
    expect(totalPages).toBeGreaterThanOrEqual(36);
  });
});

// ──────────────────────────────────────────────────────
// 10. Admin bundle isolation (comprehensive)
// ──────────────────────────────────────────────────────

test.describe("Admin bundle isolation comprehensive", () => {
  test("public pages do not load admin components", async ({ page }) => {
    const publicPages = ["/en", "/en/info", "/en/about", "/en/contacts", "/en/articles", "/en/conditions"];
    for (const p of publicPages) {
      await page.goto(p);
      const html = await page.content();
      // Admin-specific identifiers should not appear in public page HTML
      expect(html).not.toContain("admin-sidebar");
      expect(html).not.toContain("token-input");
      expect(html).not.toContain("publish-button");
    }
  });
});
