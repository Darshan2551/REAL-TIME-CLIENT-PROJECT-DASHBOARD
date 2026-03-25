import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
const priorityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const statusOptions = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
export const ManagementPanel = ({ isPm, onDataChanged, onNotify }) => {
    const [clients, setClients] = useState([]);
    const [projects, setProjects] = useState([]);
    const [developers, setDevelopers] = useState([]);
    const [clientName, setClientName] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [projectClientId, setProjectClientId] = useState("");
    const [taskProjectId, setTaskProjectId] = useState("");
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDescription, setTaskDescription] = useState("");
    const [taskDeveloperId, setTaskDeveloperId] = useState("");
    const [taskStatus, setTaskStatus] = useState("TODO");
    const [taskPriority, setTaskPriority] = useState("MEDIUM");
    const [taskDueDate, setTaskDueDate] = useState("");
    const loadData = async () => {
        const [clientsRes, projectsRes, usersRes] = await Promise.all([
            api.get("/clients"),
            api.get("/projects"),
            api.get("/users", { params: { role: "DEVELOPER" } })
        ]);
        setClients(clientsRes.data.data);
        setProjects(projectsRes.data.data);
        setDevelopers(usersRes.data.data);
    };
    useEffect(() => {
        loadData().catch(() => undefined);
    }, []);
    const createClient = async () => {
        if (!clientName.trim()) {
            return;
        }
        try {
            await api.post("/clients", {
                name: clientName.trim(),
                ...(clientEmail.trim() ? { contactEmail: clientEmail.trim() } : {})
            });
            setClientName("");
            setClientEmail("");
            await loadData();
            onDataChanged?.();
            onNotify?.("Client created successfully.");
        }
        catch {
            onNotify?.("Could not create client.", "error");
        }
    };
    const createProject = async () => {
        if (!projectName.trim() || !projectClientId) {
            return;
        }
        try {
            await api.post("/projects", {
                name: projectName.trim(),
                description: projectDescription.trim(),
                clientId: Number(projectClientId)
            });
            setProjectName("");
            setProjectDescription("");
            setProjectClientId("");
            await loadData();
            onDataChanged?.();
            onNotify?.("Project created successfully.");
        }
        catch {
            onNotify?.("Could not create project.", "error");
        }
    };
    const createTask = async () => {
        if (!taskProjectId || !taskTitle.trim() || !taskDescription.trim() || !taskDeveloperId || !taskDueDate) {
            return;
        }
        try {
            await api.post(`/tasks/project/${taskProjectId}`, {
                title: taskTitle.trim(),
                description: taskDescription.trim(),
                assignedDeveloperId: taskDeveloperId,
                status: taskStatus,
                priority: taskPriority,
                dueDate: new Date(taskDueDate).toISOString()
            });
            setTaskTitle("");
            setTaskDescription("");
            setTaskDeveloperId("");
            setTaskStatus("TODO");
            setTaskPriority("MEDIUM");
            setTaskDueDate("");
            await loadData();
            onDataChanged?.();
            onNotify?.("Task created successfully.");
        }
        catch {
            onNotify?.("Could not create task.", "error");
        }
    };
    return (_jsxs("section", { className: "panel", children: [_jsx("div", { className: "panel-head", children: _jsx("h3", { children: isPm ? "Darshan PM Controls" : "Darshan Admin Controls" }) }), _jsxs("div", { className: "manager-grid", children: [_jsxs("div", { children: [_jsx("h4", { children: "Create Client" }), _jsx("input", { placeholder: "Client name", value: clientName, onChange: (event) => setClientName(event.target.value) }), _jsx("input", { placeholder: "Contact email", value: clientEmail, onChange: (event) => setClientEmail(event.target.value) }), _jsx("button", { type: "button", onClick: createClient, children: "Add client" })] }), _jsxs("div", { children: [_jsx("h4", { children: "Create Project" }), _jsx("input", { placeholder: "Project name", value: projectName, onChange: (event) => setProjectName(event.target.value) }), _jsx("input", { placeholder: "Description", value: projectDescription, onChange: (event) => setProjectDescription(event.target.value) }), _jsxs("select", { value: projectClientId, onChange: (event) => setProjectClientId(event.target.value ? Number(event.target.value) : ""), children: [_jsx("option", { value: "", children: "Select client" }), clients.map((client) => (_jsx("option", { value: client.id, children: client.name }, client.id)))] }), _jsx("button", { type: "button", onClick: createProject, children: "Create project" })] }), _jsxs("div", { children: [_jsx("h4", { children: "Create Task" }), _jsxs("select", { value: taskProjectId, onChange: (event) => setTaskProjectId(event.target.value ? Number(event.target.value) : ""), children: [_jsx("option", { value: "", children: "Select project" }), projects.map((project) => (_jsxs("option", { value: project.id, children: ["#", project.id, " ", project.name] }, project.id)))] }), _jsx("input", { placeholder: "Task title", value: taskTitle, onChange: (event) => setTaskTitle(event.target.value) }), _jsx("input", { placeholder: "Task details", value: taskDescription, onChange: (event) => setTaskDescription(event.target.value) }), _jsxs("select", { value: taskDeveloperId, onChange: (event) => setTaskDeveloperId(event.target.value), children: [_jsx("option", { value: "", children: "Assign developer" }), developers.map((developer) => (_jsx("option", { value: developer.id, children: developer.name }, developer.id)))] }), _jsx("select", { value: taskStatus, onChange: (event) => setTaskStatus(event.target.value), children: statusOptions.map((status) => (_jsx("option", { value: status, children: status }, status))) }), _jsx("select", { value: taskPriority, onChange: (event) => setTaskPriority(event.target.value), children: priorityOptions.map((priority) => (_jsx("option", { value: priority, children: priority }, priority))) }), _jsx("input", { type: "datetime-local", value: taskDueDate, onChange: (event) => setTaskDueDate(event.target.value) }), _jsx("button", { type: "button", onClick: createTask, children: "Add task" })] })] })] }));
};
