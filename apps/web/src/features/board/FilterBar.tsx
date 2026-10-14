import { Search } from 'lucide-react';
import type { Ref } from 'react';
import type { BoardDetail } from '@tack/shared';
import { Avatar } from '@/components/ui/Avatar';
import { LabelChip } from '@/components/LabelChip';
import { cn } from '@/lib/cn';
import { DUE_FILTERS, type DueFilter, type Filters } from './filters';

const DUE_LABEL: Record<DueFilter, string> = {
  overdue: 'Overdue',
  soon: 'Due soon',
  none: 'No date',
  done: 'Complete',
};

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

export function FilterBar({
  board,
  filters,
  activeCount,
  onChange,
  onClear,
  searchRef,
}: {
  board: BoardDetail;
  filters: Filters;
  activeCount: number;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
  searchRef: Ref<HTMLInputElement>;
}) {
  return (
    <div
      role="search"
      className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-black/20 px-3 py-2 text-white sm:px-4"
    >
      <label className="relative">
        <span className="sr-only">Search cards</span>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          ref={searchRef}
          type="search"
          value={filters.query}
          placeholder="Search cards"
          onChange={(event) => onChange({ query: event.target.value })}
          className="h-9 w-52 rounded-lg border-0 bg-surface pl-8 pr-3 text-ink placeholder:text-muted"
        />
      </label>

      {board.labels.length > 0 && (
        <Group label="Labels">
          {board.labels.map((label) => {
            const on = filters.labels.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ labels: toggle(filters.labels, label.id) })}
                className={cn(
                  'rounded-full ring-offset-2 ring-offset-transparent',
                  on && 'ring-2 ring-white',
                )}
              >
                <LabelChip label={label} />
              </button>
            );
          })}
        </Group>
      )}

      <Group label="Members">
        {board.members.map((member) => {
          const on = filters.members.includes(member.id);
          return (
            <button
              key={member.id}
              type="button"
              aria-pressed={on}
              aria-label={member.name}
              onClick={() => onChange({ members: toggle(filters.members, member.id) })}
              className={cn(
                'rounded-full',
                on && 'ring-2 ring-white ring-offset-2 ring-offset-transparent',
              )}
            >
              <Avatar user={member} size={28} />
            </button>
          );
        })}
      </Group>

      <Group label="Due">
        {DUE_FILTERS.map((value) => {
          const on = filters.due === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange({ due: on ? null : value })}
              className={cn(
                'rounded-full px-2.5 py-1 text-sm font-medium transition-colors',
                on ? 'bg-white text-[#14202b]' : 'bg-white/20 hover:bg-white/30',
              )}
            >
              {DUE_LABEL[value]}
            </button>
          );
        })}
      </Group>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-semibold underline underline-offset-2"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm text-white/80">{label}</span>
      {children}
    </div>
  );
}
