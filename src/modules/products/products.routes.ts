import { Router } from 'express';
import * as repo from './products.repository.js';
import { listProductsQuerySchema } from './products.schema.js';

export const productsRouter = Router();

productsRouter.get('/', async (req, res) => {
  const params = listProductsQuerySchema.parse(req.query);
  const { items, total } = await repo.listProducts(params);
  res.json({ data: items, meta: { total, limit: params.limit, offset: params.offset } });
});

productsRouter.get('/categories', async (_req, res) => {
  res.json({ data: await repo.listCategories() });
});
