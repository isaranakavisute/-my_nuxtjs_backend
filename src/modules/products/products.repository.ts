import { query } from '../../db/pool.js';
import type { ListProductsQuery, Product } from './products.schema.js';

// rating is NUMERIC, which node-postgres returns as a string; cast it so the
// API always emits a number.
const COLUMNS =
  'id, name, category, emoji, price, original_price, rating::float8 AS rating, sold_count, location';

export async function listProducts(
  params: ListProductsQuery,
): Promise<{ items: Product[]; total: number }> {
  const { limit, offset, category, search } = params;
  const filters: string[] = [];
  const values: unknown[] = [];

  if (category) {
    values.push(category);
    filters.push(`category = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    filters.push(`name ILIKE $${values.length}`);
  }

  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM products ${where}`,
    values,
  );

  values.push(limit, offset);
  const rowsResult = await query<Product>(
    `SELECT ${COLUMNS} FROM products ${where}
     ORDER BY sold_count DESC, id
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  return {
    items: rowsResult.rows,
    total: Number(totalResult.rows[0]?.count ?? 0),
  };
}

export async function listCategories(): Promise<string[]> {
  const result = await query<{ category: string }>(
    'SELECT DISTINCT category FROM products ORDER BY category',
  );
  return result.rows.map((row) => row.category);
}
