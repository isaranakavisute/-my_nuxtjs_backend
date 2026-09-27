import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../errors/http-error.js';
import { isProduction } from '../config/env.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(HttpError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
}

// Express identifies error middleware by arity, so `next` must stay in the signature.
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: { message: 'Validation failed', details: error.issues },
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: { message: error.message, ...(error.details ? { details: error.details } : {}) },
    });
    return;
  }

  // Unique violation — surfaces as a 409 instead of a generic 500.
  if (isPgError(error) && error.code === '23505') {
    res.status(409).json({ error: { message: 'Resource already exists' } });
    return;
  }

  console.error('Unhandled error', error);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      ...(isProduction ? {} : { details: error instanceof Error ? error.message : String(error) }),
    },
  });
}

function isPgError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error;
}
