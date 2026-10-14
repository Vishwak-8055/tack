import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toast } from 'sonner';
import type { BoardDetail, BoardSummary, CardDetail, ListDTO, UpdateBoardData } from '@tack/shared';
import { api, messageOf } from '@/lib/api';
import { boardKey, boardsKey } from '@/features/boards/queries';
import { cardKey } from '@/features/card/queries';
import {
  moveCardInBoard,
  moveListInBoard,
  removeList,
  summaryOf,
  upsertCard,
  upsertList,
} from './board-cache';

/** Small wrapper over the query cache for one board. */
export function useBoardCache(boardId: string) {
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      patch: (change: (board: BoardDetail) => BoardDetail) =>
        queryClient.setQueryData<BoardDetail>(boardKey(boardId), (board) =>
          board ? change(board) : board,
        ),
      snapshot: () => queryClient.getQueryData<BoardDetail>(boardKey(boardId)),
      restore: (board: BoardDetail | undefined) =>
        queryClient.setQueryData(boardKey(boardId), board),
      cancel: () => queryClient.cancelQueries({ queryKey: boardKey(boardId) }),
      refetch: () => queryClient.invalidateQueries({ queryKey: boardKey(boardId) }),
    }),
    [queryClient, boardId],
  );
}

const onFailure = (error: unknown) => toast.error(messageOf(error));

export function useMoveCard(boardId: string) {
  const cache = useBoardCache(boardId);
  return useMutation({
    mutationFn: (vars: { cardId: string; listId: string; afterId: string | null }) =>
      api.post(`/cards/${vars.cardId}/move`, { listId: vars.listId, afterId: vars.afterId }),
    onMutate: async (vars) => {
      await cache.cancel();
      const previous = cache.snapshot();
      cache.patch((board) => moveCardInBoard(board, vars.cardId, vars.listId, vars.afterId));
      return { previous };
    },
    onError: (error, _vars, context) => {
      cache.restore(context?.previous);
      onFailure(error);
      void cache.refetch();
    },
  });
}

export function useMoveList(boardId: string) {
  const cache = useBoardCache(boardId);
  return useMutation({
    mutationFn: (vars: { listId: string; afterId: string | null }) =>
      api.post(`/lists/${vars.listId}/move`, { afterId: vars.afterId }),
    onMutate: async (vars) => {
      await cache.cancel();
      const previous = cache.snapshot();
      cache.patch((board) => moveListInBoard(board, vars.listId, vars.afterId));
      return { previous };
    },
    onError: (error, _vars, context) => {
      cache.restore(context?.previous);
      onFailure(error);
      void cache.refetch();
    },
  });
}

export function useCreateList(boardId: string) {
  const cache = useBoardCache(boardId);
  return useMutation({
    mutationFn: (title: string) => api.post<ListDTO>(`/boards/${boardId}/lists`, { title }),
    onSuccess: (list) => cache.patch((board) => upsertList(board, list)),
    onError: onFailure,
  });
}

export function useRenameList(boardId: string) {
  const cache = useBoardCache(boardId);
  return useMutation({
    mutationFn: (vars: { listId: string; title: string }) =>
      api.patch<ListDTO>(`/lists/${vars.listId}`, { title: vars.title }),
    onMutate: async (vars) => {
      await cache.cancel();
      const previous = cache.snapshot();
      cache.patch((board) => ({
        ...board,
        lists: board.lists.map((list) =>
          list.id === vars.listId ? { ...list, title: vars.title } : list,
        ),
      }));
      return { previous };
    },
    onError: (error, _vars, context) => {
      cache.restore(context?.previous);
      onFailure(error);
    },
  });
}

export function useDeleteList(boardId: string) {
  const cache = useBoardCache(boardId);
  return useMutation({
    mutationFn: (listId: string) => api.delete(`/lists/${listId}`),
    onSuccess: (_data, listId) => cache.patch((board) => removeList(board, listId)),
    onError: onFailure,
  });
}

export function useCreateCard(boardId: string) {
  const queryClient = useQueryClient();
  const cache = useBoardCache(boardId);
  return useMutation({
    mutationFn: (vars: { listId: string; title: string }) =>
      api.post<CardDetail>(`/lists/${vars.listId}/cards`, { title: vars.title }),
    onSuccess: (card) => {
      queryClient.setQueryData(cardKey(card.id), card);
      cache.patch((board) => upsertCard(board, summaryOf(card)));
    },
    onError: onFailure,
  });
}

export function useUpdateBoard(boardId: string) {
  const queryClient = useQueryClient();
  const cache = useBoardCache(boardId);
  return useMutation({
    mutationFn: (input: UpdateBoardData) => api.patch<BoardSummary>(`/boards/${boardId}`, input),
    onMutate: async (input) => {
      await cache.cancel();
      const previous = cache.snapshot();
      cache.patch((board) => ({ ...board, ...input }));
      return { previous };
    },
    onError: (error, _input, context) => {
      cache.restore(context?.previous);
      onFailure(error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardsKey }),
  });
}

export function useDeleteBoard(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/boards/${boardId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardsKey }),
    onError: onFailure,
  });
}
