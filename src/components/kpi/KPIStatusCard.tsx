import React from 'react';
import { KPI } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { ProgressBar } from '../ui/ProgressBar';
import { TrendingUp, TrendingDown, CheckSquare, AlertTriangle } from 'lucide-react';

interface KPIStatusCardProps {
  kpi: KPI;
  linkedActionsCount?: number;
  completedActionsCount?: number;
  overdueCount?: number;
  onClick?: () => void;
}

const STATUS_ICONS = {
  'On Track':  { icon: TrendingUp,   color: 'text-emerald-500' },
  'At Risk':   { icon: AlertTriangle, color: 'text-amber-500' },
  'Off Track': { icon: TrendingDown,  color: 'text-red-500' },
  'Completed': { icon: CheckSquare,   color: 'text-teal-500' },
};

export function KPIStatusCard({ kpi, linkedActionsCount = 0, completedActionsCount = 0, overdueCount = 0, onClick }: KPIStatusCardProps) {
  const si = STATUS_ICONS[kpi.status] ?? STATUS_ICONS['At Risk'];
  const StatusIcon = si.icon;

  const barColor = kpi.status === 'On Track' || kpi.status === 'Completed'
    ? 'emerald' : kpi.status === 'At Risk' ? 'amber' : 'red';

  return (
    <div className={`card p-4 ${onClick ? 'card-interactive' : ''}`} onClick={onClick}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon className={`w-4 h-4 flex-shrink-0 ${si.color}`} />
            <h3 className="font-semibold text-slate-900 text-sm leading-tight truncate">{kpi.kpi_name}</h3>
          </div>
          {kpi.objective && (
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{kpi.objective}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-slate-900 leading-none">{Math.round(kpi.current_score)}<span className="text-sm font-medium text-slate-400">%</span></div>
          <div className="text-[10px] text-slate-400 mt-0.5">of {kpi.target_value}% target</div>
        </div>
      </div>

      <ProgressBar value={kpi.current_score} max={kpi.target_value} color={barColor as 'teal'} size="md" />

      <div className="flex items-center justify-between mt-3">
        <StatusBadge status={kpi.status} type="kpi" />
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          {kpi.weight > 0 && <span>Weight: {kpi.weight}%</span>}
          {linkedActionsCount > 0 && (
            <span>{completedActionsCount}/{linkedActionsCount} actions</span>
          )}
          {overdueCount > 0 && (
            <span className="text-red-500 font-medium">{overdueCount} overdue</span>
          )}
        </div>
      </div>
    </div>
  );
}
