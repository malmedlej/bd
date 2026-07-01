import { useState, useMemo } from 'react';
import {
  AlertCircle, MessageSquare, Clock,
  CheckCircle2, Shield, Download, Edit3, X,
  TrendingUp, Users
} from 'lucide-react';
import { WeeklyAction } from '../types';
import { useActions } from '../hooks/useActions';
import { useKpis } from '../hooks/useKpis';
import { ActionCard } from '../components/actions/ActionCard';
import { LoadingState } from '../components/ui/LoadingState';
import { calculateOverallScore, isOverdue, hasNoRecentUpdate } from '../lib/kpiCalculations';
import { exportActionsToCsv } from '../lib/csvExport';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface ManagerDashboardProps {
  onUpdateAction: (action: WeeklyAction) => void;
}

function ManagerFeedbackModal({ action, onClose, onSaved }: {
  action: WeeklyAction;
  onClose: () => void;
  onSaved: () => void;
}) {
  useBodyScrollLock();

  const { profile } = useAuth();
  const [feedback, setFeedback] = useState(action.manager_feedback ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { error: err } = await supabase.from('weekly_actions').update({
        manager_feedback: feedback,
        manager_feedback_at: new Date().toISOString(),
        manager_feedback_by: profile?.id,
      }).eq('id', action.id);
      if (err) throw err;
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send feedback');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden lg:items-center">
      <div className="absolute inset-0 bg-black/60 fade-in" onClick={onClose} />
      <div className="modal-sheet relative bg-white w-full lg:max-w-md lg:rounded-2xl rounded-t-3xl slide-up overflow-hidden flex flex-col">
        <div className="flex justify-center pt-2.5 pb-1 lg:hidden">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="px-5 pt-3 pb-3 border-b border-slate-100 flex items-start justify-between">
          <div>
            <div className="font-bold text-slate-900">Manager Feedback</div>
            <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{action.task_title}</div>
          </div>
          <button onClick={onClose} className="min-h-11 min-w-11 p-2 rounded-xl hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="modal-scroll overflow-y-auto px-5 py-4">
          <label className="label">Feedback / Instructions</label>
          <textarea
            className="input resize-none"
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add guidance, priority change, or next steps…"
            autoFocus
          />
          {error && (
            <div className="mt-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : 'Send Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}

function UrgentBanner({ count, label, color }: { count: number; label: string; color: 'red' | 'amber' | 'blue' }) {
  const cfg = {
    red:   { bg: 'bg-red-600',   text: 'text-white',      dot: 'bg-red-400' },
    amber: { bg: 'bg-amber-500', text: 'text-white',       dot: 'bg-amber-300' },
    blue:  { bg: 'bg-blue-600',  text: 'text-white',       dot: 'bg-blue-400' },
  }[color];

  return (
    <div className={`${cfg.bg} rounded-2xl px-4 py-3.5 flex items-center gap-3`}>
      <div className={`w-8 h-8 rounded-xl ${cfg.dot} bg-opacity-30 flex items-center justify-center`}>
        <span className="text-lg font-black text-white">{count}</span>
      </div>
      <div className={`${cfg.text} font-semibold text-sm`}>{label}</div>
    </div>
  );
}

function KpiHealthRow({ kpi, overdueCount }: { kpi: { id: string; kpi_name: string; current_score: number; status: string }; overdueCount: number }) {
  const statusColor = {
    'On Track': 'text-emerald-400',
    'Completed': 'text-emerald-400',
    'At Risk': 'text-amber-400',
    'Off Track': 'text-red-400',
  }[kpi.status] ?? 'text-slate-400';

  const barColor = {
    'On Track': 'bg-emerald-400',
    'Completed': 'bg-emerald-400',
    'At Risk': 'bg-amber-400',
    'Off Track': 'bg-red-400',
  }[kpi.status] ?? 'bg-slate-300';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-semibold text-slate-800 truncate pr-2">{kpi.kpi_name}</div>
          <div className={`text-xs font-bold flex-shrink-0 ${statusColor}`}>{kpi.current_score}%</div>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${Math.min(kpi.current_score, 100)}%` }}
          />
        </div>
      </div>
      {overdueCount > 0 && (
        <div className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md flex-shrink-0">
          {overdueCount} overdue
        </div>
      )}
    </div>
  );
}

export function ManagerDashboard({ onUpdateAction }: ManagerDashboardProps) {
  const { actions, loading: actionsLoading, error: actionsError, refetch } = useActions({ all: true });
  const { kpis, loading: kpisLoading, error: kpisError } = useKpis();
  const [feedbackAction, setFeedbackAction] = useState<WeeklyAction | null>(null);

  const loading = actionsLoading || kpisLoading;

  const stats = useMemo(() => {
    const open = actions.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled');
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    return {
      overallScore: calculateOverallScore(kpis),
      openActions: open.length,
      overdueActions: open.filter(a => isOverdue(a)).length,
      blockedActions: open.filter(a => a.status === 'Blocked').length,
      noUpdateActions: open.filter(a => hasNoRecentUpdate(a, 7)).length,
      supportRequired: open.filter(a => a.need_manager_support).length,
      completedThisWeek: actions.filter(a =>
        a.status === 'Completed' && a.closure_date && new Date(a.closure_date) >= weekStart
      ).length,
      onTrackKpis: kpis.filter(k => k.status === 'On Track' || k.status === 'Completed').length,
      atRiskKpis: kpis.filter(k => k.status === 'At Risk').length,
      offTrackKpis: kpis.filter(k => k.status === 'Off Track').length,
    };
  }, [actions, kpis]);

  const sections = {
    overdue: actions.filter(a => isOverdue(a) && a.status !== 'Completed').slice(0, 5),
    blocked: actions.filter(a => a.status === 'Blocked').slice(0, 5),
    support: actions.filter(a => a.need_manager_support && a.status !== 'Completed').slice(0, 5),
    noUpdate: actions.filter(a => hasNoRecentUpdate(a, 7) && a.status !== 'Completed' && !isOverdue(a)).slice(0, 5),
  };

  const urgentCount = sections.overdue.length + sections.blocked.length + sections.support.length;
  const scoreColor = stats.overallScore >= 80 ? 'text-emerald-400' : stats.overallScore >= 50 ? 'text-amber-400' : 'text-red-400';
  const scoreBarColor = stats.overallScore >= 80 ? 'bg-emerald-400' : stats.overallScore >= 50 ? 'bg-amber-400' : 'bg-red-400';

  if (loading) return <LoadingState text="Loading manager dashboard…" />;

  return (
    <div className="pb-24 lg:pb-6 fade-in">

      {/* ── Hero ──────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 pt-6 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1">BD Pulse</div>
              <div className="text-xl font-bold text-white">Manager View</div>
            </div>
            <button
              onClick={() => exportActionsToCsv(actions)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>

          {/* Score + KPI distribution */}
          <div className="flex items-center gap-6 mb-5">
            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">KPI Health</div>
              <div className={`text-5xl font-black tabular-nums ${scoreColor}`}>
                {stats.overallScore}<span className="text-2xl text-slate-500">%</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">On Track</span>
                <span className="font-bold text-emerald-400">{stats.onTrackKpis}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">At Risk</span>
                <span className="font-bold text-amber-400">{stats.atRiskKpis}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Off Track</span>
                <span className="font-bold text-red-400">{stats.offTrackKpis}</span>
              </div>
            </div>
          </div>

          {/* Score bar */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${scoreBarColor}`}
              style={{ width: `${stats.overallScore}%` }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6 max-w-2xl mx-auto lg:px-6">
        {(actionsError || kpisError) && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
            {actionsError || kpisError}
          </div>
        )}

        {/* ── Urgent alerts strip ─────────────────── */}
        {urgentCount > 0 && (
          <div className="space-y-2.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Needs Attention</div>
            {sections.overdue.length > 0 && (
              <UrgentBanner count={sections.overdue.length} label="Overdue actions — past due date" color="red" />
            )}
            {sections.blocked.length > 0 && (
              <UrgentBanner count={sections.blocked.length} label="Blocked — needs unblocking" color="amber" />
            )}
            {sections.support.length > 0 && (
              <UrgentBanner count={sections.support.length} label="Team members need your support" color="blue" />
            )}
          </div>
        )}

        {/* ── Activity metrics ────────────────────── */}
        <div>
          <div className="section-title mb-3">This Week</div>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="card p-3.5 text-center">
              <div className="text-2xl font-black text-slate-800">{stats.openActions}</div>
              <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Open</div>
            </div>
            <div className={`card p-3.5 text-center ${stats.noUpdateActions > 0 ? 'border-amber-200' : ''}`}>
              <div className={`text-2xl font-black ${stats.noUpdateActions > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{stats.noUpdateActions}</div>
              <div className="text-[10px] font-semibold text-slate-500 mt-0.5">No Update 7d</div>
            </div>
            <div className="card p-3.5 text-center">
              <div className="text-2xl font-black text-emerald-600">{stats.completedThisWeek}</div>
              <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Closed</div>
            </div>
          </div>
        </div>

        {/* ── KPI Health ──────────────────────────── */}
        <div>
          <div className="section-title mb-3">KPI Progress</div>
          <div className="card p-4 space-y-4">
            {kpis.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-2">No KPIs configured</div>
            ) : (
              kpis.map(k => (
                <KpiHealthRow
                  key={k.id}
                  kpi={k}
                  overdueCount={actions.filter(a => a.linked_kpi_id === k.id && isOverdue(a)).length}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Manager Support Required ─────────────── */}
        {sections.support.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <div className="text-[11px] font-bold text-blue-700 uppercase tracking-widest">
                Manager Support Required ({sections.support.length})
              </div>
            </div>
            <div className="space-y-2.5">
              {sections.support.map(a => (
                <div key={a.id} className="card border-l-4 border-l-blue-500 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm leading-snug">{a.task_title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">{a.owner?.full_name}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setFeedbackAction(a)}
                      className="flex min-h-11 items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-colors flex-shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Respond
                    </button>
                  </div>
                  {a.risk_issue && (
                    <div className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                      {a.risk_issue}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Overdue Actions ─────────────────────── */}
        {sections.overdue.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <div className="text-[11px] font-bold text-red-700 uppercase tracking-widest">
                Overdue ({sections.overdue.length})
              </div>
            </div>
            <div className="space-y-3">
              {sections.overdue.map(a => (
                <ActionCard key={a.id} action={a} onUpdate={onUpdateAction} showOwner />
              ))}
            </div>
          </div>
        )}

        {/* ── Blocked ─────────────────────────────── */}
        {sections.blocked.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-amber-600" />
              <div className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">
                Blocked ({sections.blocked.length})
              </div>
            </div>
            <div className="space-y-3">
              {sections.blocked.map(a => (
                <ActionCard key={a.id} action={a} onUpdate={onUpdateAction} showOwner />
              ))}
            </div>
          </div>
        )}

        {/* ── No Update ───────────────────────────── */}
        {sections.noUpdate.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-slate-500" />
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                No Update in 7+ Days ({sections.noUpdate.length})
              </div>
            </div>
            <div className="space-y-2">
              {sections.noUpdate.map(a => (
                <div key={a.id} className="card p-3.5 flex items-center gap-3 border-l-4 border-l-slate-300">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{a.task_title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{a.owner?.full_name}</div>
                  </div>
                  <button
                    onClick={() => setFeedbackAction(a)}
                    className="min-h-11 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors flex-shrink-0"
                  >
                    Nudge
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── All clear ───────────────────────────── */}
        {urgentCount === 0 && sections.noUpdate.length === 0 && (
          <div className="card p-6 text-center">
            <div className="text-3xl mb-2">🎯</div>
            <div className="font-bold text-slate-800 mb-1">All Clear</div>
            <div className="text-sm text-slate-500">No overdue, blocked, or stale actions this week.</div>
          </div>
        )}

        {/* ── Done this week ──────────────────────── */}
        {stats.completedThisWeek > 0 && (
          <div className="card p-4 bg-emerald-50 border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="font-bold text-emerald-800 text-sm">
                  {stats.completedThisWeek} action{stats.completedThisWeek > 1 ? 's' : ''} completed this week
                </div>
                <div className="text-xs text-emerald-600 mt-0.5">Keep the momentum going</div>
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-400 ml-auto flex-shrink-0" />
            </div>
          </div>
        )}

      </div>

      {feedbackAction && (
        <ManagerFeedbackModal
          action={feedbackAction}
          onClose={() => setFeedbackAction(null)}
          onSaved={() => { setFeedbackAction(null); refetch(); }}
        />
      )}
    </div>
  );
}
