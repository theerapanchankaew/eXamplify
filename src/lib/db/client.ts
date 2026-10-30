'use client';

// Browser data layer with the same API surface as the Firebase Firestore
// web SDK (the subset this app uses), backed by /api/db on our own server.
// Existing code keeps calling collection()/query()/getDocs()/... unchanged.
//
// Realtime: onSnapshot() re-fetches on an interval while the tab is visible
// and immediately after any write made from this browser.

import {
  type DbRequest, type Precondition, type QuerySpec, type WhereOp, type WireDoc, type WriteSpec,
  FieldValue, Timestamp, autoId, decodeValue, encodeValue, validatePath,
} from './wire';

export { Timestamp, FieldValue };

export type DocumentData = Record<string, any>;
export type SetOptions = { merge?: boolean };

/** How often live queries (useCollection/useDoc) refresh while the tab is visible. */
const POLL_INTERVAL_MS = 5000;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class FirestoreError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'FirebaseError';
  }
}

async function call<T>(req: DbRequest): Promise<T> {
  let res: Response;
  try {
    res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(req),
    });
  } catch (e) {
    throw new FirestoreError('unavailable', `Network error: ${(e as Error).message}`);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body?.error ?? {};
    throw new FirestoreError(err.code || 'internal', err.message || `Request failed (${res.status}).`);
  }
  return body as T;
}

// ---------------------------------------------------------------------------
// References
// ---------------------------------------------------------------------------

export class Firestore {
  readonly type = 'firestore' as const;
}

const defaultDb = new Firestore();
export const getFirestore = (_app?: unknown): Firestore => defaultDb;

export class Query<T = DocumentData> {
  /** Phantom field so TypeScript can infer T from references. */
  declare readonly __type?: T;
  readonly type: 'query' | 'collection' = 'query';
  constructor(readonly firestore: Firestore, readonly _spec: QuerySpec) {}
  /** For compatibility with code that inspects Firestore SDK internals. */
  get _query() {
    const p = this._spec.path;
    return { path: { canonicalString: () => p, toString: () => p } };
  }
  withConverter(): Query<T> { return this; }
}

export class CollectionReference<T = DocumentData> extends Query<T> {
  override readonly type = 'collection' as const;
  constructor(firestore: Firestore, readonly path: string) {
    super(firestore, { path, filters: [], orderBy: [] });
  }
  get id(): string { return this.path.split('/').pop()!; }
  get parent(): DocumentReference | null {
    const segs = this.path.split('/');
    return segs.length > 1 ? new DocumentReference(this.firestore, segs.slice(0, -1).join('/')) : null;
  }
  override withConverter(): CollectionReference<T> { return this; }
}

export class DocumentReference<T = DocumentData> {
  declare readonly __type?: T;
  readonly type = 'document' as const;
  constructor(readonly firestore: Firestore, readonly path: string) {}
  get id(): string { return this.path.split('/').pop()!; }
  get parent(): CollectionReference<T> {
    return new CollectionReference(this.firestore, this.path.split('/').slice(0, -1).join('/'));
  }
  withConverter(): DocumentReference<T> { return this; }
}

type Parent = Firestore | DocumentReference | CollectionReference;

const joinPath = (base: string, path: string, rest: string[]) =>
  [base, path, ...rest].filter(Boolean).join('/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');

function wrapPathError<T>(fn: () => T): T {
  try { return fn(); } catch (e) { throw new FirestoreError('invalid-argument', (e as Error).message); }
}

export function collection(parent: Parent, path: string, ...pathSegments: string[]): CollectionReference {
  const base = parent instanceof Firestore ? '' : parent.path;
  const full = joinPath(base, path, pathSegments);
  wrapPathError(() => validatePath(full, 'collection'));
  return new CollectionReference(parent instanceof Firestore ? parent : parent.firestore, full);
}

export function doc(parent: Parent, path?: string, ...pathSegments: string[]): DocumentReference {
  const fs = parent instanceof Firestore ? parent : parent.firestore;
  const base = parent instanceof Firestore ? '' : parent.path;
  const full = parent instanceof CollectionReference && path === undefined
    ? `${base}/${autoId()}`
    : joinPath(base, path ?? '', pathSegments);
  wrapPathError(() => validatePath(full, 'doc'));
  return new DocumentReference(fs, full);
}

export function collectionGroup(firestore: Firestore, collectionId: string): Query {
  if (!collectionId || collectionId.includes('/')) throw new FirestoreError('invalid-argument', 'Invalid collection ID.');
  return new Query(firestore, { path: collectionId, group: true, filters: [], orderBy: [] });
}

// ---------------------------------------------------------------------------
// Query constraints
// ---------------------------------------------------------------------------

export interface QueryConstraint { readonly type: string; _apply(spec: QuerySpec): QuerySpec }

export function where(field: string, op: WhereOp, value: unknown): QueryConstraint {
  return { type: 'where', _apply: (s) => ({ ...s, filters: [...s.filters, { field, op, value: encodeValue(value) }] }) };
}
export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): QueryConstraint {
  return { type: 'orderBy', _apply: (s) => ({ ...s, orderBy: [...s.orderBy, { field, dir }] }) };
}
export function limit(n: number): QueryConstraint {
  return { type: 'limit', _apply: (s) => ({ ...s, limit: n, limitToLast: undefined }) };
}
export function limitToLast(n: number): QueryConstraint {
  return { type: 'limitToLast', _apply: (s) => ({ ...s, limitToLast: n, limit: undefined }) };
}

export function query<T>(base: Query<T>, ...constraints: QueryConstraint[]): Query<T> {
  return new Query<T>(base.firestore, constraints.reduce((s, c) => c._apply(s), base._spec));
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

export class DocumentSnapshot<T = DocumentData> {
  readonly metadata = { hasPendingWrites: false, fromCache: false };
  constructor(readonly ref: DocumentReference<T>, private readonly _data: T | undefined, readonly _version: number) {}
  get id(): string { return this.ref.id; }
  exists(): this is QueryDocumentSnapshot<T> { return this._data !== undefined; }
  data(): T | undefined { return this._data === undefined ? undefined : structuredCloneData(this._data); }
  get(fieldPath: string): any {
    let cur: any = this._data;
    for (const k of fieldPath.split('.')) cur = cur == null ? undefined : cur[k];
    return cur;
  }
}

export class QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<T> {
  override data(): T { return super.data() as T; }
}

export class QuerySnapshot<T = DocumentData> {
  readonly metadata = { hasPendingWrites: false, fromCache: false };
  constructor(readonly query: Query<T>, readonly docs: QueryDocumentSnapshot<T>[]) {}
  get size(): number { return this.docs.length; }
  get empty(): boolean { return this.docs.length === 0; }
  forEach(cb: (doc: QueryDocumentSnapshot<T>) => void): void { this.docs.forEach(cb); }
  docChanges() { return this.docs.map((doc, newIndex) => ({ type: 'added' as const, doc, oldIndex: -1, newIndex })); }
}

/** Deep copy that keeps Timestamp instances. */
function structuredCloneData<T>(v: T): T {
  if (v === null || typeof v !== 'object' || v instanceof Timestamp) return v;
  if (Array.isArray(v)) return v.map(structuredCloneData) as T;
  const out: any = {};
  for (const [k, x] of Object.entries(v)) out[k] = structuredCloneData(x);
  return out;
}

const toDocSnap = (fs: Firestore, w: WireDoc) =>
  new QueryDocumentSnapshot(new DocumentReference(fs, w.path), decodeValue(w.data) as DocumentData, w.version);

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getDoc<T = DocumentData>(ref: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
  const { doc: w } = await call<{ doc: WireDoc }>({ action: 'get', path: ref.path });
  return new DocumentSnapshot<T>(ref, w.data === null ? undefined : (decodeValue(w.data) as T), w.version);
}

export async function getDocs<T = DocumentData>(q: Query<T>): Promise<QuerySnapshot<T>> {
  const { docs } = await call<{ docs: WireDoc[] }>({ action: 'query', query: q._spec });
  return new QuerySnapshot<T>(q, docs.map((w) => toDocSnap(q.firestore, w)) as QueryDocumentSnapshot<T>[]);
}

export const getDocFromServer = getDoc;
export const getDocsFromServer = getDocs;

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function encodeData(data: unknown): Record<string, unknown> {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new FirestoreError('invalid-argument', 'Document data must be an object.');
  }
  return encodeValue(data) as Record<string, unknown>;
}

function updateArgs(dataOrField: unknown, rest: unknown[]): Record<string, unknown> {
  if (typeof dataOrField === 'string') {
    const out: Record<string, unknown> = {};
    const pairs = [dataOrField, ...rest];
    for (let i = 0; i < pairs.length; i += 2) out[String(pairs[i])] = pairs[i + 1];
    return encodeData(out);
  }
  return encodeData(dataOrField);
}

async function commitWrites(writes: WriteSpec[], preconditions: Precondition[] = []): Promise<void> {
  if (writes.length === 0) return;
  await call({ action: 'commit', writes, preconditions });
  notifyChanged(writes.map((w) => w.path));
}

export async function setDoc(ref: DocumentReference, data: DocumentData, options?: SetOptions): Promise<void> {
  await commitWrites([{ type: 'set', path: ref.path, data: encodeData(data), merge: !!options?.merge }]);
}

export async function addDoc(ref: CollectionReference, data: DocumentData): Promise<DocumentReference> {
  const newRef = doc(ref);
  await commitWrites([{ type: 'set', path: newRef.path, data: encodeData(data) }]);
  return newRef;
}

export async function updateDoc(ref: DocumentReference, dataOrField: DocumentData | string, ...rest: unknown[]): Promise<void> {
  await commitWrites([{ type: 'update', path: ref.path, data: updateArgs(dataOrField, rest) }]);
}

export async function deleteDoc(ref: DocumentReference): Promise<void> {
  await commitWrites([{ type: 'delete', path: ref.path }]);
}

export class WriteBatch {
  private writes: WriteSpec[] = [];
  private committed = false;
  set(ref: DocumentReference, data: DocumentData, options?: SetOptions): WriteBatch {
    this.writes.push({ type: 'set', path: ref.path, data: encodeData(data), merge: !!options?.merge });
    return this;
  }
  update(ref: DocumentReference, dataOrField: DocumentData | string, ...rest: unknown[]): WriteBatch {
    this.writes.push({ type: 'update', path: ref.path, data: updateArgs(dataOrField, rest) });
    return this;
  }
  delete(ref: DocumentReference): WriteBatch {
    this.writes.push({ type: 'delete', path: ref.path });
    return this;
  }
  async commit(): Promise<void> {
    if (this.committed) throw new FirestoreError('failed-precondition', 'A write batch can only be committed once.');
    this.committed = true;
    await commitWrites(this.writes);
  }
}

export const writeBatch = (_db?: Firestore): WriteBatch => new WriteBatch();

/**
 * Optimistic transaction: reads record each document's version; the commit
 * fails with "aborted" if any of them changed, and the function is retried.
 */
export class Transaction {
  readonly _writes: WriteSpec[] = [];
  readonly _reads = new Map<string, number>();
  async get<T = DocumentData>(ref: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
    if (this._writes.length) throw new FirestoreError('invalid-argument', 'Transactions require all reads before writes.');
    const snap = await getDoc(ref);
    this._reads.set(ref.path, snap._version);
    return snap;
  }
  set(ref: DocumentReference, data: DocumentData, options?: SetOptions): Transaction {
    this._writes.push({ type: 'set', path: ref.path, data: encodeData(data), merge: !!options?.merge });
    return this;
  }
  update(ref: DocumentReference, dataOrField: DocumentData | string, ...rest: unknown[]): Transaction {
    this._writes.push({ type: 'update', path: ref.path, data: updateArgs(dataOrField, rest) });
    return this;
  }
  delete(ref: DocumentReference): Transaction {
    this._writes.push({ type: 'delete', path: ref.path });
    return this;
  }
}

export async function runTransaction<T>(
  _db: Firestore, fn: (tx: Transaction) => Promise<T>, options?: { maxAttempts?: number },
): Promise<T> {
  const max = options?.maxAttempts ?? 5;
  let lastError: unknown;
  for (let attempt = 1; attempt <= max; attempt++) {
    const tx = new Transaction();
    const result = await fn(tx);
    try {
      const pre = [...tx._reads].map(([path, version]) => ({ path, version }));
      await commitWrites(tx._writes, pre);
      return result;
    } catch (e) {
      lastError = e;
      if (!(e instanceof FirestoreError) || e.code !== 'aborted') throw e;
      await new Promise((r) => setTimeout(r, 50 * attempt + Math.random() * 100));
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Field values
// ---------------------------------------------------------------------------

export const serverTimestamp = () => new FieldValue({ __op: 'serverTimestamp' });
export const increment = (by: number) => new FieldValue({ __op: 'increment', by });
export const arrayUnion = (...values: unknown[]) => new FieldValue({ __op: 'arrayUnion', values });
export const arrayRemove = (...values: unknown[]) => new FieldValue({ __op: 'arrayRemove', values });
export const deleteField = () => new FieldValue({ __op: 'delete' });

// ---------------------------------------------------------------------------
// Realtime (polling + local change notifications)
// ---------------------------------------------------------------------------

type Listener = { paths: () => string[]; refresh: () => void };
const listeners = new Set<Listener>();

function notifyChanged(paths: string[]) {
  for (const l of listeners) {
    const watched = l.paths();
    // Refresh if a written doc is the watched doc, or lives in the watched collection / group.
    if (paths.some((p) => watched.some((w) => p === w || p.startsWith(w + '/') || p.split('/').includes(w)))) {
      l.refresh();
    }
  }
}

/** Re-fetch all live queries (e.g. after sign-in/out). */
export function refreshAllListeners(): void {
  for (const l of listeners) l.refresh();
}

type Unsubscribe = () => void;

export function onSnapshot<T = DocumentData>(
  target: Query<T> | DocumentReference<T>,
  onNext: (snap: any) => void,
  onError?: (e: FirestoreError) => void,
): Unsubscribe {
  let stopped = false;
  let inFlight = false;
  let queued = false;
  let lastKey: string | null = null;

  const fetchOnce = async () => {
    if (stopped) return;
    if (inFlight) { queued = true; return; }
    inFlight = true;
    try {
      if (target instanceof DocumentReference) {
        const { doc: w } = await call<{ doc: WireDoc }>({ action: 'get', path: target.path });
        const key = JSON.stringify(w);
        if (!stopped && key !== lastKey) {
          lastKey = key;
          onNext(new DocumentSnapshot<T>(target, w.data === null ? undefined : (decodeValue(w.data) as T), w.version));
        }
      } else {
        const { docs } = await call<{ docs: WireDoc[] }>({ action: 'query', query: target._spec });
        const key = JSON.stringify(docs);
        if (!stopped && key !== lastKey) {
          lastKey = key;
          onNext(new QuerySnapshot<T>(target, docs.map((w) => toDocSnap(target.firestore, w)) as QueryDocumentSnapshot<T>[]));
        }
      }
    } catch (e) {
      if (!stopped) {
        lastKey = null;
        const err = e instanceof FirestoreError ? e : new FirestoreError('internal', String(e));
        if (onError) onError(err); else console.error(err);
      }
    } finally {
      inFlight = false;
      if (queued && !stopped) { queued = false; void fetchOnce(); }
    }
  };

  const listener: Listener = {
    paths: () => (target instanceof DocumentReference ? [target.path] : [target._spec.path]),
    refresh: () => void fetchOnce(),
  };
  listeners.add(listener);

  const tick = () => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') void fetchOnce();
  };
  const timer = setInterval(tick, POLL_INTERVAL_MS);
  const onVisible = () => { if (document.visibilityState === 'visible') void fetchOnce(); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
  void fetchOnce();

  return () => {
    stopped = true;
    clearInterval(timer);
    listeners.delete(listener);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
  };
}

// No-ops kept for API compatibility.
export const connectFirestoreEmulator = (..._args: unknown[]): void => {};
