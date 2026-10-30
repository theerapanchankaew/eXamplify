// Shared helpers for API route handlers. Server-only.
import { NextResponse } from 'next/server';
import { AuthError } from './auth';
import { StoreError } from './store';

const STORE_STATUS: Record<string, number> = {
  'permission-denied': 403, 'unauthenticated': 401, 'not-found': 404, 'already-exists': 409,
  'aborted': 409, 'invalid-argument': 400, 'internal': 500,
};

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof StoreError) {
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: STORE_STATUS[e.code] ?? 500 });
  }
  if (e instanceof AuthError) {
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  }
  console.error('[api] unexpected error:', e);
  return NextResponse.json({ error: { code: 'internal', message: 'Internal server error.' } }, { status: 500 });
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    const text = await req.text();
    if (text.length > 2_000_000) throw new Error('too large');
    return JSON.parse(text) as T;
  } catch {
    throw new AuthError('bad-request', 'Invalid JSON body.', 400);
  }
}

export const noStore = { 'Cache-Control': 'no-store' };
