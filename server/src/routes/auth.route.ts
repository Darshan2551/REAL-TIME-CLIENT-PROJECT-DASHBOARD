import { Router } from "express";
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from "../config/auth.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { prisma } from "../lib/prisma.js";
import { loginWithPassword, revokeRefreshToken, rotateRefreshToken, sanitizeUser } from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { unauthorized } from "../utils/httpError.js";
import { loginSchema } from "../validators/auth.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const authResult = await loginWithPassword(email, password);

    res.cookie(REFRESH_COOKIE_NAME, authResult.refreshToken, refreshCookieOptions);

    res.json({
      success: true,
      data: {
        accessToken: authResult.accessToken,
        user: authResult.user
      }
    });
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;

    if (!refreshToken) {
      throw unauthorized("Missing refresh token cookie");
    }

    const rotated = await rotateRefreshToken(refreshToken);
    res.cookie(REFRESH_COOKIE_NAME, rotated.refreshToken, refreshCookieOptions);

    res.json({
      success: true,
      data: {
        accessToken: rotated.accessToken,
        user: rotated.user
      }
    });
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, {
      ...refreshCookieOptions,
      maxAge: undefined
    });

    res.json({
      success: true,
      data: {
        message: "Logged out"
      }
    });
  })
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;
    const user = await prisma.user.findUnique({ where: { id: authUser.userId } });

    if (!user) {
      throw unauthorized("User not found");
    }

    res.json({
      success: true,
      data: sanitizeUser(user)
    });
  })
);
