import React, { useState } from 'react';
import { WeeklyAction, ActionPriority, KPI, Profile } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { X } from 'lucide-react';

interface AddActionModalProps {
  kpis: KPI[];
  profiles: Profile[];
  onClose: () => void;
  onSaved: () => void;
  initial?: Partial<WeeklyAction>;
}

const TEMPLATES = [
  { label: 'Client Follow-up',     category: 'Client Management',   description: 'Follow up with client on pending matters' },
  { label: 'RFQ Review',           category: 'Proposal',            description: 'Review and respond to Request for Quotation' },
  { label: 'Proposal Preparation', category: 'Proposal',            description: 'Prepare commercial proposal for client' },
  { label: 'Supplier Coordination', category: 'Operations',         description: 'Coordinate with supplier on logistics requirements' },
  { label: 'Internal Alignment',   category: 'Internal',            description: 'Internal meeting for alignment on BD strategy' },
  { label: 'CargoWise Update',     category: 'CRM / System',        description: 'Update CargoWise with latest client and opportunity data' },
  { label: 'Automotive Lead',      category: 'Automotive Vertical', description: 'Develop automotive sector opportunity' },
  { label: 'Industrial Lead',      category: 'Industrial Vertical', description: 'Develop industrial sector opportunity' },
  { label: 'Meeting Arrangement',  category: 'Client Management',   description: 'Arrange and prepare for client meeting' },
  { label: 'Share of Wallet',      category: 'Growth',              description: 'Identify cross-sell / up-sell opportunity' },
  { label: 'Tender Support',       category: 'Proposal',            description: 'Support tender submission and documentation' },
  { label: 'Documentation Update', category: 'Admin',               description: 'Update documentation and records' },
];

const PRIORITIES: ActionPriority[] = ['Low', 'Medium', 'High', 'Critical'];

export function AddActionModal({ kpis, profiles, onClose, onSaved, initial }: AddActionModalProps) {
  useBodyScrollLock();

  const { profile } = useAuth();
  const [title, setTitle] = useState(initial?.task_title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [ownerId, setOwnerId] = useState(initial?.owner_id ?? profile?.id ?? '');
  const [kpiId, setKpiId] = useState(initial?.linked_kpi_id ?? '');
  const [priority, setPriority] = useState<ActionPriority>(initial?.priority ?? 'Medium');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [client, setClient] = useState(initial?.client_name ?? '');
  const [startDate, setStartDate] = useState(initial?.start_date ?? '');
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '');
  const [dependency, setDependency] = useState(initial?.dependency ?? '');
  const [managerNote, setManagerNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setTitle(t.label);
    setCategory(t.category);
    setDescription(t.description);
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Task title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const { error: err } = await supabase.from('weekly_actions').insert({
        task_title: title.trim(),
        description: description || null,
        owner_id: ownerId || null,
        created_by: profile?.id,
        linked_kpi_id: kpiId || null,
        client_name: client || null,
        category: category || 'General',
        priority,
        status: 'Not Started',
        progress: 0,
        start_date: startDate || null,
        due_date: dueDate || null,
        dependency: dependency || null,
        manager_feedback: managerNote || null,
        last_updated: new Date().toISOString(),
      });
      if (err) throw err;
      onSaved();
    } catch (e: unknown) {
      console.error('Unable to create action', e);
      setError('Unable to create action');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden lg:items-center">
      <div className="absolute inset-0 bg-black/50 fade-in" onClick={onClose} />
      <div className="modal-sheet relative bg-white w-full lg:max-w-lg lg:rounded-2xl rounded-t-2xl slide-up overflow-hidden flex flex-col">
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-base">Add Action</h2>
          <button onClick={onClose} className="min-h-11 min-w-11 p-2 rounded-xl hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-scroll flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Templates */}
          <div>
            <label className="label">Quick Templates</label>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => applyTemplate(t)}
                  className="min-h-11 text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="label">Task Title <span className="text-red-400">*</span></label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional details…" />
          </div>

          {/* Owner */}
          <div>
            <label className="label">Assign To</label>
            <select className="input" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">Select owner</option>
              {profiles.filter(p => p.is_active).map((p) => (
                <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
              ))}
            </select>
          </div>

          {/* KPI */}
          <div>
            <label className="label">Linked KPI</label>
            <select className="input" value={kpiId} onChange={(e) => setKpiId(e.target.value)}>
              <option value="">Select KPI</option>
              {kpis.map((k) => (
                <option key={k.id} value={k.id}>{k.kpi_name}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="label">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 min-h-11 py-2 rounded-xl text-xs font-semibold border-2 transition-all
                    ${priority === p ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-100 text-slate-500'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Client & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Client / Opportunity</label>
              <input className="input" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client name" />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* Dependency */}
          <div>
            <label className="label">Dependency <span className="text-slate-400 normal-case text-[10px] font-normal">(optional)</span></label>
            <input className="input" value={dependency} onChange={(e) => setDependency(e.target.value)} placeholder="Depends on…" />
          </div>

          {/* Manager Note */}
          {(profile?.role === 'admin' || profile?.role === 'manager') && (
            <div>
              <label className="label">Manager Note</label>
              <textarea className="input resize-none" rows={2} value={managerNote} onChange={(e) => setManagerNote(e.target.value)} placeholder="Instructions or context for the owner…" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">{error}</div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-3"
             style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Creating…' : 'Create Action'}
          </button>
        </div>
      </div>
    </div>
  );
}
