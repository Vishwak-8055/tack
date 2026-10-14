import { Router } from 'express';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from '@tack/shared';
import { clearSessionCookie, requireUser, setSessionCookie } from '../../middleware/auth';
import { authLimiter } from '../../middleware/security';
import { changePassword, login, register, updateProfile } from './auth.service';
import { deleteSession } from './sessions';

export const authRouter = Router();

authRouter.post('/register', authLimiter, async (req, res) => {
  const input = registerSchema.parse(req.body);
  const { user, token, expiresAt } = await register(input, req.get('user-agent'));
  setSessionCookie(res, token, expiresAt);
  res.status(201).json(user);
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const input = loginSchema.parse(req.body);
  const { user, token, expiresAt } = await login(input, req.get('user-agent'));
  setSessionCookie(res, token, expiresAt);
  res.json(user);
});

authRouter.post('/logout', async (req, res) => {
  if (req.sessionId) await deleteSession(req.sessionId);
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireUser, (req, res) => {
  res.json(req.user);
});

authRouter.patch('/me', requireUser, async (req, res) => {
  res.json(await updateProfile(req.user!.id, updateProfileSchema.parse(req.body)));
});

authRouter.post('/password', requireUser, async (req, res) => {
  await changePassword(req.user!.id, req.sessionId!, changePasswordSchema.parse(req.body));
  res.status(204).end();
});
