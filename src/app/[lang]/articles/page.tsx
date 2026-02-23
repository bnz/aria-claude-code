import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import type { Language } from "@/schemas";
import { getTranslations, getArticlesList, getArticle } from "@/lib/content";
import { generateLangStaticParams } from "@/lib/languages";

export function generateStaticParams() {
  return generateLangStaticParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const translations = getTranslations(lang as Language);
  return {
    title: translations.buttons.articlesMetaTitle,
    description: translations.buttons.articlesMetaDescription,
  };
}

export default async function ArticlesListPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const typedLang = lang as Language;
  const translations = getTranslations(typedLang);
  const t = translations.buttons;
  const articlesIndex = getArticlesList();

  const publishedItems = articlesIndex.items
    .filter((a) => a.published)
    .sort((a, b) => a.order - b.order);

  const articles = publishedItems.map((item) => getArticle(item.slug, typedLang));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold sm:text-4xl">
        {translations.header.navArticles}
      </h1>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/${lang}/articles/${article.slug}`}
            className="group overflow-hidden rounded-lg border border-border transition-colors hover:bg-muted"
          >
            {article.heroImagePath && (
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                <Image
                  src={article.heroImagePath}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            )}
            <div className="p-6">
              <h2 className="text-lg font-semibold group-hover:text-accent">
                {article.title}
              </h2>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                {article.excerpt}
              </p>
              <span className="mt-3 inline-block text-sm font-medium text-accent">
                {t.readMore}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
