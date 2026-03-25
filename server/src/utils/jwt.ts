import crypto from "crypto";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "@prisma/client";

export type AccessTokenPayload = {
  userId: string;
  role: Role;
};

export type RefreshTokenPayload = {
  userId: string;
  tokenId: string;
};

export const signAccessToken = (payload: AccessTokenPayload) => {
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET as Secret, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN
  } as SignOptions);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET as Secret) as AccessTokenPayload;
};

export const signRefreshToken = (payload: RefreshTokenPayload) => {
  const expiresIn = `${env.REFRESH_TOKEN_EXPIRES_IN_DAYS}d`;
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET as Secret, {
    expiresIn
  } as SignOptions);
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET as Secret) as RefreshTokenPayload;
};

export const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
