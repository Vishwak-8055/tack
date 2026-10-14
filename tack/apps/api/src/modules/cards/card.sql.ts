/**
 * The columns behind a CardSummary, shared by the board query and the single-card query so both
 * always return the same shape. Use as `SELECT ${CARD_COLUMNS} FROM cards c ...`.
 */
export const CARD_COLUMNS = `
  c.id, c.board_id AS "boardId", c.list_id AS "listId", c.title, c.position,
  c.due_at AS "dueAt", c.completed_at AS "completedAt",
  c.description <> '' AS "hasDescription",
  COALESCE((SELECT array_agg(cl.label_id ORDER BY cl.label_id)
              FROM card_labels cl WHERE cl.card_id = c.id), '{}') AS "labelIds",
  COALESCE((SELECT array_agg(ca.user_id ORDER BY ca.user_id)
              FROM card_assignees ca WHERE ca.card_id = c.id), '{}') AS "assigneeIds",
  (SELECT count(*) FROM checklist_items i WHERE i.card_id = c.id)::int AS "checklistTotal",
  (SELECT count(*) FROM checklist_items i WHERE i.card_id = c.id AND i.done)::int AS "checklistDone",
  (SELECT count(*) FROM comments m WHERE m.card_id = c.id)::int AS "commentCount"`;
