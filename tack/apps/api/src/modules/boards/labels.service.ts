import type { CreateLabelData, Label, UpdateLabelData } from '@tack/shared';
import { one, tx } from '../../db/pool';
import { requireBoardRole } from '../../lib/access';
import type { Ctx } from '../../lib/context';
import { notFound } from '../../lib/errors';
import { boardChanged } from '../realtime';

export function createLabel(ctx: Ctx, boardId: string, input: CreateLabelData): Promise<Label> {
  return tx(async (db) => {
    await requireBoardRole(db, ctx.userId, boardId, 'editor');
    const label = await one<Label>(
      db,
      'INSERT INTO labels (board_id, name, color) VALUES ($1, $2, $3) RETURNING id, name, color',
      [boardId, input.name, input.color],
    );
    await boardChanged(db, ctx, boardId);
    return label;
  });
}

export function updateLabel(
  ctx: Ctx,
  boardId: string,
  labelId: string,
  input: UpdateLabelData,
): Promise<Label> {
  return tx(async (db) => {
    await requireBoardRole(db, ctx.userId, boardId, 'editor');
    const label = await db.query<Label>(
      `UPDATE labels SET name = COALESCE($3, name), color = COALESCE($4, color)
        WHERE id = $1 AND board_id = $2 RETURNING id, name, color`,
      [labelId, boardId, input.name ?? null, input.color ?? null],
    );
    if (!label.rows[0]) throw notFound('Label');
    await boardChanged(db, ctx, boardId);
    return label.rows[0];
  });
}

export function deleteLabel(ctx: Ctx, boardId: string, labelId: string): Promise<void> {
  return tx(async (db) => {
    await requireBoardRole(db, ctx.userId, boardId, 'editor');
    const result = await db.query('DELETE FROM labels WHERE id = $1 AND board_id = $2', [
      labelId,
      boardId,
    ]);
    if (result.rowCount === 0) throw notFound('Label');
    await boardChanged(db, ctx, boardId);
  });
}
