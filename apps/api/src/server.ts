import http from 'node:http';
import { createApp } from './app';
import { config } from './config';
import { migrate } from './db/migrate';
import { pool } from './db/pool';
import { logger } from './lib/logger';
import { purgeExpiredSessions } from './modules/auth/sessions';
import { startRealtime } from './modules/realtime';
import { hub } from './modules/realtime/hub';

async function main() {
  if (config.runMigrations) await migrate();
  await purgeExpiredSessions();

  const realtime = await startRealtime();
  const server = http.createServer(createApp());
  server.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, `Tack is listening on :${config.port}`);
  });

  const sweep = setInterval(
    () =>
      void purgeExpiredSessions().catch((err) => logger.warn({ err }, 'session cleanup failed')),
    6 * 60 * 60 * 1000,
  );
  sweep.unref();

  let closing = false;
  const shutdown = (signal: string) => {
    if (closing) return;
    closing = true;
    logger.info({ signal }, 'shutting down');

    hub.closeAll(); // open event streams would otherwise keep server.close() waiting
    void realtime.stop();
    server.close(() => void pool.end().finally(() => process.exit(0)));
    server.closeIdleConnections();
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start');
  process.exit(1);
});
