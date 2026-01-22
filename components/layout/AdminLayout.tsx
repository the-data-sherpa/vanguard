'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SignOutButton } from '@clerk/nextjs';
import { LayoutDashboard, Building2, Activity, Settings, User, ClipboardCheck, LogOut, Check } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MobileNav } from './MobileNav';
import { BottomNav } from './BottomNav';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const currentUser = useQuery(api.users.getCurrentUser);
  const pendingApprovals = useQuery(api.admin.getPendingApprovals);
  const userTenant = useQuery(api.users.getCurrentUserTenant);

  const pendingCount = pendingApprovals?.length ?? 0;

  // User's tenants for switching
  const userTenants = userTenant?.tenant ? [userTenant.tenant] : [];

  const navItems = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: 'Approvals',
      href: '/admin/approvals',
      icon: ClipboardCheck,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      label: 'Tenants',
      href: '/admin/tenants',
      icon: Building2,
    },
    {
      label: 'System Health',
      href: '/admin/health',
      icon: Activity,
    },
    {
      label: 'Settings',
      href: '/admin/settings',
      icon: Settings,
    },
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
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 flex h-14 items-center justify-between">
          <div className="flex items-center">
            <MobileNav navItems={navItems} title="Vanguard Admin" titleBadge="Platform" open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
            <Link href="/admin" className="mr-6 flex items-center space-x-2">
              <span className="font-bold">Vanguard Admin</span>
              <Badge variant="secondary" className="text-xs">Platform</Badge>
            </Link>
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
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
                    {item.badge && (
                      <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {item.badge}
                      </Badge>
                    )}
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
                    <p className="text-sm font-medium">{currentUser?.name || 'Admin'}</p>
                    <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>

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
                        className="flex items-center"
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        <span className="truncate max-w-[160px]">{t.displayName || t.name}</span>
                      </DropdownMenuItem>
                    ))}
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
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6 overflow-x-hidden">{children}</main>

      {/* Bottom Navigation for Mobile */}
      <BottomNav
        items={[
          { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
          { href: '/admin/approvals', label: 'Approvals', icon: ClipboardCheck },
          { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
        ]}
        onMoreClick={() => setMobileNavOpen(true)}
      />
    </div>
  );
}
