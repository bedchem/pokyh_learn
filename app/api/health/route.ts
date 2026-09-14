import { NextResponse } from 'next/server';

import { getServerConfig } from '@/lib/server/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const headers = { 'Cache-Control': 'no-store, max-age=0' };

/**
 * Container liveness/configuration check. It deliberately does not call the
 * upstream API, so a transient API outage is not mistaken for a dead frontend.
 */
export function GET() {
  try {
    getServerConfig();
    return NextResponse.json({ status: 'ok' }, { headers });
  } catch {
    return NextResponse.json({ status: 'misconfigured' }, { status: 503, headers });
  }
}
