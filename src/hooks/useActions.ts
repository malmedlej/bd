import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { WeeklyAction } from '../types';
import { useAuth } from './useAuth';

export function useActions(filter?: { ownerId?: string; all?: boolean }) {
  const { profile } = useAuth();
  const [actions, setActions] = useState<WeeklyAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      let query = supabase
        .from('weekly_actions')
        .select(`
          *,
          owner:profiles!weekly_actions_owner_id_fkey(id, full_name, email, role, avatar_url),
          kpi:kpis!weekly_actions_linked_kpi_id_fkey(id, kpi_name, color, status)
        `)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (filter?.ownerId) {
        query = query.eq('owner_id', filter.ownerId);
      } else if (!filter?.all && profile.role === 'employee') {
        query = query.eq('owner_id', profile.id);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setActions((data ?? []) as WeeklyAction[]);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load actions');
    } finally {
      setLoading(false);
    }
  }, [profile, filter?.ownerId, filter?.all]);

  useEffect(() => { fetch(); }, [fetch]);

  return { actions, loading, error, refetch: fetch };
}
