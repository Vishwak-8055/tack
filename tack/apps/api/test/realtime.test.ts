import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { BoardEvent } from '@tack/shared';
import { startRealtime, type Realtime } from '../src/modules/realtime';
import { hub } from '../src/modules/realtime/hub';
import { addTo, app, makeBoard, makeCard, signup } from './helpers';

let server: http.Server;
let realtime: Realtime;
let base: string;
const taps: EventTap[] = [];

/** A minimal EventSource: opens the stream with fetch and collects parsed board events. */
class EventTap {
  readonly events: BoardEvent[] = [];
  private controller = new AbortController();
  status = 0;

  async open(path: string, cookie: string) {
    const res = await fetch(`${base}${path}`, {
      headers: { cookie },
      signal: this.controller.signal,
    });
    this.status = res.status;
    if (res.ok && res.body) void this.pump(res.body.getReader());
    taps.push(this);
    return this;
  }

  private async pump(reader: ReadableStreamDefaultReader<Uint8Array>) {
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        let end: number;
        while ((end = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const data = frame.split('\n').find((line) => line.startsWith('data: '));
          if (data) this.events.push(JSON.parse(data.slice(6)));
        }
      }
    } catch {
      // aborted on teardown
    }
  }

  close() {
    this.controller.abort();
  }
}

beforeAll(async () => {
  realtime = await startRealtime();
  server = http.createServer(app).listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  taps.forEach((tap) => tap.close());
  hub.closeAll();
  await realtime.stop();
  await new Promise((resolve) => server.close(resolve));
});

describe('realtime events', () => {
  it("streams one person's change to another person's open tab", async () => {
    const owner = await signup();
    const board = await makeBoard(owner.agent);
    const mate = await addTo(owner, board.id, 'editor');

    const tap = await new EventTap().open(`/api/boards/${board.id}/events`, owner.cookie);
    expect(tap.status).toBe(200);

    const card = await mate.agent
      .post(`/api/lists/${board.lists[0]!.id}/cards`)
      .set('X-Client-Id', 'tab-of-mate')
      .send({ title: 'Announced' });

    await vi.waitFor(() => {
      expect(tap.events).toContainEqual(
        expect.objectContaining({
          type: 'board.changed',
          boardId: board.id,
          cardId: card.body.id,
          actorId: mate.user.id,
          clientId: 'tab-of-mate',
        }),
      );
    });
  });

  it('keeps boards separate', async () => {
    const { agent, cookie } = await signup();
    const one = await makeBoard(agent, 'One');
    const two = await makeBoard(agent, 'Two');
    const tap = await new EventTap().open(`/api/boards/${one.id}/events`, cookie);

    await makeCard(agent, two.lists[0]!.id, 'Elsewhere');
    const here = await makeCard(agent, one.lists[0]!.id, 'Here');

    await vi.waitFor(() => expect(tap.events.some((e) => e.cardId === here.id)).toBe(true));
    expect(tap.events.every((e) => e.boardId === one.id)).toBe(true);
  });

  it('refuses the stream to people who are not on the board', async () => {
    const owner = await signup();
    const stranger = await signup();
    const board = await makeBoard(owner.agent);

    const tap = await new EventTap().open(`/api/boards/${board.id}/events`, stranger.cookie);
    expect(tap.status).toBe(404);
  });

  it('says when a board is deleted or someone is removed', async () => {
    const owner = await signup();
    const board = await makeBoard(owner.agent);
    const mate = await addTo(owner, board.id, 'editor');
    const tap = await new EventTap().open(`/api/boards/${board.id}/events`, owner.cookie);

    await owner.agent.delete(`/api/boards/${board.id}/members/${mate.user.id}`).expect(204);
    await vi.waitFor(() =>
      expect(tap.events).toContainEqual(
        expect.objectContaining({ type: 'member.removed', userId: mate.user.id }),
      ),
    );

    await owner.agent.delete(`/api/boards/${board.id}`).expect(204);
    await vi.waitFor(() =>
      expect(tap.events).toContainEqual(expect.objectContaining({ type: 'board.deleted' })),
    );
  });

  it('stays silent when a request is rejected', async () => {
    const owner = await signup();
    const board = await makeBoard(owner.agent);
    const viewer = await addTo(owner, board.id, 'viewer');
    const tap = await new EventTap().open(`/api/boards/${board.id}/events`, owner.cookie);
    const before = tap.events.length;

    await viewer.agent
      .post(`/api/lists/${board.lists[0]!.id}/cards`)
      .send({ title: 'x' })
      .expect(403);
    // Prove the stream is alive, then check nothing arrived for the rejected write.
    const real = await makeCard(owner.agent, board.lists[0]!.id, 'Real');
    await vi.waitFor(() => expect(tap.events.some((e) => e.cardId === real.id)).toBe(true));
    expect(tap.events.length - before).toBe(1);
  });
});
