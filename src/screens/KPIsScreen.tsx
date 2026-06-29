import React, { useMemo } from 'react';
import { BarChart2, Download } from 'lucide-react';
import { useKpis } from '../hooks/useKpis';
import { useActions } from '../hooks/useActions';
import { KPIStatusCard } from '../components/kpi/KPIStatusCard';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { calculateOverallScore, isOverdue } from '../lib/kpiCalculations';
import { exportKpisToCsv } from '../lib/csvExport';
import { useAuth } from '../hooks/useAuth';

export function KPIsScreen() {
  const { profile } = useAuth();
  const { kpis, loading } = useKpis();
  const { actions } = useActions({ all: true });

  const overallScore = useMemo(() => calculateOverallScore(kpis), [kpis]);

  const statusCounts = useMemo(() => ({
    'On Track':  kpis.filter(k => k.status === 'On Track').length,
    'At Risk':   kpis.filter(k => k.status === 'At Risk').length,
    'Off Track': kpis.filter(k => k.status === 'Off Track').length,
    'Completed': kpis.filter(k => k.status === 'Completed').length,
  }), [kpis]);

  const getActionStats = (kpiId: string) => ({
    linked: actions.filter(a => a.linked_kpi_id === kpiId && a.status !== 'Cancelled').length,
    completed: actions.filter(a => a.linked_kpi_id === kpiId && a.status === 'Completed').length,
    overdue: actions.filter(a => a.linked_kpi_id === kpiId && isOverdue(a)).length,
  });

  if (loading) return <LoadingState text="Calculating KPI scores…" />;

  return (
    <div className="px-4 py-5 space-y-5 max-w-2xl mx-auto lg:px-6 fade-in">
      {/* Overall score header */}
      <div className="card p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Overall BD KPI Score</div>
        <div className="flex items-end gap-3 mb-4">
          <div className="text-5xl font-bold leading-none">{overallScore}</div>
          <div className="text-2xl font-medium text-slate-400 mb-1">%</div>
          <div className={`ml-auto px-3 py-1.5 rounded-xl text-sm font-semibold ${
            overallScore >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
            overallScore >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {overallScore >= 80 ? 'On Track' : overallScore >= 50 ? 'At Risk' : 'Off Track'}
          </div>
        </div>

        {/* Status distribution */}
        <div className="flex gap-3">
          {[
            { label: 'On Track',  count: statusCounts['On Track'],  color: 'text-emerald-400' },
            { label: 'At Risk',   count: statusCounts['At Risk'],   color: 'text-amber-400' },
            { label: 'Off Track', count: statusCounts['Off Track'], color: 'text-red-400' },
            { label: 'Done',      count: statusCounts['Completed'], color: 'text-teal-400' },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex-1 text-center">
              <div className={`text-xl font-bold ${color}`}>{count}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Export */}
      {(profile?.role === 'admin' || profile?.role === 'manager') && (
        <button
          onClick={() => exportKpisToCsv(kpis)}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export KPI Summary (CSV)
        </button>
      )}

      {/* KPI cards */}
      {kpis.length === 0 ? (
        <EmptyState icon={BarChart2} title="No KPIs configured" description="Managers can add KPIs from the dashboard." />
      ) : (
        <div className="space-y-3">
          <div className="section-title">KPI Performance</div>
          {kpis.map((kpi) => {
            const stats = getActionStats(kpi.id);
            return (
              <KPIStatusCard
                key={kpi.id}
                kpi={kpi}
                linkedActionsCount={stats.linked}
                completedActionsCount={stats.completed}
                overdueCount={stats.overdue}
              />
            );
          })}
        </div>
      )}

      {/* Formula legend */}
      <div className="card p-4">
        <div className="section-title mb-3">Score Calculation</div>
        <div className="space-y-2">
          {[
            { type: 'Action Completion', desc: 'Average progress of linked actions (adjusted for overdue)' },
            { type: 'Milestone Completion', desc: 'Average completion of linked milestones' },
            { type: 'Share of Wallet', desc: 'Based on client spend growth vs. 2025 baseline' },
            { type: 'Manual', desc: 'Score set directly by manager' },
          ].map(({ type, desc }) => (
            <div key={type} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-semibold text-slate-700">{type}: </span>
                <span className="text-xs text-slate-500">{desc}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
          <div><span className="font-semibold text-emerald-600">On Track</span><div className="text-slate-400">≥ 80%</div></div>
          <div><span className="font-semibold text-amber-600">At Risk</span><div className="text-slate-400">50–79%</div></div>
          <div><span className="font-semibold text-red-600">Off Track</span><div className="text-slate-400">&lt; 50%</div></div>
        </div>
      </div>
    </div>
  );
}
