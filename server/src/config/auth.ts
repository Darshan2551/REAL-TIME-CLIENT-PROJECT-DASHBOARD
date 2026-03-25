import { env } from "./env.js";

export const REFRESH_COOKIE_NAME = "refreshToken";

export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/auth/refresh",
  maxAge: env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000
};
