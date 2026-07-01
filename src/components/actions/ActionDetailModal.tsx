import { useState, useEffect } from 'react';
import {
  X, Edit3, Calendar, User, ExternalLink,
  AlertTriangle, MessageSquare, Clock, CheckCircle2, History
} from 'lucide-react';
import { WeeklyAction, ActionUpdate, Profile } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface ActionDetailModalProps {
  action: WeeklyAction;
  onClose: () => void;
  onUpdate: (action: WeeklyAction) => void;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  'Not Started': { bg: 'bg-slate-100',    text: 'text-slate-600',    dot: 'bg-slate-300' },
  'In Progress':  { bg: 'bg-blue-50',     text: 'text-blue-700',     dot: 'bg-blue-400' },
  'Completed':    { bg: 'bg-emerald-50',  text: 'text-emerald-700',  dot: 'bg-emerald-400' },
  'Delayed':      { bg: 'bg-amber-50',    text: 'text-amber-700',    dot: 'bg-amber-400' },
  'Blocked':      { bg: 'bg-red-50',      text: 'text-red-700',      dot: 'bg-red-400' },
  'Cancelled':    { bg: 'bg-slate-50',    text: 'text-slate-400',    dot: 'bg-slate-200' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function ActionDetailModal({ action, onClose, onUpdate }: ActionDetailModalProps) {
  useBodyScrollLock();

  const { profile } = useAuth();
  const isManager = profile?.role === 'admin' || profile?.role === 'manager';
  const isDirector = profile?.role === 'director';
  const canUpdate = !isDirector && (isManager || action.owner_id === profile?.id);

  const [updates, setUpdates] = useState<(ActionUpdate & { updater?: Profile })[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [tab, setTab] = useState<'detail' | 'history'>('detail');

  useEffect(() => {
    const load = async () => {
      setHistoryError('');
      const { data, error } = await supabase
        .from('action_updates')
        .select('*, updater:profiles!action_updates_updated_by_fkey(id, full_name, role)')
        .eq('action_id', action.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        setHistoryError(error.message);
        setUpdates([]);
        setLoadingHistory(false);
        return;
      }
      setUpdates((data ?? []) as (ActionUpdate & { updater?: Profile })[]);
      setLoadingHistory(false);
    };
    load();
  }, [action.id]);

  const statusStyle = STATUS_STYLE[action.status] ?? STATUS_STYLE['Not Started'];
  const isCompleted = action.status === 'Completed';
  const isOverdue = action.due_date && !isCompleted && new Date(action.due_date) < new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden lg:items-center">
      <div className="absolute inset-0 bg-black/60 fade-in" onClick={onClose} />

      <div className="modal-sheet relative bg-white w-full lg:max-w-lg lg:rounded-2xl rounded-t-3xl slide-up flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1 lg:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 border-b border-slate-100 flex items-start justify-between flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            {action.kpi && (
              <div className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1">{action.kpi.kpi_name}</div>
            )}
            <h2 className="font-bold text-slate-900 text-base leading-snug">{action.task_title}</h2>
            {action.client_name && (
              <div className="text-xs text-slate-400 mt-0.5">{action.client_name}</div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canUpdate && (
              <button
                onClick={() => { onClose(); onUpdate(action); }}
                className="flex min-h-11 items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-2 rounded-xl transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Update
              </button>
            )}
            <button onClick={onClose} className="min-h-11 min-w-11 p-2 rounded-xl hover:bg-slate-100 text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 flex-shrink-0">
          {(['detail', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 min-h-11 py-2.5 text-xs font-bold transition-colors capitalize
                ${tab === t ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t === 'history' ? (
                <span className="flex items-center justify-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  History {updates.length > 0 && `(${updates.length})`}
                </span>
              ) : 'Details'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="modal-scroll flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {tab === 'detail' && (
            <div className="px-5 py-4 space-y-5">

              {/* Status + Progress */}
              <div className="flex items-center gap-3">
                <span className={`pill text-xs ${statusStyle.bg} ${statusStyle.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0 inline-block ${statusStyle.dot}`} />
                  {action.status}
                </span>
                {action.priority !== 'Medium' && (
                  <span className={`pill text-xs ${
                    action.priority === 'Critical' ? 'bg-red-50 text-red-700' :
                    action.priority === 'High' ? 'bg-amber-50 text-amber-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>{action.priority}</span>
                )}
                <span className="text-xs text-slate-400 ml-auto">{action.progress}% done</span>
              </div>

              {/* Progress bar */}
              {action.progress > 0 && (
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-emerald-400' :
                      action.progress >= 75 ? 'bg-emerald-400' :
                      action.progress >= 40 ? 'bg-teal-400' : 'bg-blue-400'
                    }`}
                    style={{ width: `${action.progress}%` }}
                  />
                </div>
              )}

              {/* Description */}
              {action.description && (
                <div>
                  <div className="label">Description</div>
                  <p className="text-sm text-slate-700 leading-relaxed">{action.description}</p>
                </div>
              )}

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3">
                {action.owner && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Owner</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800">{action.owner.full_name}</div>
                  </div>
                )}
                {action.due_date && (
                  <div className={`rounded-xl p-3 ${isOverdue ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Due Date</span>
                    </div>
                    <div className={`text-sm font-semibold ${isOverdue ? 'text-red-700' : 'text-slate-800'}`}>
                      {new Date(action.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {isOverdue && <span className="text-xs ml-1 font-bold">(Overdue)</span>}
                    </div>
                  </div>
                )}
                {action.category && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Category</div>
                    <div className="text-sm font-semibold text-slate-800">{action.category}</div>
                  </div>
                )}
                {action.closure_date && (
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Closed</span>
                    </div>
                    <div className="text-sm font-semibold text-emerald-700">
                      {new Date(action.closure_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                )}
              </div>

              {/* Last employee update */}
              {action.employee_update && (
                <div>
                  <div className="label">Last Update</div>
                  <div className="bg-slate-50 rounded-xl px-3 py-3 text-sm text-slate-700">{action.employee_update}</div>
                </div>
              )}

              {/* Next action */}
              {action.next_action && (
                <div>
                  <div className="label">Next Step</div>
                  <div className="bg-slate-50 rounded-xl px-3 py-3 text-sm text-slate-700">{action.next_action}</div>
                </div>
              )}

              {/* Manager feedback */}
              {action.manager_feedback && (
                <div>
                  <div className="label flex items-center gap-1.5 text-blue-600">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Manager Feedback
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-3">
                    <div className="text-sm text-blue-900">{action.manager_feedback}</div>
                    {action.manager_feedback_at && (
                      <div className="text-[10px] text-blue-400 mt-1.5">{timeAgo(action.manager_feedback_at)}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Risk/Issue */}
              {action.risk_issue && (
                <div>
                  <div className="label flex items-center gap-1.5 text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Risk / Blocker
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-3 text-sm text-amber-900">
                    {action.risk_issue}
                  </div>
                </div>
              )}

              {/* Evidence link */}
              {action.evidence_link && (
                <a
                  href={action.evidence_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-teal-600 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Evidence
                </a>
              )}

              {/* Flags */}
              {action.need_manager_support && !isCompleted && (
                <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2.5">
                  <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-blue-800">Manager support requested</span>
                </div>
              )}

              {/* Last updated */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                Last updated {timeAgo(action.last_updated || action.updated_at)}
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="px-5 py-4">
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
                </div>
              ) : historyError ? (
                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-700">
                  {historyError}
                </div>
              ) : updates.length === 0 ? (
                <div className="text-center py-10">
                  <History className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <div className="text-sm text-slate-400">No update history yet</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {updates.map((u, i) => {
                    const s = STATUS_STYLE[u.status ?? ''] ?? STATUS_STYLE['Not Started'];
                    return (
                      <div key={u.id} className="relative">
                        {i < updates.length - 1 && (
                          <div className="absolute left-3.5 top-8 bottom-0 w-px bg-slate-100" />
                        )}
                        <div className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 z-10 relative">
                            <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                          </div>
                          <div className="flex-1 min-w-0 pb-3">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-slate-800">
                                  {u.updater?.full_name ?? 'Unknown'}
                                </span>
                                {u.status && (
                                  <span className={`pill text-[10px] ${s.bg} ${s.text}`}>{u.status}</span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(u.created_at)}</span>
                            </div>
                            {u.update_text && (
                              <p className="text-xs text-slate-600 mt-0.5">{u.update_text}</p>
                            )}
                            {u.progress != null && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-teal-400 rounded-full" style={{ width: `${u.progress}%` }} />
                                </div>
                                <span className="text-[10px] text-slate-500 font-medium">{u.progress}%</span>
                              </div>
                            )}
                            {u.risk_issue && (
                              <div className="text-[10px] text-amber-700 bg-amber-50 rounded-md px-2 py-1 mt-1">
                                Risk: {u.risk_issue}
                              </div>
                            )}
                            {u.new_due_date && (
                              <div className="text-[10px] text-blue-600 mt-1">
                                Due date moved to {new Date(u.new_due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
