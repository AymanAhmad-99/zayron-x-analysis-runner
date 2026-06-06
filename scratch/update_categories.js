import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres.xdfndojvqazffcjngglr:Ay20941699nuor582002@aws-1-us-west-1.pooler.supabase.com:6543/postgres';

const categoryMappings = {
  // threat_intel
  'Intel': 'threat_intel',
  'Threat Intelligence': 'threat_intel',
  'Cyber Crime': 'threat_intel',
  'Supply Chain Security': 'threat_intel',
  'AI Security': 'threat_intel',
  'Cloud Security': 'threat_intel',
  'APT Activity': 'threat_intel',
  'Geopolitical Risk': 'threat_intel',
  
  // vulnerabilities
  'Exploits': 'vulnerabilities',
  'Vulnerability Research': 'vulnerabilities',
  
  // osint
  'OSINT': 'osint',
  'Leaks': 'osint',
  
  // tools
  'Tools': 'tools',
  'Security Tools': 'tools'
};

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('Starting category migration...');
  
  // Let's audit current counts
  const initialRes = await client.query('SELECT category, COUNT(*) as count FROM articles GROUP BY category');
  console.log('\nInitial category counts:');
  for (const row of initialRes.rows) {
    console.log(`  - "${row.category}": ${row.count}`);
  }

  // Run updates for each mapping
  let totalUpdated = 0;
  for (const [oldCat, newCat] of Object.entries(categoryMappings)) {
    const updateRes = await client.query(
      'UPDATE articles SET category = $1 WHERE category = $2',
      [newCat, oldCat]
    );
    if (updateRes.rowCount > 0) {
      console.log(`Updated "${oldCat}" -> "${newCat}": ${updateRes.rowCount} rows`);
      totalUpdated += updateRes.rowCount;
    }
  }

  // Let's also do a case-insensitive lookup for any remaining legacy categories or variants
  const finalAudit = await client.query('SELECT category, COUNT(*) as count FROM articles GROUP BY category');
  console.log('\nFinal category counts:');
  for (const row of finalAudit.rows) {
    console.log(`  - "${row.category}": ${row.count}`);
  }

  console.log(`\nMigration completed. Total rows updated: ${totalUpdated}`);
  await client.end();
}

run().catch(console.error);
