/**
 * Unit Legend API Endpoint
 * GET: Retrieve the stored unit legend for a tenant
 * POST: Sync/refresh unit legend from PulsePoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug } from '@/services/tenant';
import { syncTenantUnitLegend } from '@/services/pulsepoint';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/tenant/[slug]/units/legend
 * Returns the stored unit legend for the tenant
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({
      unitLegend: tenant.unitLegend || [],
      updatedAt: tenant.unitLegendUpdatedAt || null,
      unitCount: tenant.unitLegend?.length || 0,
    });
  } catch (error) {
    console.error('[API] Unit legend GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenant/[slug]/units/legend
 * Syncs/refreshes the unit legend from PulsePoint
 * Query params:
 *   - force=true: Force refresh even if recently updated or marked unavailable
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check for force parameter
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const result = await syncTenantUnitLegend(tenant.id, force);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      unitCount: result.unitCount,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error('[API] Unit legend POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
