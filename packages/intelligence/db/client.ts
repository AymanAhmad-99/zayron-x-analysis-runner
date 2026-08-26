import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb(env: any) {
  if (!env?.DB) {
    throw new Error('D1 database binding "DB" is missing from the environment');
  }
  return drizzle(env.DB, { schema });
}
