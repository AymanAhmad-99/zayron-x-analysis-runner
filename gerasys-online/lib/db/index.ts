import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
let cachedConnectionString: string | undefined;
let queryClient: ReturnType<typeof postgres> | undefined;

export function maskDatabaseUrl(urlStr: string): string {
  if (!urlStr) return "[EMPTY]";
  try {
    const url = new URL(urlStr);
    url.password = "********";
    return url.toString();
  } catch {
    return "[UNPARSEABLE DATABASE URL]";
  }
}

export function resetDbConnection(): void {
  if (queryClient) {
    try {
      queryClient.end();
    } catch {
      // Swallow
    }
  }
  queryClient = undefined;
  cachedDb = undefined;
  cachedConnectionString = undefined;
}

export function getDb(env?: any) {
  // Extract the connection string from Cloudflare Hyperdrive binding or DATABASE_URL.
  // We check passed env, process.env, and globalThis for maximum edge compatibility.
  const hyperdriveObj = env?.HYPERDRIVE || (process.env as any)?.HYPERDRIVE || (globalThis as any)?.HYPERDRIVE || (globalThis as any)?.process?.env?.HYPERDRIVE;
  const connectionString = 
    (typeof hyperdriveObj === 'object' && hyperdriveObj !== null && 'connectionString' in hyperdriveObj)
      ? hyperdriveObj.connectionString
      : (typeof hyperdriveObj === 'string' ? hyperdriveObj : undefined) || process.env.DATABASE_URL;

  if (!connectionString || connectionString.includes("dummy") || connectionString.includes("localhost") || connectionString.includes("[PROJECT_REF]")) {
    console.error('FATAL: HYPERDRIVE binding or DATABASE_URL is missing or invalid.');
    throw new Error('Database connection string not found.');
  }

  // Reuse the database instance to prevent socket exhaustion
  if (!cachedDb || cachedConnectionString !== connectionString) {
    if (queryClient) {
      try {
        queryClient.end();
      } catch {}
    }
    // Initialize postgres.js client (TCP over Hyperdrive)
    queryClient = postgres(connectionString, { prepare: false });
    cachedDb = drizzle(queryClient, { schema });
    cachedConnectionString = connectionString;
  }

  return cachedDb;
}

// Re-export sql for convenience
export { sql };
