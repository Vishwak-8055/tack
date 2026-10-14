import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { ActivityPage, BoardDetail } from '@tack/shared';
import { api } from '@/lib/api';
import { boardKey } from '@/features/boards/queries';

export const useBoard = (boardId: string) =>
  useQuery({
    queryKey: boardKey(boardId),
    queryFn: () => api.get<BoardDetail>(`/boards/${boardId}`),
  });

export const activityKey = (boardId: string) => ['activity', boardId] as const;

export const useActivity = (boardId: string, enabled: boolean) =>
  useInfiniteQuery({
    queryKey: activityKey(boardId),
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api.get<ActivityPage>(
        `/boards/${boardId}/activity${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    getNextPageParam: (last) => last.nextCursor,
  });
