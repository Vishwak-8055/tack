import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BoardDetail, BoardSummary, CreateBoardInput } from '@tack/shared';
import { api } from '@/lib/api';

export const boardsKey = ['boards'] as const;
export const boardKey = (boardId: string) => ['board', boardId] as const;

export const useBoards = () =>
  useQuery({ queryKey: boardsKey, queryFn: () => api.get<BoardSummary[]>('/boards') });

export function useCreateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBoardInput) => api.post<BoardSummary>('/boards', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardsKey }),
  });
}

/** Stars update instantly on both the dashboard and an open board, and roll back on failure. */
export function useStarBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, starred }: { boardId: string; starred: boolean }) =>
      api.put(`/boards/${boardId}/star`, { starred }),
    onMutate: async ({ boardId, starred }) => {
      const previousList = queryClient.getQueryData<BoardSummary[]>(boardsKey);
      const previousBoard = queryClient.getQueryData<BoardDetail>(boardKey(boardId));
      queryClient.setQueryData<BoardSummary[]>(boardsKey, (boards) =>
        boards?.map((board) => (board.id === boardId ? { ...board, starred } : board)),
      );
      queryClient.setQueryData<BoardDetail>(boardKey(boardId), (board) =>
        board ? { ...board, starred } : board,
      );
      return { boardId, previousList, previousBoard };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(boardsKey, context.previousList);
      queryClient.setQueryData(boardKey(context.boardId), context.previousBoard);
    },
  });
}
