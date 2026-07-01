import React, { useState, useMemo } from 'react';
import {
  CheckCircle, Clock, AlertTriangle, ArrowRight, ArrowLeft,
  Copy, Check, Calendar, Send
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useActions } from '../hooks/useActions';
import { supabase } from '../lib/supabase';

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now); start.setDate(now.getDate() - day);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(start), end: fmt(end) };
}

interface StepIndicatorProps {
  current: number;
  total: number;
}

function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${i === current ? 'w-6 bg-teal-500' : i < current ? 'w-3 bg-teal-300' : 'w-3 bg-slate-200'}`}
        />
      ))}
    </div>
  );
}

export function WeeklyCheckinWizard({ onComplete }: { onComplete: () => void }) {
  const { profile } = useAuth();
  const { actions } = useActions();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState('');
  const [error, setError] = useState('');

  const openActions = useMemo(() =>
    actions.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled'), [actions]);
  const completedActions = useMemo(() =>
    actions.filter(a => a.status === 'Completed'), [actions]);
  const blockedActions = useMemo(() =>
    actions.filter(a => a.status === 'Blocked' || a.status === 'Delayed'), [actions]);

  const [completedText, setCompletedText] = useState('');
  const [selectedCompleted, setSelectedCompleted] = useState<string[]>([]);
  const [inProgressText, setInProgressText] = useState('');
  const [blockedText, setBlockedText] = useState('');
  const [selectedBlocked, setSelectedBlocked] = useState<string[]>([]);
  const [nextWeekFocus, setNextWeekFocus] = useState('');
  const [supportRequired, setSupportRequired] = useState('');

  const STEPS = [
    { title: 'What did you complete?', icon: CheckCircle, color: 'text-emerald-500' },
    { title: 'What\'s in progress?',   icon: Clock,       color: 'text-blue-500' },
    { title: 'What\'s blocked?',       icon: AlertTriangle, color: 'text-amber-500' },
    { title: 'Next week focus',        icon: ArrowRight,  color: 'text-teal-500' },
    { title: 'Manager support needed?', icon: Send,       color: 'text-purple-500' },
  ];

  const generateSummary = (): string => {
    const week = getWeekRange();
    const completedItems = [
      ...selectedCompleted.map(id => {
        const a = completedActions.find(ac => ac.id === id);
        return a ? `• ${a.task_title}` : null;
      }).filter(Boolean),
      ...(completedText ? completedText.split('\n').filter(l => l.trim()).map(l => `• ${l.trim()}`) : []),
    ];
    const blockedItems = [
      ...selectedBlocked.map(id => {
        const a = blockedActions.find(ac => ac.id === id);
        return a ? `• ${a.task_title}${a.risk_issue ? ` — ${a.risk_issue}` : ''}` : null;
      }).filter(Boolean),
      ...(blockedText ? blockedText.split('\n').filter(l => l.trim()).map(l => `• ${l.trim()}`) : []),
    ];

    const lines: string[] = [];
    lines.push(`Weekly BD Update – ${profile?.full_name}`);
    lines.push(`Week of ${new Date(week.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} – ${new Date(week.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`);
    lines.push('');

    if (completedItems.length > 0) {
      lines.push('✅ Completed:');
      completedItems.forEach(i => lines.push(i!));
      lines.push('');
    }

    if (inProgressText) {
      lines.push('🔄 In Progress:');
      inProgressText.split('\n').filter(l => l.trim()).forEach(l => lines.push(`• ${l.trim()}`));
      lines.push('');
    }

    if (blockedItems.length > 0) {
      lines.push('⚠️ Blocked / Delayed:');
      blockedItems.forEach(i => lines.push(i!));
      lines.push('');
    }

    if (nextWeekFocus) {
      lines.push('📅 Next Week Focus:');
      nextWeekFocus.split('\n').filter(l => l.trim()).forEach(l => lines.push(`• ${l.trim()}`));
      lines.push('');
    }

    if (supportRequired) {
      lines.push('🙋 Support Required:');
      supportRequired.split('\n').filter(l => l.trim()).forEach(l => lines.push(`• ${l.trim()}`));
    }

    return lines.join('\n');
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    const week = getWeekRange();
    const summary = generateSummary();

    const { error: submitError } = await supabase.from('weekly_checkins').insert({
      employee_id: profile?.id,
      week_start: week.start,
      week_end: week.end,
      completed_text: completedText,
      in_progress_text: inProgressText,
      blocked_text: blockedText,
      next_week_focus: nextWeekFocus,
      support_required: supportRequired,
      generated_summary: summary,
    });

    setSaving(false);
    if (submitError) {
      setError(submitError.message);
      return;
    }

    setGeneratedSummary(summary);
    setStep(5);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleItem = (id: string, list: string[], setList: (l: string[]) => void) => {
    setList(list.includes(id) ? list.filter(i => i !== id) : [...list, id]);
  };

  // Final summary screen
  if (step === 5) {
    return (
      <div className="px-4 py-5 max-w-2xl mx-auto space-y-5 fade-in">
        <div className="text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-7 h-7 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Check-in Submitted!</h1>
          <p className="text-slate-500 text-sm mt-1">Your weekly summary has been saved.</p>
        </div>

        <div className="card p-4">
          <div className="section-title mb-3 flex items-center justify-between">
            <span>Generated Summary</span>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all
                ${copied ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 rounded-xl p-4">
            {generatedSummary}
          </pre>
        </div>

        <button onClick={onComplete} className="btn-primary w-full">
          Done
        </button>
      </div>
    );
  }

  const currentStep = STEPS[step];
  const StepIcon = currentStep.icon;

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto space-y-5 fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StepIcon className={`w-5 h-5 ${currentStep.color}`} />
            <span className="text-xs font-semibold text-slate-500">{step + 1} of {STEPS.length}</span>
          </div>
          <StepIndicator current={step} total={STEPS.length} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{currentStep.title}</h2>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          Weekly Check-in
        </div>
      </div>

      {/* Step 0: Completed */}
      {step === 0 && (
        <div className="space-y-4">
          {completedActions.length > 0 && (
            <div>
              <label className="label">Select completed actions</label>
              <div className="space-y-2">
                {completedActions.slice(0, 8).map(a => (
                  <button
                    key={a.id}
                    onClick={() => toggleItem(a.id, selectedCompleted, setSelectedCompleted)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all text-sm
                      ${selectedCompleted.includes(a.id)
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                        : 'border-slate-100 text-slate-700 hover:border-slate-200'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                        ${selectedCompleted.includes(a.id) ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                        {selectedCompleted.includes(a.id) && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      {a.task_title}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="label">Add additional completions (one per line)</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={completedText}
              onChange={(e) => setCompletedText(e.target.value)}
              placeholder="e.g., B-Train solution deck updated…"
            />
          </div>
        </div>
      )}

      {/* Step 1: In Progress */}
      {step === 1 && (
        <div className="space-y-4">
          {openActions.length > 0 && (
            <div className="card divide-y divide-slate-50">
              {openActions.slice(0, 6).map(a => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{a.task_title}</div>
                    <div className="text-xs text-slate-400">{a.progress}% done</div>
                  </div>
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden ml-3">
                    <div className="h-full bg-teal-400 rounded-full" style={{ width: `${a.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div>
            <label className="label">What are you working on? (one per line)</label>
            <textarea
              className="input resize-none"
              rows={4}
              value={inProgressText}
              onChange={(e) => setInProgressText(e.target.value)}
              placeholder="Wallan Group RFQ – 25%&#10;IdentiFlight shipment – 40%"
            />
          </div>
        </div>
      )}

      {/* Step 2: Blocked */}
      {step === 2 && (
        <div className="space-y-4">
          {blockedActions.length > 0 && (
            <div>
              <label className="label">Select blocked/delayed actions</label>
              <div className="space-y-2">
                {blockedActions.map(a => (
                  <button
                    key={a.id}
                    onClick={() => toggleItem(a.id, selectedBlocked, setSelectedBlocked)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all text-sm
                      ${selectedBlocked.includes(a.id)
                        ? 'border-amber-400 bg-amber-50 text-amber-800'
                        : 'border-slate-100 text-slate-700 hover:border-slate-200'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                        ${selectedBlocked.includes(a.id) ? 'border-amber-500 bg-amber-500' : 'border-slate-300'}`}>
                        {selectedBlocked.includes(a.id) && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div>
                        <div>{a.task_title}</div>
                        {a.risk_issue && <div className="text-xs text-amber-600 mt-0.5">{a.risk_issue}</div>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="label">Additional blockers or issues</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={blockedText}
              onChange={(e) => setBlockedText(e.target.value)}
              placeholder="MUSAHAMA registration pending internal action…"
            />
          </div>
        </div>
      )}

      {/* Step 3: Next Week */}
      {step === 3 && (
        <div>
          <label className="label">What will you focus on next week?</label>
          <textarea
            className="input resize-none"
            rows={5}
            value={nextWeekFocus}
            onChange={(e) => setNextWeekFocus(e.target.value)}
            placeholder="Close pending RFQs&#10;Update Automotive opportunity pipeline&#10;Follow up with key clients"
          />
        </div>
      )}

      {/* Step 4: Support */}
      {step === 4 && (
        <div>
          <label className="label">What support do you need from your manager?</label>
          <textarea
            className="input resize-none"
            rows={4}
            value={supportRequired}
            onChange={(e) => setSupportRequired(e.target.value)}
            placeholder="Manager input required on client priority&#10;Clarification needed on registration process"
          />
          <p className="text-xs text-slate-400 mt-2">Leave blank if no support is needed.</p>
        </div>
      )}

      {/* Navigation */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="btn-secondary flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)} className="btn-primary flex-1 flex items-center justify-center gap-1.5">
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Submitting…' : 'Submit Check-in'}
          </button>
        )}
      </div>

      {/* Skip */}
      <button onClick={onComplete} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors py-1">
        Skip this week
      </button>
    </div>
  );
}
