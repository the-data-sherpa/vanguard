import { getTenantBySlug } from '@/services/tenant';
import { TenantLayout } from '@/components/layout/TenantLayout';
import { notFound } from 'next/navigation';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function Layout({ children, params }: TenantLayoutProps) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  return (
    <TenantLayout tenantSlug={tenant.slug} tenantName={tenant.name}>
      {children}
    </TenantLayout>
  );
}
