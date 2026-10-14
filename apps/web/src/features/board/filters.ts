import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { CardSummary } from '@tack/shared';
import { dueState } from '@/lib/dates';

export const DUE_FILTERS = ['overdue', 'soon', 'none', 'done'] as const;
export type DueFilter = (typeof DUE_FILTERS)[number];

export interface Filters {
  query: string;
  labels: string[];
  members: string[];
  due: DueFilter | null;
}

export const noFilters: Filters = { query: '', labels: [], members: [], due: null };

export const countActive = (filters: Filters) =>
  (filters.query.trim() ? 1 : 0) +
  filters.labels.length +
  filters.members.length +
  (filters.due ? 1 : 0);

/** Within a group (labels, members) a card matches if it has any of them; groups combine with AND. */
export function matchesFilters(
  card: CardSummary,
  filters: Filters,
  now: Date = new Date(),
): boolean {
  const query = filters.query.trim().toLowerCase();
  if (query && !card.title.toLowerCase().includes(query)) return false;
  if (filters.labels.length && !filters.labels.some((id) => card.labelIds.includes(id)))
    return false;
  if (filters.members.length && !filters.members.some((id) => card.assigneeIds.includes(id))) {
    return false;
  }
  if (filters.due) {
    if (filters.due === 'none') return card.dueAt === null;
    if (dueState(card, now) !== filters.due) return false;
  }
  return true;
}

// Filters live in the URL, so a filtered view can be shared or survive a refresh.

export function readFilters(params: URLSearchParams): Filters {
  const due = params.get('due');
  return {
    query: params.get('q') ?? '',
    labels: params.getAll('label'),
    members: params.getAll('member'),
    due: DUE_FILTERS.find((value) => value === due) ?? null,
  };
}

export function writeFilters(params: URLSearchParams, filters: Filters): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of ['q', 'label', 'member', 'due']) next.delete(key);
  if (filters.query.trim()) next.set('q', filters.query);
  filters.labels.forEach((id) => next.append('label', id));
  filters.members.forEach((id) => next.append('member', id));
  if (filters.due) next.set('due', filters.due);
  return next;
}

export function useBoardFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => readFilters(params), [params]);

  const update = useCallback(
    (patch: Partial<Filters>) =>
      setParams((current) => writeFilters(current, { ...readFilters(current), ...patch }), {
        replace: true,
      }),
    [setParams],
  );
  const clear = useCallback(() => update(noFilters), [update]);

  return { filters, update, clear, activeCount: countActive(filters) };
}
