/**
 * Incidents Cron API Route
 * POST /api/cron/incidents - Sync all tenants (called by Vercel Cron)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAllTenantsIncidentSync } from '@/services/incidentSync';

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Starting incident sync for all tenants');
    const result = await runAllTenantsIncidentSync();

    console.log(
      `[Cron] Incident sync complete: ${result.tenantsProcessed} tenants processed, ` +
        `${result.tenantsSkipped} skipped, ${result.totalCreated} created, ` +
        `${result.totalUpdated} updated, ${result.totalClosed} closed`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Cron] Incident sync failed:', error);
    return NextResponse.json(
      { error: 'Failed to sync incidents' },
      { status: 500 }
    );
  }
}

// Allow GET for testing in development
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  return POST(request);
}
