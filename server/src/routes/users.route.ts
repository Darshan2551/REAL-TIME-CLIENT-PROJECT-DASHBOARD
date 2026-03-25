import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const usersRouter = Router();

const userQuerySchema = z.object({
  role: z.enum(["ADMIN", "PROJECT_MANAGER", "DEVELOPER"]).optional()
});

usersRouter.get(
  "/",
  authenticate,
  authorize("ADMIN", "PROJECT_MANAGER"),
  validateQuery(userQuerySchema),
  asyncHandler(async (req, res) => {
    const { role } = req.query as { role?: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER" };
    const authUser = req.authUser!;

    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(authUser.role === "PROJECT_MANAGER" ? { role: "DEVELOPER" } : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    res.json({
      success: true,
      data: users
    });
  })
);
