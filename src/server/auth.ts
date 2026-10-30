// Authentication: users, passwords, sessions. Server-only.
import { createCipheriv, createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { autoId } from '@/lib/db/wire';
import { withClient, withTransaction } from './db';
import { commit, SYSTEM } from './store';
import type { AuthContext } from './rules';

export const SESSION_COOKIE = 'examplify_session';
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 7);
export const MIN_PASSWORD_LENGTH = 8;

export interface PublicUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

export class AuthError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
  }
}

const scrypt = (pw: string | Buffer, salt: Buffer, len: number, opts: ScryptOptions) =>
  new Promise<Buffer>((res, rej) => scryptCb(pw, salt, len, opts, (e, k) => (e ? rej(e) : res(k))));

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

const N = 16384, R = 8, P = 1, KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/**
 * Verifies Firebase Auth's modified-scrypt hash (users imported with
 * scripts/migrate-from-firebase). Parameters come from Firebase Console ->
 * Authentication -> Users -> ⋮ -> Password hash parameters.
 */
async function verifyFirebaseScrypt(password: string, hashB64: string, saltB64: string): Promise<boolean> {
  const signerKey = process.env.FIREBASE_HASH_SIGNER_KEY;
  const separator = process.env.FIREBASE_HASH_SALT_SEPARATOR;
  const rounds = Number(process.env.FIREBASE_HASH_ROUNDS);
  const memCost = Number(process.env.FIREBASE_HASH_MEM_COST);
  if (!signerKey || !separator || !rounds || !memCost) {
    console.error('[auth] Firebase password hash parameters are not configured; imported users cannot sign in.');
    return false;
  }
  const salt = Buffer.concat([Buffer.from(saltB64, 'base64'), Buffer.from(separator, 'base64')]);
  const derived = await scrypt(Buffer.from(password, 'utf8'), salt, 64, {
    N: 2 ** memCost, r: rounds, p: 1, maxmem: 256 * 1024 * 1024,
  });
  const cipher = createCipheriv('aes-256-ctr', derived.subarray(0, 32), Buffer.alloc(16, 0));
  const out = Buffer.concat([cipher.update(Buffer.from(signerKey, 'base64')), cipher.final()]);
  const expected = Buffer.from(hashB64, 'base64');
  return out.length === expected.length && timingSafeEqual(out, expected);
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts[0] === 'scrypt' && parts.length === 6) {
    const [, n, r, p, saltB64, keyB64] = parts;
    const expected = Buffer.from(keyB64, 'base64');
    const key = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, {
      N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
    });
    return timingSafeEqual(key, expected);
  }
  if (parts[0] === 'firebase-scrypt' && parts.length === 3) {
    return verifyFirebaseScrypt(password, parts[1], parts[2]);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

interface UserRow { uid: string; email: string; password_hash: string | null; display_name: string | null; photo_url: string | null; disabled: boolean }

const toPublic = (r: UserRow): PublicUser => ({ uid: r.uid, email: r.email, displayName: r.display_name, photoURL: r.photo_url });

export const normalizeEmail = (email: unknown): string => {
  const e = String(email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 254) throw new AuthError('auth/invalid-email', 'The email address is badly formatted.');
  return e;
};

function checkPassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH || password.length > 256) {
    throw new AuthError('auth/weak-password', `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  return password;
}

const bootstrapAdmins = () =>
  (process.env.BOOTSTRAP_ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

/**
 * Creates an account and its `users/{uid}` profile. The role is decided
 * here, never by the client: "Admin" for BOOTSTRAP_ADMIN_EMAILS, otherwise
 * `role` if the caller is trusted (admin UI), otherwise "Student".
 */
export async function createUser(input: {
  email: unknown; password: unknown; username?: string; role?: 'Admin' | 'Instructor' | 'Student';
}): Promise<PublicUser> {
  const email = normalizeEmail(input.email);
  const password = checkPassword(input.password);
  const role = bootstrapAdmins().includes(email) ? 'Admin' : (input.role ?? 'Student');
  const passwordHash = await hashPassword(password);
  const uid = autoId() + autoId().slice(0, 8); // 28 chars, like Firebase UIDs

  const user = await withTransaction(async (client) => {
    const { rows } = await client.query<UserRow>(
      `INSERT INTO auth_users (uid, email, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING RETURNING *`, [uid, email, passwordHash]);
    if (!rows[0]) throw new AuthError('auth/email-already-in-use', 'The email address is already in use by another account.', 409);
    return toPublic(rows[0]);
  });

  const writes = [{
    type: 'set' as const, path: `users/${uid}`,
    data: { id: uid, email, role, username: input.username?.trim() || email.split('@')[0] },
  }];
  if (role === 'Admin') writes.push({ type: 'set' as const, path: `roles_admin/${uid}`, data: { role: 'admin' } as never });
  await commit(SYSTEM, writes);
  return user;
}

export async function deleteUser(uid: string): Promise<void> {
  await withTransaction((c) => c.query('DELETE FROM auth_users WHERE uid = $1', [uid]));
  await commit(SYSTEM, [
    { type: 'delete', path: `users/${uid}` },
    { type: 'delete', path: `roles_admin/${uid}` },
  ]);
}

export async function authenticate(emailInput: unknown, password: unknown): Promise<PublicUser> {
  const email = normalizeEmail(emailInput);
  const row = await withClient(async (c) =>
    (await c.query<UserRow>('SELECT * FROM auth_users WHERE email = $1', [email])).rows[0]);
  // Same error for unknown user / wrong password (no account enumeration).
  const invalid = new AuthError('auth/invalid-credential', 'Invalid email or password.', 401);
  if (!row || typeof password !== 'string') {
    await hashPassword('timing-equalizer');
    throw invalid;
  }
  if (!(await verifyPassword(password, row.password_hash))) throw invalid;
  if (row.disabled) throw new AuthError('auth/user-disabled', 'This account has been disabled.', 403);

  // Upgrade imported Firebase hashes to the native format on first login.
  const upgrade = row.password_hash?.startsWith('firebase-scrypt$') ? await hashPassword(password) : null;
  await withClient((c) => c.query(
    'UPDATE auth_users SET last_login_at = now(), password_hash = COALESCE($2, password_hash) WHERE uid = $1',
    [row.uid, upgrade]));
  return toPublic(row);
}

export async function updateProfile(uid: string, p: { displayName?: unknown; photoURL?: unknown }): Promise<PublicUser> {
  const str = (v: unknown, max: number) => (v === undefined ? undefined : v === null ? null : String(v).slice(0, max));
  const displayName = str(p.displayName, 200), photoURL = str(p.photoURL, 2048);
  if (typeof photoURL === 'string' && photoURL && !/^https?:\/\//.test(photoURL) && !photoURL.startsWith('data:image/')) {
    throw new AuthError('auth/invalid-photo-url', 'Photo URL must be http(s).');
  }
  const { rows } = await withClient((c) => c.query<UserRow>(
    `UPDATE auth_users SET
       display_name = CASE WHEN $2::boolean THEN $3 ELSE display_name END,
       photo_url    = CASE WHEN $4::boolean THEN $5 ELSE photo_url END
     WHERE uid = $1 RETURNING *`,
    [uid, displayName !== undefined, displayName ?? null, photoURL !== undefined, photoURL ?? null]));
  if (!rows[0]) throw new AuthError('auth/user-not-found', 'User not found.', 404);
  return toPublic(rows[0]);
}

export async function changePassword(uid: string, current: unknown, next: unknown): Promise<void> {
  const row = await withClient(async (c) => (await c.query<UserRow>('SELECT * FROM auth_users WHERE uid = $1', [uid])).rows[0]);
  if (!row || typeof current !== 'string' || !(await verifyPassword(current, row.password_hash))) {
    throw new AuthError('auth/wrong-password', 'Current password is incorrect.', 401);
  }
  const hash = await hashPassword(checkPassword(next));
  await withClient((c) => c.query('UPDATE auth_users SET password_hash = $2 WHERE uid = $1', [uid, hash]));
}

// ---------------------------------------------------------------------------
// Sessions (opaque random token in an httpOnly cookie; sha256 stored in DB)
// ---------------------------------------------------------------------------

const tokenId = (token: string) => createHash('sha256').update(token).digest('hex');

const cookieSecure = () =>
  process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : (process.env.APP_URL || '').startsWith('https://');

export async function startSession(uid: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  const h = await headers();
  await withClient((c) => c.query(
    'INSERT INTO sessions (id, uid, expires_at, user_agent, ip) VALUES ($1, $2, $3, $4, $5)',
    [tokenId(token), uid, expires, h.get('user-agent')?.slice(0, 300) ?? null, clientIp(h)]));
  // Opportunistic cleanup of expired sessions.
  withClient((c) => c.query('DELETE FROM sessions WHERE expires_at < now()')).catch(() => {});
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: cookieSecure(), path: '/', expires,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await withClient((c) => c.query('DELETE FROM sessions WHERE id = $1', [tokenId(token)]));
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user for this request, or null. */
export async function currentUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await withClient(async (c) => (await c.query<UserRow>(
    `SELECT u.* FROM sessions s JOIN auth_users u ON u.uid = s.uid
     WHERE s.id = $1 AND s.expires_at > now() AND NOT u.disabled`, [tokenId(token)])).rows[0]);
  return row ? toPublic(row) : null;
}

export async function currentAuth(): Promise<AuthContext | null> {
  const u = await currentUser();
  return u ? { uid: u.uid, email: u.email } : null;
}

// ---------------------------------------------------------------------------
// Request hardening
// ---------------------------------------------------------------------------

export function clientIp(h: Headers): string | null {
  return h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || null;
}

/**
 * Rejects cross-site state-changing requests: requires a JSON body and an
 * Origin header that matches the host the request was sent to.
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new AuthError('bad-request', 'Expected application/json.', 415);
  if (!origin || !host) throw new AuthError('forbidden', 'Missing Origin header.', 403);
  try {
    if (new URL(origin).host !== host) throw new Error();
  } catch {
    throw new AuthError('forbidden', 'Cross-origin request rejected.', 403);
  }
}

const attempts = new Map<string, number[]>();
/** Simple in-memory limiter (per app instance): `max` attempts per `windowMs`. */
export function rateLimit(key: string, max = 10, windowMs = 15 * 60_000): void {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) throw new AuthError('auth/too-many-requests', 'Too many attempts. Please try again later.', 429);
  list.push(now);
  attempts.set(key, list);
  if (attempts.size > 10_000) attempts.clear();
}
