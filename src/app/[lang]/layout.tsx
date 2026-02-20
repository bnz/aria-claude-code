import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { generateLangStaticParams, isValidLanguage } from "@/lib/languages";
import { getTranslations } from "@/lib/content";
import { I18nProvider } from "@/lib/i18n-context";
import type { Language } from "@/schemas";

export function generateStaticParams() {
  return generateLangStaticParams();
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  return params.then(({ lang }) => ({
    title: "Acupuncture",
    description: "Professional acupuncture services",
    alternates: {
      languages: {
        en: "/en",
        lv: "/lv",
        ru: "/ru",
      },
    },
    openGraph: {
      locale: lang,
    },
  }));
}

export default async function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;

  if (!isValidLanguage(lang)) {
    notFound();
  }

  const translations = getTranslations(lang as Language);

  return (
    <html lang={lang}>
      <body className="antialiased">
        <I18nProvider lang={lang as Language} translations={translations}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
