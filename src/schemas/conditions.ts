import { z } from "zod";
import { SeoSchema } from "./seo";
import { InfoSectionSchema } from "./info";

export const ConditionsIndexSchema = z.object({
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

export const ConditionSchema = z.object({
  id: z.string(),
  slug: z.string().min(1),
  updatedAt: z.string().datetime(),
  seo: SeoSchema,
  title: z.string().min(1),
  intro: z.string().min(1),
  sections: z.array(InfoSectionSchema).min(1),
  contraindications: z.array(z.string().min(1)).default([]),
  faq: z
    .array(
      z.object({
        q: z.string().min(1),
        a: z.string().min(1),
      }),
    )
    .default([]),
});

export type ConditionsIndex = z.infer<typeof ConditionsIndexSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
