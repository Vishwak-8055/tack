import type { BoardDetail, CardSummary, ListDTO } from '@tack/shared';

export const list = (id: string, position: string): ListDTO => ({
  id,
  boardId: 'board',
  title: id,
  position,
});

export const card = (
  id: string,
  listId: string,
  position: string,
  extra: Partial<CardSummary> = {},
): CardSummary => ({
  id,
  boardId: 'board',
  listId,
  title: id,
  position,
  dueAt: null,
  completedAt: null,
  hasDescription: false,
  labelIds: [],
  assigneeIds: [],
  checklistTotal: 0,
  checklistDone: 0,
  commentCount: 0,
  ...extra,
});

export const board = (lists: ListDTO[], cards: CardSummary[]): BoardDetail => ({
  id: 'board',
  title: 'Board',
  background: 'moss',
  role: 'owner',
  starred: false,
  members: [],
  labels: [],
  lists,
  cards,
});
