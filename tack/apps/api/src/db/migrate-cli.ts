import { migrate } from './migrate';
import { pool } from './pool';

try {
  const ran = await migrate();
  console.log(ran.length ? `Applied ${ran.join(', ')}` : 'Database is up to date');
} finally {
  await pool.end();
}
