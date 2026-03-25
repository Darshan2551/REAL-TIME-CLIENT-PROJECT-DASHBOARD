import http from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { startOverdueTaskJob } from "./jobs/overdue.job.js";
import { initSocket } from "./services/socket.service.js";

const server = http.createServer(app);

initSocket(server);
startOverdueTaskJob();

server.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

const shutdown = async () => {
  console.log("shutting down...");
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
