import { z } from "zod";
import { SeoSchema } from "./seo";

export const ArticlesIndexSchema = z.object({
  updatedAt: z.string().datetime(),
  items: z
    .array(
      z.object({
        id: z.string(),
        slug: z.string().min(1),
        published: z.boolean().default(true),
        order: z.number().int().default(0),
      }),
    )
    .default([]),
});

export const ArticleSectionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal("image"),
    imagePath: z.string().min(1),
    caption: z.string().optional(),
  }),
]);

export const ArticleSchema = z.object({
  id: z.string(),
  slug: z.string().min(1),
  updatedAt: z.string().datetime(),
  seo: SeoSchema,
  title: z.string().min(1),
  excerpt: z.string().min(1).max(280),
  heroImagePath: z.string().min(1).optional(),
  sections: z.array(ArticleSectionSchema).min(1),
});

export type ArticlesIndex = z.infer<typeof ArticlesIndexSchema>;
export type ArticleSection = z.infer<typeof ArticleSectionSchema>;
export type Article = z.infer<typeof ArticleSchema>;
