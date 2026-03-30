const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function parseEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const env = {};
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

(async () => {
  try {
    const repoRoot = path.resolve(__dirname, '..');
    const envPath = path.join(repoRoot, '.env');
    if (!fs.existsSync(envPath)) {
      console.error('.env not found at', envPath);
      process.exit(2);
    }
    const env = parseEnv(envPath);

    const host = env.PG_HOST || env.PG_POOLER_HOST || env.HEAVY_PG_HOST;
    const port = env.PG_PORT || env.PG_POOLER_PORT || 5432;
    const user = env.PG_USER || env.PG_POOLER_USER || env.HEAVY_PG_USER;
    const password = env.PG_PASSWORD || env.PG_POOLER_PASSWORD || env.HEAVY_PG_PASSWORD;
    const database = env.PG_DATABASE || env.PG_POOLER_DATABASE || env.HEAVY_PG_DATABASE || 'postgres';

    if (!host || !user || !password) {
      console.error('Missing PG connection parameters in .env');
      process.exit(3);
    }

    const sqlFile = path.join(repoRoot, 'supabase', 'migrations', '20260330000000_add_ticket_deletion.sql');
    if (!fs.existsSync(sqlFile)) {
      console.error('Migration file not found:', sqlFile);
      process.exit(4);
    }

    let sql = fs.readFileSync(sqlFile, 'utf8');
    // Remove DO $$ ... $$ wrapper handling by executing whole file

    const client = new Client({ host, port, user, password, database });
    await client.connect();

    console.log('Connected to', host, database);

    // Execute statements sequentially splitting by semicolon may fail for functions; use simple approach: run entire file as one query
    try {
      await client.query(sql);
      console.log('Migration executed successfully.');
    } catch (err) {
      console.error('Error executing migration (trying statement-by-statement):', err.message);
      // Try splitting on "\n\n" boundaries for safer execution
      const parts = sql.split(/;\s*\n/);
      for (const part of parts) {
        const stmt = part.trim();
        if (!stmt) continue;
        try {
          await client.query(stmt + ';');
        } catch (e) {
          console.error('Failed statement:', stmt.slice(0, 120).replace(/\n/g, ' '));
          console.error(e.message);
          // continue to attempt remaining
        }
      }
      console.log('Finished attempting statements.');
    }

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err.message);
    process.exit(1);
  }
})();
