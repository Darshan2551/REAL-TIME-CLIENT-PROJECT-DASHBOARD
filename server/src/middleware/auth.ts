import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { forbidden, unauthorized } from "../utils/httpError.js";
import { verifyAccessToken } from "../utils/jwt.js";

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(unauthorized("Missing access token"));
  }

  const token = header.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.authUser = {
      userId: payload.userId,
      role: payload.role
    };
    next();
  } catch {
    next(unauthorized("Invalid access token"));
  }
};

export const authorize = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return next(unauthorized("User not authenticated"));
    }

    if (!roles.includes(req.authUser.role)) {
      return next(forbidden("Insufficient role permissions"));
    }

    next();
  };
};
