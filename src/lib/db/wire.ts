// Shared value model for the self-hosted document store.
//
// Documents are JSON. Non-JSON values use tagged objects, both on the wire
// (browser <-> /api/db) and inside PostgreSQL (jsonb):
//   Timestamp           -> { "__ts": <milliseconds since epoch> }
// Write-time sentinels (resolved on the server, never stored):
//   serverTimestamp()   -> { "__op": "serverTimestamp" }
//   increment(n)        -> { "__op": "increment", "by": n }
//   arrayUnion(...v)    -> { "__op": "arrayUnion", "values": [...] }
//   arrayRemove(...v)   -> { "__op": "arrayRemove", "values": [...] }
//   deleteField()       -> { "__op": "delete" }
//
// This module has no server/client-only imports so both sides can use it.

export class Timestamp {
  constructor(public readonly seconds: number, public readonly nanoseconds: number) {}

  static now(): Timestamp {
    return Timestamp.fromMillis(Date.now());
  }

  static fromDate(date: Date): Timestamp {
    return Timestamp.fromMillis(date.getTime());
  }

  static fromMillis(ms: number): Timestamp {
    const seconds = Math.floor(ms / 1000);
    const nanoseconds = Math.round((ms - seconds * 1000) * 1e6);
    return new Timestamp(seconds, nanoseconds);
  }

  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }

  toDate(): Date {
    return new Date(this.toMillis());
  }

  isEqual(other: Timestamp): boolean {
    return other instanceof Timestamp && other.toMillis() === this.toMillis();
  }

  valueOf(): string {
    // Allows <, > comparisons between Timestamps (same as Firestore SDK).
    return String(this.toMillis()).padStart(16, '0');
  }

  toJSON() {
    return { seconds: this.seconds, nanoseconds: this.nanoseconds };
  }

  toString(): string {
    return `Timestamp(seconds=${this.seconds}, nanoseconds=${this.nanoseconds})`;
  }
}

export type SentinelOp =
  | { __op: 'serverTimestamp' }
  | { __op: 'increment'; by: number }
  | { __op: 'arrayUnion'; values: unknown[] }
  | { __op: 'arrayRemove'; values: unknown[] }
  | { __op: 'delete' };

/** Marker class for write sentinels created on the client. */
export class FieldValue {
  constructor(public readonly op: SentinelOp) {}
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

export const isTaggedTimestamp = (v: unknown): v is { __ts: number } =>
  isPlainObject(v) && typeof v.__ts === 'number' && Object.keys(v).length === 1;

export const isSentinel = (v: unknown): v is SentinelOp =>
  isPlainObject(v) && typeof v.__op === 'string';

/** Encode SDK values (Timestamp, Date, FieldValue) to their tagged JSON form. */
export function encodeValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Timestamp) return { __ts: value.toMillis() };
  if (value instanceof Date) return { __ts: value.getTime() };
  if (value instanceof FieldValue) {
    const op = value.op;
    if (op.__op === 'arrayUnion' || op.__op === 'arrayRemove') {
      return { ...op, values: op.values.map(encodeValue) };
    }
    return op;
  }
  if (Array.isArray(value)) return value.map((v) => (v === undefined ? null : encodeValue(v)));
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    // Timestamp-like objects (e.g. from another SDK instance)
    return { __ts: (value as { toDate(): Date }).toDate().getTime() };
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    // Firestore rejects undefined; the app relies on dropping them silently
    // in a few places, so we drop them instead of throwing.
    if (v !== undefined) out[k] = encodeValue(v);
  }
  return out;
}

/** Decode tagged JSON into SDK values (Timestamp instances). */
export function decodeValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (isTaggedTimestamp(value)) return Timestamp.fromMillis(value.__ts);
  if (Array.isArray(value)) return value.map(decodeValue);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = decodeValue(v);
  return out;
}

// ---------------------------------------------------------------------------
// Query & write specs exchanged with /api/db
// ---------------------------------------------------------------------------

export type WhereOp =
  | '==' | '!=' | '<' | '<=' | '>' | '>='
  | 'in' | 'not-in' | 'array-contains' | 'array-contains-any';

export interface QuerySpec {
  /** Collection path (e.g. "courses/abc/modules"), or collection ID for a group query. */
  path: string;
  group?: boolean;
  filters: { field: string; op: WhereOp; value: unknown }[];
  orderBy: { field: string; dir: 'asc' | 'desc' }[];
  limit?: number;
  limitToLast?: number;
}

export type WriteSpec =
  | { type: 'set'; path: string; data: Record<string, unknown>; merge?: boolean }
  | { type: 'update'; path: string; data: Record<string, unknown> }
  | { type: 'delete'; path: string };

export interface Precondition {
  path: string;
  /** Expected version; 0 means "document must not exist". */
  version: number;
}

export interface WireDoc {
  path: string;
  id: string;
  data: Record<string, unknown> | null;
  version: number;
}

export type DbRequest =
  | { action: 'get'; path: string }
  | { action: 'query'; query: QuerySpec }
  | { action: 'commit'; writes: WriteSpec[]; preconditions?: Precondition[] };

export type DbErrorCode =
  | 'permission-denied' | 'not-found' | 'already-exists' | 'aborted'
  | 'invalid-argument' | 'unauthenticated' | 'internal';

/** Validates a slash-separated path. `kind` checks segment parity. */
export function validatePath(path: string, kind: 'doc' | 'collection'): string[] {
  if (typeof path !== 'string' || !path || path.length > 1500) throw new Error(`Invalid path: ${path}`);
  const segs = path.split('/');
  if (segs.some((s) => !s || s === '.' || s === '..' || s.length > 300 || /^__.*__$/.test(s))) {
    throw new Error(`Invalid path: ${path}`);
  }
  const even = segs.length % 2 === 0;
  if (kind === 'doc' && !even) throw new Error(`Not a document path: ${path}`);
  if (kind === 'collection' && even) throw new Error(`Not a collection path: ${path}`);
  return segs;
}

const AUTO_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** 20-character random ID, same shape as Firestore auto IDs. */
export function autoId(): string {
  const bytes = new Uint8Array(20);
  globalThis.crypto.getRandomValues(bytes);
  let id = '';
  for (const b of bytes) id += AUTO_ID_CHARS[b % AUTO_ID_CHARS.length];
  return id;
}
