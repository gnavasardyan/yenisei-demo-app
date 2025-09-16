import { apiRequest } from "@/lib/queryClient";
import type { 
  User, 
  Task, 
  TaskWithUser, 
  CreateTaskRequest, 
  CreateUserRequest, 
  AssignTaskRequest,
  DashboardStats
} from "./types";

const API_BASE = "/api";

// Tasks API
export const tasksApi = {
  getAll: async (): Promise<TaskWithUser[]> => {
    const response = await fetch(`${API_BASE}/tasks/`);
    if (!response.ok) throw new Error("Failed to fetch tasks");
    const data = await response.json();
    return data.tasks || [];
  },

  getById: async (id: string): Promise<TaskWithUser> => {
    const response = await fetch(`${API_BASE}/tasks/${id}`);
    if (!response.ok) throw new Error("Failed to fetch task");
    return response.json();
  },

  create: async (task: CreateTaskRequest): Promise<Task> => {
    const response = await apiRequest("POST", `${API_BASE}/tasks/`, task);
    return response.json();
  },

  update: async (id: string, task: Partial<CreateTaskRequest>): Promise<Task> => {
    const response = await apiRequest("PUT", `${API_BASE}/tasks/${id}`, task);
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `${API_BASE}/tasks/${id}`);
  },

  assign: async (id: string, assignment: AssignTaskRequest): Promise<Task> => {
    const response = await apiRequest("POST", `${API_BASE}/tasks/assign-task/${id}`, assignment);
    return response.json();
  },

  uploadAttachment: async (id: string, file: File): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await fetch(`${API_BASE}/tasks/${id}/attachment`, {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) throw new Error("Failed to upload attachment");
  },

  getWithAttachment: async (id: string): Promise<{task: TaskWithUser, attachment: {filename: string, content_base64: string}}> => {
    const response = await fetch(`${API_BASE}/tasks/${id}/with-attachment`);
    if (!response.ok) throw new Error("Failed to fetch task with attachment");
    return response.json();
  },
};

// Users API
export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await fetch(`${API_BASE}/users/`);
    if (!response.ok) throw new Error("Failed to fetch users");
    const data = await response.json();
    return data.users || [];
  },

  getById: async (id: string): Promise<User> => {
    const response = await fetch(`${API_BASE}/users/${id}`);
    if (!response.ok) throw new Error("Failed to fetch user");
    return response.json();
  },

  create: async (user: CreateUserRequest): Promise<User> => {
    const response = await apiRequest("POST", `${API_BASE}/users/`, user);
    return response.json();
  },

  update: async (id: string, user: Partial<CreateUserRequest>): Promise<User> => {
    const response = await apiRequest("PUT", `${API_BASE}/users/${id}`, user);
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `${API_BASE}/users/${id}`);
  },

  getTasks: async (id: string): Promise<TaskWithUser[]> => {
    const response = await fetch(`${API_BASE}/users/${id}/tasks`);
    if (!response.ok) throw new Error("Failed to fetch user tasks");
    const data = await response.json();
    return data.tasks || [];
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    // Calculate stats from tasks and users
    const [tasks, users] = await Promise.all([
      tasksApi.getAll(),
      usersApi.getAll()
    ]);

    return {
      totalTasks: tasks.length,
      activeUsers: users.length,
      completedTasks: tasks.filter(t => t.status === "done").length,
      inProgressTasks: tasks.filter(t => t.status === "assigned").length,
    };
  },
};
