export const testEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://tack:tack@localhost:5432/tack_test',
  PASSWORD_COST: '10', // fast hashes; production uses 15
  RATE_LIMIT: 'false',
  COOKIE_SECURE: 'false',
  LOG_LEVEL: 'silent',
};
