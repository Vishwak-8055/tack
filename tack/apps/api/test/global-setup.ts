import pg from 'pg';
import { testEnv } from './env';

/** Creates the test database if this server doesn't have it yet. */
async function ensureDatabase(url: string, name: string) {
  const admin = new URL(url);
  admin.pathname = '/postgres';

  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (found.rowCount === 0)
      await client.query(`CREATE DATABASE ${client.escapeIdentifier(name)}`);
  } finally {
    await client.end();
  }
}

/** Rebuilds the test database from the migrations once per run. */
export default async function setup() {
  Object.assign(process.env, testEnv);

  const name = new URL(testEnv.DATABASE_URL).pathname.slice(1);
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to wipe "${name}". Test databases must have a name ending in _test.`);
  }
  await ensureDatabase(testEnv.DATABASE_URL, name);

  const { pool } = await import('../src/db/pool');
  const { migrate } = await import('../src/db/migrate');
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate();
  await pool.end();
}
