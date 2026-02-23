import type { Language } from "@/schemas";
import { getTranslations } from "@/lib/content";

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const translations = getTranslations(lang as Language);

  return (
    <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-3xl font-bold sm:text-4xl">Acupuncture Landing</h1>
      <p className="mt-4 text-lg text-muted-foreground">{translations.buttons.callToAction}</p>
    </section>
  );
}
