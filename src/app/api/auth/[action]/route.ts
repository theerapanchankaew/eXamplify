import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  assertSameOrigin, authenticate, AuthError, changePassword, clientIp, createUser, currentUser,
  endSession, normalizeEmail, rateLimit, startSession, updateProfile,
} from '@/server/auth';
import { errorResponse, noStore, readJson } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ action: string }> };

/** GET /api/auth/session — the signed-in user, or null. */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { action } = await params;
    if (action !== 'session') throw new AuthError('not-found', 'Not found.', 404);
    return NextResponse.json({ user: await currentUser() }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}

/** POST /api/auth/{signup|signin|signout|profile|password} */
export async function POST(req: Request, { params }: Params) {
  try {
    assertSameOrigin(req);
    const { action } = await params;
    const body = await readJson(req);
    const ip = clientIp(await headers()) ?? 'unknown';

    switch (action) {
      case 'signup': {
        if (process.env.ALLOW_SIGNUP === 'false') {
          throw new AuthError('auth/operation-not-allowed', 'Self sign-up is disabled. Ask an administrator for an account.', 403);
        }
        rateLimit(`signup:${ip}`, 5, 60 * 60_000);
        const user = await createUser({ email: body.email, password: body.password });
        await startSession(user.uid);
        return NextResponse.json({ user }, { headers: noStore });
      }
      case 'signin': {
        rateLimit(`signin:${ip}:${normalizeEmail(body.email)}`, 10, 15 * 60_000);
        const user = await authenticate(body.email, body.password);
        await startSession(user.uid);
        return NextResponse.json({ user }, { headers: noStore });
      }
      case 'signout':
        await endSession();
        return NextResponse.json({ ok: true }, { headers: noStore });
      case 'profile': {
        const me = await currentUser();
        if (!me) throw new AuthError('auth/unauthenticated', 'Not signed in.', 401);
        return NextResponse.json({ user: await updateProfile(me.uid, body) }, { headers: noStore });
      }
      case 'password': {
        const me = await currentUser();
        if (!me) throw new AuthError('auth/unauthenticated', 'Not signed in.', 401);
        rateLimit(`password:${me.uid}`, 5, 15 * 60_000);
        await changePassword(me.uid, body.currentPassword, body.newPassword);
        return NextResponse.json({ ok: true }, { headers: noStore });
      }
      default:
        throw new AuthError('not-found', 'Not found.', 404);
    }
  } catch (e) {
    return errorResponse(e);
  }
}
