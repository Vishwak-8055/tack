import type { BoardRole } from '@tack/shared';
import { maybeOne, type Queryable } from '../db/pool';
import { forbidden, notFound } from './errors';

const rank: Record<BoardRole, number> = { viewer: 0, editor: 1, owner: 2 };

function assertRole(role: BoardRole, min: BoardRole) {
  if (rank[role] >= rank[min]) return;
  throw forbidden(
    min === 'owner'
      ? 'Only the board owner can do that'
      : 'You have view-only access to this board',
  );
}

/**
 * Non-members get a 404, not a 403, so board ids can't be probed for existence.
 */
export async function requireBoardRole(
  db: Queryable,
  userId: string,
  boardId: string,
  min: BoardRole = 'viewer',
): Promise<BoardRole> {
  const row = await maybeOne<{ role: BoardRole }>(
    db,
    'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
    [boardId, userId],
  );
  if (!row) throw notFound('Board');
  assertRole(row.role, min);
  return row.role;
}

export interface CardRef {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  completedAt: string | null;
  role: BoardRole;
}

export async function loadCard(
  db: Queryable,
  userId: string,
  cardId: string,
  min: BoardRole = 'viewer',
): Promise<CardRef> {
  const row = await maybeOne<CardRef>(
    db,
    `SELECT c.id, c.board_id AS "boardId", c.list_id AS "listId", c.title,
            c.completed_at AS "completedAt", m.role
       FROM cards c
       JOIN board_members m ON m.board_id = c.board_id AND m.user_id = $2
      WHERE c.id = $1`,
    [cardId, userId],
  );
  if (!row) throw notFound('Card');
  assertRole(row.role, min);
  return row;
}

export interface ListRef {
  id: string;
  boardId: string;
  title: string;
  role: BoardRole;
}

export async function loadList(
  db: Queryable,
  userId: string,
  listId: string,
  min: BoardRole = 'viewer',
): Promise<ListRef> {
  const row = await maybeOne<ListRef>(
    db,
    `SELECT l.id, l.board_id AS "boardId", l.title, m.role
       FROM lists l
       JOIN board_members m ON m.board_id = l.board_id AND m.user_id = $2
      WHERE l.id = $1`,
    [listId, userId],
  );
  if (!row) throw notFound('List');
  assertRole(row.role, min);
  return row;
}
