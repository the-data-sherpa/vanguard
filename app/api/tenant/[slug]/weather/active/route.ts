/**
 * Active Weather Alerts API Route
 * GET /api/tenant/[slug]/weather/active - Get active weather alerts only
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContextFromRequest } from '@/lib/tenant-context';
import { getActiveAlerts } from '@/services/weather';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ctx = getTenantContextFromRequest(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Tenant context not found' }, { status: 401 });
  }

  // Check if weather alerts are enabled
  if (!ctx.features.weatherAlerts) {
    return NextResponse.json(
      { error: 'Weather alerts are not enabled for this tenant' },
      { status: 403 }
    );
  }

  try {
    const alerts = await getActiveAlerts(ctx);
    return NextResponse.json({
      items: alerts,
      totalItems: alerts.length,
    });
  } catch (error) {
    console.error('Failed to get active weather alerts:', error);
    return NextResponse.json(
      { error: 'Failed to get active weather alerts' },
      { status: 500 }
    );
  }
}
