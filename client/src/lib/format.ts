import { formatDistanceToNowStrict } from "date-fns";
import type { TaskPriority, TaskStatus } from "../types/models";

export const statusLabel = (status: TaskStatus) => {
  switch (status) {
    case "TODO":
      return "To Do";
    case "IN_PROGRESS":
      return "In Progress";
    case "IN_REVIEW":
      return "In Review";
    case "DONE":
      return "Done";
    default:
      return status;
  }
};

export const priorityLabel = (priority: TaskPriority) => {
  return priority[0] + priority.slice(1).toLowerCase();
};

export const ago = (isoDate: string | Date) => {
  return `${formatDistanceToNowStrict(new Date(isoDate))} ago`;
};
