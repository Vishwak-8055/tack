import type { CookieOptions, RequestHandler, Response } from 'express';
import { config } from '../config';
import { unauthorized } from '../lib/errors';
import { resolveSession } from '../modules/auth/sessions';

export const SESSION_COOKIE = 'tack_session';

const cookieOptions = (expires?: Date): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: config.cookieSecure,
  path: '/',
  ...(expires && { expires }),
});

export function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

/** Attaches req.user when the request carries a valid session. Never rejects on its own. */
export const loadSession: RequestHandler = async (req, res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string' && token) {
    const session = await resolveSession(token);
    if (session) {
      req.user = session.user;
      req.sessionId = session.sessionId;
      if (session.renewed) setSessionCookie(res, token, session.expiresAt);
    } else {
      clearSessionCookie(res);
    }
  }
  next();
};

export const requireUser: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  next();
};
