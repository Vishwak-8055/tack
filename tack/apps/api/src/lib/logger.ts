import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { config } from '../config';

export const logger = pino({
  level: config.isTest ? 'silent' : config.logLevel,
  redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
  ...(config.env === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && incoming.length <= 64 ? incoming : randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    return res.statusCode >= 400 ? 'warn' : 'info';
  },
  autoLogging: {
    ignore: (req) => req.url === '/api/health' || (req.url ?? '').startsWith('/assets/'),
  },
});
