import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { BoardRole, Member } from '@tack/shared';
import { api, messageOf } from '@/lib/api';
import { boardsKey } from '@/features/boards/queries';
import { useBoardCache } from './mutations';

export function useAddMember(boardId: string) {
  const queryClient = useQueryClient();
  const cache = useBoardCache(boardId);
  return useMutation({
    mutationFn: (input: { email: string; role: 'editor' | 'viewer' }) =>
      api.post<Member>(`/boards/${boardId}/members`, input),
    onSuccess: (member) => {
      cache.patch((board) => ({ ...board, members: [...board.members, member] }));
      void queryClient.invalidateQueries({ queryKey: boardsKey });
    },
  });
}

export function useSetMemberRole(boardId: string) {
  const cache = useBoardCache(boardId);
  return useMutation({
    mutationFn: (vars: { userId: string; role: Exclude<BoardRole, 'owner'> }) =>
      api.patch(`/boards/${boardId}/members/${vars.userId}`, { role: vars.role }),
    onMutate: async (vars) => {
      await cache.cancel();
      const previous = cache.snapshot();
      cache.patch((board) => ({
        ...board,
        members: board.members.map((member) =>
          member.id === vars.userId ? { ...member, role: vars.role } : member,
        ),
      }));
      return { previous };
    },
    onError: (error, _vars, context) => {
      cache.restore(context?.previous);
      toast.error(messageOf(error));
    },
  });
}

export function useRemoveMember(boardId: string) {
  const queryClient = useQueryClient();
  const cache = useBoardCache(boardId);
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/boards/${boardId}/members/${userId}`),
    onSuccess: (_data, userId) => {
      cache.patch((board) => ({
        ...board,
        members: board.members.filter((member) => member.id !== userId),
        cards: board.cards.map((card) => ({
          ...card,
          assigneeIds: card.assigneeIds.filter((id) => id !== userId),
        })),
      }));
      void queryClient.invalidateQueries({ queryKey: boardsKey });
    },
    onError: (error) => toast.error(messageOf(error)),
  });
}
