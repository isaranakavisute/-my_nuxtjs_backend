# my_nuxtjs_backend

Node.js REST API on Express 5 + TypeScript, talking to PostgreSQL through
[node-postgres](https://node-postgres.com/) with plain SQL migrations. No ORM.

## Setup

```sh
npm install
cp .env.example .env    # then fill in DATABASE_URL
npm run migrate
npm run dev
```

The server refuses to start if it cannot reach PostgreSQL, so a bad
`DATABASE_URL` surfaces immediately rather than on the first request.

### DATABASE_URL

```
postgres://user:password@host:5432/database
```

Special characters in the password must be percent-encoded — `#` becomes `%23`,
`@` becomes `%40`, `/` becomes `%2F`. An unencoded `#` silently truncates the
connection string and produces a confusing authentication error.

`DATABASE_SSL=true` enables TLS without certificate verification, which is what
most managed providers need. There is no equivalent of libpq's `sslmode=prefer`;
choose plaintext (`false`) or TLS (`true`) explicitly.

## Scripts

| Script                   | Purpose                                      |
| ------------------------ | -------------------------------------------- |
| `npm run dev`            | Watch mode via tsx                            |
| `npm run build`          | Compile TypeScript to `dist/`                 |
| `npm start`              | Run the compiled build                        |
| `npm run typecheck`      | Type check without emitting                   |
| `npm run migrate`        | Apply pending migrations                      |
| `npm run migrate:status` | Show applied / pending migrations             |

## Endpoints

| Method   | Path              | Notes                                          |
| -------- | ----------------- | ---------------------------------------------- |
| `POST`   | `/login`          | `{ email, password }` → `{ token, user }`; 401 on bad creds |
| `GET`    | `/api/health`     | Liveness — always 200 if the process is up      |
| `GET`    | `/api/health/db`  | Readiness — 503 when PostgreSQL is unreachable  |
| `GET`    | `/api/users`      | `?limit=20&offset=0&search=` — paginated        |
| `GET`    | `/api/users/:id`  |                                                 |
| `POST`   | `/api/users`      | `{ "email": "...", "name": "..." }`             |
| `PATCH`  | `/api/users/:id`  | Partial; at least one field required            |
| `DELETE` | `/api/users/:id`  | 204 on success                                  |

Successful responses are wrapped in `{ "data": ... }`; list responses add
`{ "meta": { total, limit, offset } }`. Errors are `{ "error": { message, details? } }`.

```sh
curl localhost:3001/api/health/db

curl -X POST localhost:3001/api/users \
  -H 'content-type: application/json' \
  -d '{"email":"ada@example.com","name":"Ada Lovelace"}'

curl 'localhost:3001/api/users?limit=10&search=ada'
```

## Layout

```
migrations/        numbered .sql files, applied in filename order
scripts/migrate.ts migration runner
src/
  app.ts           express app assembly
  index.ts         entry point, startup DB check, graceful shutdown
  config/env.ts    zod-validated environment
  db/pool.ts       pg Pool, query(), withTransaction()
  errors/          HttpError
  middleware/      404 + centralized error handler
  modules/users/   schema (zod) / repository (SQL) / routes
  routes/index.ts  /api router, health checks
```

## Adding a migration

Create `migrations/002_whatever.sql` and run `npm run migrate`. Each file runs
once, inside a transaction, and is recorded in `schema_migrations` with a
checksum. Editing an already-applied file is rejected — add a new migration
instead, since the old one will never re-run.

## Adding an endpoint

Copy `src/modules/users/` as a template: a zod schema for validation, a
repository holding parameterized SQL, and a router that parses input and calls
the repository. Register the router in `src/routes/index.ts`.

Express 5 forwards rejected promises to the error middleware automatically, so
route handlers can `throw` (including `HttpError.notFound(...)`) without a
try/catch or async wrapper.

## Conventions

- All SQL uses parameterized queries. Where a query builds its own `SET` clause
  (see `updateUser`), column names come from a fixed whitelist, never from the
  request body.
- `users.email` is stored lowercased with a `UNIQUE INDEX ON (LOWER(email))`.
  A duplicate insert raises PostgreSQL error `23505`, which the error handler
  maps to HTTP 409.
- `.env` is gitignored. Do not commit credentials.
