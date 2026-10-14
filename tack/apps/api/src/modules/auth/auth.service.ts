import type {
  ChangePasswordData,
  LoginData,
  RegisterData,
  SessionUser,
  UpdateProfileData,
} from '@tack/shared';
import { maybeOne, one, pool } from '../../db/pool';
import { AppError, isUniqueViolation } from '../../lib/errors';
import { dummyHash, hashPassword, verifyPassword } from '../../lib/password';
import { createSession, deleteOtherSessions } from './sessions';

export async function register(input: RegisterData, userAgent?: string) {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await one<SessionUser>(
      pool,
      `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at AS "createdAt"`,
      [input.email, input.name, passwordHash],
    );
    return { user, ...(await createSession(user.id, userAgent)) };
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError(409, 'email_taken', 'An account with that email already exists', {
        email: 'This email is already registered',
      });
    }
    throw err;
  }
}

export async function login(input: LoginData, userAgent?: string) {
  const row = await maybeOne<SessionUser & { passwordHash: string }>(
    pool,
    `SELECT id, name, email, created_at AS "createdAt", password_hash AS "passwordHash"
       FROM users WHERE email = $1`,
    [input.email],
  );

  // Always run one scrypt, even for unknown emails, so timing doesn't reveal which accounts exist.
  const valid = await verifyPassword(input.password, row?.passwordHash ?? (await dummyHash()));
  if (!row || !valid) {
    throw new AppError(401, 'invalid_credentials', "That email and password don't match");
  }

  const user: SessionUser = {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt,
  };
  return { user, ...(await createSession(user.id, userAgent)) };
}

export function updateProfile(userId: string, input: UpdateProfileData) {
  return one<SessionUser>(
    pool,
    `UPDATE users SET name = $2 WHERE id = $1
     RETURNING id, name, email, created_at AS "createdAt"`,
    [userId, input.name],
  );
}

export async function changePassword(userId: string, sessionId: string, input: ChangePasswordData) {
  const row = await one<{ passwordHash: string }>(
    pool,
    'SELECT password_hash AS "passwordHash" FROM users WHERE id = $1',
    [userId],
  );
  if (!(await verifyPassword(input.currentPassword, row.passwordHash))) {
    throw new AppError(400, 'wrong_password', 'Your current password is incorrect', {
      currentPassword: 'Incorrect password',
    });
  }
  if (input.currentPassword === input.newPassword) {
    throw unauthorizedChange();
  }
  await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [
    userId,
    await hashPassword(input.newPassword),
  ]);
  // Anyone else signed in with the old password gets signed out.
  await deleteOtherSessions(userId, sessionId);
}

const unauthorizedChange = () =>
  new AppError(400, 'same_password', 'Choose a password you are not already using', {
    newPassword: 'Must be different from your current password',
  });
