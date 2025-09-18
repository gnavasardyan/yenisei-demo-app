import { apiRequest } from "@/lib/queryClient";
import type { 
  User, 
  Task, 
  TaskWithUser, 
  CreateTaskRequest, 
  CreateUserRequest, 
  AssignTaskRequest,
  DashboardStats,
  LoginRequest,
  LoginResponse,
  RegisterRequest
} from "./types";

const API_BASE = "/api";

// Tasks API
export const tasksApi = {
  getAll: async (): Promise<TaskWithUser[]> => {
    const response = await apiRequest("GET", `${API_BASE}/tasks/`);
    const data = await response.json();
    return data.tasks || [];
  },

  getById: async (id: string): Promise<TaskWithUser> => {
    const response = await apiRequest("GET", `${API_BASE}/tasks/${id}`);
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
    
    const response = await apiRequest("POST", `${API_BASE}/tasks/${id}/attachment`, formData);
    if (!response.ok) throw new Error("Failed to upload attachment");
  },

  getWithAttachment: async (id: string): Promise<{task: TaskWithUser, attachment: {filename: string, content_base64: string}}> => {
    const response = await apiRequest("GET", `${API_BASE}/tasks/${id}/with-attachment`);
    return response.json();
  },

  addToDescription: async (id: string, additionalText: string, fullTask?: TaskWithUser): Promise<Task> => {
    const response = await apiRequest("POST", `${API_BASE}/tasks/${id}/add-to-description`, { additionalText, fullTask });
    return response.json();
  },
};

// Users API
export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await apiRequest("GET", `${API_BASE}/users/`);
    const data = await response.json();
    return data.users || [];
  },

  getById: async (id: string): Promise<User> => {
    const response = await apiRequest("GET", `${API_BASE}/users/${id}`);
    const data = await response.json();
    // API может возвращать объект с полем user внутри
    return data.user || data;
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
    const response = await apiRequest("GET", `${API_BASE}/users/${id}/tasks`);
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

// Authentication API
export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    // OAuth2 password grant format
    const formData = new URLSearchParams({
      grant_type: 'password',
      username: credentials.username,
      password: credentials.password,
      scope: '',
      client_id: 'string',
      client_secret: ''
    });

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Ошибка входа в систему');
    }

    return response.json();
  },

  register: async (data: RegisterRequest): Promise<void> => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Ошибка регистрации');
    }
  },
};
