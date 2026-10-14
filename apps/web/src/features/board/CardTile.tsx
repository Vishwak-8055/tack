import { Draggable } from '@hello-pangea/dnd';
import { AlignLeft, CheckSquare, CircleCheck, MessageSquare } from 'lucide-react';
import { memo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { CardSummary, Label, Member } from '@tack/shared';
import { AvatarStack } from '@/components/ui/Avatar';
import { DueBadge } from '@/components/DueBadge';
import { LabelChip } from '@/components/LabelChip';
import { cn } from '@/lib/cn';

interface CardTileProps {
  card: CardSummary;
  index: number;
  boardId: string;
  labelsById: Map<string, Label>;
  membersById: Map<string, Member>;
  canEdit: boolean;
}

export const CardTile = memo(function CardTile({
  card,
  index,
  boardId,
  labelsById,
  membersById,
  canEdit,
}: CardTileProps) {
  const navigate = useNavigate();
  const { search } = useLocation(); // keep the active filters when a card opens
  const open = () => navigate({ pathname: `/b/${boardId}/c/${card.id}`, search });

  const labels = card.labelIds.flatMap((id) => labelsById.get(id) ?? []);
  const assignees = card.assigneeIds.flatMap((id) => membersById.get(id) ?? []);
  const checklistComplete = card.checklistTotal > 0 && card.checklistDone === card.checklistTotal;
  const hasBadges =
    card.dueAt ||
    card.hasDescription ||
    card.commentCount > 0 ||
    card.checklistTotal > 0 ||
    assignees.length > 0;

  return (
    <Draggable draggableId={card.id} index={index} isDragDisabled={!canEdit}>
      {(drag, snapshot) => (
        <div
          ref={drag.innerRef}
          {...drag.draggableProps}
          {...drag.dragHandleProps}
          onClick={open}
          onKeyDown={(event) => {
            if (event.key === 'Enter') open();
          }}
          className={cn(
            'cursor-pointer rounded-slip bg-surface p-2.5 shadow-slip outline-none transition-shadow',
            'hover:ring-2 hover:ring-focus/40 focus-visible:ring-2 focus-visible:ring-focus',
            snapshot.isDragging && 'rotate-2 cursor-grabbing shadow-lift ring-2 ring-focus/60',
          )}
        >
          {labels.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {labels.map((label) => (
                <LabelChip key={label.id} label={label} compact />
              ))}
            </div>
          )}

          <p className={cn('break-words leading-snug', card.completedAt && 'text-muted')}>
            {card.completedAt && (
              <>
                <CircleCheck className="mr-1.5 inline size-4 -translate-y-px text-ok" aria-hidden />
                <span className="sr-only">Complete: </span>
              </>
            )}
            {card.title}
          </p>

          {hasBadges && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted">
              <DueBadge card={card} />
              {card.hasDescription && (
                <span title="Has a description">
                  <AlignLeft className="size-3.5" aria-hidden />
                  <span className="sr-only">Has a description</span>
                </span>
              )}
              {card.commentCount > 0 && (
                <span className="inline-flex items-center gap-1" title="Comments">
                  <MessageSquare className="size-3.5" aria-hidden />
                  {card.commentCount}
                  <span className="sr-only">comments</span>
                </span>
              )}
              {card.checklistTotal > 0 && (
                <span
                  className={cn('inline-flex items-center gap-1', checklistComplete && 'text-ok')}
                  title="Checklist"
                >
                  <CheckSquare className="size-3.5" aria-hidden />
                  {card.checklistDone}/{card.checklistTotal}
                  <span className="sr-only">checklist items done</span>
                </span>
              )}
              {assignees.length > 0 && (
                <span className="ml-auto">
                  <AvatarStack users={assignees} size={24} />
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
});
