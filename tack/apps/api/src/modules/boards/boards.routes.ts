import { Router } from 'express';
import { z } from 'zod';
import {
  addMemberSchema,
  createBoardSchema,
  createLabelSchema,
  createListSchema,
  starBoardSchema,
  updateBoardSchema,
  updateLabelSchema,
  updateMemberSchema,
} from '@tack/shared';
import { pool } from '../../db/pool';
import { requireBoardRole } from '../../lib/access';
import { ctx, param } from '../../lib/http';
import { requireUser } from '../../middleware/auth';
import { createList } from '../lists/lists.service';
import { hub } from '../realtime/hub';
import { listActivity } from './activity.service';
import {
  createBoard,
  deleteBoard,
  getBoard,
  listBoards,
  setStarred,
  updateBoard,
} from './boards.service';
import { createLabel, deleteLabel, updateLabel } from './labels.service';
import { addMember, removeMember, updateMemberRole } from './members.service';

export const boardsRouter = Router();
boardsRouter.use(requireUser);

const activityQuery = z.object({
  cursor: z.string().regex(/^\d+$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

boardsRouter.get('/', async (req, res) => {
  res.json(await listBoards(ctx(req)));
});

boardsRouter.post('/', async (req, res) => {
  res.status(201).json(await createBoard(ctx(req), createBoardSchema.parse(req.body)));
});

boardsRouter.get('/:id', async (req, res) => {
  res.json(await getBoard(ctx(req), param(req)));
});

boardsRouter.patch('/:id', async (req, res) => {
  res.json(await updateBoard(ctx(req), param(req), updateBoardSchema.parse(req.body)));
});

boardsRouter.delete('/:id', async (req, res) => {
  await deleteBoard(ctx(req), param(req));
  res.status(204).end();
});

boardsRouter.put('/:id/star', async (req, res) => {
  await setStarred(ctx(req), param(req), starBoardSchema.parse(req.body).starred);
  res.status(204).end();
});

boardsRouter.get('/:id/activity', async (req, res) => {
  const { cursor, limit } = activityQuery.parse(req.query);
  res.json(await listActivity(ctx(req), param(req), cursor ?? null, limit));
});

/** Server-sent events: one long-lived response per open board tab. */
boardsRouter.get('/:id/events', async (req, res) => {
  const boardId = param(req);
  await requireBoardRole(pool, req.user!.id, boardId);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // tell nginx not to buffer the stream
  });
  res.write('retry: 3000\n\n');

  const leave = hub.join(boardId, res);
  req.on('close', leave);
});

boardsRouter.post('/:id/members', async (req, res) => {
  const member = await addMember(ctx(req), param(req), addMemberSchema.parse(req.body));
  res.status(201).json(member);
});

boardsRouter.patch('/:id/members/:userId', async (req, res) => {
  const { role } = updateMemberSchema.parse(req.body);
  await updateMemberRole(ctx(req), param(req), param(req, 'userId'), role);
  res.status(204).end();
});

boardsRouter.delete('/:id/members/:userId', async (req, res) => {
  await removeMember(ctx(req), param(req), param(req, 'userId'));
  res.status(204).end();
});

boardsRouter.post('/:id/labels', async (req, res) => {
  const label = await createLabel(ctx(req), param(req), createLabelSchema.parse(req.body));
  res.status(201).json(label);
});

boardsRouter.patch('/:id/labels/:labelId', async (req, res) => {
  const input = updateLabelSchema.parse(req.body);
  res.json(await updateLabel(ctx(req), param(req), param(req, 'labelId'), input));
});

boardsRouter.delete('/:id/labels/:labelId', async (req, res) => {
  await deleteLabel(ctx(req), param(req), param(req, 'labelId'));
  res.status(204).end();
});

boardsRouter.post('/:id/lists', async (req, res) => {
  const list = await createList(ctx(req), param(req), createListSchema.parse(req.body));
  res.status(201).json(list);
});
