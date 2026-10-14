import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Ellipsis, GripVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { CardSummary, Label, ListDTO, Member } from '@tack/shared';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EditableText } from '@/components/ui/EditableText';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/Menu';
import { cn } from '@/lib/cn';
import { AddCard } from './Composers';
import { CardTile } from './CardTile';
import { useDeleteList, useRenameList } from './mutations';

interface ListColumnProps {
  list: ListDTO;
  index: number;
  boardId: string;
  /** Cards that pass the current filters. */
  cards: CardSummary[];
  totalCards: number;
  labelsById: Map<string, Label>;
  membersById: Map<string, Member>;
  canEdit: boolean;
}

export function ListColumn({
  list,
  index,
  boardId,
  cards,
  totalCards,
  labelsById,
  membersById,
  canEdit,
}: ListColumnProps) {
  const rename = useRenameList(boardId);
  const remove = useDeleteList(boardId);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const filtered = cards.length !== totalCards;

  return (
    <>
      <Draggable draggableId={list.id} index={index} isDragDisabled={!canEdit}>
        {(drag, snapshot) => (
          <section
            ref={drag.innerRef}
            {...drag.draggableProps}
            aria-label={list.title}
            className={cn(
              'flex max-h-full w-72 shrink-0 flex-col rounded-tray bg-tray shadow-slip',
              snapshot.isDragging && 'rotate-1 shadow-lift',
            )}
          >
            <header className="flex items-center gap-0.5 pb-1 pl-1 pr-1.5 pt-2">
              {canEdit ? (
                <span
                  {...drag.dragHandleProps}
                  aria-label={`Move list ${list.title}`}
                  className="grid size-7 shrink-0 cursor-grab place-items-center rounded-md text-muted hover:bg-ink/10 hover:text-ink"
                >
                  <GripVertical className="size-4" />
                </span>
              ) : (
                <span className="w-1.5" />
              )}
              <h2 className="min-w-0 flex-1 font-sans text-[0.9375rem] font-bold tracking-normal">
                <EditableText
                  value={list.title}
                  label="List title"
                  disabled={!canEdit}
                  maxLength={100}
                  onSave={(title) => rename.mutate({ listId: list.id, title })}
                />
              </h2>
              <span className="shrink-0 px-1 text-sm tabular-nums text-muted">
                {filtered ? `${cards.length} of ${totalCards}` : totalCards}
              </span>
              {canEdit && (
                <Menu>
                  <MenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Actions for ${list.title}`}
                      className="size-7 text-muted"
                    >
                      <Ellipsis className="size-4" />
                    </Button>
                  </MenuTrigger>
                  <MenuContent>
                    <MenuItem danger onSelect={() => setConfirmingDelete(true)}>
                      <Trash2 className="size-4" /> Delete list
                    </MenuItem>
                  </MenuContent>
                </Menu>
              )}
            </header>

            <Droppable droppableId={list.id} type="CARD" isDropDisabled={!canEdit}>
              {(drop, dropSnapshot) => (
                <div
                  ref={drop.innerRef}
                  {...drop.droppableProps}
                  className={cn(
                    'thin-scroll flex min-h-10 flex-1 flex-col gap-2 overflow-y-auto px-2 py-1 transition-colors',
                    dropSnapshot.isDraggingOver && 'bg-ink/5',
                  )}
                >
                  {cards.map((card, cardIndex) => (
                    <CardTile
                      key={card.id}
                      card={card}
                      index={cardIndex}
                      boardId={boardId}
                      labelsById={labelsById}
                      membersById={membersById}
                      canEdit={canEdit}
                    />
                  ))}
                  {drop.placeholder}
                </div>
              )}
            </Droppable>

            {canEdit && (
              <footer className="p-2 pt-1">
                <AddCard boardId={boardId} listId={list.id} />
              </footer>
            )}
          </section>
        )}
      </Draggable>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Delete "${list.title}"?`}
        description={
          totalCards > 0
            ? `This also deletes its ${totalCards} ${totalCards === 1 ? 'card' : 'cards'}. It can't be undone.`
            : "This list is empty. It can't be undone."
        }
        confirmLabel="Delete list"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(list.id, { onSettled: () => setConfirmingDelete(false) })}
      />
    </>
  );
}
