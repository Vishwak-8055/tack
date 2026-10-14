import {
  byPosition,
  computeMovePosition,
  type BoardDetail,
  type CardDetail,
  type CardSummary,
  type ListDTO,
} from '@tack/shared';

/**
 * Pure helpers for editing a BoardDetail held in the query cache. Dragging uses the same ordering
 * code as the server (computeMovePosition), so the optimistic position is the one the server
 * will compute, and nothing visibly jumps when the response arrives.
 */

export function summaryOf(card: CardDetail): CardSummary {
  return {
    id: card.id,
    boardId: card.boardId,
    listId: card.listId,
    title: card.title,
    position: card.position,
    dueAt: card.dueAt,
    completedAt: card.completedAt,
    hasDescription: card.description !== '',
    labelIds: card.labelIds,
    assigneeIds: card.assigneeIds,
    checklistTotal: card.checklist.length,
    checklistDone: card.checklist.filter((item) => item.done).length,
    commentCount: card.comments.length,
  };
}

export function moveCardInBoard(
  board: BoardDetail,
  cardId: string,
  listId: string,
  afterId: string | null,
): BoardDetail {
  if (!board.cards.some((card) => card.id === cardId)) return board;
  const siblings = board.cards
    .filter((card) => card.listId === listId && card.id !== cardId)
    .sort(byPosition);
  const position = computeMovePosition(siblings, afterId);
  return {
    ...board,
    cards: board.cards.map((card) => (card.id === cardId ? { ...card, listId, position } : card)),
  };
}

export function moveListInBoard(
  board: BoardDetail,
  listId: string,
  afterId: string | null,
): BoardDetail {
  if (!board.lists.some((list) => list.id === listId)) return board;
  const siblings = board.lists.filter((list) => list.id !== listId).sort(byPosition);
  const position = computeMovePosition(siblings, afterId);
  return {
    ...board,
    lists: board.lists
      .map((list) => (list.id === listId ? { ...list, position } : list))
      .sort(byPosition),
  };
}

export function upsertCard(board: BoardDetail, card: CardSummary): BoardDetail {
  const exists = board.cards.some((existing) => existing.id === card.id);
  return {
    ...board,
    cards: exists
      ? board.cards.map((existing) => (existing.id === card.id ? card : existing))
      : [...board.cards, card],
  };
}

export function removeCard(board: BoardDetail, cardId: string): BoardDetail {
  return { ...board, cards: board.cards.filter((card) => card.id !== cardId) };
}

export function upsertList(board: BoardDetail, list: ListDTO): BoardDetail {
  const exists = board.lists.some((existing) => existing.id === list.id);
  const lists = exists
    ? board.lists.map((existing) => (existing.id === list.id ? list : existing))
    : [...board.lists, list];
  return { ...board, lists: lists.sort(byPosition) };
}

export function removeList(board: BoardDetail, listId: string): BoardDetail {
  return {
    ...board,
    lists: board.lists.filter((list) => list.id !== listId),
    cards: board.cards.filter((card) => card.listId !== listId),
  };
}

/** Cards grouped by list, each group already in display order. */
export function cardsByList(
  board: Pick<BoardDetail, 'lists' | 'cards'>,
): Map<string, CardSummary[]> {
  const groups = new Map<string, CardSummary[]>(board.lists.map((list) => [list.id, []]));
  for (const card of [...board.cards].sort(byPosition)) groups.get(card.listId)?.push(card);
  return groups;
}
