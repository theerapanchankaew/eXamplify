/**
 * Set a new password for an account (e.g. a user who forgot theirs) and sign
 * them out everywhere.
 *
 *   docker compose run --rm -e NEW_PASSWORD='...' tools reset-password -- user@example.org
 *
 * Without NEW_PASSWORD a random password is generated and printed.
 */
import { randomBytes } from 'node:crypto';
import { hashPassword, MIN_PASSWORD_LENGTH, normalizeEmail } from '../src/server/auth';
import { getPool, withClient } from '../src/server/db';

async function main() {
  const email = normalizeEmail(process.argv[2]);
  const generated = !process.env.NEW_PASSWORD;
  const password = process.env.NEW_PASSWORD || randomBytes(9).toString('base64url');
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);

  const hash = await hashPassword(password);
  const { rows } = await withClient((c) => c.query<{ uid: string }>(
    'UPDATE auth_users SET password_hash = $2 WHERE email = $1 RETURNING uid', [email, hash]));
  if (!rows[0]) throw new Error(`No account with email ${email}.`);
  await withClient((c) => c.query('DELETE FROM sessions WHERE uid = $1', [rows[0].uid]));

  console.log(`Password reset for ${email}.${generated ? ` Temporary password: ${password}` : ''}`);
  console.log('All existing sessions for this user were signed out.');
}

main()
  .catch((e) => {
    console.error('Error:', e.message || e);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
