'use client';

import { Badge } from '@/components/ui/badge';
import type { CallTypeCategory } from '@/lib/types';
import { getCategoryBadgeClasses, getCallTypeDescription } from '@/lib/callTypeMapping';

interface CallTypeBadgeProps {
  category: CallTypeCategory;
  callType?: string;
  showLabel?: boolean;
}

export function CallTypeBadge({ category, callType, showLabel = true }: CallTypeBadgeProps) {
  const classes = getCategoryBadgeClasses(category);
  // Get full description for call type code (e.g., "TC" -> "Traffic Collision")
  const description = callType ? getCallTypeDescription(callType) : null;

  return (
    <Badge variant="secondary" className={classes}>
      {description || (showLabel ? category : callType)}
    </Badge>
  );
}
