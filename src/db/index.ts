import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import "./relations";

function getDbUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Please add it to your environment variables.",
    );
  }
  return url;
}

// Connection for queries — compatible with Vercel serverless + connection poolers
const globalForDb = globalThis as unknown as {
  queryClient: ReturnType<typeof postgres> | undefined;
};

const queryClient =
  globalForDb.queryClient ??
  postgres(getDbUrl(), {
    max: process.env.NODE_ENV === "production" ? 1 : 10,
    prepare: false, // required for connection poolers (Neon, Supabase)
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
