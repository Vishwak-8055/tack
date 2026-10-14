import { Router } from 'express';
import {
  commentSchema,
  createChecklistItemSchema,
  moveCardSchema,
  updateCardSchema,
  updateChecklistItemSchema,
} from '@tack/shared';
import { ctx, param } from '../../lib/http';
import { requireUser } from '../../middleware/auth';
import {
  addAssignee,
  addChecklistItem,
  addComment,
  addLabel,
  deleteCard,
  deleteChecklistItem,
  deleteComment,
  getCard,
  moveCard,
  removeAssignee,
  removeLabel,
  updateCard,
  updateChecklistItem,
  updateComment,
} from './cards.service';

export const cardsRouter = Router();
cardsRouter.use(requireUser);

cardsRouter.get('/:id', async (req, res) => {
  res.json(await getCard(ctx(req), param(req)));
});

cardsRouter.patch('/:id', async (req, res) => {
  res.json(await updateCard(ctx(req), param(req), updateCardSchema.parse(req.body)));
});

cardsRouter.delete('/:id', async (req, res) => {
  await deleteCard(ctx(req), param(req));
  res.status(204).end();
});

cardsRouter.post('/:id/move', async (req, res) => {
  res.json(await moveCard(ctx(req), param(req), moveCardSchema.parse(req.body)));
});

cardsRouter.put('/:id/labels/:labelId', async (req, res) => {
  res.json(await addLabel(ctx(req), param(req), param(req, 'labelId')));
});

cardsRouter.delete('/:id/labels/:labelId', async (req, res) => {
  res.json(await removeLabel(ctx(req), param(req), param(req, 'labelId')));
});

cardsRouter.put('/:id/assignees/:userId', async (req, res) => {
  res.json(await addAssignee(ctx(req), param(req), param(req, 'userId')));
});

cardsRouter.delete('/:id/assignees/:userId', async (req, res) => {
  res.json(await removeAssignee(ctx(req), param(req), param(req, 'userId')));
});

cardsRouter.post('/:id/checklist', async (req, res) => {
  const card = await addChecklistItem(
    ctx(req),
    param(req),
    createChecklistItemSchema.parse(req.body),
  );
  res.status(201).json(card);
});

cardsRouter.patch('/:id/checklist/:itemId', async (req, res) => {
  const input = updateChecklistItemSchema.parse(req.body);
  res.json(await updateChecklistItem(ctx(req), param(req), param(req, 'itemId'), input));
});

cardsRouter.delete('/:id/checklist/:itemId', async (req, res) => {
  res.json(await deleteChecklistItem(ctx(req), param(req), param(req, 'itemId')));
});

cardsRouter.post('/:id/comments', async (req, res) => {
  res.status(201).json(await addComment(ctx(req), param(req), commentSchema.parse(req.body)));
});

cardsRouter.patch('/:id/comments/:commentId', async (req, res) => {
  const input = commentSchema.parse(req.body);
  res.json(await updateComment(ctx(req), param(req), param(req, 'commentId'), input));
});

cardsRouter.delete('/:id/comments/:commentId', async (req, res) => {
  res.json(await deleteComment(ctx(req), param(req), param(req, 'commentId')));
});
