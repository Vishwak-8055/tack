import type { BoardBackground, BoardRole, LabelColor } from './constants';

export interface UserSummary {
  id: string;
  name: string;
}

export interface SessionUser extends UserSummary {
  email: string;
  createdAt: string;
}

export interface Member extends UserSummary {
  email: string;
  role: BoardRole;
}

export interface BoardSummary {
  id: string;
  title: string;
  background: BoardBackground;
  role: BoardRole;
  starred: boolean;
  memberCount: number;
  listCount: number;
  cardCount: number;
  updatedAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: LabelColor;
}

export interface ListDTO {
  id: string;
  boardId: string;
  title: string;
  position: string;
}

/** What the board view needs for each card tile. */
export interface CardSummary {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  position: string;
  dueAt: string | null;
  completedAt: string | null;
  hasDescription: boolean;
  labelIds: string[];
  assigneeIds: string[];
  checklistTotal: number;
  checklistDone: number;
  commentCount: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  position: string;
}

export interface CommentDTO {
  id: string;
  author: UserSummary | null;
  body: string;
  createdAt: string;
  editedAt: string | null;
}

export interface CardDetail extends CardSummary {
  description: string;
  checklist: ChecklistItem[];
  comments: CommentDTO[];
  createdAt: string;
}

export interface BoardDetail {
  id: string;
  title: string;
  background: BoardBackground;
  role: BoardRole;
  starred: boolean;
  members: Member[];
  labels: Label[];
  lists: ListDTO[];
  cards: CardSummary[];
}

export const ACTIVITY_TYPES = [
  'board.created',
  'board.updated',
  'list.created',
  'list.renamed',
  'list.deleted',
  'card.created',
  'card.moved',
  'card.completed',
  'card.reopened',
  'card.deleted',
  'comment.added',
  'member.added',
  'member.removed',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface ActivityDTO {
  id: string;
  type: ActivityType;
  actor: UserSummary | null;
  cardId: string | null;
  data: Record<string, string | null>;
  createdAt: string;
}

export interface ActivityPage {
  items: ActivityDTO[];
  nextCursor: string | null;
}

export type BoardEventType = 'board.changed' | 'board.deleted' | 'member.removed';

/** Pushed to every open tab on a board. Deliberately tiny: clients refetch what they need. */
export interface BoardEvent {
  type: BoardEventType;
  boardId: string;
  actorId: string;
  clientId: string | null;
  cardId?: string;
  userId?: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
