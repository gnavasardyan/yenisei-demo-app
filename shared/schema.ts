import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull(),
  email: text("email").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("created"), // created, assigned, done
  user_id: varchar("user_id").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  attachments: text("attachments"), // JSON string for attachment info
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  created_at: true,
});

export const updateUserSchema = insertUserSchema.partial();
export const updateTaskSchema = insertTaskSchema.partial();

export const assignTaskSchema = z.object({
  user_id: z.string(),
  status: z.enum(["created", "assigned", "done"]).default("assigned"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type AssignTask = z.infer<typeof assignTaskSchema>;
export type User = typeof users.$inferSelect;
export type Task = typeof tasks.$inferSelect;

// Extended types with relationships
export type TaskWithUser = Task & {
  user?: User;
};

export type UserWithStats = User & {
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
  };
};
