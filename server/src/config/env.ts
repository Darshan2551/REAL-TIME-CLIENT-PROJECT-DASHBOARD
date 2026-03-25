import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().default(7),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(10),
  CRON_OVERDUE_SCHEDULE: z.string().default("*/5 * * * *")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Env validation failed", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
