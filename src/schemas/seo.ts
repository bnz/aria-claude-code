import { z } from "zod";

export const SeoSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).max(320),
  canonical: z.string().url().optional(),
  ogImagePath: z.string().min(1).optional(),
});

export type Seo = z.infer<typeof SeoSchema>;
