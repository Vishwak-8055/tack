import type { ActivityDTO, ActivityPage, ActivityType, UserSummary } from '@tack/shared';
import { many, pool, type Queryable } from '../../db/pool';
import { requireBoardRole } from '../../lib/access';
import type { Ctx } from '../../lib/context';

interface NewActivity {
  boardId: string;
  actorId: string;
  type: ActivityType;
  cardId?: string | null;
  data?: Record<string, string | null>;
}

export async function recordActivity(db: Queryable, activity: NewActivity) {
  await db.query(
    `INSERT INTO activities (board_id, card_id, actor_id, type, data) VALUES ($1, $2, $3, $4, $5)`,
    [
      activity.boardId,
      activity.cardId ?? null,
      activity.actorId,
      activity.type,
      JSON.stringify(activity.data ?? {}),
    ],
  );
}

interface ActivityRow extends Omit<ActivityDTO, 'actor'> {
  actorId: string | null;
  actorName: string | null;
}

export async function listActivity(
  ctx: Ctx,
  boardId: string,
  cursor: string | null,
  limit = 30,
): Promise<ActivityPage> {
  await requireBoardRole(pool, ctx.userId, boardId);

  const rows = await many<ActivityRow>(
    pool,
    `SELECT a.id::text AS id, a.type, a.card_id AS "cardId", a.data, a.created_at AS "createdAt",
            u.id AS "actorId", u.name AS "actorName"
       FROM activities a
       LEFT JOIN users u ON u.id = a.actor_id
      WHERE a.board_id = $1 AND ($2::bigint IS NULL OR a.id < $2::bigint)
      ORDER BY a.id DESC
      LIMIT $3`,
    [boardId, cursor, limit + 1],
  );

  const page = rows.slice(0, limit);
  const items = page.map(({ actorId, actorName, ...rest }): ActivityDTO => {
    const actor: UserSummary | null =
      actorId && actorName ? { id: actorId, name: actorName } : null;
    return { ...rest, actor };
  });
  return { items, nextCursor: rows.length > limit ? (page.at(-1)?.id ?? null) : null };
}
