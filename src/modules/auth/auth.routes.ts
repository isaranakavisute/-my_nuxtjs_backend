import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { signToken } from '../../auth/jwt.js';

export const authRouter = Router();

// The frontend labels the field "email", but the only credential store is
// user_password.myuser (values like "admin", "alice"), so accept any non-empty
// string rather than enforcing email format.
const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

interface CredentialRow {
  id: number;
  myuser: string;
  mypassword: string;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Error responses use a top-level `message` because the frontend reads
// err.response.data.message. On success it reads data.token.
authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Please enter your email and password.' });
    return;
  }

  const { email, password } = parsed.data;

  const result = await query<CredentialRow>(
    'SELECT id, myuser, mypassword FROM user_password WHERE myuser = $1',
    [email],
  );
  const row = result.rows[0];

  // NOTE: mypassword is stored in plaintext, so this is a direct comparison.
  // Passwords should be hashed (bcrypt/argon2) and verified against the hash.
  if (!row || !safeEqual(row.mypassword, password)) {
    res.status(401).json({ message: 'Invalid email or password.' });
    return;
  }

  const token = signToken({ sub: String(row.id), username: row.myuser });
  res.json({ token, user: { id: row.id, username: row.myuser } });
});
