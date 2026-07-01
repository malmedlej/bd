import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Calendar, Copy, Check
} from 'lucide-react';
import { useActions } from '../hooks/useActions';
import { useKpis } from '../hooks/useKpis';
import { KPIStatusCard } from '../components/kpi/KPIStatusCard';
import { LoadingState } from '../components/ui/LoadingState';
import { calculateOverallScore, isOverdue } from '../lib/kpiCalculations';

export function DirectorView() {
  const { actions, loading: actionsLoading, error: actionsError } = useActions({ all: true });
  const { kpis, loading: kpisLoading, error: kpisError } = useKpis();
  const [copied, setCopied] = useState(false);

  const loading = actionsLoading || kpisLoading;

  const stats = useMemo(() => {
    const open = actions.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled');
    const completed = actions.filter(a => a.status === 'Completed');
    const overallScore = calculateOverallScore(kpis);

    const achievements = completed.slice(0, 5);
    const risks = actions.filter(a => a.status === 'Blocked' || a.status === 'Delayed').slice(0, 5);
    const keyOverdue = open.filter(a => isOverdue(a) && (a.priority === 'Critical' || a.priority === 'High')).slice(0, 5);

    return {
      overallScore,
      totalKpis: kpis.length,
      onTrack: kpis.filter(k => k.status === 'On Track').length,
      atRisk: kpis.filter(k => k.status === 'At Risk').length,
      offTrack: kpis.filter(k => k.status === 'Off Track').length,
      totalActions: actions.length,
      completedActions: completed.length,
      overdueActions: open.filter(a => isOverdue(a)).length,
      completionRate: actions.length > 0 ? Math.round((completed.length / actions.length) * 100) : 0,
      achievements,
      risks,
      keyOverdue,
    };
  }, [actions, kpis]);

  const generateExecutiveSummary = (): string => {
    const lines = [
      `BD Pulse – Executive Summary`,
      `Internal Business Development Tool`,
      `Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      '',
      `Overall BD KPI Score: ${stats.overallScore}%`,
      '',
      `KPI Health:`,
      `• On Track: ${stats.onTrack}`,
      `• At Risk: ${stats.atRisk}`,
      `• Off Track: ${stats.offTrack}`,
      '',
      `Action Metrics:`,
      `• Total Actions: ${stats.totalActions}`,
      `• Completed: ${stats.completedActions} (${stats.completionRate}%)`,
      `• Overdue: ${stats.overdueActions}`,
      '',
    ];

    if (stats.achievements.length > 0) {
      lines.push('Key Achievements:');
      stats.achievements.forEach(a => lines.push(`• ${a.task_title}`));
      lines.push('');
    }

    if (stats.risks.length > 0) {
      lines.push('Active Risks / Blockers:');
      stats.risks.forEach(a => lines.push(`• ${a.task_title}${a.risk_issue ? ` — ${a.risk_issue}` : ''}`));
      lines.push('');
    }

    if (stats.keyOverdue.length > 0) {
      lines.push('Key Overdue Items:');
      stats.keyOverdue.forEach(a => lines.push(`• ${a.task_title}`));
    }

    return lines.join('\n');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateExecutiveSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <LoadingState text="Loading executive view…" />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 space-y-6 lg:px-6 fade-in">
      {(actionsError || kpisError) && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {actionsError || kpisError}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Read-only</div>
          <h1 className="text-xl font-bold text-slate-900">Executive BD View</h1>
          <p className="text-slate-500 text-xs mt-0.5">Business Development · {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all
            ${copied ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Export Summary'}
        </button>
      </div>

      {/* Overall Score - Hero */}
      <div className="card p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Overall BD KPI Score</div>
        <div className="flex items-end gap-4 mb-6">
          <div className="text-6xl font-bold leading-none">{stats.overallScore}</div>
          <div className="text-3xl font-light text-slate-400 mb-2">%</div>
          <div className={`ml-auto px-4 py-2 rounded-xl text-sm font-bold ${
            stats.overallScore >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
            stats.overallScore >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {stats.overallScore >= 80 ? 'On Track' : stats.overallScore >= 50 ? 'At Risk' : 'Needs Attention'}
          </div>
        </div>

        {/* Score bar */}
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              stats.overallScore >= 80 ? 'bg-emerald-400' :
              stats.overallScore >= 50 ? 'bg-amber-400' : 'bg-red-400'
            }`}
            style={{ width: `${stats.overallScore}%` }}
          />
        </div>

        {/* KPI distribution */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'KPIs',      val: stats.totalKpis,   color: 'text-slate-300' },
            { label: 'On Track',  val: stats.onTrack,     color: 'text-emerald-400' },
            { label: 'At Risk',   val: stats.atRisk,      color: 'text-amber-400' },
            { label: 'Off Track', val: stats.offTrack,    color: 'text-red-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="text-center">
              <div className={`text-2xl font-bold ${color}`}>{val}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Health */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{stats.totalActions}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total Actions</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{stats.completionRate}%</div>
          <div className="text-xs text-slate-500 mt-0.5">Completion Rate</div>
        </div>
        <div className="card p-4 text-center">
          <div className={`text-2xl font-bold ${stats.overdueActions > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {stats.overdueActions}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Overdue</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div>
        <div className="section-title mb-3">Strategic Progress</div>
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {kpis.map(kpi => (
            <KPIStatusCard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </div>

      {/* Key Achievements */}
      {stats.achievements.length > 0 && (
        <div>
          <div className="section-title mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Key Achievements
          </div>
          <div className="card divide-y divide-slate-50">
            {stats.achievements.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-800">{a.task_title}</div>
                  {a.kpi && <div className="text-xs text-slate-400">{a.kpi.kpi_name}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {stats.risks.length > 0 && (
        <div>
          <div className="section-title mb-3 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Active Risks & Blockers
          </div>
          <div className="card divide-y divide-slate-50">
            {stats.risks.map(a => (
              <div key={a.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.status === 'Blocked' ? 'bg-red-400' : 'bg-amber-400'}`} />
                  <div className="text-sm font-medium text-slate-800">{a.task_title}</div>
                </div>
                {a.risk_issue && <div className="text-xs text-slate-500 ml-4">{a.risk_issue}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Management Actions */}
      {stats.keyOverdue.length > 0 && (
        <div>
          <div className="section-title mb-3 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            Next Management Actions
          </div>
          <div className="card divide-y divide-slate-50">
            {stats.keyOverdue.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-slate-800">{a.task_title}</div>
                  <div className="text-xs text-slate-400">{a.owner?.full_name} · Due {a.due_date}</div>
                </div>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex-shrink-0">
                  {a.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-xs text-slate-400 pb-2">
        Last updated: {new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
      </div>
    </div>
  );
}
