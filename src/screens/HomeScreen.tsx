import { useMemo } from 'react';
import {
  ArrowRight, MessageSquare, CalendarDays,
  CheckCircle2, AlertCircle, Zap, TrendingUp,
  Clock, AlertTriangle, ChevronRight
} from 'lucide-react';
import { Screen, WeeklyAction } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useActions } from '../hooks/useActions';
import { useKpis } from '../hooks/useKpis';
import { LoadingState } from '../components/ui/LoadingState';
import { calculateOverallScore, isOverdue, isDueSoon } from '../lib/kpiCalculations';

interface HomeScreenProps {
  onNavigate: (s: Screen) => void;
  onUpdateAction: (action: WeeklyAction) => void;
  onDetailAction: (action: WeeklyAction) => void;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatToday() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function daysUntilDue(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0,0,0,0);
  return Math.ceil(diff / 86400000);
}

interface FocusCardProps {
  action: WeeklyAction;
  onUpdate: (a: WeeklyAction) => void;
  onDetail: (a: WeeklyAction) => void;
}

function FocusCard({ action, onUpdate, onDetail }: FocusCardProps) {
  const overdue = isOverdue(action);
  const days = daysUntilDue(action.due_date);
  const isBlocked = action.status === 'Blocked';
  const hasFeedback = !!action.manager_feedback;

  const accent = overdue ? 'border-l-red-400 bg-red-50/30'
    : isBlocked ? 'border-l-amber-400 bg-amber-50/20'
    : hasFeedback ? 'border-l-blue-400 bg-blue-50/20'
    : 'border-l-slate-200';

  const badge = overdue
    ? { label: 'Overdue', cls: 'bg-red-100 text-red-700' }
    : isBlocked
    ? { label: 'Blocked', cls: 'bg-amber-100 text-amber-700' }
    : hasFeedback
    ? { label: 'Feedback', cls: 'bg-blue-100 text-blue-700' }
    : action.status === 'In Progress'
    ? { label: 'In Progress', cls: 'bg-teal-50 text-teal-700' }
    : { label: action.status, cls: 'bg-slate-100 text-slate-600' };

  return (
    <div className={`card border-l-[3px] ${accent} p-4 cursor-pointer`} onClick={() => onDetail(action)}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`pill text-[10px] ${badge.cls}`}>{badge.label}</span>
            {action.priority === 'Critical' && (
              <span className="pill text-[10px] bg-red-50 text-red-600">Critical</span>
            )}
          </div>
          <div className="font-semibold text-slate-900 text-sm leading-snug">{action.task_title}</div>
          {action.client_name && (
            <div className="text-xs text-slate-400 mt-0.5">{action.client_name}</div>
          )}
          {hasFeedback && (
            <div className="mt-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
              <MessageSquare className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2">{action.manager_feedback}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {days !== null && (
            <div className={`text-[10px] font-semibold ${overdue ? 'text-red-600' : days <= 1 ? 'text-amber-600' : 'text-slate-400'}`}>
              {overdue ? `${Math.abs(days)}d late` : days === 0 ? 'Due today' : `${days}d left`}
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onUpdate(action); }}
            className="min-h-11 px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 transition-colors active:scale-95"
          >
            Update
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {action.progress > 0 && action.status !== 'Completed' && (
        <div className="mt-3">
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                overdue ? 'bg-red-400' : isBlocked ? 'bg-amber-400' : 'bg-teal-400'
              }`}
              style={{ width: `${action.progress}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{action.progress}% complete</div>
        </div>
      )}
    </div>
  );
}

export function HomeScreen({ onNavigate, onUpdateAction, onDetailAction }: HomeScreenProps) {
  const { profile } = useAuth();
  const { actions, loading: actionsLoading, error: actionsError } = useActions();
  const { kpis, loading: kpisLoading, error: kpisError } = useKpis();

  const stats = useMemo(() => {
    const open = actions.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled');
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    return {
      open: open.length,
      dueSoon: open.filter(a => isDueSoon(a, 7)).length,
      overdue: open.filter(a => isOverdue(a)).length,
      blocked: open.filter(a => a.status === 'Blocked').length,
      needsSupport: open.filter(a => a.need_manager_support).length,
      completedThisWeek: actions.filter(a =>
        a.status === 'Completed' && a.closure_date && new Date(a.closure_date) >= weekStart
      ).length,
      feedbackPending: actions.filter(a => a.manager_feedback && a.status !== 'Completed').length,
    };
  }, [actions]);

  const focusActions = useMemo(() => {
    const open = actions.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled');
    const seen = new Set<string>();
    const add = (list: WeeklyAction[]) => list.forEach(a => seen.add(a.id));
    const overdue = open.filter(a => isOverdue(a));
    const blocked = open.filter(a => a.status === 'Blocked' && !seen.has(a.id));
    add(overdue);
    const feedback = open.filter(a => a.manager_feedback && !seen.has(a.id));
    add(blocked);
    const dueSoon = open.filter(a => isDueSoon(a, 2) && !isOverdue(a) && !seen.has(a.id));
    add(feedback);
    return [...overdue, ...blocked, ...feedback, ...dueSoon].slice(0, 4);
  }, [actions]);

  const overallScore = useMemo(() => calculateOverallScore(kpis), [kpis]);

  if (actionsLoading || kpisLoading) return <LoadingState text="Loading your BD pulse…" />;

  const firstName = profile?.full_name.split(' ')[0] ?? 'there';
  const urgentCount = stats.overdue + stats.blocked;

  return (
    <div className="fade-in">
      {/* Hero header strip */}
      <div className="bg-slate-900 px-4 pt-5 pb-6 lg:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-[11px] font-bold text-teal-400 uppercase tracking-widest">BD Pulse</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {getGreeting()}, {firstName}.
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">{formatToday()}</p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold leading-none ${
                overallScore >= 80 ? 'text-emerald-400' :
                overallScore >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>{overallScore}%</div>
              <div className="text-[10px] text-slate-500 mt-0.5">KPI Score</div>
            </div>
          </div>

          {/* Four metric tiles */}
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                val: stats.open,
                label: 'Open',
                sub: stats.dueSoon > 0 ? `${stats.dueSoon} due soon` : null,
                color: 'text-white',
                bg: 'bg-slate-800',
                onClick: () => onNavigate('actions'),
              },
              {
                val: stats.overdue,
                label: 'Overdue',
                sub: stats.overdue === 0 ? 'On time!' : null,
                color: stats.overdue > 0 ? 'text-red-400' : 'text-emerald-400',
                bg: stats.overdue > 0 ? 'bg-red-950/40 ring-1 ring-red-800/50' : 'bg-slate-800',
                onClick: () => onNavigate('actions'),
              },
              {
                val: stats.blocked,
                label: 'Blocked',
                sub: null,
                color: stats.blocked > 0 ? 'text-amber-400' : 'text-slate-400',
                bg: stats.blocked > 0 ? 'bg-amber-950/40 ring-1 ring-amber-800/50' : 'bg-slate-800',
                onClick: () => onNavigate('actions'),
              },
              {
                val: stats.completedThisWeek,
                label: 'Done',
                sub: 'this week',
                color: 'text-teal-400',
                bg: 'bg-slate-800',
                onClick: () => onNavigate('actions'),
              },
            ].map(({ val, label, sub, color, bg, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className={`${bg} rounded-xl p-2.5 text-center transition-all active:scale-95`}
              >
                <div className={`text-2xl font-bold leading-none ${color}`}>{val}</div>
                <div className="text-[10px] text-slate-400 mt-1 leading-tight">{label}</div>
                {sub && <div className={`text-[9px] mt-0.5 ${color} opacity-80`}>{sub}</div>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 max-w-2xl mx-auto lg:px-6">
        {(actionsError || kpisError) && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
            {actionsError || kpisError}
          </div>
        )}

        {/* Alert banner — urgent items */}
        {urgentCount > 0 && (
          <button
            onClick={() => onNavigate('actions')}
            className="w-full flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3.5 text-left active:scale-[0.99] transition-transform"
          >
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-red-900">
                {urgentCount} action{urgentCount > 1 ? 's' : ''} need{urgentCount === 1 ? 's' : ''} attention
              </div>
              <div className="text-xs text-red-500 mt-0.5">
                {stats.overdue > 0 && `${stats.overdue} overdue`}
                {stats.overdue > 0 && stats.blocked > 0 && ' · '}
                {stats.blocked > 0 && `${stats.blocked} blocked`}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-red-400 flex-shrink-0" />
          </button>
        )}

        {/* Manager feedback banner */}
        {stats.feedbackPending > 0 && (
          <button
            onClick={() => onNavigate('actions')}
            className="w-full flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3.5 text-left active:scale-[0.99] transition-transform"
          >
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-blue-900">Manager feedback received</div>
              <div className="text-xs text-blue-500 mt-0.5">
                {stats.feedbackPending} action{stats.feedbackPending > 1 ? 's' : ''} with new feedback
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
          </button>
        )}

        {/* Primary actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate('checkin')}
            className="flex flex-col items-start gap-1 bg-teal-600 text-white p-4 rounded-2xl hover:bg-teal-700 transition-colors active:scale-[0.97]"
          >
            <CalendarDays className="w-5 h-5 text-teal-200" />
            <div className="font-bold text-sm mt-1">Update My Week</div>
            <div className="text-teal-200/80 text-xs">Weekly check-in wizard</div>
          </button>
          <button
            onClick={() => onNavigate('actions')}
            className="flex flex-col items-start gap-1 bg-white border border-slate-200 text-slate-700 p-4 rounded-2xl hover:bg-slate-50 transition-colors active:scale-[0.97]"
          >
            <CheckCircle2 className="w-5 h-5 text-slate-400" />
            <div className="font-bold text-sm mt-1">My Actions</div>
            <div className="text-slate-400 text-xs">{stats.open} open tasks</div>
          </button>
        </div>

        {/* Focus items */}
        {focusActions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="section-title flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 text-red-500" />
                Focus Now
              </div>
              <button
                onClick={() => onNavigate('actions')}
                className="text-xs text-teal-600 font-semibold flex items-center gap-0.5 hover:underline"
              >
                All actions <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2.5">
              {focusActions.map(a => (
                <FocusCard key={a.id} action={a} onUpdate={onUpdateAction} onDetail={onDetailAction} />
              ))}
            </div>
          </div>
        )}

        {/* All clear */}
        {focusActions.length === 0 && stats.open > 0 && (
          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="font-bold text-slate-800">You're all caught up!</div>
            <div className="text-slate-400 text-sm mt-0.5">No overdue or blocked actions this week.</div>
          </div>
        )}

        {/* KPI strip */}
        {kpis.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="section-title flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" />
                KPI Health
              </div>
              <button
                onClick={() => onNavigate('kpis')}
                className="text-xs text-teal-600 font-semibold flex items-center gap-0.5 hover:underline"
              >
                Details <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="card overflow-hidden">
              {kpis.slice(0, 5).map((k, i) => {
                const pct = Math.round(k.current_score);
                const barColor = k.status === 'On Track' || k.status === 'Completed'
                  ? 'bg-emerald-400' : k.status === 'At Risk' ? 'bg-amber-400' : 'bg-red-400';
                const textColor = k.status === 'On Track' || k.status === 'Completed'
                  ? 'text-emerald-600' : k.status === 'At Risk' ? 'text-amber-600' : 'text-red-600';
                return (
                  <div
                    key={k.id}
                    className={`px-4 py-3 flex items-center gap-3 ${i < kpis.slice(0,5).length - 1 ? 'border-b border-slate-50' : ''}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${barColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{k.kpi_name}</div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className={`text-sm font-bold flex-shrink-0 ${textColor}`}>{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Support needed nudge */}
        {stats.needsSupport > 0 && (
          <button
            onClick={() => onNavigate('actions')}
            className="w-full flex items-center gap-3 bg-slate-100 rounded-2xl px-4 py-3 text-left"
          >
            <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <div className="text-sm text-slate-600">
              <span className="font-semibold">{stats.needsSupport}</span> action{stats.needsSupport > 1 ? 's' : ''} flagged for manager support
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 ml-auto flex-shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
}
