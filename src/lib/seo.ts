import type { Metadata } from "next";
import type { Seo } from "@/schemas";
import type { Language } from "@/schemas";
import { LANGUAGES } from "@/schemas";

/**
 * Base URL for canonical and hreflang links.
 * Set via NEXT_PUBLIC_SITE_URL env var, defaults to localhost for dev.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

/** Build an absolute URL from a path */
function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/**
 * Generate unified page metadata with OG tags, hreflang, and canonical.
 *
 * @param seo - SEO fields from content JSON (title, description, ogImagePath)
 * @param lang - Current page language
 * @param pagePath - Path without language prefix (e.g. "/articles/back-pain" or "" for home)
 */
export function generatePageMetadata(
  seo: Seo,
  lang: Language,
  pagePath: string,
): Metadata {
  const currentPath = `/${lang}${pagePath}`;
  const canonicalUrl = seo.canonical ?? absoluteUrl(currentPath);

  const languages: Record<string, string> = {};
  for (const l of LANGUAGES) {
    languages[l] = absoluteUrl(`/${l}${pagePath}`);
  }

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonicalUrl,
      locale: lang,
      type: "website",
      ...(seo.ogImagePath
        ? { images: [{ url: absoluteUrl(seo.ogImagePath) }] }
        : {}),
    },
  };
}

/** Get all static page paths (without lang prefix) for sitemap generation */
export function getAllPagePaths(): string[] {
  return ["", "/info", "/about", "/contacts", "/articles", "/conditions"];
}

export { SITE_URL, absoluteUrl };
