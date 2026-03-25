import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type { Role } from "@prisma/client";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { presenceService } from "./presence.service.js";
import { assertCanViewProject } from "./access.service.js";

let io: Server | null = null;

type ActivityPayload = {
  id: number;
  projectId: number;
  taskId: number;
  message: string;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: Date;
  actor: {
    id: string;
    name: string;
    role: Role;
  };
};

const adminRoom = "role:ADMIN";

const emitPresence = () => {
  if (!io) {
    return;
  }

  io.to(adminRoom).emit("presence:update", {
    onlineUsers: presenceService.getOnlineUserCount(),
    timestamp: new Date().toISOString()
  });
};

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true
    }
  });

  io.use((socket, next) => {
    const tokenFromAuth = socket.handshake.auth?.token;
    const authHeader = socket.handshake.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
    const token = tokenFromAuth || tokenFromHeader;

    if (!token) {
      return next(new Error("Missing access token"));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.authUser = payload;
      next();
    } catch {
      next(new Error("Invalid access token"));
    }
  });

  io.on("connection", (socket) => {
    const authUser = socket.data.authUser as { userId: string; role: Role };
    const userRoom = `user:${authUser.userId}`;
    const roleRoom = `role:${authUser.role}`;

    socket.join(userRoom);
    socket.join(roleRoom);
    presenceService.addConnection(authUser.userId, socket.id);
    emitPresence();

    socket.on("project:join", async (projectId: number, ack?: (response: { ok: boolean; error?: string }) => void) => {
      try {
        if (authUser.role === "DEVELOPER") {
          ack?.({ ok: false, error: "Developers cannot join full project rooms" });
          return;
        }

        await assertCanViewProject(authUser, Number(projectId));
        socket.join(`project:${projectId}`);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false, error: "Cannot join project room" });
      }
    });

    socket.on("project:leave", (projectId: number) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on("disconnect", () => {
      presenceService.removeConnection(authUser.userId, socket.id);
      emitPresence();
    });
  });

  return io;
};

const safeEmit = (emitFn: (ioServer: Server) => void) => {
  if (!io) {
    return;
  }

  emitFn(io);
};

export const emitActivityUpdate = (payload: ActivityPayload & { projectOwnerId: string; assignedDeveloperId: string }) => {
  safeEmit((ioServer) => {
    const projectRoom = `project:${payload.projectId}`;

    // send broad cast to admin and pm room viewers, dev gets only own user room
    ioServer.to(adminRoom).emit("activity:new", payload);
    ioServer.to(projectRoom).emit("activity:new", payload);
    ioServer.to(`user:${payload.projectOwnerId}`).emit("activity:new", payload);
    ioServer.to(`user:${payload.assignedDeveloperId}`).emit("activity:new", payload);
  });
};

export const emitNotificationCount = (userId: string, unreadCount: number) => {
  safeEmit((ioServer) => {
    ioServer.to(`user:${userId}`).emit("notifications:count", { unreadCount });
  });
};

export const emitNotificationCreated = (userId: string, notification: unknown) => {
  safeEmit((ioServer) => {
    ioServer.to(`user:${userId}`).emit("notifications:new", notification);
  });
};

export const getSocketServer = () => io;
