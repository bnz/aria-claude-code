import type { MetadataRoute } from "next";
import { LANGUAGES } from "@/schemas";
import { getArticlesList, getConditionsList } from "@/lib/content";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ["", "/info", "/about", "/contacts", "/articles", "/conditions"];

  const entries: MetadataRoute.Sitemap = [];

  // Static pages × languages
  for (const pagePath of staticPaths) {
    for (const lang of LANGUAGES) {
      entries.push({
        url: `${SITE_URL}/${lang}${pagePath}`,
        lastModified: new Date(),
        alternates: {
          languages: Object.fromEntries(
            LANGUAGES.map((l) => [l, `${SITE_URL}/${l}${pagePath}`]),
          ),
        },
      });
    }
  }

  // Article detail pages
  const articlesIndex = getArticlesList();
  for (const item of articlesIndex.items.filter((a) => a.published)) {
    for (const lang of LANGUAGES) {
      entries.push({
        url: `${SITE_URL}/${lang}/articles/${item.slug}`,
        lastModified: new Date(),
        alternates: {
          languages: Object.fromEntries(
            LANGUAGES.map((l) => [l, `${SITE_URL}/${l}/articles/${item.slug}`]),
          ),
        },
      });
    }
  }

  // Condition detail pages
  const conditionsIndex = getConditionsList();
  for (const item of conditionsIndex.items.filter((c) => c.published)) {
    for (const lang of LANGUAGES) {
      entries.push({
        url: `${SITE_URL}/${lang}/conditions/${item.slug}`,
        lastModified: new Date(),
        alternates: {
          languages: Object.fromEntries(
            LANGUAGES.map((l) => [l, `${SITE_URL}/${l}/conditions/${item.slug}`]),
          ),
        },
      });
    }
  }

  return entries;
}
