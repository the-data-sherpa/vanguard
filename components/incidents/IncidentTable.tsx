'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Incident } from '@/lib/types';
import { CallTypeBadge } from './CallTypeBadge';
import { Skeleton } from '@/components/ui/skeleton';

interface IncidentTableProps {
  incidents: Incident[];
  onRowClick?: (incident: Incident) => void;
  isLoading?: boolean;
}

export function IncidentTable({ incidents, onRowClick, isLoading }: IncidentTableProps) {
  if (isLoading) {
    return <IncidentTableSkeleton />;
  }

  if (incidents.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>No incidents found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Units</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents.map((incident) => {
            const timeOpened = new Date(incident.callReceivedTime);
            const formattedTime = timeOpened.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            const statusColor = {
              active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
              closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
              archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
            }[incident.status];

            return (
              <TableRow
                key={incident.id}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                onClick={onRowClick ? () => onRowClick(incident) : undefined}
              >
                <TableCell>
                  <CallTypeBadge
                    category={incident.callTypeCategory ?? 'other'}
                    showLabel={false}
                    callType={incident.callType}
                  />
                </TableCell>
                <TableCell className="max-w-[300px] truncate">
                  {incident.fullAddress}
                </TableCell>
                <TableCell className="whitespace-nowrap">{formattedTime}</TableCell>
                <TableCell>
                  {incident.units?.length ?? 0} unit{(incident.units?.length ?? 0) !== 1 ? 's' : ''}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColor}>
                    {incident.status}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function IncidentTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Units</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-48" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
