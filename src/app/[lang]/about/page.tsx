import type { Metadata } from "next";
import Image from "next/image";
import type { Language } from "@/schemas";
import { getAbout } from "@/lib/content";
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
  const about = getAbout(lang as Language);
  return {
    title: about.seo.title,
    description: about.seo.description,
  };
}

export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const about = getAbout(lang as Language);

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold sm:text-4xl">{about.title}</h1>

      {/* Summary + experience */}
      <div className="mt-6">
        <p className="text-lg leading-relaxed text-muted-foreground">{about.summary}</p>
        {about.experienceYears != null && about.experienceYears > 0 && (
          <div className="mt-6 inline-flex items-baseline gap-2 rounded-lg bg-muted px-4 py-3">
            <span className="text-3xl font-bold text-accent">{about.experienceYears}+</span>
            <span className="text-sm font-medium text-muted-foreground">
              {lang === "lv"
                ? "gadu pieredze"
                : lang === "ru"
                  ? "лет опыта"
                  : "years of experience"}
            </span>
          </div>
        )}
      </div>

      {/* Credentials */}
      {about.credentials.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold">
            {lang === "lv"
              ? "Kvalifikācijas"
              : lang === "ru"
                ? "Квалификации"
                : "Credentials"}
          </h2>
          <ul className="mt-4 space-y-3">
            {about.credentials.map((credential, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  ✓
                </span>
                <span className="text-muted-foreground">{credential}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Certificates */}
      {about.certificates.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold">
            {lang === "lv"
              ? "Sertifikāti"
              : lang === "ru"
                ? "Сертификаты"
                : "Certificates"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {about.certificates.map((cert, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-lg border border-border"
              >
                {cert.imagePath && (
                  <div className="relative aspect-[4/3] w-full bg-muted">
                    <Image
                      src={cert.imagePath}
                      alt={cert.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                  </div>
                )}
                <div className="px-4 py-3">
                  <p className="font-medium">{cert.title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
