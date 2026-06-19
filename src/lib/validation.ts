import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(24, "Username must be at most 24 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Use only letters, numbers and underscores");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password is too long");

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username"),
  password: z.string().min(1, "Enter your password"),
});

export const progressSchema = z.object({
  questId: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Invalid quest id"),
  completed: z.boolean(),
});

export const bugReportSchema = z.object({
  message: z
    .string()
    .trim()
    .min(10, "Please describe the bug in a bit more detail")
    .max(1000, "Please keep it under 1000 characters"),
  // Where in the app the report was filed (path, not a full URL).
  page: z.string().trim().max(300).optional(),
  // Optional way to reach the reporter back (Discord tag, email, …).
  contact: z.string().trim().max(120).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type BugReportInput = z.infer<typeof bugReportSchema>;
