import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { validateParams, validateQuery } from "../middleware/validate.js";
import { pushUnreadCount } from "../services/notification.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notFound } from "../utils/httpError.js";

export const notificationsRouter = Router();

const querySchema = z.object({
  onlyUnread: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  take: z.coerce.number().int().min(1).max(100).optional()
});

const idSchema = z.object({
  id: z.coerce.number().int().positive()
});

notificationsRouter.get(
  "/",
  authenticate,
  validateQuery(querySchema),
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;
    const { onlyUnread, take } = req.query as { onlyUnread?: boolean; take?: number };

    const notifications = await prisma.notification.findMany({
      where: {
        userId: authUser.userId,
        ...(onlyUnread ? { isRead: false } : {})
      },
      orderBy: {
        createdAt: "desc"
      },
      take: take ?? 30
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: authUser.userId,
        isRead: false
      }
    });

    res.json({
      success: true,
      data: {
        items: notifications,
        unreadCount
      }
    });
  })
);

notificationsRouter.patch(
  "/:id/read",
  authenticate,
  validateParams(idSchema),
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;
    const notificationId = Number(req.params.id);

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: authUser.userId
      }
    });

    if (!notification) {
      throw notFound("Notification not found");
    }

    const updated = await prisma.notification.update({
      where: {
        id: notification.id
      },
      data: {
        isRead: true
      }
    });

    await pushUnreadCount(authUser.userId);

    res.json({
      success: true,
      data: updated
    });
  })
);

notificationsRouter.patch(
  "/read-all",
  authenticate,
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;

    await prisma.notification.updateMany({
      where: {
        userId: authUser.userId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    await pushUnreadCount(authUser.userId);

    res.json({
      success: true,
      data: {
        message: "All notifications marked as read"
      }
    });
  })
);
