import type { Contacts, About, Condition, Article } from "@/schemas";
import { SITE_URL } from "@/lib/seo";

/**
 * Generate MedicalBusiness JSON-LD for local SEO.
 * Uses contacts data for NAP (Name/Address/Phone).
 */
export function buildMedicalBusinessJsonLd(
  contacts: Contacts,
  siteName: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: siteName,
    url: SITE_URL,
    telephone: contacts.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: contacts.address,
      addressLocality: "Riga",
      addressCountry: "LV",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 56.95,
      longitude: 24.1,
    },
    ...(contacts.workHours
      ? { openingHours: contacts.workHours }
      : {}),
  };
}

/**
 * Generate Physician JSON-LD for the about page.
 */
export function buildPhysicianJsonLd(
  about: About,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: about.title,
    description: about.summary,
    medicalSpecialty: "Acupuncture",
    ...(about.credentials.length > 0
      ? { hasCredential: about.credentials.map((c) => ({ "@type": "EducationalOccupationalCredential", credentialCategory: c })) }
      : {}),
  };
}

/**
 * Generate FAQPage JSON-LD from a condition's FAQ array.
 */
export function buildFaqPageJsonLd(
  faq: Condition["faq"],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

/**
 * Generate Article JSON-LD for article detail pages.
 */
export function buildArticleJsonLd(
  article: Article,
  lang: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    dateModified: article.updatedAt,
    inLanguage: lang,
    url: `${SITE_URL}/${lang}/articles/${article.slug}`,
    ...(article.heroImagePath
      ? { image: `${SITE_URL}${article.heroImagePath}` }
      : {}),
    author: {
      "@type": "Organization",
      name: "Acupuncture Clinic",
    },
  };
}
