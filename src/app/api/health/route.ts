import { NextResponse } from 'next/server';
import { withClient } from '@/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Liveness/readiness probe used by Docker and the reverse proxy. */
export async function GET() {
  try {
    await withClient((c) => c.query('SELECT 1'));
    return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[health] database check failed:', e);
    return NextResponse.json({ status: 'error', database: 'unreachable' }, { status: 503 });
  }
}
