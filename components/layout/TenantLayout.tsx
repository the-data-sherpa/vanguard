'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SignOutButton } from '@clerk/nextjs';
import { Home, AlertTriangle, CloudRain, Settings, Users, User, CreditCard, Radio, Building2, Shield, LogOut, Check, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrialBanner, SubscriptionGuard } from '@/components/billing';
import { TenantSelector } from './TenantSelector';

interface TenantLayoutProps {
  tenantSlug: string;
  tenantName: string;
  tenantId?: string;
  children: React.ReactNode;
}

export function TenantLayout({ tenantSlug, tenantName, tenantId, children }: TenantLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const tenant = useQuery(api.tenants.getBySlug, { slug: tenantSlug });
  const userTenant = useQuery(api.users.getCurrentUserTenant);

  // Redirect to pending-approval page if tenant is pending approval
  useEffect(() => {
    if (tenant && tenant.status === 'pending_approval') {
      router.push('/pending-approval');
    }
  }, [tenant, router]);

  // Platform admins do NOT have automatic tenant access - only check tenant role
  const isOwner = currentUser?.tenantRole === 'owner';
  const isPlatformAdmin = currentUser?.role === 'platform_admin';

  // For now, users can only have one tenant - future: list all tenants
  const userTenants = userTenant?.tenant ? [userTenant.tenant] : [];

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
      label: 'Mission Control',
      href: `/tenant/${tenantSlug}/mission-control`,
      icon: Radio,
    },
    ...(tenant?.features?.advancedAnalytics
      ? [
          {
            label: 'Analytics',
            href: `/tenant/${tenantSlug}/analytics`,
            icon: BarChart3,
          },
        ]
      : []),
    ...(isOwner
      ? [
          {
            label: 'Users',
            href: `/tenant/${tenantSlug}/users`,
            icon: Users,
          },
          {
            label: 'Billing',
            href: `/tenant/${tenantSlug}/billing`,
            icon: CreditCard,
          },
          {
            label: 'Settings',
            href: `/tenant/${tenantSlug}/settings`,
            icon: Settings,
          },
        ]
      : []),
  ];

  const getInitials = () => {
    if (currentUser?.name) {
      return currentUser.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return currentUser?.email?.slice(0, 2).toUpperCase() || '??';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Trial/Billing Banner */}
      {tenant?._id && (
        <TrialBanner tenantId={tenant._id} tenantSlug={tenantSlug} />
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 flex h-14 items-center justify-between">
          <div className="flex items-center">
            <TenantSelector
              currentTenantSlug={tenantSlug}
              currentTenantName={tenantName}
            />
            <nav className="ml-6 flex items-center space-x-6 text-sm font-medium">
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

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser?.avatar} />
                    <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser?.avatar} />
                    <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium">{currentUser?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/tenant/${tenantSlug}/profile`} className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                {isOwner && (
                  <DropdownMenuItem asChild>
                    <Link href={`/tenant/${tenantSlug}/settings`} className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                )}

                {/* Organizations Section */}
                {userTenants.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      Organizations
                    </DropdownMenuLabel>
                    {userTenants.map((t) => (
                      <DropdownMenuItem
                        key={t._id}
                        onClick={() => router.push(`/tenant/${t.slug}`)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <Building2 className="mr-2 h-4 w-4" />
                          <span className="truncate max-w-[140px]">{t.displayName || t.name}</span>
                        </div>
                        {t.slug === tenantSlug && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}

                {/* Platform Admin Link */}
                {isPlatformAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center">
                        <Shield className="mr-2 h-4 w-4" />
                        Platform Admin
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}

                {/* Sign Out */}
                <DropdownMenuSeparator />
                <SignOutButton redirectUrl="/">
                  <DropdownMenuItem className="flex items-center text-red-600 dark:text-red-400 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </SignOutButton>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {tenant?._id ? (
          <SubscriptionGuard
            tenantId={tenant._id}
            tenantSlug={tenantSlug}
            allowBillingPage={pathname?.includes('/billing')}
          >
            {children}
          </SubscriptionGuard>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
