import type { Metadata } from "next";
import type { Language } from "@/schemas";
import { getContacts, getTranslations } from "@/lib/content";
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
  const t = getTranslations(lang as Language);
  return {
    title: `${t.header.navContacts} — Acupuncture`,
    description: `Contact us for acupuncture consultations in Riga.`,
  };
}

export default async function ContactsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const typedLang = lang as Language;
  const contacts = getContacts(typedLang);
  const translations = getTranslations(typedLang);
  const t = translations.buttons;
  const ft = translations.footer;

  const phoneClean = contacts.phone.replace(/\s/g, "");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold sm:text-4xl">{translations.header.navContacts}</h1>

      {contacts.introText && (
        <p className="mt-4 text-lg text-muted-foreground">{contacts.introText}</p>
      )}

      {/* CTA call button — prominent, mobile-first */}
      <a
        href={`tel:${phoneClean}`}
        className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg bg-accent px-8 py-4 text-xl font-bold text-accent-foreground transition-colors hover:bg-accent/90 sm:w-auto sm:inline-flex"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
          />
        </svg>
        {t.callNow} — {contacts.phone}
      </a>

      {/* Contact details */}
      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        {/* Info column */}
        <div className="space-y-6">
          {/* Phone */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {ft.phone ?? "Phone"}
            </h2>
            <a
              href={`tel:${phoneClean}`}
              className="mt-1 block text-lg font-medium text-accent transition-colors hover:text-accent/80"
            >
              {contacts.phone}
            </a>
          </div>

          {/* Address */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {ft.address ?? "Address"}
            </h2>
            <p className="mt-1 text-lg">{contacts.address}</p>
          </div>

          {/* Work hours */}
          {contacts.workHours && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {ft.workHours ?? "Working Hours"}
              </h2>
              <p className="mt-1 text-lg">{contacts.workHours}</p>
            </div>
          )}
        </div>

        {/* Map */}
        {contacts.mapEmbedUrl && (
          <div className="overflow-hidden rounded-lg border border-border">
            <iframe
              src={contacts.mapEmbedUrl}
              title="Google Maps"
              className="h-64 w-full sm:h-full sm:min-h-[300px]"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </div>
    </div>
  );
}
