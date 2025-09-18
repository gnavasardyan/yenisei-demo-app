export interface User {
  id: string;
  username: string;
  email: string;
  role?: 'user' | 'admin';
  created_at?: string;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: "created" | "assigned" | "done";
  user_id?: string;
  created_at?: string;
  attachments?: any;
}

export interface TaskWithUser extends Task {
  user?: User;
}

export interface UserWithStats extends User {
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
  };
}

export interface DashboardStats {
  totalTasks: number;
  activeUsers: number;
  completedTasks: number;
  inProgressTasks: number;
}

export interface CreateTaskRequest {
  name: string;
  description?: string;
  status?: "created" | "assigned" | "done";
  user_id?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
}

export interface AssignTaskRequest {
  user_id: string;
  status?: "created" | "assigned" | "done";
}

// Authentication types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  role: 'user' | 'admin';
}
