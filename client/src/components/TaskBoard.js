import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { priorityLabel, statusLabel } from "../lib/format";
const statusOptions = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const priorityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const TaskBoard = ({ role, onTasksChanged }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const queryObject = useMemo(() => {
        const status = searchParams.get("status") ?? "";
        const priority = searchParams.get("priority") ?? "";
        const dueFrom = searchParams.get("dueFrom") ?? "";
        const dueTo = searchParams.get("dueTo") ?? "";
        const projectId = searchParams.get("projectId") ?? "";
        return { status, priority, dueFrom, dueTo, projectId };
    }, [searchParams]);
    const setFilter = (key, value) => {
        const next = new URLSearchParams(searchParams);
        if (!value) {
            next.delete(key);
        }
        else {
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
            setTasks(response.data.data);
        }
        catch {
            setError("Could not load tasks");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadTasks().catch(() => undefined);
    }, [searchParams]);
    const updateStatus = async (taskId, nextStatus) => {
        await api.patch(`/tasks/${taskId}/status`, { status: nextStatus });
        await loadTasks();
        onTasksChanged?.();
    };
    return (_jsxs("section", { className: "panel", children: [_jsx("div", { className: "panel-head", children: _jsx("h3", { children: "Tasks" }) }), _jsxs("div", { className: "filters", children: [_jsxs("select", { value: queryObject.status, onChange: (event) => setFilter("status", event.target.value), children: [_jsx("option", { value: "", children: "All status" }), statusOptions.map((status) => (_jsx("option", { value: status, children: statusLabel(status) }, status)))] }), _jsxs("select", { value: queryObject.priority, onChange: (event) => setFilter("priority", event.target.value), children: [_jsx("option", { value: "", children: "All priority" }), priorityOptions.map((priority) => (_jsx("option", { value: priority, children: priorityLabel(priority) }, priority)))] }), _jsx("input", { type: "date", value: queryObject.dueFrom, onChange: (event) => setFilter("dueFrom", event.target.value), title: "Due from" }), _jsx("input", { type: "date", value: queryObject.dueTo, onChange: (event) => setFilter("dueTo", event.target.value), title: "Due to" }), _jsx("input", { type: "number", min: 1, placeholder: "Project #", value: queryObject.projectId, onChange: (event) => setFilter("projectId", event.target.value) })] }), loading ? _jsx("p", { className: "muted", children: "Loading tasks..." }) : null, error ? _jsx("p", { className: "error", children: error }) : null, _jsx("div", { className: "table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "Title" }), _jsx("th", { children: "Project" }), _jsx("th", { children: "Developer" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Priority" }), _jsx("th", { children: "Due" }), _jsx("th", { children: "Action" })] }) }), _jsxs("tbody", { children: [tasks.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, children: "No tasks found" }) })) : null, tasks.map((task) => (_jsxs("tr", { children: [_jsxs("td", { children: ["#", task.id] }), _jsx("td", { children: task.title }), _jsx("td", { children: task.project?.name ?? `Project #${task.projectId}` }), _jsx("td", { children: task.assignedDeveloper?.name ?? task.assignedDeveloperId }), _jsx("td", { children: statusLabel(task.status) }), _jsx("td", { children: priorityLabel(task.priority) }), _jsxs("td", { children: [new Date(task.dueDate).toLocaleDateString(), " ", task.isOverdue ? _jsx("span", { className: "overdue", children: "Overdue" }) : null] }), _jsx("td", { children: _jsx("select", { value: task.status, onChange: (event) => updateStatus(task.id, event.target.value), disabled: role === "DEVELOPER" ? false : false, children: statusOptions.map((status) => (_jsx("option", { value: status, children: statusLabel(status) }, `${task.id}-${status}`))) }) })] }, task.id)))] })] }) })] }));
};
