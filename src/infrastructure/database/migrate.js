require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./connection');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '001_initial.sql'), 'utf8');

  // Split on semicolons, filter blank lines, run each statement individually
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query('COMMIT');
    console.log('[Migrate] Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migrate] Migration failed:');
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
