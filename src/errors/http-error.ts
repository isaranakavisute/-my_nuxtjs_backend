export class HttpError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }

  static badRequest(message = 'Bad request', details?: unknown): HttpError {
    return new HttpError(400, message, details);
  }

  static notFound(message = 'Not found', details?: unknown): HttpError {
    return new HttpError(404, message, details);
  }

  static conflict(message = 'Conflict', details?: unknown): HttpError {
    return new HttpError(409, message, details);
  }
}
