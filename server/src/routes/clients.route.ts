import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createClientSchema } from "../validators/project.js";

export const clientsRouter = Router();

clientsRouter.get(
  "/",
  authenticate,
  authorize("ADMIN", "PROJECT_MANAGER"),
  asyncHandler(async (_req, res) => {
    const clients = await prisma.agencyClient.findMany({
      orderBy: { createdAt: "desc" }
    });

    res.json({
      success: true,
      data: clients
    });
  })
);

clientsRouter.post(
  "/",
  authenticate,
  authorize("ADMIN", "PROJECT_MANAGER"),
  validateBody(createClientSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body;

    const client = await prisma.agencyClient.create({
      data: payload
    });

    res.status(201).json({
      success: true,
      data: client
    });
  })
);
