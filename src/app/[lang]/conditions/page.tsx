import type { Metadata } from "next";
import Link from "next/link";
import type { Language } from "@/schemas";
import { getTranslations, getConditionsList, getCondition } from "@/lib/content";
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
    title: translations.buttons.conditionsMetaTitle,
    description: translations.buttons.conditionsMetaDescription,
  };
}

export default async function ConditionsListPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const typedLang = lang as Language;
  const translations = getTranslations(typedLang);
  const conditionsIndex = getConditionsList();

  const publishedItems = conditionsIndex.items
    .filter((c) => c.published)
    .sort((a, b) => a.order - b.order);

  const conditions = publishedItems.map((item) => getCondition(item.slug, typedLang));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold sm:text-4xl">
        {translations.buttons.popularConditions}
      </h1>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {conditions.map((condition) => (
          <Link
            key={condition.slug}
            href={`/${lang}/conditions/${condition.slug}`}
            className="group rounded-lg border border-border p-6 transition-colors hover:bg-muted"
          >
            <h2 className="text-lg font-semibold group-hover:text-accent">
              {condition.title}
            </h2>
            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
              {condition.intro}
            </p>
            <span className="mt-3 inline-block text-sm font-medium text-accent">
              {translations.buttons.readMore}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
