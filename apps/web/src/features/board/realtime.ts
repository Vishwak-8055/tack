import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import type { BoardEvent } from '@tack/shared';
import { useSession } from '@/features/auth/session';
import { boardKey, boardsKey } from '@/features/boards/queries';
import { cardKey } from '@/features/card/queries';
import { clientId } from '@/lib/api';
import { activityKey } from './queries';

/**
 * Keeps an open board in step with what other people do. The server pushes a tiny "something
 * changed" event over Server-Sent Events and we refetch. Changes made in this very tab are
 * ignored: they were already applied locally.
 */
export function useBoardEvents(boardId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useSession();
  const myId = me?.id;

  useEffect(() => {
    if (!boardId) return;
    const source = new EventSource(`/api/boards/${boardId}/events`);
    let hasConnected = false;

    const refresh = (cardId?: string) => {
      void queryClient.invalidateQueries({ queryKey: boardKey(boardId) });
      void queryClient.invalidateQueries({ queryKey: activityKey(boardId) });
      if (cardId) void queryClient.invalidateQueries({ queryKey: cardKey(cardId) });
    };

    const leave = (message: string) => {
      toast.info(message);
      void queryClient.invalidateQueries({ queryKey: boardsKey });
      navigate('/', { replace: true });
    };

    // EventSource reconnects by itself; after a gap we may have missed events, so catch up.
    source.onopen = () => {
      if (hasConnected) refresh();
      hasConnected = true;
    };

    source.addEventListener('board', (message) => {
      const event: BoardEvent = JSON.parse((message as MessageEvent<string>).data);
      const mine = event.clientId === clientId;

      if (event.type === 'board.deleted') {
        if (!mine) leave('This board was deleted');
        return;
      }
      if (event.type === 'member.removed' && event.userId === myId) {
        if (!mine) leave('You were removed from this board');
        return;
      }
      if (!mine) refresh(event.cardId);
    });

    return () => source.close();
  }, [boardId, myId, navigate, queryClient]);
}
