'use client';

// Browser auth with the same API surface as the Firebase Auth web SDK (the
// subset this app uses), backed by /api/auth/* and an httpOnly session cookie.

import { refreshAllListeners } from '@/lib/db/client';

export interface UserInfo { providerId: string; uid: string }

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  providerData: UserInfo[];
  tenantId: string | null;
  /** Kept for compatibility. Requests are authenticated by the session cookie. */
  getIdToken(forceRefresh?: boolean): Promise<string>;
  reload(): Promise<void>;
}

export interface UserCredential { user: User }

export class AuthError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'FirebaseError';
  }
}

type PublicUser = { uid: string; email: string; displayName: string | null; photoURL: string | null };
type NextFn = (user: User | null) => void;
type ErrorFn = (e: Error) => void;

function toUser(p: PublicUser): User {
  return {
    uid: p.uid,
    email: p.email,
    displayName: p.displayName,
    photoURL: p.photoURL,
    emailVerified: false,
    phoneNumber: null,
    providerData: [{ providerId: 'password', uid: p.email }],
    tenantId: null,
    getIdToken: async () => '',
    reload: async () => { await auth._load(); },
  };
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AuthError(json?.error?.code || 'auth/internal-error', json?.error?.message || `Request failed (${res.status}).`);
  }
  return json as T;
}

export class Auth {
  currentUser: User | null = null;
  private listeners = new Set<{ next: NextFn; error?: ErrorFn }>();
  private loaded = false;
  private loading: Promise<void> | null = null;

  /** Fetches the session from the server (once, unless forced). */
  _load(): Promise<void> {
    this.loading = fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { user: PublicUser | null }) => this._set(j.user ? toUser(j.user) : null))
      .catch((e) => {
        this.loaded = true;
        for (const l of this.listeners) l.error?.(e);
      });
    return this.loading;
  }

  _set(user: User | null) {
    const changed = this.currentUser?.uid !== user?.uid;
    this.currentUser = user;
    this.loaded = true;
    for (const l of this.listeners) l.next(user);
    if (changed) refreshAllListeners();
  }

  _subscribe(next: NextFn, error?: ErrorFn): () => void {
    const l = { next, error };
    this.listeners.add(l);
    if (this.loaded) queueMicrotask(() => this.listeners.has(l) && next(this.currentUser));
    else if (!this.loading) void this._load();
    return () => { this.listeners.delete(l); };
  }

  /** Re-notify listeners after an in-place profile change. */
  _notify() {
    for (const l of this.listeners) l.next(this.currentUser);
  }
}

const auth = new Auth();
export const getAuth = (_app?: unknown): Auth => auth;

export function onAuthStateChanged(a: Auth, next: NextFn, error?: ErrorFn): () => void {
  return a._subscribe(next, error);
}

export async function signInWithEmailAndPassword(a: Auth, email: string, password: string): Promise<UserCredential> {
  const { user } = await post<{ user: PublicUser }>('signin', { email, password });
  const u = toUser(user);
  a._set(u);
  return { user: u };
}

export async function createUserWithEmailAndPassword(a: Auth, email: string, password: string): Promise<UserCredential> {
  const { user } = await post<{ user: PublicUser }>('signup', { email, password });
  const u = toUser(user);
  a._set(u);
  return { user: u };
}

export async function signOut(a: Auth): Promise<void> {
  await post('signout', {});
  a._set(null);
}

export async function updateProfile(user: User, profile: { displayName?: string | null; photoURL?: string | null }): Promise<void> {
  const { user: updated } = await post<{ user: PublicUser }>('profile', profile);
  Object.assign(user, { displayName: updated.displayName, photoURL: updated.photoURL });
  if (auth.currentUser && auth.currentUser.uid === updated.uid) {
    if (auth.currentUser !== user) Object.assign(auth.currentUser, { displayName: updated.displayName, photoURL: updated.photoURL });
    auth._notify();
  }
}

export async function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
  await post('password', { currentPassword, newPassword });
}

export async function signInAnonymously(_a: Auth): Promise<UserCredential> {
  throw new AuthError('auth/operation-not-allowed', 'Anonymous sign-in is not supported.');
}
