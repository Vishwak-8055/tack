import type { SessionUser } from '@tack/shared';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      sessionId?: string;
      clientId?: string;
    }
  }
}
