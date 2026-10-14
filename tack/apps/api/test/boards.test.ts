import { describe, expect, it } from 'vitest';
import type { ActivityPage, BoardDetail, BoardSummary } from '@tack/shared';
import { addTo, makeBoard, makeCard, signup } from './helpers';

describe('boards', () => {
  it('creates a kanban board with starter lists and labels', async () => {
    const { agent } = await signup();
    const board = await makeBoard(agent, 'Roadmap');

    expect(board).toMatchObject({ title: 'Roadmap', role: 'owner', starred: false });
    expect(board.lists.map((l) => l.title)).toEqual(['To do', 'Doing', 'Done']);
    expect(board.labels.map((l) => l.color)).toEqual([
      'green',
      'yellow',
      'orange',
      'red',
      'purple',
      'blue',
    ]);
    expect(board.members).toHaveLength(1);
  });

  it('can start blank', async () => {
    const { agent } = await signup();
    const board = await makeBoard(agent, 'Empty', 'blank');
    expect(board.lists).toEqual([]);
  });

  it('rejects an empty title', async () => {
    const { agent } = await signup();
    const res = await agent.post('/api/boards').send({ title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.title).toBeDefined();
  });

  it('only lists boards you belong to, with counts', async () => {
    const mine = await signup();
    const theirs = await signup();
    const board = await makeBoard(mine.agent, 'Mine');
    await makeBoard(theirs.agent, 'Theirs');
    await makeCard(mine.agent, board.lists[0]!.id, 'One');
    await makeCard(mine.agent, board.lists[0]!.id, 'Two');

    const res = await mine.agent.get('/api/boards');
    const boards: BoardSummary[] = res.body;
    expect(boards).toHaveLength(1);
    expect(boards[0]).toMatchObject({ title: 'Mine', listCount: 3, cardCount: 2, memberCount: 1 });
  });

  it('hides boards from people who are not members', async () => {
    const owner = await signup();
    const stranger = await signup();
    const board = await makeBoard(owner.agent);

    await stranger.agent.get(`/api/boards/${board.id}`).expect(404);
    await stranger.agent.patch(`/api/boards/${board.id}`).send({ title: 'Mine now' }).expect(404);
    await stranger.agent.delete(`/api/boards/${board.id}`).expect(404);
  });

  it('answers a malformed id with 404', async () => {
    const { agent } = await signup();
    await agent.get('/api/boards/not-a-uuid').expect(404);
  });

  it('requires sign-in', async () => {
    const { agent } = await signup();
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/boards').expect(401);
  });

  it('keeps stars per person', async () => {
    const owner = await signup();
    const board = await makeBoard(owner.agent);
    const mate = await addTo(owner, board.id, 'editor');

    await owner.agent.put(`/api/boards/${board.id}/star`).send({ starred: true }).expect(204);

    const mine: BoardSummary[] = (await owner.agent.get('/api/boards')).body;
    const theirs: BoardSummary[] = (await mate.agent.get('/api/boards')).body;
    expect(mine[0]!.starred).toBe(true);
    expect(theirs[0]!.starred).toBe(false);
  });

  it('lets editors rename a board but not viewers', async () => {
    const owner = await signup();
    const board = await makeBoard(owner.agent);
    const editor = await addTo(owner, board.id, 'editor', 'Eddie');
    const viewer = await addTo(owner, board.id, 'viewer', 'Vera');

    const renamed = await editor.agent
      .patch(`/api/boards/${board.id}`)
      .send({ title: 'Renamed', background: 'plum' });
    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({ title: 'Renamed', background: 'plum' });

    const denied = await viewer.agent.patch(`/api/boards/${board.id}`).send({ title: 'Nope' });
    expect(denied.status).toBe(403);
  });

  it('keeps viewers read-only everywhere', async () => {
    const owner = await signup();
    const board = await makeBoard(owner.agent);
    const card = await makeCard(owner.agent, board.lists[0]!.id, 'Look but do not touch');
    const viewer = await addTo(owner, board.id, 'viewer');

    await viewer.agent.get(`/api/boards/${board.id}`).expect(200);
    await viewer.agent.get(`/api/cards/${card.id}`).expect(200);
    await viewer.agent.post(`/api/boards/${board.id}/lists`).send({ title: 'x' }).expect(403);
    await viewer.agent
      .post(`/api/lists/${board.lists[0]!.id}/cards`)
      .send({ title: 'x' })
      .expect(403);
    await viewer.agent.patch(`/api/cards/${card.id}`).send({ title: 'x' }).expect(403);
    await viewer.agent.post(`/api/cards/${card.id}/comments`).send({ body: 'x' }).expect(403);
  });

  it('only lets the owner delete a board', async () => {
    const owner = await signup();
    const board = await makeBoard(owner.agent);
    const editor = await addTo(owner, board.id, 'editor');

    await editor.agent.delete(`/api/boards/${board.id}`).expect(403);
    await owner.agent.delete(`/api/boards/${board.id}`).expect(204);
    await owner.agent.get(`/api/boards/${board.id}`).expect(404);
  });

  describe('members', () => {
    it('adds people by email and rejects unknown or repeated emails', async () => {
      const owner = await signup();
      const board = await makeBoard(owner.agent);
      const mate = await signup('Mate');

      const added = await owner.agent
        .post(`/api/boards/${board.id}/members`)
        .send({ email: mate.user.email, role: 'viewer' });
      expect(added.status).toBe(201);
      expect(added.body).toMatchObject({ id: mate.user.id, role: 'viewer' });

      const again = await owner.agent
        .post(`/api/boards/${board.id}/members`)
        .send({ email: mate.user.email });
      expect(again.status).toBe(409);

      const unknown = await owner.agent
        .post(`/api/boards/${board.id}/members`)
        .send({ email: 'nobody@example.com' });
      expect(unknown.status).toBe(404);
      expect(unknown.body.error.code).toBe('user_not_found');
    });

    it('only lets the owner manage members', async () => {
      const owner = await signup();
      const board = await makeBoard(owner.agent);
      const editor = await addTo(owner, board.id, 'editor');
      const other = await signup();

      await editor.agent
        .post(`/api/boards/${board.id}/members`)
        .send({ email: other.user.email })
        .expect(403);
    });

    it('changes roles, and the new role applies immediately', async () => {
      const owner = await signup();
      const board = await makeBoard(owner.agent);
      const mate = await addTo(owner, board.id, 'editor');
      const listId = board.lists[0]!.id;

      await mate.agent.post(`/api/lists/${listId}/cards`).send({ title: 'Allowed' }).expect(201);
      await owner.agent
        .patch(`/api/boards/${board.id}/members/${mate.user.id}`)
        .send({ role: 'viewer' })
        .expect(204);
      await mate.agent.post(`/api/lists/${listId}/cards`).send({ title: 'Blocked' }).expect(403);
    });

    it("can't demote the owner", async () => {
      const owner = await signup();
      const board = await makeBoard(owner.agent);
      const res = await owner.agent
        .patch(`/api/boards/${board.id}/members/${owner.user.id}`)
        .send({ role: 'viewer' });
      expect(res.status).toBe(400);
    });

    it('lets members leave, but not the owner', async () => {
      const owner = await signup();
      const board = await makeBoard(owner.agent);
      const mate = await addTo(owner, board.id, 'editor');

      await mate.agent.delete(`/api/boards/${board.id}/members/${mate.user.id}`).expect(204);
      await mate.agent.get(`/api/boards/${board.id}`).expect(404);

      const stuck = await owner.agent.delete(`/api/boards/${board.id}/members/${owner.user.id}`);
      expect(stuck.status).toBe(400);
      expect(stuck.body.error.code).toBe('owner_cannot_leave');
    });

    it('drops a removed member from their card assignments', async () => {
      const owner = await signup();
      const board = await makeBoard(owner.agent);
      const mate = await addTo(owner, board.id, 'editor');
      const card = await makeCard(owner.agent, board.lists[0]!.id, 'Shared work');
      await owner.agent.put(`/api/cards/${card.id}/assignees/${mate.user.id}`).expect(200);

      await owner.agent.delete(`/api/boards/${board.id}/members/${mate.user.id}`).expect(204);
      const after: BoardDetail = (await owner.agent.get(`/api/boards/${board.id}`)).body;
      expect(after.cards[0]!.assigneeIds).toEqual([]);
    });
  });

  describe('labels', () => {
    it('creates, renames and deletes labels', async () => {
      const { agent } = await signup();
      const board = await makeBoard(agent);

      const created = await agent
        .post(`/api/boards/${board.id}/labels`)
        .send({ name: 'Urgent', color: 'pink' });
      expect(created.status).toBe(201);

      const renamed = await agent
        .patch(`/api/boards/${board.id}/labels/${created.body.id}`)
        .send({ name: 'Very urgent' });
      expect(renamed.body).toMatchObject({ name: 'Very urgent', color: 'pink' });

      await agent.delete(`/api/boards/${board.id}/labels/${created.body.id}`).expect(204);
      const after: BoardDetail = (await agent.get(`/api/boards/${board.id}`)).body;
      expect(after.labels.find((l) => l.id === created.body.id)).toBeUndefined();
    });
  });

  describe('lists', () => {
    it('adds, renames, reorders and deletes lists', async () => {
      const { agent } = await signup();
      const board = await makeBoard(agent);
      const [todo, doing, done] = board.lists;

      const added = await agent.post(`/api/boards/${board.id}/lists`).send({ title: 'Later' });
      expect(added.status).toBe(201);

      await agent.patch(`/api/lists/${doing!.id}`).send({ title: 'In progress' }).expect(200);
      // Move "Done" to the front
      await agent.post(`/api/lists/${done!.id}/move`).send({ afterId: null }).expect(200);

      const titles = async () =>
        ((await agent.get(`/api/boards/${board.id}`)).body as BoardDetail).lists.map(
          (l) => l.title,
        );
      expect(await titles()).toEqual(['Done', 'To do', 'In progress', 'Later']);

      await agent.delete(`/api/lists/${todo!.id}`).expect(204);
      expect(await titles()).toEqual(['Done', 'In progress', 'Later']);
    });

    it('deletes a list together with its cards', async () => {
      const { agent } = await signup();
      const board = await makeBoard(agent);
      const listId = board.lists[0]!.id;
      const card = await makeCard(agent, listId, 'Doomed');

      await agent.delete(`/api/lists/${listId}`).expect(204);
      await agent.get(`/api/cards/${card.id}`).expect(404);
    });
  });

  describe('activity', () => {
    it('records what happened, newest first, and pages through it', async () => {
      const { agent } = await signup('Ada');
      const board = await makeBoard(agent);
      const listId = board.lists[0]!.id;
      for (const title of ['One', 'Two', 'Three']) await makeCard(agent, listId, title);

      const first: ActivityPage = (await agent.get(`/api/boards/${board.id}/activity?limit=2`))
        .body;
      expect(first.items.map((a) => a.type)).toEqual(['card.created', 'card.created']);
      expect(first.items[0]!.data.title).toBe('Three');
      expect(first.items[0]!.actor?.name).toBe('Ada');
      expect(first.nextCursor).not.toBeNull();

      const second: ActivityPage = (
        await agent.get(`/api/boards/${board.id}/activity?limit=2&cursor=${first.nextCursor}`)
      ).body;
      expect(second.items.map((a) => a.type)).toEqual(['card.created', 'board.created']);
      expect(second.nextCursor).toBeNull();
    });

    it('is private to members', async () => {
      const owner = await signup();
      const stranger = await signup();
      const board = await makeBoard(owner.agent);
      await stranger.agent.get(`/api/boards/${board.id}/activity`).expect(404);
    });
  });
});
