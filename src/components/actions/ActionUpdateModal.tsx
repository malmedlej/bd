import { useState, useEffect } from 'react';
import { WeeklyAction, ActionStatus } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { saveDraft, getDraft, clearDraft } from '../../lib/draftStorage';
import { X, AlertTriangle, ExternalLink, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

interface ActionUpdateModalProps {
  action: WeeklyAction;
  onClose: () => void;
  onSaved: () => void;
}

type ProgressStep = 0 | 25 | 50 | 75 | 100;

const STATUSES: { val: ActionStatus; icon: string; bg: string; active: string }[] = [
  { val: 'Not Started', icon: '⭕', bg: 'bg-slate-50  border-slate-200',  active: 'bg-slate-100  border-slate-400  text-slate-800' },
  { val: 'In Progress', icon: '🔄', bg: 'bg-blue-50   border-blue-100',   active: 'bg-blue-100   border-blue-500   text-blue-800' },
  { val: 'Completed',   icon: '✅', bg: 'bg-emerald-50 border-emerald-100', active: 'bg-emerald-100 border-emerald-500 text-emerald-800' },
  { val: 'Delayed',     icon: '⏳', bg: 'bg-amber-50  border-amber-100',  active: 'bg-amber-100  border-amber-500  text-amber-800' },
  { val: 'Blocked',     icon: '🚫', bg: 'bg-red-50    border-red-100',    active: 'bg-red-100    border-red-500    text-red-800' },
  { val: 'Cancelled',   icon: '✖',  bg: 'bg-slate-50  border-slate-200',  active: 'bg-slate-100  border-slate-400  text-slate-500' },
];

const STATUS_CURRENT_STYLE: Record<ActionStatus, string> = {
  'Not Started': 'bg-slate-100 text-slate-600',
  'In Progress':  'bg-blue-50 text-blue-700',
  'Completed':    'bg-emerald-50 text-emerald-700',
  'Delayed':      'bg-amber-50 text-amber-700',
  'Blocked':      'bg-red-50 text-red-700',
  'Cancelled':    'bg-slate-100 text-slate-400',
};

const PROGRESS_STEPS: ProgressStep[] = [0, 25, 50, 75, 100];

export function ActionUpdateModal({ action, onClose, onSaved }: ActionUpdateModalProps) {
  useBodyScrollLock();

  const { profile } = useAuth();
  const draft = getDraft('action-update', action.id);

  const [status, setStatus] = useState<ActionStatus>(
    (draft?.data.status as ActionStatus) ?? action.status
  );
  const [progress, setProgress] = useState<number>(
    (draft?.data.progress as number) ?? action.progress
  );
  const [updateText, setUpdateText] = useState(
    (draft?.data.updateText as string) ?? ''
  );
  const [nextAction, setNextAction] = useState(
    (draft?.data.nextAction as string) ?? ''
  );
  const [riskIssue, setRiskIssue] = useState(
    (draft?.data.riskIssue as string) ?? (action.risk_issue ?? '')
  );
  const [needSupport, setNeedSupport] = useState(
    (draft?.data.needSupport as boolean) ?? action.need_manager_support
  );
  const [evidenceLink, setEvidenceLink] = useState(
    (draft?.data.evidenceLink as string) ?? (action.evidence_link ?? '')
  );
  const [newDueDate, setNewDueDate] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [toast, setToast] = useState('');

  const showRisk = status === 'Delayed' || status === 'Blocked';

  useEffect(() => {
    if (status === 'Completed') setProgress(100);
  }, [status]);

  const handleProgressClick = (p: ProgressStep) => {
    setProgress(p);
    if (p === 100 && status !== 'Completed') setConfirmComplete(true);
    if (p < 100 && status === 'Completed') setStatus('In Progress');
  };

  const handleStatusClick = (s: ActionStatus) => {
    setStatus(s);
    setConfirmComplete(false);
    if (s === 'Completed') { setProgress(100); setConfirmComplete(false); }
  };

  const handleSave = async () => {
    if (showRisk && !riskIssue.trim()) {
      setError('Please describe the risk or issue before saving.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const now = new Date().toISOString();
      const { error: actionError } = await supabase.from('weekly_actions').update({
        status,
        progress,
        employee_update:      updateText   || null,
        next_action:          nextAction   || null,
        risk_issue:           riskIssue    || null,
        need_manager_support: needSupport,
        evidence_link:        evidenceLink || null,
        last_updated:         now,
        ...(newDueDate && { due_date: newDueDate }),
        ...(status === 'Completed' && { closure_date: now.split('T')[0] }),
      }).eq('id', action.id);
      if (actionError) throw actionError;

      const { error: historyError } = await supabase.from('action_updates').insert({
        action_id:            action.id,
        updated_by:           profile?.id,
        status,
        progress,
        update_text:          updateText   || null,
        next_action:          nextAction   || null,
        risk_issue:           riskIssue    || null,
        need_manager_support: needSupport,
        evidence_link:        evidenceLink || null,
        new_due_date:         newDueDate   || null,
      });
      if (historyError) throw historyError;

      const { error: auditError } = await supabase.from('audit_log').insert({
        entity_type: 'weekly_action',
        entity_id:   action.id,
        changed_by:  profile?.id,
        change_type: 'update',
        field_name:  'status',
        old_value:   action.status,
        new_value:   status,
        description: `${profile?.full_name} updated "${action.task_title}" → ${status} (${progress}%)`,
      });
      if (auditError) throw auditError;

      clearDraft('action-update', action.id);

      const message = needSupport
        ? 'Update saved. Manager support requested.'
        : 'Update saved successfully.';
      setToast(message);

      // Show toast briefly then close
      setTimeout(() => {
        onSaved();
      }, 1400);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
      setSaving(false);
    }
  };

  const handleDraft = () => {
    saveDraft('action-update', action.id, { status, progress, updateText, nextAction, riskIssue, needSupport, evidenceLink });
    onClose();
  };

  // Toast overlay — shown after successful save
  if (toast) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none lg:items-center">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative mb-8 lg:mb-0 mx-4 bg-slate-900 text-white rounded-2xl px-5 py-4 flex items-center gap-3 shadow-2xl scale-in">
          <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm font-semibold">{toast}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden lg:items-center">
      <div className="absolute inset-0 bg-black/60 fade-in" onClick={onClose} />

      <div className="modal-sheet relative bg-white w-full lg:max-w-md lg:rounded-2xl rounded-t-3xl slide-up flex flex-col">
        {/* Handle bar */}
        <div className="flex justify-center pt-2.5 pb-1 lg:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 border-b border-slate-100 flex items-start justify-between flex-shrink-0">
          <div className="flex-1 min-w-0 pr-2">
            <div className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-0.5">Quick Update</div>
            <div className="font-bold text-slate-900 text-base leading-snug line-clamp-2">{action.task_title}</div>
            {action.kpi && (
              <div className="text-xs text-slate-400 mt-0.5">{action.kpi.kpi_name}</div>
            )}
            {/* Current status pill */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400 font-medium">Current status:</span>
              <span className={`pill text-[10px] ${STATUS_CURRENT_STYLE[action.status]}`}>
                {action.status}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="min-h-11 min-w-11 p-2 rounded-xl hover:bg-slate-100 text-slate-400 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Draft restored */}
        {draft && (
          <div className="mx-4 mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex-shrink-0">
            Draft restored from {new Date(draft.savedAt).toLocaleTimeString()}
          </div>
        )}

        {/* Confirm complete prompt */}
        {confirmComplete && (
          <div className="mx-4 mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 flex items-center gap-3 flex-shrink-0">
            <div className="text-sm text-emerald-800 flex-1">Mark as <strong>Completed</strong>?</div>
            <button onClick={() => { handleStatusClick('Completed'); }} className="min-h-11 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg">Yes</button>
            <button onClick={() => setConfirmComplete(false)} className="min-h-11 px-3 text-xs text-emerald-600">No</button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="modal-scroll flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* STATUS — big tappable buttons */}
          <div>
            <div className="label">New Status</div>
            <div className="grid grid-cols-3 gap-2">
              {STATUSES.map(({ val, icon, bg, active }) => (
                <button
                  key={val}
                  onClick={() => handleStatusClick(val)}
                  className={`py-3 px-2 rounded-xl border-2 text-xs font-bold transition-all active:scale-[0.97] leading-tight
                    ${status === val ? active : `${bg} text-slate-600 hover:border-slate-300`}`}
                >
                  <div className="text-base mb-1">{icon}</div>
                  <div>{val}</div>
                </button>
              ))}
            </div>
          </div>

          {/* PROGRESS — big pill buttons */}
          <div>
            <div className="label">Progress</div>
            <div className="flex gap-2">
              {PROGRESS_STEPS.map(p => (
                <button
                  key={p}
                  onClick={() => handleProgressClick(p)}
                  className={`flex-1 py-3.5 rounded-xl text-sm font-bold border-2 transition-all active:scale-[0.97]
                    ${progress === p
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-teal-300'}`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          {/* WHAT CHANGED */}
          <div>
            <div className="label">What changed?</div>
            <textarea
              className="input resize-none text-base"
              rows={2}
              value={updateText}
              onChange={e => setUpdateText(e.target.value)}
              placeholder="Briefly describe what happened…"
              autoFocus={false}
            />
          </div>

          {/* RISK/ISSUE — shown only when Delayed or Blocked */}
          {showRisk && (
            <div>
              <div className="label flex items-center gap-1.5 text-amber-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                Risk / Issue <span className="text-red-400">*</span>
              </div>
              <textarea
                className="input resize-none border-amber-200 focus:border-amber-400 focus:ring-amber-200"
                rows={2}
                value={riskIssue}
                onChange={e => setRiskIssue(e.target.value)}
                placeholder="What is blocking this? What do you need?"
                autoFocus
              />
            </div>
          )}

          {/* NEEDS SUPPORT — large toggle */}
          <div>
            <div className="label">Needs Manager Support?</div>
            <div className="flex gap-3">
              <button
                onClick={() => setNeedSupport(true)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-[0.97]
                  ${needSupport ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
              >
                Yes, I need support
              </button>
              <button
                onClick={() => setNeedSupport(false)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-[0.97]
                  ${!needSupport ? 'bg-slate-800 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
              >
                No, all good
              </button>
            </div>
          </div>

          {/* MORE OPTIONS — collapsible */}
          <div>
            <button
              onClick={() => setShowMore(!showMore)}
              className="flex items-center gap-2 text-xs text-slate-400 font-semibold hover:text-slate-600 transition-colors"
            >
              {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showMore ? 'Fewer options' : 'More options (next action, evidence, due date)'}
            </button>

            {showMore && (
              <div className="mt-3 space-y-4 fade-in">
                <div>
                  <div className="label">Next Action</div>
                  <input
                    className="input"
                    value={nextAction}
                    onChange={e => setNextAction(e.target.value)}
                    placeholder="What will you do next?"
                  />
                </div>
                <div>
                  <div className="label">Evidence Link</div>
                  <div className="relative">
                    <input
                      className="input pr-9"
                      value={evidenceLink}
                      onChange={e => setEvidenceLink(e.target.value)}
                      placeholder="https://… SharePoint, email, doc"
                      type="url"
                    />
                    {evidenceLink && (
                      <a href={evidenceLink} target="_blank" rel="noopener noreferrer"
                         className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-500">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <div className="label">New Due Date</div>
                  <input
                    className="input"
                    type="date"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 pt-3 pb-4 border-t border-slate-100 flex gap-2.5 flex-shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
        >
          <button onClick={handleDraft} className="btn-secondary px-3">
            Save Draft
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1 py-3 text-base"
          >
            {saving ? 'Saving…' : 'Save Update'}
          </button>
        </div>
      </div>
    </div>
  );
}
