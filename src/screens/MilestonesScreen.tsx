import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Download } from 'lucide-react';
import { Milestone } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useKpis } from '../hooks/useKpis';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { exportMilestonesToCsv } from '../lib/csvExport';

export function MilestonesScreen() {
  const { profile } = useAuth();
  const { kpis } = useKpis();
  const isManager = profile?.role === 'admin' || profile?.role === 'manager';
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterKpi, setFilterKpi] = useState('');
  const [error, setError] = useState('');

  const fetchMilestones = async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('milestones')
      .select('*, kpi:kpis(id, kpi_name, color), owner:profiles!milestones_owner_id_fkey(id, full_name)')
      .order('due_date', { ascending: true, nullsFirst: false });
    if (err) {
      console.error('Unable to load milestones', err);
      setError('Unable to load milestones');
      setMilestones([]);
      setLoading(false);
      return;
    }
    setMilestones((data ?? []) as Milestone[]);
    setLoading(false);
  };

  useEffect(() => { fetchMilestones(); }, []);

  const filtered = useMemo(() =>
    filterKpi ? milestones.filter(m => m.kpi_id === filterKpi) : milestones,
    [milestones, filterKpi]);

  if (loading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 space-y-4 lg:px-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-slate-900 text-lg">Milestones</h1>
          <p className="text-xs text-slate-500">{milestones.length} total</p>
        </div>
        {isManager && (
          <button onClick={() => exportMilestonesToCsv(milestones)} className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Filter by KPI */}
      {kpis.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterKpi('')}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${!filterKpi ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >All</button>
          {kpis.map(k => (
            <button
              key={k.id}
              onClick={() => setFilterKpi(k.id)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${filterKpi === k.id ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >{k.kpi_name}</button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No milestones" description="Milestones help track major project deliverables linked to KPIs." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {filtered.map(m => (
            <div key={m.id} className="card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{m.milestone_name}</h3>
                  {m.kpi && <span className="text-[10px] text-teal-600 font-medium">{m.kpi.kpi_name}</span>}
                </div>
                <StatusBadge status={m.status} />
              </div>
              {m.description && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{m.description}</p>}
              <ProgressBar value={m.completion} showLabel size="md" />
              <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                {m.due_date && <span>Due: {new Date(m.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                {m.owner && <span>{m.owner.full_name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
