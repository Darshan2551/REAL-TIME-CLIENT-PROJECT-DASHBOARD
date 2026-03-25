import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().min(2).max(5000),
  assignedDeveloperId: z.string().uuid(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  dueDate: z.string().datetime()
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"])
});

export const reassignTaskSchema = z.object({
  assignedDeveloperId: z.string().uuid()
});
