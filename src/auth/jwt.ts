import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Minimal HS256 JWT sign/verify built on Node's crypto — no external dependency.
 * Enough for issuing a bearer token the frontend can store and send back.
 */

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sign(data: string): string {
  return base64url(createHmac('sha256', env.JWT_SECRET).update(data).digest());
}

export interface JwtPayload {
  sub: string;
  username: string;
  iat: number;
  exp: number;
}

export function signToken(claims: { sub: string; username: string }): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      sub: claims.sub,
      username: claims.username,
      iat: now,
      exp: now + env.JWT_EXPIRES_IN_SECONDS,
    }),
  );
  const signature = sign(`${header}.${payload}`);
  return `${header}.${payload}.${signature}`;
}

/** Returns the decoded payload if the token is well-formed, correctly signed,
 * and unexpired; otherwise null. */
export function verifyToken(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts as [string, string, string];

  const expected = sign(`${header}.${payload}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64').toString('utf8'),
    ) as JwtPayload;
    if (typeof decoded.exp !== 'number' || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
