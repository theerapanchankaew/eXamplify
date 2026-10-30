/**
 * Create an administrator account, or promote an existing account to Admin.
 *
 *   npm run create-admin -- admin@example.org
 *
 * The password is read from ADMIN_PASSWORD or prompted for (new accounts
 * only). Requires DATABASE_URL.
 *
 * With Docker Compose:
 *   docker compose run --rm -e ADMIN_PASSWORD='...' tools create-admin -- admin@example.org
 */
import { createInterface } from 'node:readline/promises';
import { createUser, normalizeEmail } from '../src/server/auth';
import { getPool, withClient } from '../src/server/db';
import { commit, SYSTEM } from '../src/server/store';

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function main() {
  const email = normalizeEmail(process.argv[2] || (await prompt('Admin email: ')));

  const existing = await withClient(async (c) =>
    (await c.query<{ uid: string }>('SELECT uid FROM auth_users WHERE email = $1', [email])).rows[0]);

  if (existing) {
    await commit(SYSTEM, [
      { type: 'set', path: `users/${existing.uid}`, data: { id: existing.uid, email, role: 'Admin' }, merge: true },
      { type: 'set', path: `roles_admin/${existing.uid}`, data: { role: 'admin' } },
    ]);
    console.log(`Promoted existing user ${email} (${existing.uid}) to Admin.`);
    return;
  }

  const password = process.env.ADMIN_PASSWORD || (await prompt('Password (min 8 chars): '));
  const user = await createUser({ email, password, role: 'Admin' });
  console.log(`Created Admin ${email} (${user.uid}).`);
}

main()
  .catch((e) => {
    console.error('Error:', e.message || e);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
