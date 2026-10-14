import { addDays, format, formatDistanceToNowStrict, isSameDay, isSameYear } from 'date-fns';

export type DueState = 'done' | 'overdue' | 'soon' | 'later';

const DAY = 24 * 60 * 60 * 1000;

export function dueState(
  card: { dueAt: string | null; completedAt: string | null },
  now: Date = new Date(),
): DueState | null {
  if (!card.dueAt) return null;
  if (card.completedAt) return 'done';
  const remaining = new Date(card.dueAt).getTime() - now.getTime();
  if (remaining < 0) return 'overdue';
  return remaining < DAY ? 'soon' : 'later';
}

export function formatDue(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const time = format(date, 'p');
  if (isSameDay(date, now)) return `Today, ${time}`;
  if (isSameDay(date, addDays(now, 1))) return `Tomorrow, ${time}`;
  if (isSameDay(date, addDays(now, -1))) return `Yesterday, ${time}`;
  return format(date, isSameYear(date, now) ? 'MMM d' : 'MMM d, yyyy');
}

export const timeAgo = (iso: string) =>
  formatDistanceToNowStrict(new Date(iso), { addSuffix: true });

/** <input type="datetime-local"> wants local time without a zone, in this exact shape. */
export const toInputValue = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
export const fromInputValue = (value: string) => new Date(value).toISOString();
