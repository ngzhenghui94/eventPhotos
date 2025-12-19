import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

const clientConfig = {
  connect_timeout: 15,
  idle_timeout: 20,
};

// Use globalThis to persist the database client across hot reloads in development.
// Note: During initial Next.js compilation, you may see multiple clients created
// as different routes compile in separate worker contexts. This is expected and
// resolves once all routes are compiled.
const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

export const client = globalForDb.pgClient ?? postgres(process.env.POSTGRES_URL, clientConfig);

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
