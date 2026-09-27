/**
 * Minimal forward-only migration runner.
 *
 *   npm run migrate          apply every pending migration
 *   npm run migrate:status   list applied / pending migrations
 *
 * Each file in migrations/ runs once, inside a transaction, in filename order.
 * Applied filenames are recorded in the schema_migrations table.
 */
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, pool, withTransaction } from '../src/db/pool.js';

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'migrations',
);

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      checksum   TEXT        NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function readMigrationFiles(): Promise<{ name: string; sql: string; checksum: string }[]> {
  const entries = await readdir(MIGRATIONS_DIR);
  const names = entries.filter((name) => name.endsWith('.sql')).sort();

  return Promise.all(
    names.map(async (name) => {
      const sql = await readFile(path.join(MIGRATIONS_DIR, name), 'utf8');
      return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
    }),
  );
}

async function loadApplied(): Promise<Map<string, string>> {
  const result = await pool.query<{ name: string; checksum: string }>(
    'SELECT name, checksum FROM schema_migrations',
  );
  return new Map(result.rows.map((row) => [row.name, row.checksum]));
}

async function main(): Promise<void> {
  const statusOnly = process.argv.includes('--status');

  await ensureMigrationsTable();
  const files = await readMigrationFiles();
  const applied = await loadApplied();

  if (statusOnly) {
    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }
    for (const file of files) {
      const previous = applied.get(file.name);
      if (previous === undefined) console.log(`pending   ${file.name}`);
      else if (previous !== file.checksum) console.log(`CHANGED   ${file.name}  (already applied)`);
      else console.log(`applied   ${file.name}`);
    }
    return;
  }

  // An edited file that already ran would silently drift from the live schema.
  const drifted = files.filter((f) => {
    const previous = applied.get(f.name);
    return previous !== undefined && previous !== f.checksum;
  });
  if (drifted.length > 0) {
    throw new Error(
      `These migrations changed after being applied: ${drifted
        .map((f) => f.name)
        .join(', ')}. Add a new migration instead of editing an old one.`,
    );
  }

  const pending = files.filter((file) => !applied.has(file.name));
  if (pending.length === 0) {
    console.log('No pending migrations.');
    return;
  }

  for (const file of pending) {
    await withTransaction(async (client) => {
      await client.query(file.sql);
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [
        file.name,
        file.checksum,
      ]);
    });
    console.log(`applied ${file.name}`);
  }

  console.log(`Done — ${pending.length} migration(s) applied.`);
}

main()
  .catch((error) => {
    console.error('Migration failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
