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

// ---- Session Maps (coaching whiteboard) ----

// A map slug, same shape as the content/maps ids (e.g. "streets-of-tarkov").
const mapIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9-]+$/, "Invalid map");

export const createSessionSchema = z.object({
  mapId: mapIdSchema,
});

// Display name for an anonymous joiner (logged-in users use their username).
export const guestNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name")
  .max(24, "Name must be at most 24 characters");

// Body posted by the Liveblocks auth endpoint callback.
export const liveblocksAuthSchema = z.object({
  room: z.string().trim().min(1).max(64),
  name: z.string().trim().max(24).optional(),
  guestId: z.string().trim().max(64).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type BugReportInput = z.infer<typeof bugReportSchema>;
