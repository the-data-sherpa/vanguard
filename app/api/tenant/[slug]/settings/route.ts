/**
 * Tenant Settings API Route
 * PATCH /api/tenant/[slug]/settings - Update tenant settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/pocketbase';
import { getTenantBySlug } from '@/services/tenant';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const body = await request.json();
    const pb = getClient();

    // Build update data - only allow specific fields to be updated
    const updateData: Record<string, unknown> = {};

    // PulsePoint Agency ID
    if (body.pulsepointAgencyId !== undefined) {
      updateData.pulsepointAgencyId = body.pulsepointAgencyId || null;
    }

    // PulsePoint Config
    if (body.pulsepointConfig !== undefined) {
      updateData.pulsepointConfig = body.pulsepointConfig;
    }

    // Weather Zones
    if (body.weatherZones !== undefined) {
      updateData.weatherZones = body.weatherZones;
    }

    // Features
    if (body.features !== undefined) {
      updateData.features = {
        ...tenant.features,
        ...body.features,
      };
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update the tenant
    const updated = await pb.collection('tenants').update(tenant.id, updateData);

    return NextResponse.json({
      success: true,
      message: 'Settings updated',
      tenant: {
        id: updated.id,
        slug: updated.slug,
        pulsepointAgencyId: updated.pulsepointAgencyId,
        pulsepointConfig: updated.pulsepointConfig,
        weatherZones: updated.weatherZones,
        features: updated.features,
      },
    });
  } catch (error) {
    console.error('Failed to update tenant settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
