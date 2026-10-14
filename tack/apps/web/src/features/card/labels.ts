import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Label, LabelColor } from '@tack/shared';
import { api, messageOf } from '@/lib/api';
import { useBoardCache } from '@/features/board/mutations';

export function useLabelActions(boardId: string) {
  const queryClient = useQueryClient();
  const cache = useBoardCache(boardId);
  const onError = (error: unknown) => toast.error(messageOf(error));

  const create = useMutation({
    mutationFn: (input: { name: string; color: LabelColor }) =>
      api.post<Label>(`/boards/${boardId}/labels`, input),
    onSuccess: (label) => cache.patch((board) => ({ ...board, labels: [...board.labels, label] })),
    onError,
  });

  const update = useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; color?: LabelColor }) =>
      api.patch<Label>(`/boards/${boardId}/labels/${id}`, input),
    onSuccess: (label) =>
      cache.patch((board) => ({
        ...board,
        labels: board.labels.map((existing) => (existing.id === label.id ? label : existing)),
      })),
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/boards/${boardId}/labels/${id}`),
    onSuccess: (_data, id) => {
      cache.patch((board) => ({
        ...board,
        labels: board.labels.filter((label) => label.id !== id),
        cards: board.cards.map((card) => ({
          ...card,
          labelIds: card.labelIds.filter((labelId) => labelId !== id),
        })),
      }));
      // Any card detail we already hold still lists the deleted label.
      void queryClient.invalidateQueries({ queryKey: ['card'] });
    },
    onError,
  });

  return { create, update, remove };
}
