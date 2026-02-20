import { z } from "zod";

export const ContactsSchema = z.object({
  id: z.string(),
  updatedAt: z.string().datetime(),
  phone: z.string().min(3),
  address: z.string().min(3),
  mapEmbedUrl: z.string().url().optional(),
  introText: z.string().optional(),
  workHours: z.string().optional(),
});

export type Contacts = z.infer<typeof ContactsSchema>;
