import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

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
  // No-op since we are using connectionless HTTP requests.
}

export function getDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is totally missing.');
  }
  // Use HTTP fetch client (neon) strictly. NO Pool. NO WebSockets.
  const sqlConnection = neon(dbUrl);
  return drizzle(sqlConnection, { schema });
}

// Re-export sql for convenience
export { sql };
