import dotenv from 'dotenv';
import { z } from 'zod';

// Look next to the package first, then at the repo root (where .env.example lives).
dotenv.config({ path: ['.env', '../../.env'], quiet: true });

const flag = z.enum(['true', 'false']).transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'is required'),
  DATABASE_SSL: flag.default(false),
  PG_POOL_MAX: z.coerce.number().int().min(1).default(10),
  COOKIE_SECURE: flag.optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  ALLOWED_ORIGINS: z.string().default(''),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).default(30),
  // log2 of the scrypt work factor. 15 is a sensible production default; tests use 10.
  PASSWORD_COST: z.coerce.number().int().min(10).max(17).default(15),
  RATE_LIMIT: flag.default(true),
  RUN_MIGRATIONS: flag.default(true),
  WEB_DIST: z.string().optional(),
});

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  // An empty value in a .env file should mean "use the default".
  const present = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value !== ''),
  );
  const parsed = schema.safeParse(present);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration:\n${problems}\n\nCopy .env.example to .env to get started.`,
    );
  }

  const e = parsed.data;
  return {
    env: e.NODE_ENV,
    isProd: e.NODE_ENV === 'production',
    isTest: e.NODE_ENV === 'test',
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    databaseSsl: e.DATABASE_SSL,
    poolMax: e.PG_POOL_MAX,
    cookieSecure: e.COOKIE_SECURE ?? e.NODE_ENV === 'production',
    trustProxy: e.TRUST_PROXY,
    allowedOrigins: e.ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    logLevel: e.LOG_LEVEL,
    sessionTtlDays: e.SESSION_TTL_DAYS,
    passwordCost: e.PASSWORD_COST,
    rateLimit: e.RATE_LIMIT,
    runMigrations: e.RUN_MIGRATIONS,
    webDist: e.WEB_DIST,
  };
}

export const config = (() => {
  try {
    return loadConfig();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
})();
