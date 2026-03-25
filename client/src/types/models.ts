export type Role = "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Client = {
  id: number;
  name: string;
  contactEmail?: string | null;
};

export type Project = {
  id: number;
  name: string;
  description?: string | null;
  clientId: number;
  createdById: string;
  client: Client;
  _count?: {
    tasks: number;
  };
};

export type Task = {
  id: number;
  projectId: number;
  title: string;
  description: string;
  assignedDeveloperId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  isOverdue: boolean;
  createdById: string;
  assignedDeveloper?: {
    id: string;
    name: string;
    email?: string;
  };
  project?: {
    id: number;
    name: string;
    createdById?: string;
  };
};

export type ActivityItem = {
  id: number;
  taskId: number;
  projectId: number;
  message: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    role: Role;
  };
  task?: {
    id: number;
    title: string;
  };
  project?: {
    id: number;
    name: string;
  };
};

export type Notification = {
  id: number;
  userId: string;
  projectId: number | null;
  taskId: number | null;
  type: "TASK_ASSIGNED" | "TASK_IN_REVIEW" | "GENERAL";
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
