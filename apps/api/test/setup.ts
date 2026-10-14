import { afterAll, beforeEach } from 'vitest';
import { pool } from '../src/db/pool';

beforeEach(async () => {
  await pool.query('TRUNCATE users RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
});
