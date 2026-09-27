import { Router } from 'express';
import { HttpError } from '../../errors/http-error.js';
import * as repo from './users.repository.js';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from './users.schema.js';

export const usersRouter = Router();

// Express 5 forwards rejected promises to the error middleware, so these
// handlers can throw freely without a wrapper.

usersRouter.get('/', async (req, res) => {
  const params = listUsersQuerySchema.parse(req.query);
  const { items, total } = await repo.listUsers(params);
  res.json({ data: items, meta: { total, limit: params.limit, offset: params.offset } });
});

usersRouter.get('/:id', async (req, res) => {
  const { id } = userIdParamSchema.parse(req.params);
  const user = await repo.findUserById(id);
  if (!user) throw HttpError.notFound(`User ${id} not found`);
  res.json({ data: user });
});

usersRouter.post('/', async (req, res) => {
  const input = createUserSchema.parse(req.body);
  const user = await repo.insertUser(input);
  res.status(201).json({ data: user });
});

usersRouter.patch('/:id', async (req, res) => {
  const { id } = userIdParamSchema.parse(req.params);
  const input = updateUserSchema.parse(req.body);
  const user = await repo.updateUser(id, input);
  if (!user) throw HttpError.notFound(`User ${id} not found`);
  res.json({ data: user });
});

usersRouter.delete('/:id', async (req, res) => {
  const { id } = userIdParamSchema.parse(req.params);
  const deleted = await repo.deleteUser(id);
  if (!deleted) throw HttpError.notFound(`User ${id} not found`);
  res.status(204).send();
});
