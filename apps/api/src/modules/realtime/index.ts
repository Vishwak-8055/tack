import pg from 'pg';
import { BOARD_EVENTS_CHANNEL, type BoardEvent } from '@tack/shared';
import type { Ctx } from '../../lib/context';
import { pgOptions, type Queryable } from '../../db/pool';
import { logger } from '../../lib/logger';
import { hub } from './hub';

/**
 * Fan-out goes through Postgres LISTEN/NOTIFY instead of an in-process emitter, so it keeps
 * working when the app runs as more than one instance, and needs no Redis.
 *
 * pg_notify called inside a transaction is only delivered if that transaction commits, which is
 * exactly what we want: no event ever announces a change that was rolled back.
 */
export function publish(db: Queryable, event: BoardEvent) {
  return db.query('SELECT pg_notify($1, $2)', [BOARD_EVENTS_CHANNEL, JSON.stringify(event)]);
}

/** Marks the board as recently active and tells every open tab to refresh. */
export async function boardChanged(db: Queryable, ctx: Ctx, boardId: string, cardId?: string) {
  await db.query('UPDATE boards SET updated_at = now() WHERE id = $1', [boardId]);
  await publish(db, {
    type: 'board.changed',
    boardId,
    actorId: ctx.userId,
    clientId: ctx.clientId,
    cardId,
  });
}

export interface Realtime {
  stop(): Promise<void>;
}

/** Holds one dedicated connection that LISTENs, and reconnects with backoff if it drops. */
export async function startRealtime(): Promise<Realtime> {
  let stopped = false;
  let client: pg.Client | null = null;
  let attempt = 0;

  const heartbeat = setInterval(() => hub.ping(), 25_000);
  heartbeat.unref();

  async function connect(): Promise<void> {
    if (stopped) return;
    const next = new pg.Client(pgOptions);
    client = next;

    const lost = (err?: Error) => {
      if (client !== next) return;
      client = null;
      next.removeAllListeners();
      next.on('error', () => undefined);
      void next.end().catch(() => undefined);
      if (stopped) return;
      const delay = Math.min(1000 * 2 ** attempt++, 15_000);
      logger.warn({ err, delay }, 'realtime listener lost, reconnecting');
      setTimeout(() => void connect(), delay).unref();
    };

    next.on('notification', (message) => {
      if (message.channel !== BOARD_EVENTS_CHANNEL || !message.payload) return;
      try {
        hub.dispatch(JSON.parse(message.payload) as BoardEvent);
      } catch (err) {
        logger.warn({ err }, 'ignored malformed realtime payload');
      }
    });
    next.on('error', lost);
    next.on('end', () => lost());

    try {
      await next.connect();
      await next.query(`LISTEN ${BOARD_EVENTS_CHANNEL}`);
      attempt = 0;
      logger.info('realtime listener ready');
    } catch (err) {
      lost(err as Error);
    }
  }

  await connect();

  return {
    async stop() {
      stopped = true;
      clearInterval(heartbeat);
      const current = client;
      client = null;
      await current?.end().catch(() => undefined);
    },
  };
}
