import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { assertCanViewProject } from "../services/access.service.js";
import { getActivityFeed } from "../services/activity.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const activityRouter = Router();

const feedQuerySchema = z.object({
  projectId: z.coerce.number().int().positive().optional(),
  since: z.string().datetime().optional(),
  take: z.coerce.number().int().min(1).max(100).optional()
});

activityRouter.get(
  "/feed",
  authenticate,
  validateQuery(feedQuerySchema),
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;
    const { projectId, since, take } = req.query as { projectId?: number; since?: string; take?: number };

    if (projectId) {
      await assertCanViewProject(authUser, Number(projectId));
    }

    const feed = await getActivityFeed({
      userId: authUser.userId,
      role: authUser.role,
      projectId,
      since: since ? new Date(since) : undefined,
      take: take ?? 20
    });

    res.json({
      success: true,
      data: feed
    });
  })
);
