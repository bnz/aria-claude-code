import { z } from "zod";

export const TranslationsSchema = z.object({
  id: z.string(),
  updatedAt: z.string().datetime(),
  header: z.record(z.string(), z.string()).default({}),
  footer: z.record(z.string(), z.string()).default({}),
  buttons: z.record(z.string(), z.string()).default({}),
});

export type Translations = z.infer<typeof TranslationsSchema>;
