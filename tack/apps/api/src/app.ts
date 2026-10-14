import { existsSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { config } from './config';
import { pool } from './db/pool';
import { httpLogger, logger } from './lib/logger';
import { loadSession } from './middleware/auth';
import { apiNotFound, errorHandler } from './middleware/error';
import { apiLimiter, originCheck, readClientId } from './middleware/security';
import { authRouter } from './modules/auth/auth.routes';
import { boardsRouter } from './modules/boards/boards.routes';
import { cardsRouter } from './modules/cards/cards.routes';
import { listsRouter } from './modules/lists/lists.routes';

const here = fileURLToPath(new URL('.', import.meta.url));

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(httpLogger);
  app.use(
    helmet({
      // Plain-http deployments (a LAN box, a localhost demo) would break if every request were
      // silently upgraded to https, so leave that decision to the reverse proxy.
      contentSecurityPolicy: {
        useDefaults: true,
        directives: { 'upgrade-insecure-requests': null },
      },
    }),
  );
  app.use(
    compression({
      // Compressing an event stream would hold events back in a buffer.
      filter: (req, res) =>
        !String(res.getHeader('Content-Type')).includes('text/event-stream') &&
        compression.filter(req, res),
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const api = express.Router();
  api.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  api.use(apiLimiter, originCheck, readClientId, loadSession);
  api.use('/auth', authRouter);
  api.use('/boards', boardsRouter);
  api.use('/lists', listsRouter);
  api.use('/cards', cardsRouter);
  api.use(apiNotFound);
  app.use('/api', api);

  serveWeb(app);
  app.use(errorHandler);
  return app;
}

/** In production the API also serves the built single-page app. In development Vite does that. */
function serveWeb(app: Express) {
  const dist = config.webDist ?? resolve(here, '../../web/dist');
  if (!existsSync(join(dist, 'index.html'))) {
    logger.info('No web build found, serving the API only');
    return;
  }

  app.use(
    express.static(dist, {
      index: false,
      setHeaders(res, file) {
        // Vite fingerprints everything in /assets, so it can be cached forever.
        res.setHeader(
          'Cache-Control',
          file.includes(`${sep}assets${sep}`)
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=3600',
        );
      },
    }),
  );

  // Client-side routes (anything without a file extension) all get the app shell.
  app.get(/^\/(?!api(?:\/|$))[^.]*$/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(join(dist, 'index.html'));
  });
}
