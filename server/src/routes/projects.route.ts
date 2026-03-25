import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { assertCanManageProject, assertCanViewProject } from "../services/access.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createProjectSchema } from "../validators/project.js";

export const projectsRouter = Router();

const projectParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

projectsRouter.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;

    const projects = await prisma.project.findMany({
      where:
        authUser.role === "ADMIN"
          ? {}
          : authUser.role === "PROJECT_MANAGER"
            ? { createdById: authUser.userId }
            : {
                tasks: {
                  some: {
                    assignedDeveloperId: authUser.userId
                  }
                }
              },
      include: {
        client: true,
        _count: {
          select: {
            tasks: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json({
      success: true,
      data: projects
    });
  })
);

projectsRouter.post(
  "/",
  authenticate,
  authorize("ADMIN", "PROJECT_MANAGER"),
  validateBody(createProjectSchema),
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;
    const payload = req.body;

    const project = await prisma.project.create({
      data: {
        name: payload.name,
        description: payload.description,
        clientId: payload.clientId,
        createdById: authUser.userId
      },
      include: {
        client: true
      }
    });

    res.status(201).json({
      success: true,
      data: project
    });
  })
);

projectsRouter.get(
  "/:id",
  authenticate,
  validateParams(projectParamSchema),
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;
    const projectId = Number(req.params.id);

    await assertCanViewProject(authUser, projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        tasks: {
          where:
            authUser.role === "DEVELOPER"
              ? {
                  assignedDeveloperId: authUser.userId
                }
              : {},
          include: {
            assignedDeveloper: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: {
            dueDate: "asc"
          }
        }
      }
    });

    res.json({
      success: true,
      data: project
    });
  })
);

projectsRouter.patch(
  "/:id",
  authenticate,
  authorize("ADMIN", "PROJECT_MANAGER"),
  validateParams(projectParamSchema),
  validateBody(
    z.object({
      name: z.string().min(2).max(120).optional(),
      description: z.string().max(1000).optional(),
      clientId: z.number().int().positive().optional()
    })
  ),
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;
    const projectId = Number(req.params.id);

    await assertCanManageProject(authUser, projectId);

    const project = await prisma.project.update({
      where: { id: projectId },
      data: req.body,
      include: {
        client: true
      }
    });

    res.json({
      success: true,
      data: project
    });
  })
);
