import { NextResponse } from 'next/server';
import { assertSameOrigin, AuthError, createUser, currentUser, deleteUser } from '@/server/auth';
import { getDocument } from '@/server/store';
import { errorResponse, noStore, readJson } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const me = await currentUser();
  if (!me) throw new AuthError('auth/unauthenticated', 'Not signed in.', 401);
  const profile = await getDocument(`users/${me.uid}`);
  if (profile?.data?.role !== 'Admin') throw new AuthError('permission-denied', 'Administrators only.', 403);
  return me;
}

const ROLES = ['Admin', 'Instructor', 'Student'] as const;

/** POST /api/admin/users — create an account (admin only). */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const body = await readJson<{ email: string; password: string; username?: string; role?: string }>(req);
    const role = ROLES.find((r) => r === body.role) ?? 'Student';
    const user = await createUser({ email: body.email, password: body.password, username: body.username, role });
    return NextResponse.json({ user }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}

/** DELETE /api/admin/users — delete an account and its profile (admin only). */
export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req);
    const me = await requireAdmin();
    const { uid } = await readJson<{ uid: string }>(req);
    if (typeof uid !== 'string' || !uid || uid.includes('/')) throw new AuthError('bad-request', 'uid is required.', 400);
    if (uid === me.uid) throw new AuthError('bad-request', 'You cannot delete your own account.', 400);
    await deleteUser(uid);
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
