// app/tenant/[slug]/page.tsx
import React from 'react';
import { getTenantBySlug } from '../../../services/tenant';
import { getConfig } from '../../../services/config';
import { fetch } from 'node-fetch';

export default async function TenantPage({ params }: { params: { slug: string } }) {
  const tenant = await getTenantBySlug(params.slug);
  if (!tenant) {
    return <div>Tenant not found.</div>;
  }

  // Example PulsePoint fetch (placeholder URL)
  const cfg = await getConfig();
  const pulseUrl = `https://api.pulsepoint.io/v1/data?tenantId=${tenant.id}&pulseId=${tenant.pulsepointId}`;
  let pulseData: any = null;
  try {
    const res = await fetch(pulseUrl, { headers: { Authorization: `Bearer ${cfg.oauthCredentials.facebook?.clientId || ''}` } });
    if (res.ok) pulseData = await res.json();
  } catch (e) {
    console.error('PulsePoint fetch error', e);
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{tenant.name} Dashboard</h1>
      <p>Slug: {tenant.slug}</p>
      <p>Status: {tenant.status}</p>
      {pulseData ? (
        <pre>{JSON.stringify(pulseData, null, 2)}</pre>
      ) : (
        <p>No PulsePoint data available.</p>
      )}
    </div>
  );
}
