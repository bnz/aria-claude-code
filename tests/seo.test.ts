import { describe, it, expect, vi, beforeEach } from "vitest";
import { generatePageMetadata, absoluteUrl, SITE_URL } from "@/lib/seo";
import type { Seo } from "@/schemas";
import { LANGUAGES } from "@/schemas";

describe("absoluteUrl", () => {
  it("builds absolute URL from path", () => {
    const url = absoluteUrl("/en/info");
    expect(url).toBe(`${SITE_URL}/en/info`);
  });

  it("handles empty path", () => {
    const url = absoluteUrl("");
    expect(url).toBe(SITE_URL);
  });
});

describe("generatePageMetadata", () => {
  const seo: Seo = {
    title: "Test Title",
    description: "Test description for the page.",
  };

  it("returns correct title and description", () => {
    const meta = generatePageMetadata(seo, "en", "/info");
    expect(meta.title).toBe("Test Title");
    expect(meta.description).toBe("Test description for the page.");
  });

  it("generates canonical URL", () => {
    const meta = generatePageMetadata(seo, "en", "/info");
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/en/info`);
  });

  it("uses custom canonical when provided in seo", () => {
    const seoWithCanonical: Seo = {
      ...seo,
      canonical: "https://custom.example.com/page",
    };
    const meta = generatePageMetadata(seoWithCanonical, "en", "/info");
    expect(meta.alternates?.canonical).toBe("https://custom.example.com/page");
  });

  it("generates hreflang alternates for all 3 languages", () => {
    const meta = generatePageMetadata(seo, "en", "/info");
    const languages = meta.alternates?.languages as Record<string, string>;
    expect(languages).toBeDefined();
    for (const lang of LANGUAGES) {
      expect(languages[lang]).toBe(`${SITE_URL}/${lang}/info`);
    }
  });

  it("generates hreflang alternates for home page (empty path)", () => {
    const meta = generatePageMetadata(seo, "en", "");
    const languages = meta.alternates?.languages as Record<string, string>;
    expect(languages.en).toBe(`${SITE_URL}/en`);
    expect(languages.lv).toBe(`${SITE_URL}/lv`);
    expect(languages.ru).toBe(`${SITE_URL}/ru`);
  });

  it("generates Open Graph tags", () => {
    const meta = generatePageMetadata(seo, "en", "/info");
    expect(meta.openGraph?.title).toBe("Test Title");
    expect(meta.openGraph?.description).toBe("Test description for the page.");
    expect(meta.openGraph?.url).toBe(`${SITE_URL}/en/info`);
    expect(meta.openGraph?.locale).toBe("en");
    expect(meta.openGraph?.type).toBe("website");
  });

  it("includes OG image when ogImagePath is provided", () => {
    const seoWithImage: Seo = {
      ...seo,
      ogImagePath: "/media/og-image.jpg",
    };
    const meta = generatePageMetadata(seoWithImage, "en", "/info");
    const images = meta.openGraph?.images;
    expect(images).toBeDefined();
    expect(Array.isArray(images)).toBe(true);
    if (Array.isArray(images)) {
      expect(images[0]).toEqual({ url: `${SITE_URL}/media/og-image.jpg` });
    }
  });

  it("omits OG images when ogImagePath is not provided", () => {
    const meta = generatePageMetadata(seo, "en", "/info");
    expect(meta.openGraph?.images).toBeUndefined();
  });

  it("works for article detail page paths", () => {
    const meta = generatePageMetadata(seo, "lv", "/articles/some-slug");
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/lv/articles/some-slug`);
    const languages = meta.alternates?.languages as Record<string, string>;
    expect(languages.en).toBe(`${SITE_URL}/en/articles/some-slug`);
    expect(languages.lv).toBe(`${SITE_URL}/lv/articles/some-slug`);
    expect(languages.ru).toBe(`${SITE_URL}/ru/articles/some-slug`);
  });
});
