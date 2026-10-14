import type { Request } from 'express';
import { z } from 'zod';
import type { Ctx } from './context';
import { notFound } from './errors';

const uuid = z.string().uuid();

/** A malformed id can't match anything, so it's a 404 rather than a validation error. */
export function param(req: Request, name = 'id'): string {
  const parsed = uuid.safeParse(req.params[name]);
  if (!parsed.success) throw notFound();
  return parsed.data;
}

/** Only call after requireUser. */
export function ctx(req: Request): Ctx {
  return { userId: req.user!.id, clientId: req.clientId ?? null };
}
