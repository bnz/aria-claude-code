import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import type { Language } from "@/schemas";
import { LANGUAGES } from "@/schemas";
import { getTranslations, getArticlesList, getArticle } from "@/lib/content";
import { ArticleSections } from "@/components/article-sections";

export function generateStaticParams() {
  const index = getArticlesList();
  const publishedItems = index.items.filter((a) => a.published);

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
  const article = getArticle(slug, lang as Language);
  return {
    title: article.seo.title,
    description: article.seo.description,
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const typedLang = lang as Language;
  const article = getArticle(slug, typedLang);
  const translations = getTranslations(typedLang);
  const t = translations.buttons;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href={`/${lang}/articles`}
        className="text-sm font-medium text-accent transition-colors hover:text-accent/80"
      >
        &larr; {t.backToArticles}
      </Link>

      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{article.title}</h1>

      {article.heroImagePath && (
        <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src={article.heroImagePath}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      )}

      <div className="mt-8">
        <ArticleSections sections={article.sections} />
      </div>
    </article>
  );
}
