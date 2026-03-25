import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { activityRouter } from "./routes/activity.route.js";
import { authRouter } from "./routes/auth.route.js";
import { clientsRouter } from "./routes/clients.route.js";
import { dashboardRouter } from "./routes/dashboard.route.js";
import { notificationsRouter } from "./routes/notifications.route.js";
import { projectsRouter } from "./routes/projects.route.js";
import { tasksRouter } from "./routes/tasks.route.js";
import { usersRouter } from "./routes/users.route.js";
import { Request, Response } from "express";

export const app = express();

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: "ok",
    },
  });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/activity", activityRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/dashboard", dashboardRouter);

app.use(notFoundHandler);
app.use(errorHandler);
