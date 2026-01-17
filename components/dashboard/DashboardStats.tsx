'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, Heart, Car, AlertTriangle, Radio, Clock } from 'lucide-react';
import type { CallTypeCategory } from '@/lib/types';

interface StatsData {
  totalActive: number;
  totalToday: number;
  byCategory: Record<CallTypeCategory, number>;
  activeUnits: number;
  avgResponseTime?: number;
}

interface DashboardStatsProps {
  stats?: StatsData;
  isLoading?: boolean;
}

export function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  if (isLoading || !stats) {
    return <DashboardStatsSkeleton />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Active Incidents"
        value={stats.totalActive}
        icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
        description="Currently active"
      />
      <StatCard
        title="Today's Calls"
        value={stats.totalToday}
        icon={<Clock className="h-4 w-4 text-blue-500" />}
        description="In the last 24 hours"
      />
      <StatCard
        title="Active Units"
        value={stats.activeUnits}
        icon={<Radio className="h-4 w-4 text-green-500" />}
        description="On scene or en route"
      />
      <CategoryBreakdownCard byCategory={stats.byCategory} />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

interface CategoryBreakdownCardProps {
  byCategory: Record<CallTypeCategory, number>;
}

function CategoryBreakdownCard({ byCategory }: CategoryBreakdownCardProps) {
  const categories: { key: CallTypeCategory; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'fire', label: 'Fire', icon: <Flame className="h-3 w-3" />, color: 'text-red-500' },
    { key: 'medical', label: 'Medical', icon: <Heart className="h-3 w-3" />, color: 'text-blue-500' },
    { key: 'traffic', label: 'Traffic', icon: <Car className="h-3 w-3" />, color: 'text-violet-500' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">By Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {categories.map(({ key, label, icon, color }) => (
            <div key={key} className="flex items-center justify-between">
              <div className={`flex items-center gap-2 ${color}`}>
                {icon}
                <span className="text-sm">{label}</span>
              </div>
              <span className="font-medium">{byCategory[key] ?? 0}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-12 mb-1" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
