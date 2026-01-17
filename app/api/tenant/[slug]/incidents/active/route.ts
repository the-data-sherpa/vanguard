/**
 * Active Incidents API Route
 * GET /api/tenant/[slug]/incidents/active - Get active incidents only
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContextFromRequest } from '@/lib/tenant-context';
import { getActiveIncidents } from '@/services/incident';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ctx = getTenantContextFromRequest(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Tenant context not found' }, { status: 401 });
  }

  try {
    const incidents = await getActiveIncidents(ctx);
    return NextResponse.json({
      items: incidents,
      totalItems: incidents.length,
    });
  } catch (error) {
    console.error('Failed to get active incidents:', error);
    return NextResponse.json(
      { error: 'Failed to get active incidents' },
      { status: 500 }
    );
  }
}
