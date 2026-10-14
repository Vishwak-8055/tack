import pg from 'pg';
import { config } from '../config';
import { notFound } from '../lib/errors';
import { logger } from '../lib/logger';

// Return timestamptz as ISO strings so a row serialises to exactly what the API sends.
pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, (value) => new Date(value).toISOString());

export const pgOptions: pg.PoolConfig = {
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
};

export const pool = new pg.Pool({ ...pgOptions, max: config.poolMax });
pool.on('error', (err) => logger.error({ err }, 'idle postgres client error'));

/** Either the pool or a client checked out for a transaction. */
export type Queryable = Pick<pg.Pool, 'query'>;

export async function many<T extends pg.QueryResultRow>(
  db: Queryable,
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const result = await db.query<T>(text, values);
  return result.rows;
}

export async function maybeOne<T extends pg.QueryResultRow>(
  db: Queryable,
  text: string,
  values: unknown[] = [],
): Promise<T | null> {
  const rows = await many<T>(db, text, values);
  return rows[0] ?? null;
}

export async function one<T extends pg.QueryResultRow>(
  db: Queryable,
  text: string,
  values: unknown[] = [],
): Promise<T> {
  const row = await maybeOne<T>(db, text, values);
  if (!row) throw notFound();
  return row;
}

export async function tx<T>(fn: (db: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
