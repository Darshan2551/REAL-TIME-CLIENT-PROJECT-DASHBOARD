import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const projectIdParamSchema = z.object({
  projectId: z.coerce.number().int().positive()
});

export const taskFiltersSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueFrom: z.string().datetime().optional(),
  dueTo: z.string().datetime().optional(),
  projectId: z.coerce.number().int().positive().optional(),
  assignedDeveloperId: z.string().uuid().optional()
});

export const missedEventsQuerySchema = z.object({
  since: z.string().datetime().optional()
});
