import { formatDistanceToNowStrict } from "date-fns";
export const statusLabel = (status) => {
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
export const priorityLabel = (priority) => {
    return priority[0] + priority.slice(1).toLowerCase();
};
export const ago = (isoDate) => {
    return `${formatDistanceToNowStrict(new Date(isoDate))} ago`;
};
