import { useEffect, useMemo, useState } from "react";
import { ActivityFeed } from "../components/ActivityFeed";
import { ManagementPanel } from "../components/ManagementPanel";
import { NotificationBell } from "../components/NotificationBell";
import { TaskBoard } from "../components/TaskBoard";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { api } from "../lib/api";
import type { Project } from "../types/models";

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    if (!user) {
      return;
    }

    const load = async () => {
      setLoading(true);

      const endpoint =
        user.role === "ADMIN" ? "/dashboard/admin" : user.role === "PROJECT_MANAGER" ? "/dashboard/pm" : "/dashboard/developer";

      const [summaryRes, projectsRes] = await Promise.all([api.get(endpoint), api.get("/projects")]);
      setSummary(summaryRes.data.data as Record<string, unknown>);
      setProjects(projectsRes.data.data as Project[]);

      setLoading(false);
    };

    load().catch(() => setLoading(false));
  }, [user, refreshVersion]);

  const refreshDashboard = () => {
    setRefreshVersion((current) => current + 1);
  };

  useEffect(() => {
    if (!socket || !user || user.role !== "ADMIN") {
      return;
    }

    const onPresence = (payload: { onlineUsers: number }) => {
      setSummary((current) => ({
        ...current,
        onlineUsers: payload.onlineUsers
      }));
    };

    socket.on("presence:update", onPresence);

    return () => {
      socket.off("presence:update", onPresence);
    };
  }, [socket, user]);

  const summaryItems = useMemo(() => {
    if (!user) {
      return [] as Array<{ label: string; value: string | number }>;
    }

    if (user.role === "ADMIN") {
      const tasksByStatus = (summary.tasksByStatus as Record<string, number> | undefined) ?? {};
      return [
        { label: "Total projects", value: Number(summary.totalProjects ?? 0) },
        { label: "Overdue tasks", value: Number(summary.overdueTaskCount ?? 0) },
        { label: "Users online", value: Number(summary.onlineUsers ?? 0) },
        { label: "Todo tasks", value: tasksByStatus.TODO ?? 0 },
        { label: "In progress", value: tasksByStatus.IN_PROGRESS ?? 0 },
        { label: "In review", value: tasksByStatus.IN_REVIEW ?? 0 },
        { label: "Done", value: tasksByStatus.DONE ?? 0 }
      ];
    }

    if (user.role === "PROJECT_MANAGER") {
      const pmProjects = (summary.projects as Array<{ id: number }> | undefined) ?? [];
      const tasksByPriority = (summary.tasksByPriority as Record<string, number> | undefined) ?? {};
      const upcoming = (summary.upcomingDueDatesThisWeek as Array<{ id: number }> | undefined) ?? [];
      return [
        { label: "My projects", value: pmProjects.length },
        { label: "Upcoming this week", value: upcoming.length },
        { label: "Critical", value: tasksByPriority.CRITICAL ?? 0 },
        { label: "High", value: tasksByPriority.HIGH ?? 0 },
        { label: "Medium", value: tasksByPriority.MEDIUM ?? 0 },
        { label: "Low", value: tasksByPriority.LOW ?? 0 }
      ];
    }

    const assignedTasks =
      (summary.assignedTasks as Array<{ id: number; isOverdue: boolean; status: string }> | undefined) ?? [];

    return [
      { label: "Assigned tasks", value: assignedTasks.length },
      {
        label: "Overdue",
        value: assignedTasks.filter((task) => task.isOverdue && task.status !== "DONE").length
      }
    ];
  }, [summary, user]);

  if (!user) {
    return null;
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>Darshan Project Dashboard</h1>
          <p>
            {user.name} ({user.role})
          </p>
        </div>
        <div className="topbar-right">
          <NotificationBell />
          <button type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      {loading ? <p className="muted">Loading dashboard...</p> : null}

      <section className="summary-grid">
        {summaryItems.map((item) => (
          <article key={item.label} className="summary-card">
            <small>{item.label}</small>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      {user.role !== "DEVELOPER" ? (
        <ManagementPanel isPm={user.role === "PROJECT_MANAGER"} onDataChanged={refreshDashboard} />
      ) : null}

      <TaskBoard role={user.role} onTasksChanged={refreshDashboard} />

      <section className="panel">
        <div className="panel-head">
          <h3>Darshan Activity View</h3>
        </div>

        <select
          value={selectedProjectId}
          onChange={(event) => setSelectedProjectId(event.target.value ? Number(event.target.value) : "")}
        >
          <option value="">Choose project room</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              #{project.id} {project.name}
            </option>
          ))}
        </select>
      </section>

      <section className="feed-grid">
        <ActivityFeed title="Darshan Activity Feed" />
        {selectedProjectId ? (
          <ActivityFeed
            key={selectedProjectId}
            title={`Darshan Project #${selectedProjectId} Live Feed`}
            projectId={selectedProjectId}
          />
        ) : (
          <section className="panel empty-feed">
            <p>Select a project to join its live room.</p>
          </section>
        )}
      </section>
    </main>
  );
};
