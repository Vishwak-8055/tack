import { describe, expect, it } from 'vitest';
import type { ActivityPage, BoardDetail, CardDetail } from '@tack/shared';
import { addTo, makeBoard, makeCard, signup, titlesIn } from './helpers';

describe('cards', () => {
  it('appends new cards to the end of a list', async () => {
    const { agent } = await signup();
    const board = await makeBoard(agent);
    const listId = board.lists[0]!.id;

    for (const title of ['A', 'B', 'C']) await makeCard(agent, listId, title);
    expect(await titlesIn(agent, board.id, listId)).toEqual(['A', 'B', 'C']);
  });

  it('keeps positions unique when many cards are added at once', async () => {
    const { agent } = await signup();
    const board = await makeBoard(agent);
    const listId = board.lists[0]!.id;

    await Promise.all(Array.from({ length: 10 }, (_, i) => makeCard(agent, listId, `Card ${i}`)));

    const after: BoardDetail = (await agent.get(`/api/boards/${board.id}`)).body;
    const positions = after.cards.map((c) => c.position);
    expect(positions).toHaveLength(10);
    expect(new Set(positions).size).toBe(10);
  });

  it('moves cards within and between lists', async () => {
    const { agent } = await signup();
    const board = await makeBoard(agent);
    const [todo, doing] = board.lists.map((l) => l.id) as [string, string];
    const [a, b, c] = [
      await makeCard(agent, todo, 'A'),
      await makeCard(agent, todo, 'B'),
      await makeCard(agent, todo, 'C'),
    ];
    const move = (id: string, listId: string, afterId: string | null) =>
      agent.post(`/api/cards/${id}/move`).send({ listId, afterId }).expect(200);

    await move(c.id, todo, null); // C to the top
    expect(await titlesIn(agent, board.id, todo)).toEqual(['C', 'A', 'B']);

    await move(a.id, doing, null); // A into another list
    expect(await titlesIn(agent, board.id, todo)).toEqual(['C', 'B']);
    expect(await titlesIn(agent, board.id, doing)).toEqual(['A']);

    await move(b.id, doing, a.id); // B after A
    await move(c.id, doing, a.id); // C between A and B
    expect(await titlesIn(agent, board.id, doing)).toEqual(['A', 'C', 'B']);
    expect(await titlesIn(agent, board.id, todo)).toEqual([]);
  });

  it('puts a card at the end when its anchor no longer exists', async () => {
    const { agent } = await signup();
    const board = await makeBoard(agent);
    const listId = board.lists[0]!.id;
    const a = await makeCard(agent, listId, 'A');
    await makeCard(agent, listId, 'B');

    await agent
      .post(`/api/cards/${a.id}/move`)
      .send({ listId, afterId: '00000000-0000-4000-8000-000000000000' })
      .expect(200);
    expect(await titlesIn(agent, board.id, listId)).toEqual(['B', 'A']);
  });

  it("won't move a card into another board's list", async () => {
    const { agent } = await signup();
    const one = await makeBoard(agent, 'One');
    const two = await makeBoard(agent, 'Two');
    const card = await makeCard(agent, one.lists[0]!.id, 'Stays put');

    const res = await agent
      .post(`/api/cards/${card.id}/move`)
      .send({ listId: two.lists[0]!.id, afterId: null });
    expect(res.status).toBe(404);
  });

  it('only logs moves between lists in the activity feed', async () => {
    const { agent } = await signup();
    const board = await makeBoard(agent);
    const [todo, doing] = board.lists.map((l) => l.id) as [string, string];
    const a = await makeCard(agent, todo, 'A');
    const b = await makeCard(agent, todo, 'B');

    await agent.post(`/api/cards/${b.id}/move`).send({ listId: todo, afterId: null }).expect(200);
    await agent.post(`/api/cards/${a.id}/move`).send({ listId: doing, afterId: null }).expect(200);

    const feed: ActivityPage = (await agent.get(`/api/boards/${board.id}/activity`)).body;
    const moves = feed.items.filter((i) => i.type === 'card.moved');
    expect(moves).toHaveLength(1);
    expect(moves[0]!.data).toMatchObject({ title: 'A', from: 'To do', to: 'Doing' });
  });

  describe('details', () => {
    it('updates title, description and due date', async () => {
      const { agent } = await signup();
      const board = await makeBoard(agent);
      const card = await makeCard(agent, board.lists[0]!.id, 'Draft');

      const res = await agent.patch(`/api/cards/${card.id}`).send({
        title: 'Final',
        description: '## Notes\n\n- one',
        dueAt: '2030-01-02T03:04:05.000Z',
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        title: 'Final',
        description: '## Notes\n\n- one',
        dueAt: '2030-01-02T03:04:05.000Z',
        hasDescription: true,
      });

      const cleared = await agent.patch(`/api/cards/${card.id}`).send({ dueAt: null });
      expect(cleared.body.dueAt).toBeNull();
    });

    it('rejects empty and malformed updates', async () => {
      const { agent } = await signup();
      const board = await makeBoard(agent);
      const card = await makeCard(agent, board.lists[0]!.id, 'Draft');

      await agent.patch(`/api/cards/${card.id}`).send({}).expect(400);
      await agent.patch(`/api/cards/${card.id}`).send({ dueAt: 'next tuesday' }).expect(400);
      await agent.patch(`/api/cards/${card.id}`).send({ title: '  ' }).expect(400);
    });

    it('completes and reopens, logging each change once', async () => {
      const { agent } = await signup();
      const board = await makeBoard(agent);
      const card = await makeCard(agent, board.lists[0]!.id, 'Ship it');

      const done = await agent.patch(`/api/cards/${card.id}`).send({ completed: true });
      expect(done.body.completedAt).not.toBeNull();
      await agent.patch(`/api/cards/${card.id}`).send({ completed: true }); // no change
      const reopened = await agent.patch(`/api/cards/${card.id}`).send({ completed: false });
      expect(reopened.body.completedAt).toBeNull();

      const feed: ActivityPage = (await agent.get(`/api/boards/${board.id}/activity`)).body;
      const types = feed.items
        .map((i) => i.type)
        .filter((t) => t.startsWith('card.') && t !== 'card.created');
      expect(types).toEqual(['card.reopened', 'card.completed']);
    });

    it('deletes a card and everything attached to it', async () => {
      const { agent } = await signup();
      const board = await makeBoard(agent);
      const card = await makeCard(agent, board.lists[0]!.id, 'Short lived');
      await agent.post(`/api/cards/${card.id}/comments`).send({ body: 'hi' }).expect(201);

      await agent.delete(`/api/cards/${card.id}`).expect(204);
      await agent.get(`/api/cards/${card.id}`).expect(404);
      const after: BoardDetail = (await agent.get(`/api/boards/${board.id}`)).body;
      expect(after.cards).toEqual([]);
    });
  });

  describe('labels and assignees', () => {
    it('adds and removes labels', async () => {
      const { agent } = await signup();
      const board = await makeBoard(agent);
      const card = await makeCard(agent, board.lists[0]!.id, 'Tagged');
      const [red, blue] = [board.labels[3]!, board.labels[5]!];

      await agent.put(`/api/cards/${card.id}/labels/${red.id}`).expect(200);
      const twice = await agent.put(`/api/cards/${card.id}/labels/${blue.id}`);
      expect(twice.body.labelIds.sort()).toEqual([red.id, blue.id].sort());

      const removed = await agent.delete(`/api/cards/${card.id}/labels/${red.id}`);
      expect(removed.body.labelIds).toEqual([blue.id]);
    });

    it('refuses a label from another board', async () => {
      const { agent } = await signup();
      const one = await makeBoard(agent, 'One');
      const two = await makeBoard(agent, 'Two');
      const card = await makeCard(agent, one.lists[0]!.id, 'Card');

      await agent.put(`/api/cards/${card.id}/labels/${two.labels[0]!.id}`).expect(404);
    });

    it('assigns board members only', async () => {
      const owner = await signup();
      const board = await makeBoard(owner.agent);
      const card = await makeCard(owner.agent, board.lists[0]!.id, 'Task');
      const member = await addTo(owner, board.id, 'editor');
      const outsider = await signup();

      const ok = await owner.agent.put(`/api/cards/${card.id}/assignees/${member.user.id}`);
      expect(ok.body.assigneeIds).toEqual([member.user.id]);
      await owner.agent.put(`/api/cards/${card.id}/assignees/${outsider.user.id}`).expect(404);

      const removed = await owner.agent.delete(`/api/cards/${card.id}/assignees/${member.user.id}`);
      expect(removed.body.assigneeIds).toEqual([]);
    });
  });

  describe('checklist', () => {
    it('adds, ticks, edits and removes items, and keeps the counts on the board', async () => {
      const { agent } = await signup();
      const board = await makeBoard(agent);
      const card = await makeCard(agent, board.lists[0]!.id, 'With steps');

      await agent.post(`/api/cards/${card.id}/checklist`).send({ text: 'First' }).expect(201);
      const two = await agent.post(`/api/cards/${card.id}/checklist`).send({ text: 'Second' });
      const [first, second] = (two.body as CardDetail).checklist;
      expect(two.body.checklist.map((i: { text: string }) => i.text)).toEqual(['First', 'Second']);

      await agent
        .patch(`/api/cards/${card.id}/checklist/${first!.id}`)
        .send({ done: true })
        .expect(200);
      await agent
        .patch(`/api/cards/${card.id}/checklist/${second!.id}`)
        .send({ text: 'Second, reworded' })
        .expect(200);

      const summary = ((await agent.get(`/api/boards/${board.id}`)).body as BoardDetail).cards[0]!;
      expect(summary).toMatchObject({ checklistTotal: 2, checklistDone: 1 });

      const removed = await agent.delete(`/api/cards/${card.id}/checklist/${first!.id}`);
      expect(removed.body.checklist).toHaveLength(1);
    });
  });

  describe('comments', () => {
    it('lets people comment, edit their own, and nobody edit anyone else’s', async () => {
      const owner = await signup('Olive');
      const board = await makeBoard(owner.agent);
      const card = await makeCard(owner.agent, board.lists[0]!.id, 'Discuss');
      const mate = await addTo(owner, board.id, 'editor', 'Mo');

      const posted = await mate.agent
        .post(`/api/cards/${card.id}/comments`)
        .send({ body: 'First!' });
      expect(posted.status).toBe(201);
      const comment = (posted.body as CardDetail).comments[0]!;
      expect(comment.author?.name).toBe('Mo');

      await owner.agent
        .patch(`/api/cards/${card.id}/comments/${comment.id}`)
        .send({ body: 'Hijacked' })
        .expect(403);

      const edited = await mate.agent
        .patch(`/api/cards/${card.id}/comments/${comment.id}`)
        .send({ body: 'First, edited' });
      expect(edited.body.comments[0]).toMatchObject({ body: 'First, edited' });
      expect(edited.body.comments[0].editedAt).not.toBeNull();
    });

    it('lets the board owner delete anyone’s comment, but members only their own', async () => {
      const owner = await signup();
      const board = await makeBoard(owner.agent);
      const card = await makeCard(owner.agent, board.lists[0]!.id, 'Moderate');
      const a = await addTo(owner, board.id, 'editor', 'Ann');
      const b = await addTo(owner, board.id, 'editor', 'Bob');

      const posted = await a.agent.post(`/api/cards/${card.id}/comments`).send({ body: 'Mine' });
      const id = (posted.body as CardDetail).comments[0]!.id;

      await b.agent.delete(`/api/cards/${card.id}/comments/${id}`).expect(403);
      const removed = await owner.agent.delete(`/api/cards/${card.id}/comments/${id}`);
      expect(removed.body.comments).toEqual([]);
    });

    it('counts comments on the board view', async () => {
      const { agent } = await signup();
      const board = await makeBoard(agent);
      const card = await makeCard(agent, board.lists[0]!.id, 'Chatty');
      await agent.post(`/api/cards/${card.id}/comments`).send({ body: 'one' }).expect(201);
      await agent.post(`/api/cards/${card.id}/comments`).send({ body: 'two' }).expect(201);

      const after: BoardDetail = (await agent.get(`/api/boards/${board.id}`)).body;
      expect(after.cards[0]!.commentCount).toBe(2);
    });
  });
});
