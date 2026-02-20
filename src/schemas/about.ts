import { z } from "zod";
import { SeoSchema } from "./seo";

export const AboutSchema = z.object({
  id: z.string(),
  updatedAt: z.string().datetime(),
  seo: SeoSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  credentials: z.array(z.string().min(1)).default([]),
  experienceYears: z.number().int().nonnegative().optional(),
  certificates: z
    .array(
      z.object({
        title: z.string().min(1),
        imagePath: z.string().min(1).optional(),
      }),
    )
    .default([]),
});

export type About = z.infer<typeof AboutSchema>;
