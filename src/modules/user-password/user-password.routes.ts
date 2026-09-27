import { Router } from 'express';
import { query } from '../../db/pool.js';

export const userPasswordRouter = Router();

interface UserPasswordRow {
  id: number;
  myuser: string;
  mypassword: string;
}

// WARNING: returns every row of user_password, including plaintext mypassword
// values, with no authentication. Intended for local development only. Put this
// behind auth (or remove it) before exposing the server beyond your machine.
userPasswordRouter.get('/get_user_password', async (_req, res) => {
  const result = await query<UserPasswordRow>(
    'SELECT id, myuser, mypassword FROM user_password ORDER BY id',
  );
  res.json({ data: result.rows, meta: { total: result.rowCount ?? result.rows.length } });
});
