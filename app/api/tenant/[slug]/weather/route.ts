/**
 * Weather Alerts API Route
 * GET /api/tenant/[slug]/weather - List weather alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContextFromRequest } from '@/lib/tenant-context';
import { listAlerts } from '@/services/weather';
import type { AlertStatus, AlertSeverity } from '@/lib/types';

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

  const searchParams = request.nextUrl.searchParams;

  const options = {
    page: parseInt(searchParams.get('page') || '1', 10),
    perPage: Math.min(parseInt(searchParams.get('perPage') || '50', 10), 100),
    status: searchParams.get('status') as AlertStatus | undefined,
    severity: searchParams.get('severity') as AlertSeverity | undefined,
  };

  try {
    const result = await listAlerts(ctx, options);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to list weather alerts:', error);
    return NextResponse.json(
      { error: 'Failed to list weather alerts' },
      { status: 500 }
    );
  }
}
