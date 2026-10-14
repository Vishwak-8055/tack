import { createHash, randomBytes } from 'node:crypto';
import type { SessionUser } from '@tack/shared';
import { config } from '../../config';
import { maybeOne, pool } from '../../db/pool';

const DAY = 24 * 60 * 60 * 1000;
const ttl = () => config.sessionTtlDays * DAY;

// The browser holds the token; the database only ever sees its hash.
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(userId: string, userAgent?: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + ttl());
  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, user_agent, expires_at) VALUES ($1, $2, $3, $4)`,
    [userId, hashToken(token), userAgent?.slice(0, 300) ?? null, expiresAt],
  );
  return { token, expiresAt };
}

export interface ResolvedSession {
  user: SessionUser;
  sessionId: string;
  expiresAt: Date;
  renewed: boolean;
}

export async function resolveSession(token: string): Promise<ResolvedSession | null> {
  const row = await maybeOne<
    SessionUser & { sessionId: string; lastSeenAt: string; expiresAt: string }
  >(
    pool,
    `SELECT u.id, u.name, u.email, u.created_at AS "createdAt",
            s.id AS "sessionId", s.last_seen_at AS "lastSeenAt", s.expires_at AS "expiresAt"
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  if (!row) return null;

  const user: SessionUser = {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt,
  };

  // Sliding expiry, but only write once a day so ordinary requests stay read-only.
  if (Date.now() - new Date(row.lastSeenAt).getTime() > DAY) {
    const expiresAt = new Date(Date.now() + ttl());
    await pool.query('UPDATE sessions SET last_seen_at = now(), expires_at = $2 WHERE id = $1', [
      row.sessionId,
      expiresAt,
    ]);
    return { user, sessionId: row.sessionId, expiresAt, renewed: true };
  }
  return { user, sessionId: row.sessionId, expiresAt: new Date(row.expiresAt), renewed: false };
}

export const deleteSession = (sessionId: string) =>
  pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);

export const deleteOtherSessions = (userId: string, keepSessionId: string) =>
  pool.query('DELETE FROM sessions WHERE user_id = $1 AND id <> $2', [userId, keepSessionId]);

export const purgeExpiredSessions = () =>
  pool.query('DELETE FROM sessions WHERE expires_at < now()');
