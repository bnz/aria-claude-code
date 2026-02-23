import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { generateLangStaticParams, isValidLanguage } from "@/lib/languages";
import { getTranslations, getContacts } from "@/lib/content";
import { generatePageMetadata } from "@/lib/seo";
import { I18nProvider } from "@/lib/i18n-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { Language } from "@/schemas";

export function generateStaticParams() {
  return generateLangStaticParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = getTranslations(lang as Language);
  return generatePageMetadata(
    { title: t.buttons.siteName, description: t.buttons.heroSubtitle },
    lang as Language,
    "",
  );
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
  const contacts = getContacts(lang as Language);

  return (
    <html lang={lang}>
      <body className="flex min-h-screen flex-col antialiased">
        <I18nProvider lang={lang as Language} translations={translations}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer contacts={contacts} />
        </I18nProvider>
      </body>
    </html>
  );
}
