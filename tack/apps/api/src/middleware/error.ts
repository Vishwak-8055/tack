import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import type { ApiErrorBody } from '@tack/shared';
import { AppError } from '../lib/errors';

export const apiNotFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'not_found', `No route for ${req.method} ${req.path}`));
};

function fieldErrors(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  return fields;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const send = (status: number, error: ApiErrorBody['error']) => {
    res.status(status).json({ error } satisfies ApiErrorBody);
  };

  if (err instanceof AppError) {
    return send(err.status, { code: err.code, message: err.message, fields: err.fields });
  }
  if (err instanceof ZodError) {
    return send(400, {
      code: 'validation_error',
      message: 'Some fields need attention',
      fields: fieldErrors(err),
    });
  }

  // body-parser errors carry their own status and a type tag
  const type = (err as { type?: string }).type;
  if (type === 'entity.parse.failed') {
    return send(400, { code: 'invalid_json', message: 'Request body is not valid JSON' });
  }
  if (type === 'entity.too.large') {
    return send(413, { code: 'too_large', message: 'Request body is too large' });
  }

  req.log.error({ err }, 'unhandled error');
  send(500, { code: 'internal_error', message: 'Something went wrong on our side' });
};
