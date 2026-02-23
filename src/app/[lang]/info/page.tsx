import type { Metadata } from "next";
import type { Language } from "@/schemas";
import { getInfo } from "@/lib/content";
import { generateLangStaticParams } from "@/lib/languages";
import { generatePageMetadata } from "@/lib/seo";
import { ContentSections } from "@/components/content-sections";

export function generateStaticParams() {
  return generateLangStaticParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const info = getInfo(lang as Language);
  return generatePageMetadata(info.seo, lang as Language, "/info");
}

export default async function InfoPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const info = getInfo(lang as Language);

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold sm:text-4xl">{info.title}</h1>
      <div className="mt-8">
        <ContentSections sections={info.sections} />
      </div>
    </article>
  );
}
