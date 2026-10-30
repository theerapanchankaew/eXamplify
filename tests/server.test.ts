/**
 * Integration tests for the document store, access rules and auth.
 * Runs against a real PostgreSQL database:
 *
 *   TEST_DATABASE_URL=postgres://user:pass@localhost:5432/examplify_test npm test
 *
 * WARNING: the test database is wiped.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
if (!process.env.DATABASE_URL) throw new Error('Set TEST_DATABASE_URL to a disposable database.');
// Official test vector from github.com/firebase/scrypt
process.env.FIREBASE_HASH_SIGNER_KEY = 'jxspr8Ki0RYycVU8zykbdLGjFQ3McFUH0uiiTvC8pVMXAn210wjLNmdZJzxUECKbm0QsEmYUSDzZvpjeJ9WmXA==';
process.env.FIREBASE_HASH_SALT_SEPARATOR = 'Bw==';
process.env.FIREBASE_HASH_ROUNDS = '8';
process.env.FIREBASE_HASH_MEM_COST = '14';
process.env.BOOTSTRAP_ADMIN_EMAILS = 'boss@example.org';

const { ensureSchema, getPool } = await import('../src/server/db');
const store = await import('../src/server/store');
const authMod = await import('../src/server/auth');
const { commit, getForPrincipal, runQuery, StoreError } = store;
const SYSTEM: typeof store.SYSTEM = store.SYSTEM;

const alice = { uid: 'alice' }, bob = { uid: 'bob' }, admin = { uid: 'admin1' }, teacher = { uid: 'teach' };
const denied = (p: Promise<unknown>) => assert.rejects(p, (e: unknown) => e instanceof StoreError && e.code === 'permission-denied');

before(async () => {
  await ensureSchema();
  await getPool().query('TRUNCATE documents, sessions, auth_users CASCADE');
  await commit(SYSTEM, [
    { type: 'set', path: 'users/alice', data: { id: 'alice', role: 'Student', email: 'a@x.org' } },
    { type: 'set', path: 'users/bob', data: { id: 'bob', role: 'Student', email: 'b@x.org' } },
    { type: 'set', path: 'users/admin1', data: { id: 'admin1', role: 'Admin' } },
    { type: 'set', path: 'users/teach', data: { id: 'teach', role: 'Instructor' } },
    { type: 'set', path: 'courses/c1', data: { name: 'ISO 9001', instructorId: 'teach', enrollment_count: 0, price: 10 } },
    { type: 'set', path: 'courses/c1/exams/e1', data: { name: 'Final', passingScore: 50 } },
    { type: 'set', path: 'courses/c1/exams/e1/questions/q1', data: { text: '1+1', correctAnswer: '2', points: 1 } },
    { type: 'set', path: 'courses/c1/modules/m1', data: { courseId: 'c1', name: 'Intro', order: 2 } },
    { type: 'set', path: 'courses/c1/modules/m2', data: { courseId: 'c1', name: 'Basics', order: 1 } },
    { type: 'set', path: 'courses/c1/modules/m1/chapters/ch1', data: { moduleId: 'm1', title: 'Ch 1' } },
    { type: 'set', path: 'examResults/r1', data: { userId: 'alice', score: 1 } },
    { type: 'set', path: 'examResults/r2', data: { userId: 'bob', score: 0 } },
    { type: 'set', path: 'bookings/b1', data: { userId: 'alice', examId: 'e1', status: 'confirmed' } },
  ]);
});

after(async () => { await getPool().end(); });

// ---------------------------------------------------------------- store ----

test('set / update / merge / sentinels', async () => {
  await commit(SYSTEM, [{ type: 'set', path: 'tmp/d1', data: { a: 1, nested: { x: 1, y: 2 }, tags: ['a'] } }]);
  await commit(SYSTEM, [{ type: 'update', path: 'tmp/d1', data: {
    a: { __op: 'increment', by: 5 }, 'nested.y': 9, tags: { __op: 'arrayUnion', values: ['a', 'b'] }, at: { __op: 'serverTimestamp' },
  } }]);
  let d = (await getForPrincipal(SYSTEM, 'tmp/d1')).data!;
  assert.equal(d.a, 6);
  assert.deepEqual(d.nested, { x: 1, y: 9 });
  assert.deepEqual(d.tags, ['a', 'b']);
  assert.equal(typeof (d.at as { __ts: number }).__ts, 'number');

  await commit(SYSTEM, [{ type: 'set', path: 'tmp/d1', data: { nested: { z: 3 }, a: { __op: 'delete' } }, merge: true }]);
  d = (await getForPrincipal(SYSTEM, 'tmp/d1')).data!;
  assert.deepEqual(d.nested, { x: 1, y: 9, z: 3 }, 'merge deep-merges maps');
  assert.equal('a' in d, false, 'deleteField removes key');

  await commit(SYSTEM, [{ type: 'set', path: 'tmp/d1', data: { only: true } }]);
  assert.deepEqual((await getForPrincipal(SYSTEM, 'tmp/d1')).data, { only: true }, 'set without merge replaces');

  await assert.rejects(commit(SYSTEM, [{ type: 'update', path: 'tmp/missing', data: { a: 1 } }]),
    (e: unknown) => e instanceof StoreError && e.code === 'not-found');
});

test('queries: filters, orderBy, limit, collection group, missing-field exclusion', async () => {
  const mods = await runQuery(SYSTEM, { path: 'courses/c1/modules', filters: [], orderBy: [{ field: 'order', dir: 'asc' }] });
  assert.deepEqual(mods.map((m) => m.id), ['m2', 'm1']);

  const one = await runQuery(SYSTEM, { path: 'courses/c1/modules', filters: [{ field: 'name', op: '==', value: 'Intro' }], orderBy: [] });
  assert.deepEqual(one.map((m) => m.id), ['m1']);

  const lim = await runQuery(SYSTEM, { path: 'courses/c1/modules', filters: [], orderBy: [{ field: 'order', dir: 'desc' }], limit: 1 });
  assert.deepEqual(lim.map((m) => m.id), ['m1']);

  const range = await runQuery(SYSTEM, { path: 'courses/c1/modules', filters: [{ field: 'order', op: '>=', value: 2 }], orderBy: [] });
  assert.deepEqual(range.map((m) => m.id), ['m1']);

  const group = await runQuery(SYSTEM, { path: 'exams', group: true, filters: [], orderBy: [] });
  assert.deepEqual(group.map((g) => g.path), ['courses/c1/exams/e1']);

  const missing = await runQuery(SYSTEM, { path: 'users', filters: [], orderBy: [{ field: 'email', dir: 'asc' }] });
  assert.deepEqual(missing.map((u) => u.id), ['alice', 'bob'], 'docs without the orderBy field are excluded');
});

test('transactions: stale precondition aborts, nothing is written', async () => {
  const { version } = await getForPrincipal(SYSTEM, 'courses/c1');
  await commit(SYSTEM, [{ type: 'update', path: 'courses/c1', data: { price: 11 } }]);
  await assert.rejects(
    commit(SYSTEM, [{ type: 'update', path: 'courses/c1', data: { price: 99 } }, { type: 'set', path: 'tmp/tx', data: {} }],
      [{ path: 'courses/c1', version }]),
    (e: unknown) => e instanceof StoreError && e.code === 'aborted');
  assert.equal((await getForPrincipal(SYSTEM, 'courses/c1')).data!.price, 11);
  assert.equal((await getForPrincipal(SYSTEM, 'tmp/tx')).data, null, 'batch is atomic');
});

// ---------------------------------------------------------------- rules ----

test('rules: public course reads, anonymous cannot write', async () => {
  assert.equal((await getForPrincipal(null, 'courses/c1')).data!.name, 'ISO 9001');
  await denied(commit(null, [{ type: 'set', path: 'courses/c2', data: { name: 'x' } }]));
});

test('rules: course instructor / admin write content, students cannot', async () => {
  await denied(commit(alice, [{ type: 'set', path: 'courses/c1/modules/m3', data: { courseId: 'c1', name: 'x' } }]));
  await commit(teacher, [{ type: 'set', path: 'courses/c1/modules/m3', data: { courseId: 'c1', name: 'x' } }]);
  await denied(commit(teacher, [{ type: 'set', path: 'courses/c1/modules/m4', data: { courseId: 'WRONG', name: 'x' } }]));
  await commit(admin, [{ type: 'delete', path: 'courses/c1/modules/m3' }]);
});

test('rules: chapters require enrollment', async () => {
  await denied(getForPrincipal(alice, 'courses/c1/modules/m1/chapters/ch1'));
  await commit(alice, [{ type: 'set', path: 'enrollments/alice_c1', data: { userId: 'alice', courseId: 'c1' } }]);
  assert.equal((await getForPrincipal(alice, 'courses/c1/modules/m1/chapters/ch1')).data!.title, 'Ch 1');
  await denied(commit(alice, [{ type: 'set', path: 'enrollments/bob_c1', data: { userId: 'bob', courseId: 'c1' } }]));
});

test('rules: list results are filtered to what the user may read', async () => {
  const mine = await runQuery(alice, { path: 'examResults', filters: [], orderBy: [] });
  assert.deepEqual(mine.map((r) => r.id), ['r1']);
  const all = await runQuery(admin, { path: 'examResults', filters: [], orderBy: [] });
  assert.equal(all.length, 2);
  await denied(getForPrincipal(alice, 'examResults/r2'));
});

test('rules: users cannot self-assign Admin (CHANGED from old rules)', async () => {
  await denied(commit({ uid: 'mallory' }, [{ type: 'set', path: 'users/mallory', data: { id: 'mallory', role: 'Admin' } }]));
  await commit({ uid: 'mallory' }, [{ type: 'set', path: 'users/mallory', data: { id: 'mallory', role: 'Student' } }]);
  await denied(commit({ uid: 'mallory' }, [{ type: 'update', path: 'users/mallory', data: { role: 'Admin' } }]));
  await commit({ uid: 'mallory' }, [{ type: 'update', path: 'users/mallory', data: { username: 'm' } }]);
});

test('rules: admins can change roles only (CHANGED: old rule never allowed it)', async () => {
  await commit(admin, [{ type: 'update', path: 'users/bob', data: { role: 'Instructor' } }]);
  await denied(commit(admin, [{ type: 'update', path: 'users/bob', data: { email: 'hacked@x.org' } }]));
  await denied(commit(alice, [{ type: 'update', path: 'users/bob', data: { role: 'Admin' } }]));
});

test('rules: bookings owner-only get; any signed-in user may update enrollment_count only', async () => {
  assert.equal((await getForPrincipal(alice, 'bookings/b1')).data!.userId, 'alice');
  await denied(getForPrincipal(bob, 'bookings/b1'));
  // (bob was promoted to Instructor above; alice is still a Student)
  await commit(alice, [{ type: 'update', path: 'courses/c1', data: { enrollment_count: { __op: 'increment', by: 1 } } }]);
  await denied(commit(alice, [{ type: 'update', path: 'courses/c1', data: { price: 0 } }]));
});

test('rules: exam answers are hidden from candidates, visible to staff (NEW)', async () => {
  // alice is enrolled in c1 (earlier test) and may read questions, but not answers
  const forAlice = await runQuery(alice, { path: 'courses/c1/exams/e1/questions', filters: [], orderBy: [] });
  assert.equal(forAlice.length, 1);
  assert.equal(forAlice[0].data!.text, '1+1');
  assert.equal('correctAnswer' in forAlice[0].data!, false);
  assert.equal('correctAnswer' in (await getForPrincipal(alice, 'courses/c1/exams/e1/questions/q1')).data!, false);
  assert.equal((await getForPrincipal(teacher, 'courses/c1/exams/e1/questions/q1')).data!.correctAnswer, '2');
  assert.equal((await getForPrincipal(admin, 'courses/c1/exams/e1/questions/q1')).data!.correctAnswer, '2');
});

// ---------------------------------------------------------------- auth -----

test('auth: create, authenticate, wrong password, duplicate email', async () => {
  const u = await authMod.createUser({ email: 'Carol@Example.org', password: 'correct horse' });
  assert.equal(u.email, 'carol@example.org');
  const profile = (await getForPrincipal(SYSTEM, `users/${u.uid}`)).data!;
  assert.equal(profile.role, 'Student');
  assert.equal((await authMod.authenticate('carol@example.org', 'correct horse')).uid, u.uid);
  await assert.rejects(authMod.authenticate('carol@example.org', 'wrong pass'), { code: 'auth/invalid-credential' });
  await assert.rejects(authMod.authenticate('nobody@example.org', 'whatever1'), { code: 'auth/invalid-credential' });
  await assert.rejects(authMod.createUser({ email: 'carol@example.org', password: 'another pass' }), { code: 'auth/email-already-in-use' });
  await assert.rejects(authMod.createUser({ email: 'd@example.org', password: 'short' }), { code: 'auth/weak-password' });
});

test('auth: bootstrap admin email gets Admin role', async () => {
  const u = await authMod.createUser({ email: 'boss@example.org', password: 'boss password' });
  assert.equal((await getForPrincipal(SYSTEM, `users/${u.uid}`)).data!.role, 'Admin');
  assert.notEqual((await getForPrincipal(SYSTEM, `roles_admin/${u.uid}`)).data, null);
});

test('auth: imported Firebase scrypt password works and is upgraded on first login', async () => {
  await getPool().query(
    `INSERT INTO auth_users (uid, email, password_hash) VALUES ('fbuser', 'legacy@example.org', $1)`,
    ['firebase-scrypt$lSrfV15cpx95/sZS2W9c9Kp6i/LVgQNDNC/qzrCnh1SAyZvqmZqAjTdn3aoItz+VHjoZilo78198JAdRuid5lQ==$42xEC+ixf3L2lw==']);
  await assert.rejects(authMod.authenticate('legacy@example.org', 'wrongpassword'), { code: 'auth/invalid-credential' });
  assert.equal((await authMod.authenticate('legacy@example.org', 'user1password')).uid, 'fbuser');
  const { rows } = await getPool().query(`SELECT password_hash FROM auth_users WHERE uid = 'fbuser'`);
  assert.match(rows[0].password_hash, /^scrypt\$/, 'hash upgraded to native format');
  assert.equal((await authMod.authenticate('legacy@example.org', 'user1password')).uid, 'fbuser');
});
