import prismaPkg from "@prisma/client";
import type { NotificationType as PrismaNotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { emitNotificationCount, emitNotificationCreated } from "./socket.service.js";

const { NotificationType } = prismaPkg;

export const createNotification = async (params: {
  userId: string;
  type: PrismaNotificationType;
  message: string;
  projectId?: number;
  taskId?: number;
}) => {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      message: params.message,
      projectId: params.projectId,
      taskId: params.taskId
    }
  });

  const unreadCount = await prisma.notification.count({
    where: {
      userId: params.userId,
      isRead: false
    }
  });

  emitNotificationCreated(params.userId, notification);
  emitNotificationCount(params.userId, unreadCount);

  return notification;
};

export const pushUnreadCount = async (userId: string) => {
  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      isRead: false
    }
  });

  emitNotificationCount(userId, unreadCount);
};
