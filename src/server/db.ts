// PostgreSQL connection and schema. Server-only.
import { Pool, type PoolClient } from 'pg';

declare global {
  // Reuse the pool across hot reloads in development.
  // eslint-disable-next-line no-var
  var __examplifyPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __examplifySchemaReady: Promise<void> | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set (see .env.example).');
  }
  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX || 10),
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
}

export function getPool(): Pool {
  if (!globalThis.__examplifyPool) globalThis.__examplifyPool = createPool();
  return globalThis.__examplifyPool;
}

/**
 * Ordered, append-only list of schema migrations. Never edit an applied
 * migration; add a new entry instead.
 */
const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      -- Firestore-style document store: one row per document.
      CREATE TABLE documents (
        path          text PRIMARY KEY,          -- e.g. courses/abc/modules/m1
        parent        text NOT NULL,             -- collection path, e.g. courses/abc/modules
        collection_id text NOT NULL,             -- last segment of parent, e.g. modules
        id            text NOT NULL,             -- last segment of path
        data          jsonb NOT NULL,
        version       bigint NOT NULL DEFAULT 1, -- incremented on every write
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX documents_parent_idx ON documents (parent);
      CREATE INDEX documents_collection_id_idx ON documents (collection_id);
      CREATE INDEX documents_data_gin ON documents USING gin (data jsonb_path_ops);

      CREATE TABLE auth_users (
        uid           text PRIMARY KEY,
        email         text NOT NULL UNIQUE,      -- stored lower-case
        password_hash text,
        display_name  text,
        photo_url     text,
        disabled      boolean NOT NULL DEFAULT false,
        created_at    timestamptz NOT NULL DEFAULT now(),
        last_login_at timestamptz
      );

      CREATE TABLE sessions (
        id          text PRIMARY KEY,            -- sha256 of the cookie token
        uid         text NOT NULL REFERENCES auth_users (uid) ON DELETE CASCADE,
        created_at  timestamptz NOT NULL DEFAULT now(),
        expires_at  timestamptz NOT NULL,
        user_agent  text,
        ip          text
      );
      CREATE INDEX sessions_uid_idx ON sessions (uid);
      CREATE INDEX sessions_expires_idx ON sessions (expires_at);
    `,
  },
];

async function migrate(): Promise<void> {
  const client = await getPool().connect();
  try {
    // Serialize concurrent migrators (several app replicas starting at once).
    await client.query('SELECT pg_advisory_lock(727274)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    integer PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);
    const { rows } = await client.query<{ version: number }>('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.version));
    for (const m of MIGRATIONS) {
      if (applied.has(m.version)) continue;
      await client.query('BEGIN');
      try {
        await client.query(m.sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [m.version]);
        await client.query('COMMIT');
        console.log(`[db] applied migration ${m.version}`);
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(727274)').catch(() => {});
    client.release();
  }
}

/** Ensures the schema exists. Safe to call on every request (runs once). */
export function ensureSchema(): Promise<void> {
  if (!globalThis.__examplifySchemaReady) {
    globalThis.__examplifySchemaReady = migrate().catch((e) => {
      globalThis.__examplifySchemaReady = undefined; // retry on next call
      throw e;
    });
  }
  return globalThis.__examplifySchemaReady;
}

export type Queryable = Pick<PoolClient, 'query'>;

/** Runs `fn` in a transaction and returns its result. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Runs a read-only operation with a pooled connection. */
export async function withClient<T>(fn: (client: Queryable) => Promise<T>): Promise<T> {
  await ensureSchema();
  return fn(getPool());
}
