/**
 * Incidents API Route
 * GET /api/tenant/[slug]/incidents - List incidents
 * POST /api/tenant/[slug]/incidents - Create user-submitted incident
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContextFromRequest } from '@/lib/tenant-context';
import {
  listIncidents,
  createIncident,
  type ListIncidentsOptions,
  type CreateIncidentInput,
} from '@/services/incident';
import type { IncidentStatus, IncidentSource, CallTypeCategory } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ctx = getTenantContextFromRequest(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Tenant context not found' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;

  const options: ListIncidentsOptions = {
    page: parseInt(searchParams.get('page') || '1', 10),
    perPage: Math.min(parseInt(searchParams.get('perPage') || '50', 10), 100),
    sort: searchParams.get('sort') || '-callReceivedTime',
    search: searchParams.get('search') || undefined,
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
  };

  // Handle status filter (can be comma-separated)
  const statusParam = searchParams.get('status');
  if (statusParam) {
    options.status = statusParam.split(',') as IncidentStatus[];
  }

  // Handle source filter (can be comma-separated)
  const sourceParam = searchParams.get('source');
  if (sourceParam) {
    options.source = sourceParam.split(',') as IncidentSource[];
  }

  // Handle category filter (can be comma-separated)
  const categoryParam = searchParams.get('category');
  if (categoryParam) {
    options.category = categoryParam.split(',') as CallTypeCategory[];
  }

  try {
    const result = await listIncidents(ctx, options);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to list incidents:', error);
    return NextResponse.json(
      { error: 'Failed to list incidents' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ctx = getTenantContextFromRequest(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Tenant context not found' }, { status: 401 });
  }

  // Check if user submissions are enabled
  if (!ctx.features.userSubmissions) {
    return NextResponse.json(
      { error: 'User submissions are not enabled for this tenant' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.callType || !body.fullAddress) {
      return NextResponse.json(
        { error: 'callType and fullAddress are required' },
        { status: 400 }
      );
    }

    const input: CreateIncidentInput = {
      source: 'user_submitted',
      callType: body.callType,
      fullAddress: body.fullAddress,
      latitude: body.latitude,
      longitude: body.longitude,
      description: body.description,
      callReceivedTime: body.callReceivedTime || new Date().toISOString(),
      submittedBy: body.submittedBy,
    };

    const incident = await createIncident(ctx, input);
    return NextResponse.json(incident, { status: 201 });
  } catch (error) {
    console.error('Failed to create incident:', error);
    return NextResponse.json(
      { error: 'Failed to create incident' },
      { status: 500 }
    );
  }
}
