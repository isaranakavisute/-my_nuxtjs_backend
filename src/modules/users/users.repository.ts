import { query } from '../../db/pool.js';
import type { CreateUserInput, ListUsersQuery, UpdateUserInput, User } from './users.schema.js';

const COLUMNS = 'id, email, name, created_at, updated_at';

export async function listUsers(
  params: ListUsersQuery,
): Promise<{ items: User[]; total: number }> {
  const { limit, offset, search } = params;
  const filters: string[] = [];
  const values: unknown[] = [];

  if (search) {
    values.push(`%${search}%`);
    filters.push(`(name ILIKE $${values.length} OR email ILIKE $${values.length})`);
  }

  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users ${where}`,
    values,
  );

  values.push(limit, offset);
  const rowsResult = await query<User>(
    `SELECT ${COLUMNS} FROM users ${where}
     ORDER BY created_at DESC, id DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  return {
    items: rowsResult.rows,
    total: Number(totalResult.rows[0]?.count ?? 0),
  };
}

export async function findUserById(id: string): Promise<User | undefined> {
  const result = await query<User>(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
  return result.rows[0];
}

export async function insertUser(input: CreateUserInput): Promise<User> {
  const result = await query<User>(
    `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING ${COLUMNS}`,
    [input.email, input.name],
  );
  // INSERT ... RETURNING always yields exactly one row or throws.
  return result.rows[0]!;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User | undefined> {
  const assignments: string[] = [];
  const values: unknown[] = [];

  // Column names come from this fixed map, never from request data.
  for (const column of ['email', 'name'] as const) {
    const value = input[column];
    if (value !== undefined) {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    }
  }

  if (assignments.length === 0) {
    return findUserById(id);
  }

  values.push(id);
  const result = await query<User>(
    `UPDATE users SET ${assignments.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING ${COLUMNS}`,
    values,
  );
  return result.rows[0];
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM users WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
