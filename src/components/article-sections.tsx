import Image from "next/image";
import type { ArticleSection } from "@/schemas";

interface ArticleSectionsProps {
  sections: ArticleSection[];
}

export function ArticleSections({ sections }: ArticleSectionsProps) {
  return (
    <div className="space-y-8">
      {sections.map((section, index) => (
        <ArticleSectionBlock key={index} section={section} />
      ))}
    </div>
  );
}

function ArticleSectionBlock({ section }: { section: ArticleSection }) {
  switch (section.type) {
    case "text":
      return (
        <div>
          <p className="leading-relaxed text-muted-foreground">
            {section.content}
          </p>
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
