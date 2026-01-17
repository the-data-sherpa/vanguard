'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, AlertTriangle, CloudRain, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TenantLayoutProps {
  tenantSlug: string;
  tenantName: string;
  children: React.ReactNode;
}

export function TenantLayout({ tenantSlug, tenantName, children }: TenantLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Dashboard',
      href: `/tenant/${tenantSlug}`,
      icon: Home,
      exact: true,
    },
    {
      label: 'Incidents',
      href: `/tenant/${tenantSlug}/incidents`,
      icon: AlertTriangle,
    },
    {
      label: 'Weather',
      href: `/tenant/${tenantSlug}/weather`,
      icon: CloudRain,
    },
    {
      label: 'Settings',
      href: `/tenant/${tenantSlug}/settings`,
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href={`/tenant/${tenantSlug}`} className="mr-6 flex items-center space-x-2">
              <span className="font-bold">{tenantName}</span>
            </Link>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname?.startsWith(item.href) ?? false;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 transition-colors hover:text-foreground/80',
                    isActive ? 'text-foreground' : 'text-foreground/60'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">{children}</main>
    </div>
  );
}
