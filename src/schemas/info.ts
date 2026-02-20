import { z } from "zod";
import { SeoSchema } from "./seo";

export const InfoSectionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    title: z.string().optional(),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal("bullets"),
    title: z.string().optional(),
    items: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal("image"),
    imagePath: z.string().min(1),
    caption: z.string().optional(),
  }),
]);

export const InfoSchema = z.object({
  id: z.string(),
  updatedAt: z.string().datetime(),
  seo: SeoSchema,
  title: z.string().min(1),
  sections: z.array(InfoSectionSchema).min(1),
});

export type InfoSection = z.infer<typeof InfoSectionSchema>;
export type Info = z.infer<typeof InfoSchema>;
