import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config';
import { AppError } from '../lib/errors';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Cookies are SameSite=Lax and the API only accepts JSON, which already blocks cross-site form
 * posts. This is a second layer: browsers always send Origin on cross-origin writes, so reject
 * any that don't match this host (or ALLOWED_ORIGINS). Non-browser clients send no Origin.
 */
export const originCheck: RequestHandler = (req, _res, next) => {
  if (!UNSAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();

  try {
    if (new URL(origin).host === req.get('host') || config.allowedOrigins.includes(origin)) {
      return next();
    }
  } catch {
    // fall through to the rejection below
  }
  next(new AppError(403, 'bad_origin', 'Requests from this origin are not allowed'));
};

/** Tabs send a random id so the server can tell them not to react to their own changes. */
export const readClientId: RequestHandler = (req, _res, next) => {
  const id = req.get('x-client-id');
  if (id && id.length <= 64) req.clientId = id;
  next();
};

const limiterBase = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => !config.rateLimit,
} as const;

export const apiLimiter = rateLimit({
  ...limiterBase,
  windowMs: 60_000,
  limit: 600,
  message: { error: { code: 'rate_limited', message: 'Too many requests. Try again shortly.' } },
});

export const authLimiter = rateLimit({
  ...limiterBase,
  windowMs: 15 * 60_000,
  limit: 30,
  message: {
    error: {
      code: 'rate_limited',
      message: 'Too many attempts. Wait a few minutes and try again.',
    },
  },
});
