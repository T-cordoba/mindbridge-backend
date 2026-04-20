require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const pool = require('./connection');

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function ensureDatabaseExists() {
  const targetDatabase = process.env.DB_NAME || 'mindbridge';

  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_ADMIN_DATABASE || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  await adminClient.connect();
  try {
    const existsResult = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDatabase]
    );

    if (existsResult.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE ${quoteIdentifier(targetDatabase)}`);
      console.log(`[Migrate] Database "${targetDatabase}" created.`);
    }
  } finally {
    await adminClient.end();
  }
}

async function migrate() {
  await ensureDatabaseExists();

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
