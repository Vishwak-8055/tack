import { Activity, ListFilter, Star, Users } from 'lucide-react';
import { useState } from 'react';
import type { BoardDetail } from '@tack/shared';
import { AvatarStack } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EditableText } from '@/components/ui/EditableText';
import { useStarBoard } from '@/features/boards/queries';
import { cn } from '@/lib/cn';
import { BoardMenu } from './BoardMenu';
import { MembersDialog } from './MembersDialog';
import { useUpdateBoard } from './mutations';

const headerButton = 'text-white hover:bg-white/20';

export function BoardHeader({
  board,
  activeFilters,
  filtersOpen,
  onToggleFilters,
  onToggleActivity,
}: {
  board: BoardDetail;
  activeFilters: number;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onToggleActivity: () => void;
}) {
  const update = useUpdateBoard(board.id);
  const star = useStarBoard();
  const [membersOpen, setMembersOpen] = useState(false);
  const canEdit = board.role !== 'viewer';

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 bg-black/25 px-3 py-2 text-white sm:px-4">
      <h1 className="min-w-0 max-w-full font-display text-xl font-bold sm:text-2xl">
        <EditableText
          value={board.title}
          label="Board title"
          disabled={!canEdit}
          maxLength={100}
          onSave={(title) => update.mutate({ title })}
          className="hover:bg-white/15"
        />
      </h1>

      <button
        type="button"
        aria-label={board.starred ? 'Unstar this board' : 'Star this board'}
        aria-pressed={board.starred}
        onClick={() => star.mutate({ boardId: board.id, starred: !board.starred })}
        className="grid size-8 place-items-center rounded-lg hover:bg-white/20"
      >
        <Star className={cn('size-5', board.starred && 'fill-accent text-accent')} />
      </button>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className={headerButton}
          onClick={() => setMembersOpen(true)}
          aria-label={`Members, ${board.members.length} on this board`}
        >
          <AvatarStack users={board.members} max={4} size={28} ringClass="ring-white/80" />
          <Users className="ml-1 size-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={cn(headerButton, filtersOpen && 'bg-white/20')}
          aria-pressed={filtersOpen}
          onClick={onToggleFilters}
        >
          <ListFilter className="size-4" />
          Filters
          {activeFilters > 0 && (
            <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-accent-ink">
              {activeFilters}
            </span>
          )}
        </Button>

        <Button variant="ghost" size="sm" className={headerButton} onClick={onToggleActivity}>
          <Activity className="size-4" />
          Activity
        </Button>

        <BoardMenu board={board} />
      </div>

      <MembersDialog board={board} open={membersOpen} onOpenChange={setMembersOpen} />
    </div>
  );
}
