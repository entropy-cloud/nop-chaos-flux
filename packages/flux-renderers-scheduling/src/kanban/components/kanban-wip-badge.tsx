import React from 'react';
import { cn } from '@nop-chaos/ui';
import { AlertTriangle } from 'lucide-react';

export interface KanbanWipBadgeProps {
  current: number;
  limit: number;
  strict?: boolean;
  className?: string;
}

export function KanbanWipBadge({ current, limit, strict, className }: KanbanWipBadgeProps) {
  const overLimit = current > limit;
  const overflow = current - limit;

  if (!overLimit) {
    return (
      <span className={cn('text-xs text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5', className)}>
        {current}/{limit}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 font-bold rounded-full px-1.5 py-0.5', className)}>
      {strict && <AlertTriangle className="w-3 h-3" />}
      {current}/{limit}
      {overflow > 0 && <span className="bg-red-500 text-white text-[10px] rounded-full px-1">+{overflow}</span>}
    </span>
  );
}
