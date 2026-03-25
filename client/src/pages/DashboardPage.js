import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { ActivityFeed } from "../components/ActivityFeed";
import { ManagementPanel } from "../components/ManagementPanel";
import { NotificationBell } from "../components/NotificationBell";
import { TaskBoard } from "../components/TaskBoard";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { api } from "../lib/api";
export const DashboardPage = () => {
    const { user, logout } = useAuth();
    const { socket } = useSocket();
    const [summary, setSummary] = useState({});
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshVersion, setRefreshVersion] = useState(0);
    useEffect(() => {
        if (!user) {
            return;
        }
        const load = async () => {
            setLoading(true);
            const endpoint = user.role === "ADMIN" ? "/dashboard/admin" : user.role === "PROJECT_MANAGER" ? "/dashboard/pm" : "/dashboard/developer";
            const [summaryRes, projectsRes] = await Promise.all([api.get(endpoint), api.get("/projects")]);
            setSummary(summaryRes.data.data);
            setProjects(projectsRes.data.data);
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
        const onPresence = (payload) => {
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
            return [];
        }
        if (user.role === "ADMIN") {
            const tasksByStatus = summary.tasksByStatus ?? {};
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
            const pmProjects = summary.projects ?? [];
            const tasksByPriority = summary.tasksByPriority ?? {};
            const upcoming = summary.upcomingDueDatesThisWeek ?? [];
            return [
                { label: "My projects", value: pmProjects.length },
                { label: "Upcoming this week", value: upcoming.length },
                { label: "Critical", value: tasksByPriority.CRITICAL ?? 0 },
                { label: "High", value: tasksByPriority.HIGH ?? 0 },
                { label: "Medium", value: tasksByPriority.MEDIUM ?? 0 },
                { label: "Low", value: tasksByPriority.LOW ?? 0 }
            ];
        }
        const assignedTasks = summary.assignedTasks ?? [];
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
    return (_jsxs("main", { className: "dashboard", children: [_jsxs("header", { className: "topbar", children: [_jsxs("div", { children: [_jsx("h1", { children: "Darshan Project Dashboard" }), _jsxs("p", { children: [user.name, " (", user.role, ")"] })] }), _jsxs("div", { className: "topbar-right", children: [_jsx(NotificationBell, {}), _jsx("button", { type: "button", onClick: logout, children: "Log out" })] })] }), loading ? _jsx("p", { className: "muted", children: "Loading dashboard..." }) : null, _jsx("section", { className: "summary-grid", children: summaryItems.map((item) => (_jsxs("article", { className: "summary-card", children: [_jsx("small", { children: item.label }), _jsx("strong", { children: item.value })] }, item.label))) }), user.role !== "DEVELOPER" ? (_jsx(ManagementPanel, { isPm: user.role === "PROJECT_MANAGER", onDataChanged: refreshDashboard })) : null, _jsx(TaskBoard, { role: user.role, onTasksChanged: refreshDashboard }), _jsxs("section", { className: "panel", children: [_jsx("div", { className: "panel-head", children: _jsx("h3", { children: "Darshan Activity View" }) }), _jsxs("select", { value: selectedProjectId, onChange: (event) => setSelectedProjectId(event.target.value ? Number(event.target.value) : ""), children: [_jsx("option", { value: "", children: "Choose project room" }), projects.map((project) => (_jsxs("option", { value: project.id, children: ["#", project.id, " ", project.name] }, project.id)))] })] }), _jsxs("section", { className: "feed-grid", children: [_jsx(ActivityFeed, { title: "Darshan Activity Feed" }), selectedProjectId ? (_jsx(ActivityFeed, { title: `Darshan Project #${selectedProjectId} Live Feed`, projectId: selectedProjectId }, selectedProjectId)) : (_jsx("section", { className: "panel empty-feed", children: _jsx("p", { children: "Select a project to join its live room." }) }))] })] }));
};
