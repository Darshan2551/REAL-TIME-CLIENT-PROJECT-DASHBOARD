import crypto from "crypto";
import { addDays } from "date-fns";
import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { comparePassword } from "../utils/password.js";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { unauthorized } from "../utils/httpError.js";

export const sanitizeUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role
});

const makeRefreshToken = async (userId: string) => {
  const tokenId = crypto.randomUUID();
  const refreshToken = signRefreshToken({ userId, tokenId });
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      userId,
      tokenHash,
      expiresAt: addDays(new Date(), env.REFRESH_TOKEN_EXPIRES_IN_DAYS)
    }
  });

  return refreshToken;
};

export const loginWithPassword = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw unauthorized("Invalid credentials");
  }

  const isMatch = await comparePassword(password, user.passwordHash);

  if (!isMatch) {
    throw unauthorized("Invalid credentials");
  }

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role
  });

  const refreshToken = await makeRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user)
  };
};

export const rotateRefreshToken = async (incomingRefreshToken: string) => {
  const payload = verifyRefreshToken(incomingRefreshToken);
  const incomingHash = hashToken(incomingRefreshToken);

  const tokenRecord = await prisma.refreshToken.findFirst({
    where: {
      id: payload.tokenId,
      tokenHash: incomingHash,
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  if (!tokenRecord) {
    throw unauthorized("Refresh token invalid or expired");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });

  if (!user) {
    throw unauthorized("User no longer exists");
  }

  await prisma.refreshToken.update({
    where: {
      id: tokenRecord.id
    },
    data: {
      revokedAt: new Date()
    }
  });

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role
  });

  const refreshToken = await makeRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user)
  };
};

export const revokeRefreshToken = async (incomingRefreshToken: string) => {
  try {
    const payload = verifyRefreshToken(incomingRefreshToken);
    const incomingHash = hashToken(incomingRefreshToken);

    await prisma.refreshToken.updateMany({
      where: {
        id: payload.tokenId,
        tokenHash: incomingHash,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  } catch {
    return;
  }
};
