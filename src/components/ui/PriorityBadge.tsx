import React from 'react';
import { ActionPriority } from '../../types';

const PRIORITY_STYLES: Record<ActionPriority, string> = {
  'Low':      'bg-slate-100 text-slate-500',
  'Medium':   'bg-blue-50 text-blue-600',
  'High':     'bg-amber-50 text-amber-700',
  'Critical': 'bg-red-50 text-red-700',
};

const PRIORITY_DOTS: Record<ActionPriority, string> = {
  'Low':      'bg-slate-400',
  'Medium':   'bg-blue-500',
  'High':     'bg-amber-500',
  'Critical': 'bg-red-500',
};

interface PriorityBadgeProps {
  priority: ActionPriority;
  size?: 'sm' | 'md';
}

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const cls = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES['Medium'];
  const dot = PRIORITY_DOTS[priority] ?? PRIORITY_DOTS['Medium'];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClass} ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {priority}
    </span>
  );
}
