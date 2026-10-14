import { CircleCheck, Clock } from 'lucide-react';
import type { CardSummary } from '@tack/shared';
import { cn } from '@/lib/cn';
import { dueState, formatDue, type DueState } from '@/lib/dates';

const STATE_STYLE: Record<DueState, string> = {
  done: 'bg-ok px-1.5 text-white',
  overdue: 'bg-danger px-1.5 text-danger-ink',
  soon: 'bg-accent px-1.5 text-accent-ink',
  later: 'px-0 text-muted',
};

const STATE_NOTE: Record<DueState, string> = {
  done: 'complete',
  overdue: 'overdue',
  soon: 'due soon',
  later: '',
};

export function DueBadge({
  card,
  className,
}: {
  card: Pick<CardSummary, 'dueAt' | 'completedAt'>;
  className?: string;
}) {
  const state = dueState(card);
  if (!card.dueAt || !state) return null;
  const Icon = state === 'done' ? CircleCheck : Clock;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded py-0.5 text-[13px] font-medium',
        STATE_STYLE[state],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {formatDue(card.dueAt)}
      {STATE_NOTE[state] && <span className="sr-only">, {STATE_NOTE[state]}</span>}
    </span>
  );
}
