import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// In serverless (Vercel), DATABASE_URL may not be available at import time
// So we use lazy initialization instead of throwing error immediately
let poolInstance: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function getPool() {
  if (!poolInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    poolInstance = postgres(process.env.DATABASE_URL, { prepare: false });
  }
  return poolInstance;
}

function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

// Export lazy getters
export const pool = new Proxy({} as postgres.Sql, {
  get(_target, prop) {
    return getPool()[prop as keyof postgres.Sql];
  }
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  }
});