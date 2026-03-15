import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "../shared/schema.js";

// Serverless-friendly: initialize only when DATABASE_URL is available
const DATABASE_URL = process.env.DATABASE_URL || '';

// Create connection only if DATABASE_URL exists (runtime check)
export const pool = DATABASE_URL
  ? postgres(DATABASE_URL, { prepare: false })
  : null as any; // Will throw proper error on first use if null

export const db = pool ? drizzle(pool, { schema }) : null as any;