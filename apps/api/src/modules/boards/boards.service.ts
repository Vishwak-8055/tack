import {
  DEFAULT_LABEL_COLORS,
  DEFAULT_LIST_TITLES,
  initialPositions,
  type BoardDetail,
  type BoardSummary,
  type CardSummary,
  type CreateBoardData,
  type Label,
  type ListDTO,
  type Member,
  type UpdateBoardData,
} from '@tack/shared';
import { many, maybeOne, one, pool, tx, type Queryable } from '../../db/pool';
import { requireBoardRole } from '../../lib/access';
import type { Ctx } from '../../lib/context';
import { notFound } from '../../lib/errors';
import { CARD_COLUMNS } from '../cards/card.sql';
import { publish, boardChanged } from '../realtime';
import { recordActivity } from './activity.service';

const SUMMARY_SQL = `
  SELECT b.id, b.title, b.background, m.role, m.starred, b.updated_at AS "updatedAt",
         (SELECT count(*) FROM board_members x WHERE x.board_id = b.id)::int AS "memberCount",
         (SELECT count(*) FROM lists l WHERE l.board_id = b.id)::int AS "listCount",
         (SELECT count(*) FROM cards c WHERE c.board_id = b.id)::int AS "cardCount"
    FROM boards b
    JOIN board_members m ON m.board_id = b.id AND m.user_id = $1`;

const summaryOf = (db: Queryable, userId: string, boardId: string) =>
  one<BoardSummary>(db, `${SUMMARY_SQL} WHERE b.id = $2`, [userId, boardId]);

export function listBoards(ctx: Ctx): Promise<BoardSummary[]> {
  return many<BoardSummary>(pool, `${SUMMARY_SQL} ORDER BY b.updated_at DESC`, [ctx.userId]);
}

export function createBoard(ctx: Ctx, input: CreateBoardData): Promise<BoardSummary> {
  return tx(async (db) => {
    const { id } = await one<{ id: string }>(
      db,
      'INSERT INTO boards (title, background, created_by) VALUES ($1, $2, $3) RETURNING id',
      [input.title, input.background, ctx.userId],
    );
    await db.query(`INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'owner')`, [
      id,
      ctx.userId,
    ]);
    await db.query('INSERT INTO labels (board_id, color) SELECT $1, unnest($2::text[])', [
      id,
      DEFAULT_LABEL_COLORS,
    ]);

    if (input.template === 'kanban') {
      await db.query(
        `INSERT INTO lists (board_id, title, position)
         SELECT $1, t.title, t.position
           FROM unnest($2::text[], $3::text[]) AS t(title, position)`,
        [id, DEFAULT_LIST_TITLES, initialPositions(DEFAULT_LIST_TITLES.length)],
      );
    }

    await recordActivity(db, {
      boardId: id,
      actorId: ctx.userId,
      type: 'board.created',
      data: { title: input.title },
    });
    return summaryOf(db, ctx.userId, id);
  });
}

export async function getBoard(ctx: Ctx, boardId: string): Promise<BoardDetail> {
  const head = await maybeOne<
    Pick<BoardDetail, 'id' | 'title' | 'background' | 'role' | 'starred'>
  >(
    pool,
    `SELECT b.id, b.title, b.background, m.role, m.starred
       FROM boards b
       JOIN board_members m ON m.board_id = b.id AND m.user_id = $2
      WHERE b.id = $1`,
    [boardId, ctx.userId],
  );
  if (!head) throw notFound('Board');

  const [members, labels, lists, cards] = await Promise.all([
    many<Member>(
      pool,
      `SELECT u.id, u.name, u.email, m.role
         FROM board_members m JOIN users u ON u.id = m.user_id
        WHERE m.board_id = $1 ORDER BY m.joined_at, u.id`,
      [boardId],
    ),
    many<Label>(
      pool,
      'SELECT id, name, color FROM labels WHERE board_id = $1 ORDER BY created_at, id',
      [boardId],
    ),
    many<ListDTO>(
      pool,
      `SELECT id, board_id AS "boardId", title, position
         FROM lists WHERE board_id = $1 ORDER BY position, id`,
      [boardId],
    ),
    many<CardSummary>(
      pool,
      `SELECT ${CARD_COLUMNS} FROM cards c WHERE c.board_id = $1 ORDER BY c.position, c.id`,
      [boardId],
    ),
  ]);

  return { ...head, members, labels, lists, cards };
}

export function updateBoard(
  ctx: Ctx,
  boardId: string,
  input: UpdateBoardData,
): Promise<BoardSummary> {
  return tx(async (db) => {
    await requireBoardRole(db, ctx.userId, boardId, 'editor');
    const before = await one<{ title: string }>(
      db,
      'SELECT title FROM boards WHERE id = $1 FOR UPDATE',
      [boardId],
    );
    await db.query(
      'UPDATE boards SET title = COALESCE($2, title), background = COALESCE($3, background) WHERE id = $1',
      [boardId, input.title ?? null, input.background ?? null],
    );
    if (input.title && input.title !== before.title) {
      await recordActivity(db, {
        boardId,
        actorId: ctx.userId,
        type: 'board.updated',
        data: { from: before.title, to: input.title },
      });
    }
    await boardChanged(db, ctx, boardId);
    return summaryOf(db, ctx.userId, boardId);
  });
}

export async function setStarred(ctx: Ctx, boardId: string, starred: boolean): Promise<void> {
  const result = await pool.query(
    'UPDATE board_members SET starred = $3 WHERE board_id = $1 AND user_id = $2',
    [boardId, ctx.userId, starred],
  );
  if (result.rowCount === 0) throw notFound('Board');
}

export function deleteBoard(ctx: Ctx, boardId: string): Promise<void> {
  return tx(async (db) => {
    await requireBoardRole(db, ctx.userId, boardId, 'owner');
    await db.query('DELETE FROM boards WHERE id = $1', [boardId]);
    await publish(db, {
      type: 'board.deleted',
      boardId,
      actorId: ctx.userId,
      clientId: ctx.clientId,
    });
  });
}
