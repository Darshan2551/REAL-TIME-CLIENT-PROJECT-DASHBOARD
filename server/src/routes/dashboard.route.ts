import { endOfWeek, startOfWeek } from "date-fns";
import { Router } from "express";
import { TaskPriority } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { presenceService } from "../services/presence.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const dashboardRouter = Router();

const priorityOrder: Record<TaskPriority, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4
};

dashboardRouter.get(
  "/admin",
  authenticate,
  authorize("ADMIN"),
  asyncHandler(async (_req, res) => {
    const [projectCount, tasksByStatus, overdueCount] = await Promise.all([
      prisma.project.count(),
      prisma.task.groupBy({
        by: ["status"],
        _count: {
          _all: true
        }
      }),
      prisma.task.count({ where: { isOverdue: true, status: { not: "DONE" } } })
    ]);

    res.json({
      success: true,
      data: {
        totalProjects: projectCount,
        tasksByStatus: tasksByStatus.reduce<Record<string, number>>((acc, row) => {
          acc[row.status] = row._count._all;
          return acc;
        }, {}),
        overdueTaskCount: overdueCount,
        onlineUsers: presenceService.getOnlineUserCount()
      }
    });
  })
);

dashboardRouter.get(
  "/pm",
  authenticate,
  authorize("PROJECT_MANAGER"),
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    const [projects, tasksByPriority, upcomingTasks] = await Promise.all([
      prisma.project.findMany({
        where: {
          createdById: authUser.userId
        },
        include: {
          _count: {
            select: {
              tasks: true
            }
          },
          client: true
        },
        orderBy: {
          createdAt: "desc"
        }
      }),
      prisma.task.groupBy({
        by: ["priority"],
        where: {
          project: {
            createdById: authUser.userId
          }
        },
        _count: {
          _all: true
        }
      }),
      prisma.task.findMany({
        where: {
          project: {
            createdById: authUser.userId
          },
          dueDate: {
            gte: weekStart,
            lte: weekEnd
          },
          status: {
            not: "DONE"
          }
        },
        include: {
          assignedDeveloper: {
            select: {
              id: true,
              name: true
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
          dueDate: "asc"
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        projects,
        tasksByPriority: tasksByPriority.reduce<Record<string, number>>((acc, row) => {
          acc[row.priority] = row._count._all;
          return acc;
        }, {}),
        upcomingDueDatesThisWeek: upcomingTasks
      }
    });
  })
);

dashboardRouter.get(
  "/developer",
  authenticate,
  authorize("DEVELOPER"),
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;

    const tasks = await prisma.task.findMany({
      where: {
        assignedDeveloperId: authUser.userId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const sortedTasks = [...tasks].sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    res.json({
      success: true,
      data: {
        assignedTasks: sortedTasks
      }
    });
  })
);
