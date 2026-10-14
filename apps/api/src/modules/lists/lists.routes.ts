import { Router } from 'express';
import { createCardSchema, moveListSchema, updateListSchema } from '@tack/shared';
import { ctx, param } from '../../lib/http';
import { requireUser } from '../../middleware/auth';
import { createCard } from '../cards/cards.service';
import { deleteList, moveList, renameList } from './lists.service';

export const listsRouter = Router();
listsRouter.use(requireUser);

listsRouter.patch('/:id', async (req, res) => {
  const { title } = updateListSchema.parse(req.body);
  res.json(await renameList(ctx(req), param(req), title));
});

listsRouter.post('/:id/move', async (req, res) => {
  res.json(await moveList(ctx(req), param(req), moveListSchema.parse(req.body)));
});

listsRouter.delete('/:id', async (req, res) => {
  await deleteList(ctx(req), param(req));
  res.status(204).end();
});

listsRouter.post('/:id/cards', async (req, res) => {
  const card = await createCard(ctx(req), param(req), createCardSchema.parse(req.body));
  res.status(201).json(card);
});
