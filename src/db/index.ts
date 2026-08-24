import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import "./relations";

// Lazy connection — only connects when first query is made, not at import time
const globalForDb = globalThis as unknown as {
  queryClient: ReturnType<typeof postgres> | undefined;
};

function getQueryClient() {
  if (globalForDb.queryClient) return globalForDb.queryClient;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Please add it to your environment variables.",
    );
  }

  const client = postgres(url, {
    max: process.env.NODE_ENV === "production" ? 1 : 10,
    prepare: false,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.queryClient = client;
  }

  return client;
}

export const db = drizzle(new Proxy({} as ReturnType<typeof postgres>, {
  get(_target, prop) {
    const client = getQueryClient();
    return Reflect.get(client, prop);
  },
  apply(_target, _thisArg, args) {
    const client = getQueryClient();
    return Reflect.apply(client as unknown as (...a: unknown[]) => unknown, client, args);
  },
}), { schema });

export type Database = typeof db;
