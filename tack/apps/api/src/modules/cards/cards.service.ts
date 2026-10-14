import {
  computeMovePosition,
  positionAtEnd,
  type CardDetail,
  type CardSummary,
  type ChecklistItem,
  type CommentData,
  type CommentDTO,
  type CreateCardData,
  type CreateChecklistItemData,
  type MoveCardData,
  type Positioned,
  type UpdateCardData,
  type UpdateChecklistItemData,
} from '@tack/shared';
import { many, maybeOne, one, pool, tx, type Queryable } from '../../db/pool';
import { loadCard, loadList } from '../../lib/access';
import type { Ctx } from '../../lib/context';
import { forbidden, notFound } from '../../lib/errors';
import { recordActivity } from '../boards/activity.service';
import { boardChanged } from '../realtime';
import { CARD_COLUMNS } from './card.sql';

interface CommentRow {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  authorId: string | null;
  authorName: string | null;
}

const toComment = (row: CommentRow): CommentDTO => ({
  id: row.id,
  body: row.body,
  createdAt: row.createdAt,
  editedAt: row.editedAt,
  author: row.authorId && row.authorName ? { id: row.authorId, name: row.authorName } : null,
});

/** Everything the card dialog shows. Every card mutation returns this, so clients never refetch. */
export async function cardDetail(db: Queryable, cardId: string): Promise<CardDetail> {
  const card = await one<CardSummary & { description: string; createdAt: string }>(
    db,
    `SELECT ${CARD_COLUMNS}, c.description, c.created_at AS "createdAt"
       FROM cards c WHERE c.id = $1`,
    [cardId],
  );
  const [checklist, comments] = await Promise.all([
    many<ChecklistItem>(
      db,
      'SELECT id, text, done, position FROM checklist_items WHERE card_id = $1 ORDER BY position, id',
      [cardId],
    ),
    many<CommentRow>(
      db,
      `SELECT m.id, m.body, m.created_at AS "createdAt", m.edited_at AS "editedAt",
              u.id AS "authorId", u.name AS "authorName"
         FROM comments m LEFT JOIN users u ON u.id = m.author_id
        WHERE m.card_id = $1 ORDER BY m.created_at DESC, m.id DESC`,
      [cardId],
    ),
  ]);
  return { ...card, checklist, comments: comments.map(toComment) };
}

export async function getCard(ctx: Ctx, cardId: string): Promise<CardDetail> {
  await loadCard(pool, ctx.userId, cardId);
  return cardDetail(pool, cardId);
}

/** Serialises position changes within a list, so simultaneous drops can't pick the same key. */
const lockList = (db: Queryable, listId: string) =>
  db.query('SELECT 1 FROM lists WHERE id = $1 FOR UPDATE', [listId]);

const lockCard = (db: Queryable, cardId: string) =>
  db.query('SELECT 1 FROM cards WHERE id = $1 FOR UPDATE', [cardId]);

export function createCard(ctx: Ctx, listId: string, input: CreateCardData): Promise<CardDetail> {
  return tx(async (db) => {
    const list = await loadList(db, ctx.userId, listId, 'editor');
    await lockList(db, listId);
    const siblings = await many<Positioned>(
      db,
      'SELECT id, position FROM cards WHERE list_id = $1 ORDER BY position, id',
      [listId],
    );
    const { id } = await one<{ id: string }>(
      db,
      `INSERT INTO cards (board_id, list_id, title, position, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [list.boardId, listId, input.title, positionAtEnd(siblings), ctx.userId],
    );
    await recordActivity(db, {
      boardId: list.boardId,
      actorId: ctx.userId,
      type: 'card.created',
      cardId: id,
      data: { title: input.title, list: list.title },
    });
    await boardChanged(db, ctx, list.boardId, id);
    return cardDetail(db, id);
  });
}

export function updateCard(ctx: Ctx, cardId: string, input: UpdateCardData): Promise<CardDetail> {
  return tx(async (db) => {
    const card = await loadCard(db, ctx.userId, cardId, 'editor');

    // Column names below are fixed strings; only values come from the request.
    const sets: string[] = [];
    const values: unknown[] = [cardId];
    const set = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };
    if (input.title !== undefined) set('title', input.title);
    if (input.description !== undefined) set('description', input.description);
    if (input.dueAt !== undefined) set('due_at', input.dueAt);
    if (input.completed !== undefined) {
      sets.push(
        input.completed ? 'completed_at = COALESCE(completed_at, now())' : 'completed_at = NULL',
      );
    }
    await db.query(`UPDATE cards SET ${sets.join(', ')} WHERE id = $1`, values);

    if (input.completed !== undefined && input.completed !== (card.completedAt !== null)) {
      await recordActivity(db, {
        boardId: card.boardId,
        actorId: ctx.userId,
        type: input.completed ? 'card.completed' : 'card.reopened',
        cardId,
        data: { title: input.title ?? card.title },
      });
    }
    await boardChanged(db, ctx, card.boardId, cardId);
    return cardDetail(db, cardId);
  });
}

export function moveCard(
  ctx: Ctx,
  cardId: string,
  input: MoveCardData,
): Promise<{ id: string; listId: string; position: string }> {
  return tx(async (db) => {
    const card = await loadCard(db, ctx.userId, cardId, 'editor');

    // Doubles as validation: the target list must belong to the same board.
    const target = await maybeOne<{ id: string; title: string }>(
      db,
      'SELECT id, title FROM lists WHERE id = $1 AND board_id = $2 FOR UPDATE',
      [input.listId, card.boardId],
    );
    if (!target) throw notFound('List');

    const siblings = await many<Positioned>(
      db,
      'SELECT id, position FROM cards WHERE list_id = $1 AND id <> $2 ORDER BY position, id',
      [target.id, cardId],
    );
    const moved = await one<{ id: string; listId: string; position: string }>(
      db,
      `UPDATE cards SET list_id = $2, position = $3 WHERE id = $1
       RETURNING id, list_id AS "listId", position`,
      [cardId, target.id, computeMovePosition(siblings, input.afterId)],
    );

    // Reordering inside a list is routine; only moves between lists are worth a feed entry.
    if (card.listId !== target.id) {
      const from = await one<{ title: string }>(db, 'SELECT title FROM lists WHERE id = $1', [
        card.listId,
      ]);
      await recordActivity(db, {
        boardId: card.boardId,
        actorId: ctx.userId,
        type: 'card.moved',
        cardId,
        data: { title: card.title, from: from.title, to: target.title },
      });
    }
    await boardChanged(db, ctx, card.boardId, cardId);
    return moved;
  });
}

export function deleteCard(ctx: Ctx, cardId: string): Promise<void> {
  return tx(async (db) => {
    const card = await loadCard(db, ctx.userId, cardId, 'editor');
    await db.query('DELETE FROM cards WHERE id = $1', [cardId]);
    await recordActivity(db, {
      boardId: card.boardId,
      actorId: ctx.userId,
      type: 'card.deleted',
      data: { title: card.title },
    });
    await boardChanged(db, ctx, card.boardId, cardId);
  });
}

// ---- labels and assignees -------------------------------------------------------------------

export function addLabel(ctx: Ctx, cardId: string, labelId: string): Promise<CardDetail> {
  return tx(async (db) => {
    const card = await loadCard(db, ctx.userId, cardId, 'editor');
    const label = await maybeOne(db, 'SELECT 1 FROM labels WHERE id = $1 AND board_id = $2', [
      labelId,
      card.boardId,
    ]);
    if (!label) throw notFound('Label');
    await db.query(
      'INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [cardId, labelId],
    );
    await boardChanged(db, ctx, card.boardId, cardId);
    return cardDetail(db, cardId);
  });
}

export function removeLabel(ctx: Ctx, cardId: string, labelId: string): Promise<CardDetail> {
  return tx(async (db) => {
    const card = await loadCard(db, ctx.userId, cardId, 'editor');
    await db.query('DELETE FROM card_labels WHERE card_id = $1 AND label_id = $2', [
      cardId,
      labelId,
    ]);
    await boardChanged(db, ctx, card.boardId, cardId);
    return cardDetail(db, cardId);
  });
}

export function addAssignee(ctx: Ctx, cardId: string, userId: string): Promise<CardDetail> {
  return tx(async (db) => {
    const card = await loadCard(db, ctx.userId, cardId, 'editor');
    const member = await maybeOne(
      db,
      'SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2',
      [card.boardId, userId],
    );
    if (!member) throw notFound('Member');
    await db.query(
      'INSERT INTO card_assignees (card_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [cardId, userId],
    );
    await boardChanged(db, ctx, card.boardId, cardId);
    return cardDetail(db, cardId);
  });
}

export function removeAssignee(ctx: Ctx, cardId: string, userId: string): Promise<CardDetail> {
  return tx(async (db) => {
    const card = await loadCard(db, ctx.userId, cardId, 'editor');
    await db.query('DELETE FROM card_assignees WHERE card_id = $1 AND user_id = $2', [
      cardId,
      userId,
    ]);
    await boardChanged(db, ctx, card.boardId, cardId);
    return cardDetail(db, cardId);
  });
}

// ---- checklist ------------------------------------------------------------------------------

export function addChecklistItem(
  ctx: Ctx,
  cardId: string,
  input: CreateChecklistItemData,
): Promise<CardDetail> {
  return tx(async (db) => {
    const card = await loadCard(db, ctx.userId, cardId, 'editor');
    await lockCard(db, cardId);
    const siblings = await many<Positioned>(
      db,
      'SELECT id, position FROM checklist_items WHERE card_id = $1 ORDER BY position, id',
      [cardId],
    );
    await db.query('INSERT INTO checklist_items (card_id, text, position) VALUES ($1, $2, $3)', [
      cardId,
      input.text,
      positionAtEnd(siblings),
    ]);
    await boardChanged(db, ctx, card.boardId, cardId);
    return cardDetail(db, cardId);
  });
}

export function updateChecklistItem(
  ctx: Ctx,
  cardId: string,
  itemId: string,
  input: UpdateChecklistItemData,
): Promise<CardDetail> {
  return tx(async (db) => {
    const card = await loadCard(db, ctx.userId, cardId, 'editor');
    const result = await db.query(
      `UPDATE checklist_items SET text = COALESCE($3, text), done = COALESCE($4, done)
        WHERE id = $1 AND card_id = $2`,
      [itemId, cardId, input.text ?? null, input.done ?? null],
    );
    if (result.rowCount === 0) throw notFound('Checklist item');
    await boardChanged(db, ctx, card.boardId, cardId);
    return cardDetail(db, cardId);
  });
}

export function deleteChecklistItem(ctx: Ctx, cardId: string, itemId: string): Promise<CardDetail> {
  return tx(async (db) => {
    const card = await loadCard(db, ctx.userId, cardId, 'editor');
    const result = await db.query('DELETE FROM checklist_items WHERE id = $1 AND card_id = $2', [
      itemId,
      cardId,
    ]);
    if (result.rowCount === 0) throw notFound('Checklist item');
    await boardChanged(db, ctx, card.boardId, cardId);
    return cardDetail(db, cardId);
  });
}

// ---- comments -------------------------------------------------------------------------------

export function addComment(ctx: Ctx, cardId: string, input: CommentData): Promise<CardDetail> {
  return tx(async (db) => {
    const card = await loadCard(db, ctx.userId, cardId, 'editor');
    await db.query('INSERT INTO comments (card_id, author_id, body) VALUES ($1, $2, $3)', [
      cardId,
      ctx.userId,
      input.body,
    ]);
    await recordActivity(db, {
      boardId: card.boardId,
      actorId: ctx.userId,
      type: 'comment.added',
      cardId,
      data: { title: card.title },
    });
    await boardChanged(db, ctx, card.boardId, cardId);
    return cardDetail(db, cardId);
  });
}

export function updateComment(
  ctx: Ctx,
  cardId: string,
  commentId: string,
  input: CommentData,
): Promise<CardDetail> {
  return tx(async (db) => {
    const card = await loadCard(db, ctx.userId, cardId, 'editor');
    const comment = await maybeOne<{ authorId: string | null }>(
      db,
      'SELECT author_id AS "authorId" FROM comments WHERE id = $1 AND card_id = $2',
      [commentId, cardId],
    );
    if (!comment) throw notFound('Comment');
    if (comment.authorId !== ctx.userId) throw forbidden('You can only edit your own comments');

    await db.query('UPDATE comments SET body = $2, edited_at = now() WHERE id = $1', [
      commentId,
      input.body,
    ]);
    await boardChanged(db, ctx, card.boardId, cardId);
    return cardDetail(db, cardId);
  });
}

export function deleteComment(ctx: Ctx, cardId: string, commentId: string): Promise<CardDetail> {
  return tx(async (db) => {
    const card = await loadCard(db, ctx.userId, cardId, 'editor');
    const comment = await maybeOne<{ authorId: string | null }>(
      db,
      'SELECT author_id AS "authorId" FROM comments WHERE id = $1 AND card_id = $2',
      [commentId, cardId],
    );
    if (!comment) throw notFound('Comment');
    if (comment.authorId !== ctx.userId && card.role !== 'owner') {
      throw forbidden('You can only delete your own comments');
    }

    await db.query('DELETE FROM comments WHERE id = $1', [commentId]);
    await boardChanged(db, ctx, card.boardId, cardId);
    return cardDetail(db, cardId);
  });
}
