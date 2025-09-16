import { type User, type InsertUser, type Task, type InsertTask } from "@shared/schema";
import { randomUUID } from "crypto";

// Since we're using an external API, this storage interface is mainly for type consistency
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tasks: Map<string, Task>;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      created_at: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = { 
      ...insertTask,
      id,
      description: insertTask.description || null,
      status: insertTask.status || 'created',
      user_id: insertTask.user_id || null,
      attachments: insertTask.attachments || null,
      created_at: new Date()
    };
    this.tasks.set(id, task);
    return task;
  }
}

export const storage = new MemStorage();
