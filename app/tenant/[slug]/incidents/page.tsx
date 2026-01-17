import { getTenantBySlug } from '@/services/tenant';
import { listIncidents } from '@/services/incident';
import { notFound } from 'next/navigation';
import type { TenantContext, IncidentStatus, CallTypeCategory } from '@/lib/types';
import { IncidentTable } from '@/components/incidents';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface IncidentsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function IncidentsPage({ params, searchParams }: IncidentsPageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  // Build tenant context
  const ctx: TenantContext = {
    id: tenant.id,
    slug: tenant.slug,
    status: tenant.status,
    tier: tenant.tier,
    features: tenant.features ?? {},
  };

  // Parse query params
  const page = parseInt(search.page as string || '1', 10);
  const statusParam = search.status as string | undefined;
  const status: IncidentStatus = (statusParam === 'closed' || statusParam === 'archived')
    ? statusParam
    : 'active';
  const category = search.category as CallTypeCategory | undefined;
  const searchQuery = search.search as string | undefined;

  // Fetch incidents for current status
  const result = await listIncidents(ctx, {
    page,
    perPage: 25,
    status: [status],
    category: category ? [category] : undefined,
    search: searchQuery,
  });

  // Build URL for status tabs, preserving other query params
  const buildTabUrl = (newStatus: IncidentStatus) => {
    const params = new URLSearchParams();
    if (newStatus !== 'active') params.set('status', newStatus);
    if (category) params.set('category', category);
    if (searchQuery) params.set('search', searchQuery);
    const queryString = params.toString();
    return `/tenant/${slug}/incidents${queryString ? `?${queryString}` : ''}`;
  };

  const tabs: { value: IncidentStatus; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
        <p className="text-muted-foreground">
          View and manage all incident reports
        </p>
      </div>

      {/* Status Tabs as Links */}
      <div className="border-b">
        <nav className="flex gap-4" aria-label="Incident status tabs">
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={buildTabUrl(tab.value)}
              className={cn(
                'pb-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                status === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Incidents Table */}
      <IncidentTable incidents={result.items} />

      {/* Pagination Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {result.items.length} of {result.totalItems} {status} incidents
        </p>
        {result.totalPages > 1 && (
          <p>
            Page {result.page} of {result.totalPages}
          </p>
        )}
      </div>
    </div>
  );
}
