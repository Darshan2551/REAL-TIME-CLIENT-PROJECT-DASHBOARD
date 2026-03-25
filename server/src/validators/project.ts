import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(2).max(120),
  contactEmail: z.string().email().optional()
});

export const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  clientId: z.number().int().positive()
});
