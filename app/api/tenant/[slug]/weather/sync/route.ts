/**
 * Weather Sync API Route
 * POST /api/tenant/[slug]/weather/sync - Trigger manual weather sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug } from '@/services/tenant';
import { syncWeatherAlerts } from '@/services/weather';
import type { TenantContext } from '@/lib/types';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check if weather alerts are enabled
    if (!tenant.features?.weatherAlerts) {
      return NextResponse.json(
        { error: 'Weather alerts are not enabled for this tenant' },
        { status: 403 }
      );
    }

    // Build tenant context for sync
    const ctx: TenantContext = {
      id: tenant.id,
      slug: tenant.slug,
      status: tenant.status,
      tier: tenant.tier,
      features: tenant.features ?? {},
    };

    const result = await syncWeatherAlerts(ctx);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to sync weather alerts:', error);
    return NextResponse.json(
      { error: 'Failed to sync weather alerts' },
      { status: 500 }
    );
  }
}
