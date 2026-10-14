import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';
import { config } from '../config';

const KEY_LENGTH = 64;
const MAX_MEMORY = 256 * 1024 * 1024;

function scrypt(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, { ...options, maxmem: MAX_MEMORY }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

/**
 * Hashes use scrypt from node:crypto, so there is no native module to compile in Docker.
 * The format is self-describing (`scrypt$cost$r$p$salt$hash`), which means the cost can be raised
 * later without invalidating existing passwords.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const cost = config.passwordCost;
  const key = await scrypt(password, salt, { N: 2 ** cost, r: 8, p: 1 });
  return ['scrypt', cost, 8, 1, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, cost, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !cost || !r || !p || !salt || !hash) return false;

  const expected = Buffer.from(hash, 'base64url');
  const actual = await scrypt(password, Buffer.from(salt, 'base64url'), {
    N: 2 ** Number(cost),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

let dummy: Promise<string> | undefined;

/** Verified against when an email doesn't exist, so login takes the same time either way. */
export function dummyHash(): Promise<string> {
  dummy ??= hashPassword('this-password-is-never-used');
  return dummy;
}
