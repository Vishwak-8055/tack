import { randomUUID } from 'node:crypto';
import http from 'node:http';
import request from 'supertest';
import { afterAll, expect } from 'vitest';
import type { BoardDetail, CardDetail, SessionUser } from '@tack/shared';
import { createApp } from '../src/app';

export const app = createApp();

// One listening server shared by every request. Handing supertest the bare Express app makes it
// open (and leak listeners on) a new server for each call.
export const server = http.createServer(app).listen(0);
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

export type Agent = ReturnType<typeof request.agent>;

export interface TestUser {
  agent: Agent;
  user: SessionUser;
  cookie: string;
}

export async function signup(name = 'Test User'): Promise<TestUser> {
  const agent = request.agent(server);
  const res = await agent.post('/api/auth/register').send({
    name,
    email: `${randomUUID().slice(0, 8)}@example.com`,
    password: 'correct horse battery',
  });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  const cookie = (res.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
  return { agent, user: res.body, cookie };
}

export async function makeBoard(
  agent: Agent,
  title = 'Test board',
  template: 'kanban' | 'blank' = 'kanban',
): Promise<BoardDetail> {
  const created = await agent.post('/api/boards').send({ title, template });
  expect(created.status, JSON.stringify(created.body)).toBe(201);
  return (await agent.get(`/api/boards/${created.body.id}`)).body;
}

export async function makeCard(agent: Agent, listId: string, title: string): Promise<CardDetail> {
  const res = await agent.post(`/api/lists/${listId}/cards`).send({ title });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body;
}

/** Cards in a list, in display order, as titles. */
export async function titlesIn(agent: Agent, boardId: string, listId: string): Promise<string[]> {
  const board: BoardDetail = (await agent.get(`/api/boards/${boardId}`)).body;
  return board.cards.filter((c) => c.listId === listId).map((c) => c.title);
}

/** Invite someone onto a board and return their agent. */
export async function addTo(
  owner: TestUser,
  boardId: string,
  role: 'editor' | 'viewer',
  name = 'Teammate',
): Promise<TestUser> {
  const mate = await signup(name);
  const res = await owner.agent
    .post(`/api/boards/${boardId}/members`)
    .send({ email: mate.user.email, role });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return mate;
}
