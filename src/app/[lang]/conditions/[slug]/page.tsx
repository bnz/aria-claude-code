import type { Metadata } from "next";
import Link from "next/link";
import type { Language } from "@/schemas";
import { LANGUAGES } from "@/schemas";
import {
  getTranslations,
  getContacts,
  getConditionsList,
  getCondition,
} from "@/lib/content";
import { generatePageMetadata } from "@/lib/seo";
import { ContentSections } from "@/components/content-sections";

export function generateStaticParams() {
  const index = getConditionsList();
  const publishedItems = index.items.filter((c) => c.published);

  return publishedItems.flatMap((item) =>
    LANGUAGES.map((lang) => ({
      lang,
      slug: item.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const condition = getCondition(slug, lang as Language);
  return generatePageMetadata(condition.seo, lang as Language, `/conditions/${slug}`);
}

export default async function ConditionDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const typedLang = lang as Language;
  const condition = getCondition(slug, typedLang);
  const translations = getTranslations(typedLang);
  const contacts = getContacts(typedLang);
  const t = translations.buttons;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href={`/${lang}/conditions`}
        className="text-sm font-medium text-accent transition-colors hover:text-accent/80"
      >
        &larr; {t.backToConditions}
      </Link>

      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{condition.title}</h1>

      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        {condition.intro}
      </p>

      {/* Sections (text, bullets, image) */}
      <div className="mt-8">
        <ContentSections sections={condition.sections} />
      </div>

      {/* Contraindications */}
      {condition.contraindications.length > 0 && (
        <section className="mt-10 rounded-lg border border-yellow-500/30 bg-yellow-50 p-6 dark:bg-yellow-950/20">
          <h2 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200">
            {t.contraindications}
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-yellow-700 dark:text-yellow-300">
            {condition.contraindications.map((item, i) => (
              <li key={i} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* FAQ */}
      {condition.faq.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold">{t.faqTitle}</h2>
          <dl className="mt-4 space-y-6">
            {condition.faq.map((item, i) => (
              <div key={i}>
                <dt className="font-medium">{item.q}</dt>
                <dd className="mt-2 text-muted-foreground">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* CTA */}
      <section className="mt-12 rounded-lg bg-muted p-8 text-center">
        <h2 className="text-2xl font-bold">{t.ctaTitle}</h2>
        <p className="mt-2 text-muted-foreground">{t.ctaText}</p>
        <a
          href={`tel:${contacts.phone.replace(/\s/g, "")}`}
          className="mt-4 inline-flex items-center rounded-lg bg-accent px-8 py-3 text-lg font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
        >
          {t.callNow} — {contacts.phone}
        </a>
      </section>
    </article>
  );
}
