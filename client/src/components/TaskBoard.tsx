import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { priorityLabel, statusLabel } from "../lib/format";
import type { Role, Task, TaskPriority, TaskStatus } from "../types/models";

type Props = {
  role: Role;
};

const statusOptions: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const priorityOptions: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const TaskBoard = ({ role }: Props) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryObject = useMemo(() => {
    const status = searchParams.get("status") ?? "";
    const priority = searchParams.get("priority") ?? "";
    const dueFrom = searchParams.get("dueFrom") ?? "";
    const dueTo = searchParams.get("dueTo") ?? "";
    const projectId = searchParams.get("projectId") ?? "";

    return { status, priority, dueFrom, dueTo, projectId };
  }, [searchParams]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);

    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    setSearchParams(next);
  };

  const loadTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get("/tasks", {
        params: {
          ...(queryObject.status ? { status: queryObject.status } : {}),
          ...(queryObject.priority ? { priority: queryObject.priority } : {}),
          ...(queryObject.dueFrom
            ? {
                dueFrom: new Date(queryObject.dueFrom).toISOString()
              }
            : {}),
          ...(queryObject.dueTo
            ? {
                dueTo: new Date(queryObject.dueTo).toISOString()
              }
            : {}),
          ...(queryObject.projectId ? { projectId: Number(queryObject.projectId) } : {})
        }
      });

      setTasks(response.data.data as Task[]);
    } catch {
      setError("Could not load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks().catch(() => undefined);
  }, [searchParams]);

  const updateStatus = async (taskId: number, nextStatus: TaskStatus) => {
    await api.patch(`/tasks/${taskId}/status`, { status: nextStatus });
    await loadTasks();
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Tasks</h3>
      </div>

      <div className="filters">
        <select value={queryObject.status} onChange={(event) => setFilter("status", event.target.value)}>
          <option value="">All status</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>

        <select value={queryObject.priority} onChange={(event) => setFilter("priority", event.target.value)}>
          <option value="">All priority</option>
          {priorityOptions.map((priority) => (
            <option key={priority} value={priority}>
              {priorityLabel(priority)}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={queryObject.dueFrom}
          onChange={(event) => setFilter("dueFrom", event.target.value)}
          title="Due from"
        />

        <input
          type="date"
          value={queryObject.dueTo}
          onChange={(event) => setFilter("dueTo", event.target.value)}
          title="Due to"
        />

        <input
          type="number"
          min={1}
          placeholder="Project #"
          value={queryObject.projectId}
          onChange={(event) => setFilter("projectId", event.target.value)}
        />
      </div>

      {loading ? <p className="muted">Loading tasks...</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Project</th>
              <th>Developer</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Due</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={8}>No tasks found</td>
              </tr>
            ) : null}
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>#{task.id}</td>
                <td>{task.title}</td>
                <td>{task.project?.name ?? `Project #${task.projectId}`}</td>
                <td>{task.assignedDeveloper?.name ?? task.assignedDeveloperId}</td>
                <td>{statusLabel(task.status)}</td>
                <td>{priorityLabel(task.priority)}</td>
                <td>
                  {new Date(task.dueDate).toLocaleDateString()} {task.isOverdue ? <span className="overdue">Overdue</span> : null}
                </td>
                <td>
                  <select
                    value={task.status}
                    onChange={(event) => updateStatus(task.id, event.target.value as TaskStatus)}
                    disabled={role === "DEVELOPER" ? false : false}
                  >
                    {statusOptions.map((status) => (
                      <option key={`${task.id}-${status}`} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
