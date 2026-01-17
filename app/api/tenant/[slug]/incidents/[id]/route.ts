/**
 * Single Incident API Route
 * GET /api/tenant/[slug]/incidents/[id] - Get incident
 * PATCH /api/tenant/[slug]/incidents/[id] - Update incident
 * DELETE /api/tenant/[slug]/incidents/[id] - Delete incident
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContextFromRequest } from '@/lib/tenant-context';
import {
  getIncident,
  updateIncident,
  deleteIncident,
  type UpdateIncidentInput,
} from '@/services/incident';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const ctx = getTenantContextFromRequest(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Tenant context not found' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const incident = await getIncident(ctx, id);
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    return NextResponse.json(incident);
  } catch (error) {
    console.error('Failed to get incident:', error);
    return NextResponse.json(
      { error: 'Failed to get incident' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const ctx = getTenantContextFromRequest(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Tenant context not found' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();

    const input: UpdateIncidentInput = {};

    // Only include fields that are present in the request
    if (body.callType !== undefined) input.callType = body.callType;
    if (body.fullAddress !== undefined) input.fullAddress = body.fullAddress;
    if (body.latitude !== undefined) input.latitude = body.latitude;
    if (body.longitude !== undefined) input.longitude = body.longitude;
    if (body.units !== undefined) input.units = body.units;
    if (body.unitStatuses !== undefined) input.unitStatuses = body.unitStatuses;
    if (body.description !== undefined) input.description = body.description;
    if (body.status !== undefined) input.status = body.status;
    if (body.callClosedTime !== undefined) input.callClosedTime = body.callClosedTime;
    if (body.moderationStatus !== undefined) input.moderationStatus = body.moderationStatus;
    if (body.moderatedBy !== undefined) input.moderatedBy = body.moderatedBy;
    if (body.moderatedAt !== undefined) input.moderatedAt = body.moderatedAt;
    if (body.rejectionReason !== undefined) input.rejectionReason = body.rejectionReason;

    const incident = await updateIncident(ctx, id, input);
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    return NextResponse.json(incident);
  } catch (error) {
    console.error('Failed to update incident:', error);
    return NextResponse.json(
      { error: 'Failed to update incident' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const ctx = getTenantContextFromRequest(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Tenant context not found' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const success = await deleteIncident(ctx, id);
    if (!success) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete incident:', error);
    return NextResponse.json(
      { error: 'Failed to delete incident' },
      { status: 500 }
    );
  }
}
