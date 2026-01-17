/**
 * Weather Cron API Route
 * POST /api/cron/weather - Sync all tenants' weather alerts (called by Vercel Cron)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAllTenantsWeatherSync } from '@/services/incidentSync';

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Starting weather sync for all tenants');
    const result = await runAllTenantsWeatherSync();

    console.log(
      `[Cron] Weather sync complete: ${result.tenantsProcessed} tenants processed, ` +
        `${result.totalCreated} created, ${result.totalUpdated} updated, ` +
        `${result.totalExpired} expired`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Cron] Weather sync failed:', error);
    return NextResponse.json(
      { error: 'Failed to sync weather alerts' },
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
