import cron from "node-cron";
import prismaPkg from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

const { TaskStatus } = prismaPkg;

let isRunning = false;

const runOverdueSync = async () => {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    const result = await prisma.task.updateMany({
      where: {
        isOverdue: false,
        dueDate: {
          lt: new Date()
        },
        status: {
          not: TaskStatus.DONE
        }
      },
      data: {
        isOverdue: true
      }
    });

    if (result.count > 0) {
      console.log(`[cron] overdue sync updated ${result.count} tasks`);
    }
  } catch (error) {
    console.error("[cron] overdue sync failed", error);
  } finally {
    isRunning = false;
  }
};

export const startOverdueTaskJob = () => {
  cron.schedule(env.CRON_OVERDUE_SCHEDULE, runOverdueSync);
  runOverdueSync().catch((error) => console.error("initial overdue sync failed", error));
};
