/**
 * Incident Sync API Route
 * POST /api/tenant/[slug]/incidents/sync - Trigger manual PulsePoint sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug } from '@/services/tenant';
import { runIncidentSync } from '@/services/incidentSync';

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

    const result = await runIncidentSync(tenant.id);

    if (result.skippedRateLimited) {
      return NextResponse.json(
        {
          ...result,
          message: 'Sync skipped due to rate limiting',
        },
        { status: 429 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to sync incidents:', error);
    return NextResponse.json(
      { error: 'Failed to sync incidents' },
      { status: 500 }
    );
  }
}
