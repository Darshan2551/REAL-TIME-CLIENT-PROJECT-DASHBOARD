import type { Prisma, Role, TaskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const formatStatus = (status: TaskStatus | null | undefined) => {
  if (!status) {
    return "Unknown";
  }

  const withSpace = status.replaceAll("_", " ").toLowerCase();
  return withSpace.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const createTaskStatusActivity = async (params: {
  taskId: number;
  projectId: number;
  actorId: string;
  actorName: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
}) => {
  const { taskId, projectId, actorId, actorName, fromStatus, toStatus } = params;

  const message = `${actorName} moved Task #${taskId} from ${formatStatus(fromStatus)} to ${formatStatus(toStatus)}`;

  return prisma.taskActivity.create({
    data: {
      taskId,
      projectId,
      actorId,
      fromStatus,
      toStatus,
      action: "STATUS_CHANGED",
      message
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          role: true
        }
      }
    }
  });
};

const buildRoleWhere = (userId: string, role: Role): Prisma.TaskActivityWhereInput => {
  if (role === "ADMIN") {
    return {};
  }

  if (role === "PROJECT_MANAGER") {
    return {
      project: {
        createdById: userId
      }
    };
  }

  return {
    task: {
      assignedDeveloperId: userId
    }
  };
};

export const getActivityFeed = async (params: {
  userId: string;
  role: Role;
  projectId?: number;
  since?: Date;
  take?: number;
}) => {
  const { userId, role, projectId, since, take = 20 } = params;

  const where: Prisma.TaskActivityWhereInput = {
    ...buildRoleWhere(userId, role),
    ...(projectId ? { projectId } : {}),
    ...(since ? { createdAt: { gt: since } } : {})
  };

  return prisma.taskActivity.findMany({
    where,
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          role: true
        }
      },
      task: {
        select: {
          id: true,
          title: true,
          assignedDeveloperId: true
        }
      },
      project: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take
  });
};
