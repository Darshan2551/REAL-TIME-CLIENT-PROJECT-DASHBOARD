import { Router } from "express";
import prismaPkg from "@prisma/client";
import type { Prisma, TaskPriority as PrismaTaskPriority, TaskStatus as PrismaTaskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import { assertCanAccessTask, assertCanManageProject } from "../services/access.service.js";
import { createTaskStatusActivity } from "../services/activity.service.js";
import { createNotification } from "../services/notification.service.js";
import { emitActivityUpdate } from "../services/socket.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest } from "../utils/httpError.js";
import { idParamSchema, projectIdParamSchema, taskFiltersSchema } from "../validators/common.js";
import { createTaskSchema, reassignTaskSchema, updateTaskStatusSchema } from "../validators/task.js";

const { NotificationType, TaskPriority, TaskStatus } = prismaPkg;

export const tasksRouter = Router();

const priorityOrder: Record<PrismaTaskPriority, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4
};

const buildTaskWhere = (authUser: { userId: string; role: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER" }, query: Record<string, unknown>): Prisma.TaskWhereInput => {
  // do not trust query filters alone, role scope is applyed first
  const baseWhere: Prisma.TaskWhereInput =
    authUser.role === "ADMIN"
      ? {}
      : authUser.role === "PROJECT_MANAGER"
        ? {
            project: {
              createdById: authUser.userId
            }
          }
        : {
            assignedDeveloperId: authUser.userId
          };

  const typed = query as {
    status?: PrismaTaskStatus;
    priority?: PrismaTaskPriority;
    dueFrom?: string;
    dueTo?: string;
    projectId?: number;
    assignedDeveloperId?: string;
  };

  return {
    ...baseWhere,
    ...(typed.status ? { status: typed.status } : {}),
    ...(typed.priority ? { priority: typed.priority } : {}),
    ...(typed.projectId ? { projectId: Number(typed.projectId) } : {}),
    ...(typed.dueFrom || typed.dueTo
      ? {
          dueDate: {
            ...(typed.dueFrom ? { gte: new Date(typed.dueFrom) } : {}),
            ...(typed.dueTo ? { lte: new Date(typed.dueTo) } : {})
          }
        }
      : {}),
    ...(authUser.role !== "DEVELOPER" && typed.assignedDeveloperId
      ? {
          assignedDeveloperId: typed.assignedDeveloperId
        }
      : {})
  };
};

tasksRouter.get(
  "/",
  authenticate,
  validateQuery(taskFiltersSchema),
  asyncHandler(async (req, res) => {
    const authUser = req.authUser! as { userId: string; role: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER" };
    const where = buildTaskWhere(authUser, req.query);

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedDeveloper: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            createdById: true
          }
        }
      },
      orderBy: [
        {
          dueDate: "asc"
        },
        {
          createdAt: "desc"
        }
      ]
    });

    const sorted =
      authUser.role === "DEVELOPER"
        ? [...tasks].sort((a, b) => {
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) {
              return priorityDiff;
            }
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          })
        : tasks;

    res.json({
      success: true,
      data: sorted
    });
  })
);

tasksRouter.post(
  "/project/:projectId",
  authenticate,
  authorize("ADMIN", "PROJECT_MANAGER"),
  validateParams(projectIdParamSchema),
  validateBody(createTaskSchema),
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;
    const projectId = Number(req.params.projectId);
    const payload = req.body;

    const project = await assertCanManageProject(authUser, projectId);

    const developer = await prisma.user.findFirst({
      where: {
        id: payload.assignedDeveloperId,
        role: "DEVELOPER"
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!developer) {
      throw badRequest("Assigned user must be a developer");
    }

    const dueDate = new Date(payload.dueDate);

    const task = await prisma.task.create({
      data: {
        projectId,
        title: payload.title,
        description: payload.description,
        assignedDeveloperId: payload.assignedDeveloperId,
        status: payload.status ?? TaskStatus.TODO,
        priority: payload.priority,
        dueDate,
        isOverdue: dueDate < new Date(),
        createdById: authUser.userId
      },
      include: {
        assignedDeveloper: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            createdById: true
          }
        }
      }
    });

    await createNotification({
      userId: developer.id,
      type: NotificationType.TASK_ASSIGNED,
      message: `You were assigned Task #${task.id}: ${task.title}`,
      projectId,
      taskId: task.id
    });

    // this one is kinda noisy but helps timeline look real
    const activity = await prisma.taskActivity.create({
      data: {
        taskId: task.id,
        projectId,
        actorId: authUser.userId,
        action: "TASK_CREATED",
        message: `Task #${task.id} created and assigned to ${developer.name}`
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

    emitActivityUpdate({
      id: activity.id,
      projectId: activity.projectId,
      taskId: activity.taskId,
      message: activity.message,
      fromStatus: activity.fromStatus,
      toStatus: activity.toStatus,
      createdAt: activity.createdAt,
      actor: activity.actor,
      projectOwnerId: project.createdById,
      assignedDeveloperId: task.assignedDeveloperId
    });

    res.status(201).json({
      success: true,
      data: {
        ...task,
        projectOwnerId: project.createdById
      }
    });
  })
);

tasksRouter.patch(
  "/:id/status",
  authenticate,
  validateParams(idParamSchema),
  validateBody(updateTaskStatusSchema),
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;
    const taskId = Number(req.params.id);
    const { status } = req.body as { status: PrismaTaskStatus };

    const task = await assertCanAccessTask(authUser, taskId);

    if (authUser.role === "DEVELOPER" && task.assignedDeveloperId !== authUser.userId) {
      throw badRequest("Developers can only update their own tasks");
    }

    if (task.status === status) {
      throw badRequest("Task already has this status");
    }

    const actor = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        name: true,
        role: true
      }
    });

    if (!actor) {
      throw badRequest("Actor user not found");
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        isOverdue: status !== TaskStatus.DONE && task.dueDate < new Date() ? true : task.isOverdue
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            createdById: true,
            createdBy: {
              select: {
                id: true,
                role: true,
                name: true
              }
            }
          }
        },
        assignedDeveloper: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const activity = await createTaskStatusActivity({
      taskId: updatedTask.id,
      projectId: updatedTask.projectId,
      actorId: actor.id,
      actorName: actor.name,
      fromStatus: task.status,
      toStatus: status
    });

    emitActivityUpdate({
      id: activity.id,
      projectId: activity.projectId,
      taskId: activity.taskId,
      message: activity.message,
      fromStatus: activity.fromStatus,
      toStatus: activity.toStatus,
      createdAt: activity.createdAt,
      actor: activity.actor,
      projectOwnerId: updatedTask.project.createdById,
      assignedDeveloperId: updatedTask.assignedDeveloperId
    });

    if (
      status === TaskStatus.IN_REVIEW &&
      updatedTask.project.createdBy.role === "PROJECT_MANAGER" &&
      updatedTask.project.createdBy.id !== authUser.userId
    ) {
      await createNotification({
        userId: updatedTask.project.createdBy.id,
        type: NotificationType.TASK_IN_REVIEW,
        message: `${updatedTask.assignedDeveloper.name} moved Task #${updatedTask.id} to In Review`,
        projectId: updatedTask.project.id,
        taskId: updatedTask.id
      });
    }

    res.json({
      success: true,
      data: updatedTask
    });
  })
);

tasksRouter.patch(
  "/:id/reassign",
  authenticate,
  authorize("ADMIN", "PROJECT_MANAGER"),
  validateParams(idParamSchema),
  validateBody(reassignTaskSchema),
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;
    const taskId = Number(req.params.id);
    const { assignedDeveloperId } = req.body;

    const task = await assertCanAccessTask(authUser, taskId);
    await assertCanManageProject(authUser, task.projectId);

    const developer = await prisma.user.findFirst({
      where: {
        id: assignedDeveloperId,
        role: "DEVELOPER"
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!developer) {
      throw badRequest("Assigned user must be a developer");
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        assignedDeveloperId
      }
    });

    await createNotification({
      userId: assignedDeveloperId,
      type: NotificationType.TASK_ASSIGNED,
      message: `You were assigned Task #${updatedTask.id}: ${updatedTask.title}`,
      projectId: updatedTask.projectId,
      taskId: updatedTask.id
    });

    await prisma.taskActivity.create({
      data: {
        taskId: updatedTask.id,
        projectId: updatedTask.projectId,
        actorId: authUser.userId,
        action: "TASK_REASSIGNED",
        message: `Task #${updatedTask.id} reassigned to ${developer.name}`
      }
    });

    res.json({
      success: true,
      data: updatedTask
    });
  })
);
