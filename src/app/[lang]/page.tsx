import Link from "next/link";
import type { Language } from "@/schemas";
import {
  getTranslations,
  getContacts,
  getArticlesList,
  getArticle,
  getConditionsList,
  getCondition,
} from "@/lib/content";

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const typedLang = lang as Language;
  const translations = getTranslations(typedLang);
  const contacts = getContacts(typedLang);
  const articlesIndex = getArticlesList();
  const conditionsIndex = getConditionsList();

  const t = translations.buttons;

  // Load latest 2 published articles
  const publishedArticles = articlesIndex.items
    .filter((a) => a.published)
    .sort((a, b) => a.order - b.order)
    .slice(0, 2);

  const articles = publishedArticles.map((item) => getArticle(item.slug, typedLang));

  // Load first 4 published conditions
  const publishedConditions = conditionsIndex.items
    .filter((c) => c.published)
    .sort((a, b) => a.order - b.order)
    .slice(0, 4);

  const conditions = publishedConditions.map((item) => getCondition(item.slug, typedLang));

  return (
    <>
      {/* Hero */}
      <section className="px-4 py-16 text-center sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{t.heroTitle}</h1>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">{t.heroSubtitle}</p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={`tel:${contacts.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center rounded-lg bg-accent px-6 py-3 text-base font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
            >
              {t.callNow} — {contacts.phone}
            </a>
            <Link
              href={`/${lang}/contacts`}
              className="inline-flex items-center rounded-lg border border-border px-6 py-3 text-base font-semibold transition-colors hover:bg-muted"
            >
              {t.callToAction}
            </Link>
          </div>
        </div>
      </section>

      {/* Latest Articles */}
      {articles.length > 0 && (
        <section className="border-t border-border px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{t.latestArticles}</h2>
              <Link
                href={`/${lang}/articles`}
                className="text-sm font-medium text-accent transition-colors hover:text-accent/80"
              >
                {t.viewAll}
              </Link>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {articles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/${lang}/articles/${article.slug}`}
                  className="group rounded-lg border border-border p-6 transition-colors hover:bg-muted"
                >
                  <h3 className="text-lg font-semibold group-hover:text-accent">
                    {article.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {article.excerpt}
                  </p>
                  <span className="mt-3 inline-block text-sm font-medium text-accent">
                    {t.readMore}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Conditions We Treat */}
      {conditions.length > 0 && (
        <section className="border-t border-border bg-muted px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{t.popularConditions}</h2>
              <Link
                href={`/${lang}/conditions`}
                className="text-sm font-medium text-accent transition-colors hover:text-accent/80"
              >
                {t.viewAll}
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {conditions.map((condition) => (
                <Link
                  key={condition.slug}
                  href={`/${lang}/conditions/${condition.slug}`}
                  className="group rounded-lg border border-border bg-background p-5 transition-colors hover:border-accent"
                >
                  <h3 className="font-semibold group-hover:text-accent">{condition.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {condition.intro}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-t border-border px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold sm:text-3xl">{t.ctaTitle}</h2>
          <p className="mt-4 text-muted-foreground">{t.ctaText}</p>
          <a
            href={`tel:${contacts.phone.replace(/\s/g, "")}`}
            className="mt-6 inline-flex items-center rounded-lg bg-accent px-8 py-3 text-lg font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            {contacts.phone}
          </a>
        </div>
      </section>
    </>
  );
}
