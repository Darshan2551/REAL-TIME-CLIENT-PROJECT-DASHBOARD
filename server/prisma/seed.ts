import prismaPkg from "@prisma/client";
import type { TaskPriority as PrismaTaskPriority, TaskStatus as PrismaTaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const { NotificationType, PrismaClient, Role, TaskPriority, TaskStatus } = prismaPkg;

const prisma = new PrismaClient();

const password = "Password123!";

const seedUsers = async () => {
  const hash = await bcrypt.hash(password, 10);

  const users = {
    admin: {
      name: "Darshan Admin",
      email: "admin@agency.local",
      role: Role.ADMIN
    },
    pmOne: {
      name: "Ravi Manager",
      email: "ravi.pm@agency.local",
      role: Role.PROJECT_MANAGER
    },
    pmTwo: {
      name: "Neha Manager",
      email: "neha.pm@agency.local",
      role: Role.PROJECT_MANAGER
    },
    devOne: {
      name: "Isha Developer",
      email: "isha.dev@agency.local",
      role: Role.DEVELOPER
    },
    devTwo: {
      name: "Karan Developer",
      email: "karan.dev@agency.local",
      role: Role.DEVELOPER
    },
    devThree: {
      name: "Meera Developer",
      email: "meera.dev@agency.local",
      role: Role.DEVELOPER
    },
    devFour: {
      name: "Vikram Developer",
      email: "vikram.dev@agency.local",
      role: Role.DEVELOPER
    }
  } as const;

  const created = await Promise.all(
    Object.values(users).map((user) =>
      prisma.user.create({
        data: {
          ...user,
          passwordHash: hash
        }
      })
    )
  );

  return {
    admin: created[0],
    pmOne: created[1],
    pmTwo: created[2],
    devOne: created[3],
    devTwo: created[4],
    devThree: created[5],
    devFour: created[6]
  };
};

const createTaskWithLogs = async (params: {
  projectId: number;
  creatorId: string;
  assigneeId: string;
  assigneeName: string;
  title: string;
  description: string;
  status: PrismaTaskStatus;
  priority: PrismaTaskPriority;
  dueDate: Date;
  logActorId: string;
  logActorName: string;
  fromStatus?: PrismaTaskStatus;
}) => {
  const task = await prisma.task.create({
    data: {
      projectId: params.projectId,
      title: params.title,
      description: params.description,
      assignedDeveloperId: params.assigneeId,
      status: params.status,
      priority: params.priority,
      dueDate: params.dueDate,
      isOverdue: params.dueDate < new Date() && params.status !== TaskStatus.DONE,
      createdById: params.creatorId
    }
  });

  await prisma.taskActivity.create({
    data: {
      taskId: task.id,
      projectId: params.projectId,
      actorId: params.creatorId,
      action: "TASK_CREATED",
      message: `Task #${task.id} created and assigned to ${params.assigneeName}`
    }
  });

  if (params.fromStatus) {
    await prisma.taskActivity.create({
      data: {
        taskId: task.id,
        projectId: params.projectId,
        actorId: params.logActorId,
        action: "STATUS_CHANGED",
        fromStatus: params.fromStatus,
        toStatus: params.status,
        message: `${params.logActorName} moved Task #${task.id} from ${params.fromStatus.replaceAll("_", " ")} to ${params.status.replaceAll("_", " ")}`
      }
    });
  }

  return task;
};

async function main() {
  await prisma.notification.deleteMany();
  await prisma.taskActivity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.agencyClient.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const users = await seedUsers();

  const clients = await Promise.all([
    prisma.agencyClient.create({
      data: {
        name: "Nova Retail",
        contactEmail: "ops@novaretail.com"
      }
    }),
    prisma.agencyClient.create({
      data: {
        name: "Skyline Health",
        contactEmail: "it@skylinehealth.org"
      }
    }),
    prisma.agencyClient.create({
      data: {
        name: "Breeze Finance",
        contactEmail: "pm@breezefinance.io"
      }
    })
  ]);

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: "Nova Client Portal",
        description: "Portal refresh for customer onboarding",
        clientId: clients[0].id,
        createdById: users.pmOne.id
      }
    }),
    prisma.project.create({
      data: {
        name: "Skyline Claims App",
        description: "Internal claims workflow app",
        clientId: clients[1].id,
        createdById: users.pmOne.id
      }
    }),
    prisma.project.create({
      data: {
        name: "Breeze Compliance Suite",
        description: "Compliance automation dashboard",
        clientId: clients[2].id,
        createdById: users.pmTwo.id
      }
    })
  ]);

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  const tasks: Array<{ id: number; projectId: number; assigneeId: string }> = [];

  tasks.push(
    {
      id: (
        await createTaskWithLogs({
          projectId: projects[0].id,
          creatorId: users.pmOne.id,
          assigneeId: users.devOne.id,
          assigneeName: users.devOne.name,
          title: "Design auth flows",
          description: "Map happy and unhappy paths",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDate: new Date(now.getTime() + day),
          logActorId: users.devOne.id,
          logActorName: users.devOne.name,
          fromStatus: TaskStatus.TODO
        })
      ).id,
      projectId: projects[0].id,
      assigneeId: users.devOne.id
    },
    {
      id: (
        await createTaskWithLogs({
          projectId: projects[0].id,
          creatorId: users.pmOne.id,
          assigneeId: users.devTwo.id,
          assigneeName: users.devTwo.name,
          title: "Build dashboard cards",
          description: "Implement top-level metrics cards",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDate: new Date(now.getTime() + day * 2),
          logActorId: users.pmOne.id,
          logActorName: users.pmOne.name
        })
      ).id,
      projectId: projects[0].id,
      assigneeId: users.devTwo.id
    },
    {
      id: (
        await createTaskWithLogs({
          projectId: projects[0].id,
          creatorId: users.pmOne.id,
          assigneeId: users.devThree.id,
          assigneeName: users.devThree.name,
          title: "Fix session timeout bug",
          description: "Refresh token handoff not stable",
          status: TaskStatus.IN_REVIEW,
          priority: TaskPriority.CRITICAL,
          dueDate: new Date(now.getTime() - day),
          logActorId: users.devThree.id,
          logActorName: users.devThree.name,
          fromStatus: TaskStatus.IN_PROGRESS
        })
      ).id,
      projectId: projects[0].id,
      assigneeId: users.devThree.id
    },
    {
      id: (
        await createTaskWithLogs({
          projectId: projects[0].id,
          creatorId: users.pmOne.id,
          assigneeId: users.devFour.id,
          assigneeName: users.devFour.name,
          title: "Write API docs",
          description: "Draft route docs for frontend",
          status: TaskStatus.DONE,
          priority: TaskPriority.LOW,
          dueDate: new Date(now.getTime() - day * 3),
          logActorId: users.devFour.id,
          logActorName: users.devFour.name,
          fromStatus: TaskStatus.IN_REVIEW
        })
      ).id,
      projectId: projects[0].id,
      assigneeId: users.devFour.id
    },
    {
      id: (
        await createTaskWithLogs({
          projectId: projects[0].id,
          creatorId: users.pmOne.id,
          assigneeId: users.devTwo.id,
          assigneeName: users.devTwo.name,
          title: "Integrate sockets",
          description: "Push status changes into feed",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDate: new Date(now.getTime() + day * 4),
          logActorId: users.devTwo.id,
          logActorName: users.devTwo.name,
          fromStatus: TaskStatus.TODO
        })
      ).id,
      projectId: projects[0].id,
      assigneeId: users.devTwo.id
    }
  );

  tasks.push(
    {
      id: (
        await createTaskWithLogs({
          projectId: projects[1].id,
          creatorId: users.pmOne.id,
          assigneeId: users.devOne.id,
          assigneeName: users.devOne.name,
          title: "Claims intake form",
          description: "Build multi-step intake flow",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDate: new Date(now.getTime() + day * 3),
          logActorId: users.pmOne.id,
          logActorName: users.pmOne.name
        })
      ).id,
      projectId: projects[1].id,
      assigneeId: users.devOne.id
    },
    {
      id: (
        await createTaskWithLogs({
          projectId: projects[1].id,
          creatorId: users.pmOne.id,
          assigneeId: users.devTwo.id,
          assigneeName: users.devTwo.name,
          title: "Audit trail export",
          description: "CSV exports for claim history",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          dueDate: new Date(now.getTime() + day * 1),
          logActorId: users.devTwo.id,
          logActorName: users.devTwo.name,
          fromStatus: TaskStatus.TODO
        })
      ).id,
      projectId: projects[1].id,
      assigneeId: users.devTwo.id
    },
    {
      id: (
        await createTaskWithLogs({
          projectId: projects[1].id,
          creatorId: users.pmOne.id,
          assigneeId: users.devThree.id,
          assigneeName: users.devThree.name,
          title: "Upload claim attachments",
          description: "Chunk upload with retry",
          status: TaskStatus.IN_REVIEW,
          priority: TaskPriority.HIGH,
          dueDate: new Date(now.getTime() + day * 2),
          logActorId: users.devThree.id,
          logActorName: users.devThree.name,
          fromStatus: TaskStatus.IN_PROGRESS
        })
      ).id,
      projectId: projects[1].id,
      assigneeId: users.devThree.id
    },
    {
      id: (
        await createTaskWithLogs({
          projectId: projects[1].id,
          creatorId: users.pmOne.id,
          assigneeId: users.devFour.id,
          assigneeName: users.devFour.name,
          title: "Mobile responsiveness",
          description: "Fix breakpoints for claims pages",
          status: TaskStatus.DONE,
          priority: TaskPriority.LOW,
          dueDate: new Date(now.getTime() - day * 2),
          logActorId: users.devFour.id,
          logActorName: users.devFour.name,
          fromStatus: TaskStatus.IN_REVIEW
        })
      ).id,
      projectId: projects[1].id,
      assigneeId: users.devFour.id
    },
    {
      id: (
        await createTaskWithLogs({
          projectId: projects[1].id,
          creatorId: users.pmOne.id,
          assigneeId: users.devOne.id,
          assigneeName: users.devOne.name,
          title: "Retry queue cleanup",
          description: "Clean dead jobs from queue",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.CRITICAL,
          dueDate: new Date(now.getTime() - day * 2),
          logActorId: users.devOne.id,
          logActorName: users.devOne.name,
          fromStatus: TaskStatus.TODO
        })
      ).id,
      projectId: projects[1].id,
      assigneeId: users.devOne.id
    }
  );

  tasks.push(
    {
      id: (
        await createTaskWithLogs({
          projectId: projects[2].id,
          creatorId: users.pmTwo.id,
          assigneeId: users.devThree.id,
          assigneeName: users.devThree.name,
          title: "Rule builder UI",
          description: "Add drag and drop rule blocks",
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDate: new Date(now.getTime() + day * 6),
          logActorId: users.pmTwo.id,
          logActorName: users.pmTwo.name
        })
      ).id,
      projectId: projects[2].id,
      assigneeId: users.devThree.id
    },
    {
      id: (
        await createTaskWithLogs({
          projectId: projects[2].id,
          creatorId: users.pmTwo.id,
          assigneeId: users.devFour.id,
          assigneeName: users.devFour.name,
          title: "Compliance PDF render",
          description: "Server render with signed metadata",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          dueDate: new Date(now.getTime() + day * 5),
          logActorId: users.devFour.id,
          logActorName: users.devFour.name,
          fromStatus: TaskStatus.TODO
        })
      ).id,
      projectId: projects[2].id,
      assigneeId: users.devFour.id
    },
    {
      id: (
        await createTaskWithLogs({
          projectId: projects[2].id,
          creatorId: users.pmTwo.id,
          assigneeId: users.devTwo.id,
          assigneeName: users.devTwo.name,
          title: "Webhook signature check",
          description: "Validate upstream callback signatures",
          status: TaskStatus.IN_REVIEW,
          priority: TaskPriority.CRITICAL,
          dueDate: new Date(now.getTime() + day),
          logActorId: users.devTwo.id,
          logActorName: users.devTwo.name,
          fromStatus: TaskStatus.IN_PROGRESS
        })
      ).id,
      projectId: projects[2].id,
      assigneeId: users.devTwo.id
    },
    {
      id: (
        await createTaskWithLogs({
          projectId: projects[2].id,
          creatorId: users.pmTwo.id,
          assigneeId: users.devOne.id,
          assigneeName: users.devOne.name,
          title: "Legacy import script",
          description: "Migrate old compliance records",
          status: TaskStatus.DONE,
          priority: TaskPriority.LOW,
          dueDate: new Date(now.getTime() - day),
          logActorId: users.devOne.id,
          logActorName: users.devOne.name,
          fromStatus: TaskStatus.IN_REVIEW
        })
      ).id,
      projectId: projects[2].id,
      assigneeId: users.devOne.id
    },
    {
      id: (
        await createTaskWithLogs({
          projectId: projects[2].id,
          creatorId: users.pmTwo.id,
          assigneeId: users.devThree.id,
          assigneeName: users.devThree.name,
          title: "Error boundary polish",
          description: "Improve fallback pages and metrics",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDate: new Date(now.getTime() + day * 2),
          logActorId: users.devThree.id,
          logActorName: users.devThree.name,
          fromStatus: TaskStatus.TODO
        })
      ).id,
      projectId: projects[2].id,
      assigneeId: users.devThree.id
    }
  );

  for (const task of tasks) {
    await prisma.notification.create({
      data: {
        userId: task.assigneeId,
        taskId: task.id,
        projectId: task.projectId,
        type: NotificationType.TASK_ASSIGNED,
        message: `You were assigned Task #${task.id}`,
        isRead: false
      }
    });
  }

  console.log("Seed completed");
  console.log("Default password for all users:", password);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
