import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { BoardDetail, CardDetail, UpdateCardInput } from '@tack/shared';
import { api, messageOf } from '@/lib/api';
import { removeCard, summaryOf, upsertCard } from '@/features/board/board-cache';
import { boardKey } from '@/features/boards/queries';
import { applyUpdate } from './apply-update';
import { cardKey } from './queries';

/**
 * Every endpoint under /cards/:id answers with the whole updated card. Each response is written
 * to the card's cache entry and to its tile on the board, so nothing needs refetching.
 */
export function useCardActions(boardId: string, cardId: string) {
  const queryClient = useQueryClient();

  const apply = (card: CardDetail) => {
    queryClient.setQueryData(cardKey(card.id), card);
    queryClient.setQueryData<BoardDetail>(boardKey(boardId), (board) =>
      board ? upsertCard(board, summaryOf(card)) : board,
    );
  };
  const fail = (error: unknown) => toast.error(messageOf(error));
  const plain = { onSuccess: apply, onError: fail };

  type Previous = { previous?: CardDetail };
  const optimistic = async (change: (card: CardDetail) => CardDetail): Promise<Previous> => {
    await queryClient.cancelQueries({ queryKey: cardKey(cardId) });
    const previous = queryClient.getQueryData<CardDetail>(cardKey(cardId));
    if (previous) apply(change(previous));
    return { previous };
  };
  const rollback = (context?: Previous) => {
    if (context?.previous) apply(context.previous);
  };

  const update = useMutation({
    mutationFn: (input: UpdateCardInput) => api.patch<CardDetail>(`/cards/${cardId}`, input),
    onMutate: (input) => optimistic((card) => applyUpdate(card, input)),
    onSuccess: apply,
    onError: (error, _input, context) => {
      rollback(context);
      fail(error);
    },
  });

  const toggleLabel = useMutation({
    mutationFn: ({ labelId, on }: { labelId: string; on: boolean }) =>
      on
        ? api.put<CardDetail>(`/cards/${cardId}/labels/${labelId}`)
        : api.delete<CardDetail>(`/cards/${cardId}/labels/${labelId}`),
    ...plain,
  });

  const toggleAssignee = useMutation({
    mutationFn: ({ userId, on }: { userId: string; on: boolean }) =>
      on
        ? api.put<CardDetail>(`/cards/${cardId}/assignees/${userId}`)
        : api.delete<CardDetail>(`/cards/${cardId}/assignees/${userId}`),
    ...plain,
  });

  const addItem = useMutation({
    mutationFn: (text: string) => api.post<CardDetail>(`/cards/${cardId}/checklist`, { text }),
    ...plain,
  });

  const updateItem = useMutation({
    mutationFn: (vars: { itemId: string; text?: string; done?: boolean }) =>
      api.patch<CardDetail>(`/cards/${cardId}/checklist/${vars.itemId}`, {
        ...(vars.text !== undefined && { text: vars.text }),
        ...(vars.done !== undefined && { done: vars.done }),
      }),
    onMutate: (vars) =>
      optimistic((card) => ({
        ...card,
        checklist: card.checklist.map((item) =>
          item.id === vars.itemId
            ? {
                ...item,
                ...(vars.text !== undefined && { text: vars.text }),
                ...(vars.done !== undefined && { done: vars.done }),
              }
            : item,
        ),
      })),
    onSuccess: apply,
    onError: (error, _vars, context) => {
      rollback(context);
      fail(error);
    },
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => api.delete<CardDetail>(`/cards/${cardId}/checklist/${itemId}`),
    ...plain,
  });

  const addComment = useMutation({
    mutationFn: (body: string) => api.post<CardDetail>(`/cards/${cardId}/comments`, { body }),
    ...plain,
  });

  const editComment = useMutation({
    mutationFn: (vars: { commentId: string; body: string }) =>
      api.patch<CardDetail>(`/cards/${cardId}/comments/${vars.commentId}`, { body: vars.body }),
    ...plain,
  });

  const removeComment = useMutation({
    mutationFn: (commentId: string) =>
      api.delete<CardDetail>(`/cards/${cardId}/comments/${commentId}`),
    ...plain,
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/cards/${cardId}`),
    onSuccess: () => {
      queryClient.setQueryData<BoardDetail>(boardKey(boardId), (board) =>
        board ? removeCard(board, cardId) : board,
      );
      queryClient.removeQueries({ queryKey: cardKey(cardId) });
    },
    onError: fail,
  });

  return {
    update,
    toggleLabel,
    toggleAssignee,
    addItem,
    updateItem,
    removeItem,
    addComment,
    editComment,
    removeComment,
    remove,
  };
}

export type CardActions = ReturnType<typeof useCardActions>;
