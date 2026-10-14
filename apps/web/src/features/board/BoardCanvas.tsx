import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import { useMemo } from 'react';
import type { BoardDetail } from '@tack/shared';
import { cardsByList } from './board-cache';
import { AddList } from './Composers';
import { matchesFilters, type Filters } from './filters';
import { ListColumn } from './ListColumn';
import { useMoveCard, useMoveList } from './mutations';

export function BoardCanvas({ board, filters }: { board: BoardDetail; filters: Filters }) {
  const canEdit = board.role !== 'viewer';
  const moveCard = useMoveCard(board.id);
  const moveList = useMoveList(board.id);

  const labelsById = useMemo(() => new Map(board.labels.map((l) => [l.id, l])), [board.labels]);
  const membersById = useMemo(() => new Map(board.members.map((m) => [m.id, m])), [board.members]);
  const groups = useMemo(() => cardsByList(board), [board]);
  const visible = useMemo(() => {
    const now = new Date();
    return new Map(
      [...groups].map(([listId, cards]) => [
        listId,
        cards.filter((c) => matchesFilters(c, filters, now)),
      ]),
    );
  }, [groups, filters]);

  const onDragEnd = ({ source, destination, draggableId, type }: DropResult) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index)
      return;

    // Dropping "after the card above" is how the server stores order, and it stays correct even
    // when filters hide some cards: the anchor is always a card you can see.
    if (type === 'LIST') {
      const others = board.lists.filter((list) => list.id !== draggableId);
      const afterId = destination.index === 0 ? null : (others[destination.index - 1]?.id ?? null);
      moveList.mutate({ listId: draggableId, afterId });
      return;
    }

    const others = (visible.get(destination.droppableId) ?? []).filter((c) => c.id !== draggableId);
    const afterId = destination.index === 0 ? null : (others[destination.index - 1]?.id ?? null);
    moveCard.mutate({ cardId: draggableId, listId: destination.droppableId, afterId });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="board" type="LIST" direction="horizontal" isDropDisabled={!canEdit}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="thin-scroll flex min-h-0 flex-1 items-start gap-3 overflow-x-auto px-3 pb-3 pt-3 sm:px-4"
          >
            {board.lists.map((list, index) => (
              <ListColumn
                key={list.id}
                list={list}
                index={index}
                boardId={board.id}
                cards={visible.get(list.id) ?? []}
                totalCards={groups.get(list.id)?.length ?? 0}
                labelsById={labelsById}
                membersById={membersById}
                canEdit={canEdit}
              />
            ))}
            {provided.placeholder}
            {canEdit ? (
              <AddList boardId={board.id} />
            ) : (
              board.lists.length === 0 && (
                <p className="rounded-tray bg-black/25 px-4 py-3 text-white">
                  This board has no lists yet.
                </p>
              )
            )}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
