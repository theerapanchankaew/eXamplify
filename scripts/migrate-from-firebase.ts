/**
 * One-time migration: copy all Firestore documents and Firebase Auth users
 * from a Firebase project into the self-hosted PostgreSQL database.
 *
 *   npm run migrate:firebase -- --credentials ./service-account.json [--dry-run] [--only=firestore|auth]
 *
 * Requires DATABASE_URL. The service account key comes from Firebase Console
 * -> Project settings -> Service accounts -> Generate new private key.
 *
 * - Document paths and IDs are kept exactly (users keep the same UID).
 * - Re-running is safe: existing rows are overwritten with Firebase's data.
 * - Passwords: Firebase's scrypt hashes are imported as-is. Users keep their
 *   passwords once FIREBASE_HASH_* is set in the app environment (Firebase
 *   Console -> Authentication -> Users -> ⋮ -> Password hash parameters).
 *   Each hash is upgraded to the native format on the user's first sign-in.
 */
import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  getFirestore, Timestamp, GeoPoint, DocumentReference,
  type CollectionReference, type Firestore,
} from 'firebase-admin/firestore';
import { ensureSchema, getPool } from '../src/server/db';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  if (hit.includes('=')) return hit.split('=').slice(1).join('=');
  const next = args[args.indexOf(hit) + 1];
  return next && !next.startsWith('--') ? next : 'true';
};

const DRY_RUN = flag('dry-run') === 'true';
const ONLY = flag('only');
const credentialsPath = flag('credentials') || process.env.GOOGLE_APPLICATION_CREDENTIALS;

/** Converts Firestore values to the store's JSON format. */
function convert(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Timestamp) return { __ts: value.toMillis() };
  if (value instanceof Date) return { __ts: value.getTime() };
  if (value instanceof GeoPoint) return { latitude: value.latitude, longitude: value.longitude };
  if (value instanceof DocumentReference) return value.path;
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return Buffer.from(value).toString('base64');
  if (Array.isArray(value)) return value.map(convert);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = convert(v);
    return out;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return null; // NaN/Infinity are not JSON
  return value;
}

interface Row { path: string; parent: string; collectionId: string; id: string; data: unknown }

async function upsert(rows: Row[]) {
  if (DRY_RUN || rows.length === 0) return;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    for (const r of rows) {
      await client.query(
        `INSERT INTO documents (path, parent, collection_id, id, data) VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT (path) DO UPDATE SET data = EXCLUDED.data, version = documents.version + 1, updated_at = now()`,
        [r.path, r.parent, r.collectionId, r.id, JSON.stringify(r.data)]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function copyCollection(col: CollectionReference, stats: Map<string, number>): Promise<void> {
  // listDocuments() also returns "missing" parents that only hold subcollections.
  const refs = await col.listDocuments();
  let batch: Row[] = [];
  for (const ref of refs) {
    const snap = await ref.get();
    if (snap.exists) {
      batch.push({ path: ref.path, parent: col.path, collectionId: col.id, id: ref.id, data: convert(snap.data()) });
      stats.set(col.id, (stats.get(col.id) || 0) + 1);
    }
    if (batch.length >= 200) { await upsert(batch); batch = []; }
    for (const sub of await ref.listCollections()) await copyCollection(sub, stats);
  }
  await upsert(batch);
}

async function migrateFirestore(db: Firestore) {
  console.log('\n== Firestore ==');
  const stats = new Map<string, number>();
  for (const col of await db.listCollections()) {
    process.stdout.write(`  ${col.id} ... `);
    const before = [...stats.values()].reduce((a, b) => a + b, 0);
    await copyCollection(col, stats);
    console.log(`${[...stats.values()].reduce((a, b) => a + b, 0) - before} documents (incl. subcollections)`);
  }
  console.log('  Per collection ID:', Object.fromEntries([...stats].sort()));
}

async function migrateAuth() {
  console.log('\n== Authentication ==');
  const auth = getAuth();
  let pageToken: string | undefined;
  let imported = 0, skipped = 0, withoutPassword = 0;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      if (!u.email) { skipped++; continue; } // anonymous / phone-only accounts
      const hash = u.passwordHash && u.passwordSalt ? `firebase-scrypt$${u.passwordHash}$${u.passwordSalt}` : null;
      if (!hash) withoutPassword++;
      if (!DRY_RUN) {
        await getPool().query(
          `INSERT INTO auth_users (uid, email, password_hash, display_name, photo_url, disabled, created_at, last_login_at)
           VALUES ($1, lower($2), $3, $4, $5, $6, $7, $8)
           ON CONFLICT (uid) DO UPDATE SET email = EXCLUDED.email, password_hash = COALESCE(EXCLUDED.password_hash, auth_users.password_hash),
             display_name = EXCLUDED.display_name, photo_url = EXCLUDED.photo_url, disabled = EXCLUDED.disabled`,
          [u.uid, u.email, hash, u.displayName ?? null, u.photoURL ?? null, u.disabled,
            new Date(u.metadata.creationTime), u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime) : null]);
      }
      imported++;
    }
    pageToken = page.pageToken;
  } while (pageToken);
  console.log(`  imported: ${imported}, skipped (no email): ${skipped}, without password hash: ${withoutPassword}`);
  if (withoutPassword > 0) {
    console.log('  NOTE: users without a password hash (e.g. Google sign-in, or a service account lacking');
    console.log('  the "Firebase Authentication Admin" role) must have a password set by an administrator.');
  }
}

async function main() {
  if (!credentialsPath) throw new Error('Pass --credentials <service-account.json> or set GOOGLE_APPLICATION_CREDENTIALS.');
  const serviceAccount = JSON.parse(readFileSync(credentialsPath, 'utf8'));
  initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
  console.log(`Firebase project: ${serviceAccount.project_id}${DRY_RUN ? '  (dry run — nothing is written)' : ''}`);

  if (!DRY_RUN) await ensureSchema();
  if (!ONLY || ONLY === 'firestore') await migrateFirestore(getFirestore());
  if (!ONLY || ONLY === 'auth') await migrateAuth();
  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error('\nMigration failed:', e.message || e);
    process.exitCode = 1;
  })
  .finally(() => getPool().end().catch(() => {}));
