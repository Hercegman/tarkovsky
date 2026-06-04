import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Vercel's Neon/Postgres integration may expose the URL under either name.
const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!connectionString) {
  // Fail loudly at first DB use rather than at import, so the app can still
  // build and render static pages without a database configured.
  console.warn("DATABASE_URL is not set — database features are disabled.");
}

// Reuse the client across hot reloads / serverless invocations.
const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__pgClient ??
  postgres(connectionString ?? "postgres://invalid", {
    prepare: false,
    max: 1,
    // Fail closed on encryption in production (Neon/Vercel Postgres require it).
    ssl: process.env.NODE_ENV === "production" ? "require" : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__pgClient = client;

export const db = drizzle(client, { schema });
