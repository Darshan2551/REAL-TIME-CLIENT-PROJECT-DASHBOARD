import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Client, Project, TaskPriority, TaskStatus, User } from "../types/models";

const priorityOptions: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const statusOptions: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

type Props = {
  isPm: boolean;
  onDataChanged?: () => void;
};

export const ManagementPanel = ({ isPm, onDataChanged }: Props) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [developers, setDevelopers] = useState<User[]>([]);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectClientId, setProjectClientId] = useState<number | "">("");

  const [taskProjectId, setTaskProjectId] = useState<number | "">("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDeveloperId, setTaskDeveloperId] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("TODO");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [taskDueDate, setTaskDueDate] = useState("");

  const loadData = async () => {
    const [clientsRes, projectsRes, usersRes] = await Promise.all([
      api.get("/clients"),
      api.get("/projects"),
      api.get("/users", { params: { role: "DEVELOPER" } })
    ]);

    setClients(clientsRes.data.data as Client[]);
    setProjects(projectsRes.data.data as Project[]);
    setDevelopers(usersRes.data.data as User[]);
  };

  useEffect(() => {
    loadData().catch(() => undefined);
  }, []);

  const createClient = async () => {
    if (!clientName.trim()) {
      return;
    }

    await api.post("/clients", {
      name: clientName.trim(),
      ...(clientEmail.trim() ? { contactEmail: clientEmail.trim() } : {})
    });

    setClientName("");
    setClientEmail("");
    await loadData();
    onDataChanged?.();
  };

  const createProject = async () => {
    if (!projectName.trim() || !projectClientId) {
      return;
    }

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
  };

  const createTask = async () => {
    if (!taskProjectId || !taskTitle.trim() || !taskDescription.trim() || !taskDeveloperId || !taskDueDate) {
      return;
    }

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
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>{isPm ? "Darshan PM Controls" : "Darshan Admin Controls"}</h3>
      </div>

      <div className="manager-grid">
        <div>
          <h4>Create Client</h4>
          <input placeholder="Client name" value={clientName} onChange={(event) => setClientName(event.target.value)} />
          <input
            placeholder="Contact email"
            value={clientEmail}
            onChange={(event) => setClientEmail(event.target.value)}
          />
          <button type="button" onClick={createClient}>
            Add client
          </button>
        </div>

        <div>
          <h4>Create Project</h4>
          <input
            placeholder="Project name"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
          />
          <input
            placeholder="Description"
            value={projectDescription}
            onChange={(event) => setProjectDescription(event.target.value)}
          />
          <select
            value={projectClientId}
            onChange={(event) =>
              setProjectClientId(event.target.value ? Number(event.target.value) : "")
            }
          >
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={createProject}>
            Create project
          </button>
        </div>

        <div>
          <h4>Create Task</h4>
          <select
            value={taskProjectId}
            onChange={(event) => setTaskProjectId(event.target.value ? Number(event.target.value) : "")}
          >
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                #{project.id} {project.name}
              </option>
            ))}
          </select>
          <input placeholder="Task title" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
          <input
            placeholder="Task details"
            value={taskDescription}
            onChange={(event) => setTaskDescription(event.target.value)}
          />
          <select value={taskDeveloperId} onChange={(event) => setTaskDeveloperId(event.target.value)}>
            <option value="">Assign developer</option>
            {developers.map((developer) => (
              <option key={developer.id} value={developer.id}>
                {developer.name}
              </option>
            ))}
          </select>
          <select value={taskStatus} onChange={(event) => setTaskStatus(event.target.value as TaskStatus)}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select value={taskPriority} onChange={(event) => setTaskPriority(event.target.value as TaskPriority)}>
            {priorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
          <input type="datetime-local" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} />
          <button type="button" onClick={createTask}>
            Add task
          </button>
        </div>
      </div>
    </section>
  );
};
