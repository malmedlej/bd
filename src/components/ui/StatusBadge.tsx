import React from 'react';
import { ActionStatus } from '../../types';

const STATUS_STYLES: Record<ActionStatus, string> = {
  'Not Started': 'bg-slate-100 text-slate-600',
  'In Progress': 'bg-blue-50 text-blue-700',
  'Completed':   'bg-emerald-50 text-emerald-700',
  'Delayed':     'bg-amber-50 text-amber-700',
  'Blocked':     'bg-red-50 text-red-700',
  'Cancelled':   'bg-slate-100 text-slate-400 line-through',
};

const KPI_STATUS_STYLES: Record<string, string> = {
  'On Track':  'bg-emerald-50 text-emerald-700',
  'At Risk':   'bg-amber-50 text-amber-700',
  'Off Track': 'bg-red-50 text-red-700',
  'Completed': 'bg-teal-50 text-teal-700',
};

interface StatusBadgeProps {
  status: string;
  type?: 'action' | 'kpi' | 'milestone' | 'activity';
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, type = 'action', size = 'sm' }: StatusBadgeProps) {
  const styles: Record<string, string> = type === 'kpi' ? KPI_STATUS_STYLES : STATUS_STYLES;
  const cls = styles[status] ?? 'bg-slate-100 text-slate-600';
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${cls}`}>
      {status}
    </span>
  );
}
