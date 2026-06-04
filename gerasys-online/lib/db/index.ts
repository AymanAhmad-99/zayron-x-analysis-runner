import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

let queryClient: ReturnType<typeof postgres> | undefined;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

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
  dbInstance = undefined;
}

export function getDb() {
  if (!dbInstance) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || dbUrl.includes("dummy") || dbUrl.includes("localhost") || dbUrl.includes("[PROJECT_REF]")) {
      throw new Error('DATABASE_URL is missing or invalid in the Edge runtime.');
    }
    
    // Cloudflare edge compatible postgres.js client using nodejs_compat TCP sockets.
    // We disable prepared statements (prepare: false) as Supabase's Transaction Pooler (Port 6543)
    // requires this to prevent transaction/session state pollution across connections.
    queryClient = postgres(dbUrl, { prepare: false });
    dbInstance = drizzle(queryClient, { schema });
  }
  return dbInstance;
}

// Re-export sql for convenience
export { sql };
