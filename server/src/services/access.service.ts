import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { forbidden, notFound } from "../utils/httpError.js";

export type AuthUser = {
  userId: string;
  role: Role;
};

export const getProjectOrThrow = async (projectId: number) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true
    }
  });

  if (!project) {
    throw notFound("Project not found");
  }

  return project;
};

export const assertCanManageProject = async (authUser: AuthUser, projectId: number) => {
  const project = await getProjectOrThrow(projectId);

  if (authUser.role === "ADMIN") {
    return project;
  }

  if (authUser.role === "PROJECT_MANAGER" && project.createdById === authUser.userId) {
    return project;
  }

  throw forbidden("You cannot manage this project");
};

export const assertCanViewProject = async (authUser: AuthUser, projectId: number) => {
  const project = await getProjectOrThrow(projectId);

  if (authUser.role === "ADMIN") {
    return project;
  }

  if (authUser.role === "PROJECT_MANAGER") {
    if (project.createdById !== authUser.userId) {
      throw forbidden("You cannot view this project");
    }

    return project;
  }

  const assignedTask = await prisma.task.findFirst({
    where: {
      projectId,
      assignedDeveloperId: authUser.userId
    },
    select: { id: true }
  });

  if (!assignedTask) {
    throw forbidden("You cannot view this project");
  }

  return project;
};

export const assertCanAccessTask = async (authUser: AuthUser, taskId: number) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: {
          id: true,
          createdById: true
        }
      }
    }
  });

  if (!task) {
    throw notFound("Task not found");
  }

  if (authUser.role === "ADMIN") {
    return task;
  }

  if (authUser.role === "PROJECT_MANAGER" && task.project.createdById === authUser.userId) {
    return task;
  }

  if (authUser.role === "DEVELOPER" && task.assignedDeveloperId === authUser.userId) {
    return task;
  }

  throw forbidden("You cannot access this task");
};
