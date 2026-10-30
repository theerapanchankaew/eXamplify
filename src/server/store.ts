// Firestore-compatible document store on PostgreSQL. Server-only.
//
// Semantics follow Cloud Firestore where the app depends on them:
// - documents live at even-length paths, collections at odd-length paths
// - set() replaces, set(merge) deep-merges maps, update() takes field paths
// - write sentinels (serverTimestamp, increment, arrayUnion/Remove, delete)
// - queries: where / orderBy / limit / limitToLast, collection-group queries
// - every write in a commit is authorized and applied atomically
// Security rules live in ./rules.ts and are enforced here for every
// request that is not made with the SYSTEM principal.

import type { PoolClient } from 'pg';
import {
  type Precondition, type QuerySpec, type WireDoc, type WriteSpec, type DbErrorCode,
  isSentinel, isTaggedTimestamp, validatePath,
} from '@/lib/db/wire';
import { withClient, withTransaction, type Queryable } from './db';
import { authorize, redactForReader, type AuthContext, type Operation } from './rules';

export const SYSTEM: unique symbol = Symbol('system');
/** Who is making the request: a signed-in user, anonymous (null), or trusted server code. */
export type Principal = AuthContext | null | typeof SYSTEM;

const MAX_DOC_BYTES = 1_048_576;
const MAX_WRITES_PER_COMMIT = 500;

export class StoreError extends Error {
  constructor(public readonly code: DbErrorCode, message: string) {
    super(message);
    this.name = 'StoreError';
  }
}

type Data = Record<string, unknown>;
interface Row { path: string; id: string; data: Data; version: string | number }

const toDoc = (r: Row): WireDoc => ({ path: r.path, id: r.id, data: r.data, version: Number(r.version) });

function splitDocPath(path: string) {
  try {
    const segs = validatePath(path, 'doc');
    return { parent: segs.slice(0, -1).join('/'), collectionId: segs[segs.length - 2], id: segs[segs.length - 1] };
  } catch (e) {
    throw new StoreError('invalid-argument', (e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------

const isMap = (v: unknown): v is Data =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !isTaggedTimestamp(v) && !isSentinel(v);

export function getField(data: Data | null | undefined, fieldPath: string): unknown {
  let cur: unknown = data;
  for (const key of fieldPath.split('.')) {
    if (!isMap(cur)) return undefined;
    cur = cur[key];
  }
  return cur;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    return a.length === bb.length && a.every((v, i) => deepEqual(v, bb[i]));
  }
  const ka = Object.keys(a as Data), kb = Object.keys(b as Data);
  return ka.length === kb.length && ka.every((k) => deepEqual((a as Data)[k], (b as Data)[k]));
}

/** Firestore cross-type ordering: null < bool < number < timestamp < string < array < map. */
function typeRank(v: unknown): number {
  if (v === null) return 0;
  if (typeof v === 'boolean') return 1;
  if (typeof v === 'number') return 2;
  if (isTaggedTimestamp(v)) return 3;
  if (typeof v === 'string') return 4;
  if (Array.isArray(v)) return 6;
  return 7;
}

function compareValues(a: unknown, b: unknown): number {
  const ra = typeRank(a), rb = typeRank(b);
  if (ra !== rb) return ra - rb;
  switch (ra) {
    case 0: return 0;
    case 1: return Number(a) - Number(b);
    case 2: return (a as number) - (b as number);
    case 3: return (a as { __ts: number }).__ts - (b as { __ts: number }).__ts;
    case 4: return (a as string) < (b as string) ? -1 : (a as string) > (b as string) ? 1 : 0;
    case 6: {
      const aa = a as unknown[], bb = b as unknown[];
      for (let i = 0; i < Math.min(aa.length, bb.length); i++) {
        const c = compareValues(aa[i], bb[i]);
        if (c) return c;
      }
      return aa.length - bb.length;
    }
    default: return JSON.stringify(a).localeCompare(JSON.stringify(b));
  }
}

function matchesFilter(doc: Data, f: QuerySpec['filters'][number]): boolean {
  const v = getField(doc, f.field);
  const present = v !== undefined;
  switch (f.op) {
    case '==': return present && deepEqual(v, f.value);
    case '!=': return present && v !== null && !deepEqual(v, f.value);
    case '<': case '<=': case '>': case '>=': {
      if (!present || typeRank(v) !== typeRank(f.value)) return false; // range filters are type-strict
      const c = compareValues(v, f.value);
      return f.op === '<' ? c < 0 : f.op === '<=' ? c <= 0 : f.op === '>' ? c > 0 : c >= 0;
    }
    case 'in': return present && Array.isArray(f.value) && f.value.some((x) => deepEqual(v, x));
    case 'not-in': return present && v !== null && Array.isArray(f.value) && !f.value.some((x) => deepEqual(v, x));
    case 'array-contains': return Array.isArray(v) && v.some((x) => deepEqual(x, f.value));
    case 'array-contains-any':
      return Array.isArray(v) && Array.isArray(f.value) && v.some((x) => (f.value as unknown[]).some((y) => deepEqual(x, y)));
    default: throw new StoreError('invalid-argument', `Unsupported operator ${(f as { op: string }).op}`);
  }
}

/** Builds a jsonb containment object for scalar equality filters (index-assisted pre-filter). */
function containmentFor(filters: QuerySpec['filters']): Data | null {
  let out: Data | null = null;
  for (const f of filters) {
    const scalar = f.value === null || ['string', 'number', 'boolean'].includes(typeof f.value) || isTaggedTimestamp(f.value);
    if (!scalar || (f.op !== '==' && f.op !== 'array-contains')) continue;
    out = out ?? {};
    const keys = f.field.split('.');
    let cur = out;
    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        cur[k] = f.op === 'array-contains' ? [f.value] : f.value;
      } else {
        cur[k] = isMap(cur[k]) ? cur[k] : {};
        cur = cur[k] as Data;
      }
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

async function readDoc(client: Queryable, path: string, forUpdate = false): Promise<WireDoc | null> {
  const { rows } = await client.query<Row>(
    `SELECT path, id, data, version FROM documents WHERE path = $1${forUpdate ? ' FOR UPDATE' : ''}`, [path]);
  return rows[0] ? toDoc(rows[0]) : null;
}

/** Reads a document for trusted server code (no rules). */
export function getDocument(path: string): Promise<WireDoc | null> {
  splitDocPath(path);
  return withClient((c) => readDoc(c, path));
}

/** Rule-checked single-document read. Missing documents return data: null. */
export async function getForPrincipal(principal: Principal, path: string): Promise<WireDoc> {
  const { id } = splitDocPath(path);
  return withClient(async (client) => {
    const doc = await readDoc(client, path);
    if (principal !== SYSTEM) {
      const ok = await authorize({ op: 'get', path, auth: principal, resource: doc?.data ?? null, requestData: null, client });
      if (!ok) throw new StoreError('permission-denied', `Missing or insufficient permissions (get ${path}).`);
      if (doc) return { ...doc, data: await redactForReader(path, doc.data, principal, client) };
    }
    return doc ?? { path, id, data: null, version: 0 };
  });
}

/** Runs a query. For non-system principals, documents the rules do not allow are filtered out. */
export async function runQuery(principal: Principal, q: QuerySpec): Promise<WireDoc[]> {
  if (!q || typeof q.path !== 'string') throw new StoreError('invalid-argument', 'Missing query path.');
  if (q.group) {
    if (q.path.includes('/')) throw new StoreError('invalid-argument', 'Collection group ID must not contain "/".');
  } else {
    try { validatePath(q.path, 'collection'); } catch (e) { throw new StoreError('invalid-argument', (e as Error).message); }
  }
  const filters = Array.isArray(q.filters) ? q.filters : [];
  const orderBy = Array.isArray(q.orderBy) ? q.orderBy : [];

  return withClient(async (client) => {
    const params: unknown[] = [q.path];
    let sql = `SELECT path, id, data, version FROM documents WHERE ${q.group ? 'collection_id' : 'parent'} = $1`;
    const contains = containmentFor(filters);
    if (contains) {
      params.push(JSON.stringify(contains));
      sql += ` AND data @> $2::jsonb`;
    }
    const { rows } = await client.query<Row>(sql, params);

    let docs = rows.map(toDoc).filter((d) => filters.every((f) => matchesFilter(d.data!, f)));

    // Firestore excludes documents that lack an orderBy field.
    docs = docs.filter((d) => orderBy.every((o) => getField(d.data, o.field) !== undefined));
    docs.sort((a, b) => {
      for (const o of orderBy) {
        const c = compareValues(getField(a.data, o.field), getField(b.data, o.field));
        if (c) return o.dir === 'desc' ? -c : c;
      }
      return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
    });

    if (principal !== SYSTEM) {
      const allowed: WireDoc[] = [];
      for (const d of docs) {
        if (await authorize({ op: 'list', path: d.path, auth: principal, resource: d.data, requestData: null, client })) {
          allowed.push(d);
        }
      }
      docs = allowed;
    }

    if (typeof q.limit === 'number' && q.limit >= 0) docs = docs.slice(0, q.limit);
    if (typeof q.limitToLast === 'number' && q.limitToLast >= 0) docs = docs.slice(Math.max(0, docs.length - q.limitToLast));
    if (principal !== SYSTEM) {
      for (const d of docs) d.data = await redactForReader(d.path, d.data, principal, client);
    }
    return docs;
  });
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function resolveSentinel(op: unknown, prev: unknown, now: number): unknown {
  if (!isSentinel(op)) return op;
  switch (op.__op) {
    case 'serverTimestamp': return { __ts: now };
    case 'increment': {
      const by = Number((op as { by: number }).by) || 0;
      return (typeof prev === 'number' ? prev : 0) + by;
    }
    case 'arrayUnion': {
      const base = Array.isArray(prev) ? [...prev] : [];
      for (const v of (op as { values: unknown[] }).values) if (!base.some((x) => deepEqual(x, v))) base.push(v);
      return base;
    }
    case 'arrayRemove': {
      const vals = (op as { values: unknown[] }).values;
      return Array.isArray(prev) ? prev.filter((x) => !vals.some((v) => deepEqual(x, v))) : [];
    }
    case 'delete': return undefined;
    default: throw new StoreError('invalid-argument', `Unknown field transform ${(op as { __op: string }).__op}`);
  }
}

/** Replaces/merges `incoming` onto `base`, resolving sentinels. */
function applyFields(base: Data, incoming: Data, merge: boolean, now: number): Data {
  const out: Data = merge ? { ...base } : {};
  for (const [k, v] of Object.entries(incoming)) {
    if (merge && isMap(v)) {
      out[k] = applyFields(isMap(base[k]) ? (base[k] as Data) : {}, v, true, now);
    } else if (isMap(v)) {
      out[k] = applyFields({}, v, false, now);
    } else {
      const r = resolveSentinel(v, base[k], now);
      if (r === undefined) delete out[k]; else out[k] = r;
    }
  }
  return out;
}

/** Applies update() field paths ("a.b.c": value) to a copy of `base`. */
function applyFieldPaths(base: Data, updates: Data, now: number): Data {
  const out: Data = structuredClone(base);
  for (const [fieldPath, raw] of Object.entries(updates)) {
    const keys = fieldPath.split('.');
    if (keys.some((k) => !k)) throw new StoreError('invalid-argument', `Invalid field path "${fieldPath}".`);
    let cur = out;
    for (const k of keys.slice(0, -1)) {
      if (!isMap(cur[k])) cur[k] = {};
      cur = cur[k] as Data;
    }
    const last = keys[keys.length - 1];
    const value = isMap(raw) ? applyFields({}, raw, false, now) : resolveSentinel(raw, cur[last], now);
    if (value === undefined) delete cur[last]; else cur[last] = value;
  }
  return out;
}

function assertData(data: unknown): asserts data is Data {
  if (!isMap(data)) throw new StoreError('invalid-argument', 'Document data must be an object.');
}

export interface CommitResult { path: string; version: number }

/**
 * Atomically applies writes. All writes are authorized against the state
 * before the commit (like Firestore), then applied in order.
 */
export async function commit(principal: Principal, writes: WriteSpec[], preconditions: Precondition[] = []): Promise<CommitResult[]> {
  if (!Array.isArray(writes) || writes.length === 0) return [];
  if (writes.length > MAX_WRITES_PER_COMMIT) throw new StoreError('invalid-argument', `Max ${MAX_WRITES_PER_COMMIT} writes per commit.`);
  for (const w of writes) splitDocPath(w?.path);

  return withTransaction(async (client: PoolClient) => {
    const paths = [...new Set([...writes.map((w) => w.path), ...preconditions.map((p) => p.path)])].sort();
    // Lock rows in a stable order to avoid deadlocks.
    const current = new Map<string, WireDoc>();
    for (const p of paths) {
      const d = await readDoc(client, p, true);
      if (d) current.set(p, d);
    }

    for (const pre of preconditions) {
      const have = current.get(pre.path)?.version ?? 0;
      if (have !== pre.version) throw new StoreError('aborted', `Document ${pre.path} changed during the transaction.`);
    }

    const now = Date.now();
    const pending = new Map<string, Data | null>(); // after-state per path, null = deleted
    const before = (p: string) => (pending.has(p) ? pending.get(p)! : current.get(p)?.data ?? null);
    const checks: { op: Operation; path: string; resource: Data | null; requestData: Data | null }[] = [];

    for (const w of writes) {
      const prev = before(w.path);
      let next: Data | null;
      if (w.type === 'delete') {
        next = null;
      } else if (w.type === 'set') {
        assertData(w.data);
        next = w.merge ? applyFields(prev ?? {}, w.data, true, now) : applyFields({}, w.data, false, now);
      } else if (w.type === 'update') {
        assertData(w.data);
        if (prev === null) throw new StoreError('not-found', `No document to update: ${w.path}`);
        next = applyFieldPaths(prev, w.data, now);
      } else {
        throw new StoreError('invalid-argument', 'Unknown write type.');
      }
      if (next && Buffer.byteLength(JSON.stringify(next)) > MAX_DOC_BYTES) {
        throw new StoreError('invalid-argument', `Document ${w.path} exceeds 1 MiB.`);
      }
      const op: Operation = next === null ? 'delete' : prev === null ? 'create' : 'update';
      if (!(op === 'delete' && prev === null)) {
        // Rules see the committed state as `resource` (not earlier writes in this batch).
        checks.push({ op, path: w.path, resource: current.get(w.path)?.data ?? null, requestData: next });
      }
      pending.set(w.path, next);
    }

    if (principal !== SYSTEM) {
      for (const c of checks) {
        const ok = await authorize({ ...c, auth: principal, client });
        if (!ok) throw new StoreError('permission-denied', `Missing or insufficient permissions (${c.op} ${c.path}).`);
      }
    }

    const results: CommitResult[] = [];
    for (const [path, data] of pending) {
      if (data === null) {
        await client.query('DELETE FROM documents WHERE path = $1', [path]);
        results.push({ path, version: 0 });
      } else {
        const { parent, collectionId, id } = splitDocPath(path);
        const { rows } = await client.query<{ version: string }>(
          `INSERT INTO documents (path, parent, collection_id, id, data)
           VALUES ($1, $2, $3, $4, $5::jsonb)
           ON CONFLICT (path) DO UPDATE SET data = EXCLUDED.data, version = documents.version + 1, updated_at = now()
           RETURNING version`,
          [path, parent, collectionId, id, JSON.stringify(data)]);
        results.push({ path, version: Number(rows[0].version) });
      }
    }
    return results;
  });
}
