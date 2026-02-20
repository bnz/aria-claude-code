import type { Language } from "@/schemas";
import { getTranslations } from "@/lib/content";

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const translations = getTranslations(lang as Language);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-semibold">Acupuncture Landing</h1>
      <p className="ml-2 text-lg text-gray-500">({translations.buttons.callToAction})</p>
    </main>
  );
}
