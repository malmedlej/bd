import { useState, useMemo } from 'react';
import {
  Search, Plus, X, CheckCircle2
} from 'lucide-react';
import { Screen, WeeklyAction } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useActions } from '../hooks/useActions';
import { useKpis } from '../hooks/useKpis';
import { ActionCard } from '../components/actions/ActionCard';
import { SkeletonCard } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { AddActionModal } from '../components/actions/AddActionModal';
import { isOverdue, isDueSoon, hasNoRecentUpdate } from '../lib/kpiCalculations';
import { supabase } from '../lib/supabase';

type FilterTab = 'all' | 'open' | 'due-soon' | 'overdue' | 'blocked' | 'completed' | 'no-update';

interface ActionsScreenProps {
  onUpdateAction: (action: WeeklyAction) => void;
  onDetailAction: (action: WeeklyAction) => void;
  onNavigate: (s: Screen) => void;
}

export function ActionsScreen({ onUpdateAction, onDetailAction }: ActionsScreenProps) {
  const { profile } = useAuth();
  const isManager = profile?.role === 'owner' || profile?.role === 'manager';
  const { actions, loading, error: loadError, refetch } = useActions({ all: isManager });
  const { kpis } = useKpis();

  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [profiles, setProfiles] = useState<import('../types').Profile[]>([]);
  const [actionError, setActionError] = useState('');

  const loadProfiles = async () => {
    setActionError('');
    const { data, error } = await supabase.from('app_users').select('*').eq('is_active', true);
    if (error) {
      console.error('Unable to load profiles', error);
      setActionError('Unable to load profiles');
      return false;
    }
    setProfiles((data ?? []) as import('../types').Profile[]);
    return true;
  };

  const handleAddClick = async () => {
    const loaded = await loadProfiles();
    if (loaded) setShowAdd(true);
  };

  const filteredActions = useMemo(() => {
    let list = actions;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.task_title.toLowerCase().includes(q) ||
        a.client_name?.toLowerCase().includes(q) ||
        a.kpi?.kpi_name?.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q)
      );
    }

    switch (filter) {
      case 'open':
        return list.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled');
      case 'due-soon':
        return list.filter(a => isDueSoon(a) && !isOverdue(a));
      case 'overdue':
        return list.filter(a => isOverdue(a));
      case 'blocked':
        return list.filter(a => a.status === 'Blocked');
      case 'completed':
        return list.filter(a => a.status === 'Completed');
      case 'no-update':
        return list.filter(a => hasNoRecentUpdate(a));
      default:
        return list;
    }
  }, [actions, filter, search]);

  const counts = useMemo(() => ({
    overdue: actions.filter(a => isOverdue(a)).length,
    blocked: actions.filter(a => a.status === 'Blocked').length,
    dueSoon: actions.filter(a => isDueSoon(a) && !isOverdue(a)).length,
    noUpdate: actions.filter(a => hasNoRecentUpdate(a)).length,
  }), [actions]);

  const TABS: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all',       label: 'All' },
    { id: 'open',      label: 'Open' },
    { id: 'due-soon',  label: 'Due Soon',  count: counts.dueSoon },
    { id: 'overdue',   label: 'Overdue',   count: counts.overdue },
    { id: 'blocked',   label: 'Blocked',   count: counts.blocked },
    { id: 'completed', label: 'Completed' },
    { id: 'no-update', label: 'No Update', count: counts.noUpdate },
  ];

  const handleComplete = async (action: WeeklyAction) => {
    setActionError('');
    const { error } = await supabase.from('weekly_actions').update({
      status: 'Completed',
      progress: 100,
      closure_date: new Date().toISOString().split('T')[0],
      last_updated: new Date().toISOString(),
    }).eq('id', action.id);
    if (error) {
      console.error('Unable to update action', error);
      setActionError('Unable to update action');
      return;
    }
    refetch();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100 lg:px-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9 pr-4"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by task, KPI, client, status…"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5 scrollbar-none">
          {TABS.map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`flex-shrink-0 min-h-11 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                ${filter === id
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {label}
              {count != null && count > 0 && (
                <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center
                  ${filter === id ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {(loadError || actionError) && (
          <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
            {loadError || actionError}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-4 space-y-3 lg:px-6">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : filteredActions.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={search ? 'No results found' : filter === 'overdue' ? 'No overdue actions' : 'No actions here'}
              description={search ? 'Try a different search term.' : filter === 'completed' ? 'Complete some actions to see them here.' : 'Nothing to show for this filter.'}
              action={isManager && !search ? { label: 'Add Action', onClick: handleAddClick } : undefined}
            />
          ) : (
            <>
              <div className="text-xs text-slate-400 pb-1">{filteredActions.length} action{filteredActions.length !== 1 ? 's' : ''}</div>
              <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {filteredActions.map((a) => (
                  <ActionCard
                    key={a.id}
                    action={a}
                    onUpdate={onUpdateAction}
                    onComplete={handleComplete}
                    onClick={onDetailAction}
                    showOwner={isManager}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* FAB */}
      {isManager && (
        <button
          onClick={handleAddClick}
          className="fixed bottom-[calc(6.75rem+env(safe-area-inset-bottom))] right-4 lg:bottom-6 lg:right-6 w-12 h-12 bg-teal-600 text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-teal-700 transition-colors active:scale-95 z-30"
        >
          <Plus className="w-5 h-5" />
        </button>
      )}

      {showAdd && (
        <AddActionModal
          kpis={kpis}
          profiles={profiles}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); refetch(); }}
        />
      )}
    </div>
  );
}
