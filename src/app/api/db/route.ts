import { NextResponse } from 'next/server';
import type { DbRequest } from '@/lib/db/wire';
import { assertSameOrigin, currentAuth } from '@/server/auth';
import { commit, getForPrincipal, runQuery, StoreError } from '@/server/store';
import { errorResponse, noStore, readJson } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Document API used by the browser data layer (src/lib/db/client.ts).
 * Every operation is authorized by src/server/rules.ts.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const body = await readJson<DbRequest>(req);
    const auth = await currentAuth();

    switch (body?.action) {
      case 'get':
        return NextResponse.json({ doc: await getForPrincipal(auth, body.path) }, { headers: noStore });
      case 'query':
        return NextResponse.json({ docs: await runQuery(auth, body.query) }, { headers: noStore });
      case 'commit':
        return NextResponse.json(
          { results: await commit(auth, body.writes, body.preconditions ?? []) }, { headers: noStore });
      default:
        throw new StoreError('invalid-argument', 'Unknown action.');
    }
  } catch (e) {
    return errorResponse(e);
  }
}
