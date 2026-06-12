import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  console.log('🚀 Initializing connection to Supabase database...');
  const sql = postgres(dbUrl, { ssl: 'require', prepare: false });

  try {
    const migrationPath = path.join(process.cwd(), '..', 'supabase_gating_migration.sql');
    console.log(`📖 Reading migration SQL from: ${migrationPath}`);
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

    console.log('⚡ Executing migration SQL block on database...');
    await sql.unsafe(sqlContent);
    console.log('✅ Migration completed successfully!');
  } catch (err: any) {
    console.error('❌ Migration failed with error:', err.message || err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
