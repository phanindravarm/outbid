import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import "./relations";

const globalForDb = globalThis as unknown as {
  db: PostgresJsDatabase<typeof schema> | undefined;
};

function createDb(): PostgresJsDatabase<typeof schema> {
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

  return drizzle(client, { schema });
}

// Lazy getter — only creates the connection when first accessed
export function getDb(): PostgresJsDatabase<typeof schema> {
  if (globalForDb.db) return globalForDb.db;

  const database = createDb();

  if (process.env.NODE_ENV !== "production") {
    globalForDb.db = database;
  }

  return database;
}

// For backward compatibility — proxy that defers to getDb()
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const realDb = getDb();
    const value = Reflect.get(realDb, prop, receiver);
    if (typeof value === "function") {
      return value.bind(realDb);
    }
    return value;
  },
});

export type Database = PostgresJsDatabase<typeof schema>;
