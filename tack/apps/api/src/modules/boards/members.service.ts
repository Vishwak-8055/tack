import type { AddMemberData, BoardRole, Member } from '@tack/shared';
import { maybeOne, tx } from '../../db/pool';
import { requireBoardRole } from '../../lib/access';
import type { Ctx } from '../../lib/context';
import { AppError, badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import { boardChanged, publish } from '../realtime';
import { recordActivity } from './activity.service';

export function addMember(ctx: Ctx, boardId: string, input: AddMemberData): Promise<Member> {
  return tx(async (db) => {
    await requireBoardRole(db, ctx.userId, boardId, 'owner');

    const user = await maybeOne<{ id: string; name: string; email: string }>(
      db,
      'SELECT id, name, email FROM users WHERE email = $1',
      [input.email],
    );
    if (!user) {
      throw new AppError(404, 'user_not_found', 'Nobody has signed up with that email yet', {
        email: 'No account with this email',
      });
    }

    const inserted = await db.query(
      'INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [boardId, user.id, input.role],
    );
    if (inserted.rowCount === 0) {
      throw conflict('already_member', `${user.name} is already on this board`);
    }

    await recordActivity(db, {
      boardId,
      actorId: ctx.userId,
      type: 'member.added',
      data: { name: user.name },
    });
    await boardChanged(db, ctx, boardId);
    return { ...user, role: input.role };
  });
}

export function updateMemberRole(
  ctx: Ctx,
  boardId: string,
  userId: string,
  role: Exclude<BoardRole, 'owner'>,
): Promise<void> {
  return tx(async (db) => {
    await requireBoardRole(db, ctx.userId, boardId, 'owner');
    const target = await maybeOne<{ role: BoardRole }>(
      db,
      'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2 FOR UPDATE',
      [boardId, userId],
    );
    if (!target) throw notFound('Member');
    if (target.role === 'owner')
      throw badRequest('owner_role', "The owner's role can't be changed");

    await db.query('UPDATE board_members SET role = $3 WHERE board_id = $1 AND user_id = $2', [
      boardId,
      userId,
      role,
    ]);
    await boardChanged(db, ctx, boardId);
  });
}

/** Owners can remove anyone; everyone else can only remove themselves (leave). */
export function removeMember(ctx: Ctx, boardId: string, userId: string): Promise<void> {
  return tx(async (db) => {
    const myRole = await requireBoardRole(db, ctx.userId, boardId);
    if (userId !== ctx.userId && myRole !== 'owner')
      throw forbidden('Only the board owner can remove people');

    const target = await maybeOne<{ role: BoardRole; name: string }>(
      db,
      `SELECT m.role, u.name FROM board_members m JOIN users u ON u.id = m.user_id
        WHERE m.board_id = $1 AND m.user_id = $2`,
      [boardId, userId],
    );
    if (!target) throw notFound('Member');
    if (target.role === 'owner') {
      throw badRequest('owner_cannot_leave', "The owner can't leave. Delete the board instead.");
    }

    await db.query('DELETE FROM board_members WHERE board_id = $1 AND user_id = $2', [
      boardId,
      userId,
    ]);
    await db.query(
      `DELETE FROM card_assignees
        WHERE user_id = $2 AND card_id IN (SELECT id FROM cards WHERE board_id = $1)`,
      [boardId, userId],
    );
    await recordActivity(db, {
      boardId,
      actorId: ctx.userId,
      type: 'member.removed',
      data: { name: target.name },
    });
    await boardChanged(db, ctx, boardId);
    await publish(db, {
      type: 'member.removed',
      boardId,
      actorId: ctx.userId,
      clientId: ctx.clientId,
      userId,
    });
  });
}
