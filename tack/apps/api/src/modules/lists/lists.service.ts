import {
  computeMovePosition,
  positionAtEnd,
  type CreateListData,
  type ListDTO,
  type MoveListData,
  type Positioned,
} from '@tack/shared';
import { many, one, tx, type Queryable } from '../../db/pool';
import { loadList, requireBoardRole } from '../../lib/access';
import type { Ctx } from '../../lib/context';
import { recordActivity } from '../boards/activity.service';
import { boardChanged } from '../realtime';

const LIST_COLUMNS = 'id, board_id AS "boardId", title, position';

/** List order is decided under the board's row lock, so two simultaneous inserts can't collide. */
const lockBoard = (db: Queryable, boardId: string) =>
  db.query('SELECT 1 FROM boards WHERE id = $1 FOR UPDATE', [boardId]);

export function createList(ctx: Ctx, boardId: string, input: CreateListData): Promise<ListDTO> {
  return tx(async (db) => {
    await requireBoardRole(db, ctx.userId, boardId, 'editor');
    await lockBoard(db, boardId);
    const siblings = await many<Positioned>(
      db,
      'SELECT id, position FROM lists WHERE board_id = $1 ORDER BY position, id',
      [boardId],
    );
    const list = await one<ListDTO>(
      db,
      `INSERT INTO lists (board_id, title, position) VALUES ($1, $2, $3) RETURNING ${LIST_COLUMNS}`,
      [boardId, input.title, positionAtEnd(siblings)],
    );
    await recordActivity(db, {
      boardId,
      actorId: ctx.userId,
      type: 'list.created',
      data: { title: list.title },
    });
    await boardChanged(db, ctx, boardId);
    return list;
  });
}

export function renameList(ctx: Ctx, listId: string, title: string): Promise<ListDTO> {
  return tx(async (db) => {
    const before = await loadList(db, ctx.userId, listId, 'editor');
    const list = await one<ListDTO>(
      db,
      `UPDATE lists SET title = $2 WHERE id = $1 RETURNING ${LIST_COLUMNS}`,
      [listId, title],
    );
    if (before.title !== title) {
      await recordActivity(db, {
        boardId: before.boardId,
        actorId: ctx.userId,
        type: 'list.renamed',
        data: { from: before.title, to: title },
      });
    }
    await boardChanged(db, ctx, before.boardId);
    return list;
  });
}

export function moveList(ctx: Ctx, listId: string, input: MoveListData): Promise<ListDTO> {
  return tx(async (db) => {
    const ref = await loadList(db, ctx.userId, listId, 'editor');
    await lockBoard(db, ref.boardId);
    const siblings = await many<Positioned>(
      db,
      'SELECT id, position FROM lists WHERE board_id = $1 AND id <> $2 ORDER BY position, id',
      [ref.boardId, listId],
    );
    const list = await one<ListDTO>(
      db,
      `UPDATE lists SET position = $2 WHERE id = $1 RETURNING ${LIST_COLUMNS}`,
      [listId, computeMovePosition(siblings, input.afterId)],
    );
    await boardChanged(db, ctx, ref.boardId);
    return list;
  });
}

export function deleteList(ctx: Ctx, listId: string): Promise<void> {
  return tx(async (db) => {
    const ref = await loadList(db, ctx.userId, listId, 'editor');
    await db.query('DELETE FROM lists WHERE id = $1', [listId]);
    await recordActivity(db, {
      boardId: ref.boardId,
      actorId: ctx.userId,
      type: 'list.deleted',
      data: { title: ref.title },
    });
    await boardChanged(db, ctx, ref.boardId);
  });
}
