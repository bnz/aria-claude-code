import Image from "next/image";
import type { InfoSection } from "@/schemas";

interface ContentSectionsProps {
  sections: InfoSection[];
}

export function ContentSections({ sections }: ContentSectionsProps) {
  return (
    <div className="space-y-8">
      {sections.map((section, index) => (
        <ContentSection key={index} section={section} />
      ))}
    </div>
  );
}

function ContentSection({ section }: { section: InfoSection }) {
  switch (section.type) {
    case "text":
      return (
        <div>
          {section.title && (
            <h3 className="mb-3 text-xl font-semibold">{section.title}</h3>
          )}
          <p className="leading-relaxed text-muted-foreground">{section.content}</p>
        </div>
      );
    case "bullets":
      return (
        <div>
          {section.title && (
            <h3 className="mb-3 text-xl font-semibold">{section.title}</h3>
          )}
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            {section.items.map((item, i) => (
              <li key={i} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>
      );
    case "image":
      return (
        <figure>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <Image
              src={section.imagePath}
              alt={section.caption ?? ""}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
          {section.caption && (
            <figcaption className="mt-2 text-center text-sm text-muted-foreground">
              {section.caption}
            </figcaption>
          )}
        </figure>
      );
  }
}
