import type { Response } from 'express';
import type { BoardEvent } from '@tack/shared';

/**
 * Open server-sent-event connections, grouped by board. The hub only knows about this process;
 * events from other instances arrive through Postgres (see ./index.ts) and are dispatched here.
 */
class Hub {
  private rooms = new Map<string, Set<Response>>();

  join(boardId: string, res: Response): () => void {
    let room = this.rooms.get(boardId);
    if (!room) this.rooms.set(boardId, (room = new Set()));
    room.add(res);

    return () => {
      room.delete(res);
      if (room.size === 0) this.rooms.delete(boardId);
    };
  }

  dispatch(event: BoardEvent) {
    const frame = `event: board\ndata: ${JSON.stringify(event)}\n\n`;
    for (const res of this.rooms.get(event.boardId) ?? []) res.write(frame);
  }

  /** Comment frames keep idle connections open through proxies and load balancers. */
  ping() {
    for (const room of this.rooms.values()) for (const res of room) res.write(': ping\n\n');
  }

  closeAll() {
    for (const room of this.rooms.values()) for (const res of room) res.end();
    this.rooms.clear();
  }
}

export const hub = new Hub();
