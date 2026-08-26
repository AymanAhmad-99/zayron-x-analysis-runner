import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './packages/intelligence/db/schema.ts',
  out: './db/migrations',
  dialect: 'sqlite',
});
