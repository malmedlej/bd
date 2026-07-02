import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { KPI, WeeklyAction, Milestone, ShareOfWallet } from '../types';
import { calculateKpiScore, getKpiStatus } from '../lib/kpiCalculations';

export function useKpis() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [kpisRes, actionsRes, milestonesRes, sowRes] = await Promise.all([
        supabase.from('kpis').select('*, owner:app_users!kpis_owner_id_fkey(id, full_name)').eq('is_active', true).order('display_order'),
        supabase.from('weekly_actions').select('id, linked_kpi_id, status, progress, due_date').neq('status', 'Cancelled'),
        supabase.from('milestones').select('id, kpi_id, completion, status'),
        supabase.from('share_of_wallet').select('id, spend_2025, spend_2026_ytd, status'),
      ]);

      if (kpisRes.error) throw kpisRes.error;
      if (actionsRes.error) throw actionsRes.error;
      if (milestonesRes.error) throw milestonesRes.error;
      if (sowRes.error) throw sowRes.error;

      const rawKpis = (kpisRes.data ?? []) as KPI[];
      const actions = (actionsRes.data ?? []) as WeeklyAction[];
      const milestones = (milestonesRes.data ?? []) as Milestone[];
      const sow = (sowRes.data ?? []) as ShareOfWallet[];

      const enriched = rawKpis.map((k) => {
        const score = Math.round(calculateKpiScore(k, actions, milestones, sow));
        return { ...k, current_score: score, status: getKpiStatus(score) };
      });

      setKpis(enriched);
      setError(null);
    } catch (e: unknown) {
      console.error('Unable to load KPIs', e);
      setError('Unable to load KPIs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { kpis, loading, error, refetch: fetch };
}
