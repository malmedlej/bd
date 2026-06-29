import { WeeklyAction } from '../../types';
import { Edit3, CheckCircle, Calendar, User, ExternalLink, AlertTriangle, MessageSquare } from 'lucide-react';
import { isOverdue } from '../../lib/kpiCalculations';

interface ActionCardProps {
  action: WeeklyAction;
  onUpdate?: (action: WeeklyAction) => void;
  onComplete?: (action: WeeklyAction) => void;
  onClick?: (action: WeeklyAction) => void;
  showOwner?: boolean;
  compact?: boolean;
}

const STATUS_CONFIG: Record<string, { dot: string; label: string; bg: string; text: string }> = {
  'Not Started': { dot: 'bg-slate-300',   label: 'Not Started', bg: 'bg-slate-100',    text: 'text-slate-600' },
  'In Progress':  { dot: 'bg-blue-400',    label: 'In Progress',  bg: 'bg-blue-50',     text: 'text-blue-700' },
  'Completed':    { dot: 'bg-emerald-400', label: 'Completed',    bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  'Delayed':      { dot: 'bg-amber-400',   label: 'Delayed',      bg: 'bg-amber-50',    text: 'text-amber-700' },
  'Blocked':      { dot: 'bg-red-400',     label: 'Blocked',      bg: 'bg-red-50',      text: 'text-red-700' },
  'Cancelled':    { dot: 'bg-slate-200',   label: 'Cancelled',    bg: 'bg-slate-50',    text: 'text-slate-400' },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string }> = {
  'Low':      { bg: 'bg-slate-100',   text: 'text-slate-500' },
  'Medium':   { bg: 'bg-sky-50',      text: 'text-sky-700' },
  'High':     { bg: 'bg-amber-50',    text: 'text-amber-700' },
  'Critical': { bg: 'bg-red-50',      text: 'text-red-700 font-bold' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

function dueLabel(dateStr?: string | null, completed?: boolean): { text: string; urgent: boolean } | null {
  if (!dateStr || completed) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0,0,0,0);
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, urgent: true };
  if (days === 0) return { text: 'Due today', urgent: true };
  if (days <= 3) return { text: `Due in ${days}d`, urgent: true };
  return { text: new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), urgent: false };
}

export function ActionCard({ action, onUpdate, onComplete, onClick, showOwner = false, compact = false }: ActionCardProps) {
  const overdue = isOverdue(action);
  const isCompleted = action.status === 'Completed';
  const isBlocked = action.status === 'Blocked';
  const statusCfg = STATUS_CONFIG[action.status] ?? STATUS_CONFIG['Not Started'];
  const priorityCfg = PRIORITY_CONFIG[action.priority] ?? PRIORITY_CONFIG['Medium'];
  const due = dueLabel(action.due_date, isCompleted);

  const accentBorder = overdue ? 'border-l-[3px] border-l-red-400'
    : isBlocked ? 'border-l-[3px] border-l-amber-400'
    : action.need_manager_support && !isCompleted ? 'border-l-[3px] border-l-blue-400'
    : '';

  return (
    <div
      className={`card ${accentBorder} ${isCompleted ? 'opacity-70' : ''} ${onClick ? 'card-interactive' : ''} overflow-hidden`}
      onClick={() => onClick?.(action)}
    >
      {/* Card body */}
      <div className={compact ? 'p-3.5' : 'p-4'}>

        {/* Top row: title + priority */}
        <div className="flex items-start gap-2.5">
          <div className="flex-1 min-w-0 space-y-1">
            {/* Kpi tag */}
            {action.kpi && (
              <div className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide">
                {action.kpi.kpi_name}
              </div>
            )}
            <div className={`font-semibold text-sm leading-snug ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
              {action.task_title}
            </div>
            {action.client_name && (
              <div className="text-xs text-slate-400">{action.client_name}</div>
            )}
          </div>
          {/* Priority badge */}
          {!compact && (
            <span className={`pill text-[10px] flex-shrink-0 ${priorityCfg.bg} ${priorityCfg.text}`}>
              {action.priority}
            </span>
          )}
        </div>

        {/* Progress bar — only if active */}
        {!isCompleted && action.progress > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] text-slate-400 font-medium">Progress</div>
              <div className="text-[10px] font-bold text-slate-600">{action.progress}%</div>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  action.progress >= 75 ? 'bg-emerald-400' :
                  action.progress >= 40 ? 'bg-teal-400' : 'bg-blue-400'
                }`}
                style={{ width: `${action.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Status row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className={`pill text-[10px] ${statusCfg.bg} ${statusCfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${statusCfg.dot} inline-block`} />
            {statusCfg.label}
          </span>

          {due && (
            <span className={`pill text-[10px] ${due.urgent ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
              <Calendar className="w-2.5 h-2.5 mr-1" />
              {due.text}
            </span>
          )}

          {action.need_manager_support && !isCompleted && (
            <span className="pill text-[10px] bg-blue-50 text-blue-700">
              Needs Support
            </span>
          )}

          {showOwner && action.owner && (
            <span className="pill text-[10px] bg-slate-100 text-slate-500 ml-auto">
              <User className="w-2.5 h-2.5 mr-1" />
              {action.owner.full_name.split(' ')[0]}
            </span>
          )}

          {!showOwner && (
            <span className="text-[10px] text-slate-400 ml-auto">
              {timeAgo(action.last_updated || action.updated_at)}
            </span>
          )}
        </div>

        {/* Manager feedback */}
        {action.manager_feedback && !isCompleted && (
          <div className="mt-3 bg-blue-50 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-bold text-blue-600 mb-0.5">Manager</div>
              <div className="text-xs text-blue-900 line-clamp-2">{action.manager_feedback}</div>
            </div>
          </div>
        )}

        {/* Risk/Issue for blocked or delayed */}
        {(isBlocked || action.status === 'Delayed') && action.risk_issue && (
          <div className="mt-3 bg-amber-50 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 line-clamp-2">{action.risk_issue}</div>
          </div>
        )}

        {/* Action buttons */}
        {(onUpdate || onComplete) && !isCompleted && (
          <div className="flex gap-2 mt-3.5" onClick={e => e.stopPropagation()}>
            {onUpdate && (
              <button
                onClick={() => onUpdate(action)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors active:scale-[0.97]"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Update
              </button>
            )}
            {onComplete && (
              <button
                onClick={() => onComplete(action)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors active:scale-[0.97]"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Done
              </button>
            )}
          </div>
        )}

        {/* Evidence link */}
        {action.evidence_link && (
          <a
            href={action.evidence_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-teal-600 mt-3 hover:underline w-fit"
            onClick={e => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            View Evidence
          </a>
        )}
      </div>
    </div>
  );
}
