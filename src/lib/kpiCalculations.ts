import { KPI, WeeklyAction, Milestone, ShareOfWallet } from '../types';

export function calculateKpiScore(
  kpi: KPI,
  actions: WeeklyAction[],
  milestones: Milestone[],
  sowItems: ShareOfWallet[]
): number {
  const linkedActions = actions.filter((a) => a.linked_kpi_id === kpi.id && a.status !== 'Cancelled');
  const linkedMilestones = milestones.filter((m) => m.kpi_id === kpi.id);

  switch (kpi.formula_type) {
    case 'manual':
      return kpi.current_score;

    case 'action_completion': {
      if (linkedActions.length === 0) return kpi.current_score;
      const total = linkedActions.reduce((sum, a) => sum + a.progress, 0);
      const score = total / linkedActions.length;
      const overdue = linkedActions.filter(
        (a) => a.due_date && new Date(a.due_date) < new Date() && a.status !== 'Completed'
      ).length;
      const blocked = linkedActions.filter((a) => a.status === 'Blocked').length;
      const penalty = (overdue * 5 + blocked * 3);
      return Math.max(0, Math.min(100, score - penalty));
    }

    case 'milestone_completion': {
      if (linkedMilestones.length === 0) return kpi.current_score;
      const total = linkedMilestones.reduce((sum, m) => sum + m.completion, 0);
      return total / linkedMilestones.length;
    }

    case 'share_of_wallet': {
      const total2025 = sowItems.reduce((s, i) => s + i.spend_2025, 0);
      const total2026 = sowItems.reduce((s, i) => s + i.spend_2026_ytd, 0);
      if (total2025 === 0) return 0;
      const growthPct = ((total2026 - total2025) / total2025) * 100;
      return Math.min(100, Math.max(0, 50 + growthPct));
    }

    case 'mixed': {
      const scores: number[] = [];
      if (linkedActions.length > 0) {
        const total = linkedActions.reduce((s, a) => s + a.progress, 0);
        scores.push(total / linkedActions.length);
      }
      if (linkedMilestones.length > 0) {
        const total = linkedMilestones.reduce((s, m) => s + m.completion, 0);
        scores.push(total / linkedMilestones.length);
      }
      if (scores.length === 0) return kpi.current_score;
      return scores.reduce((s, v) => s + v, 0) / scores.length;
    }

    default:
      return kpi.current_score;
  }
}

export function getKpiStatus(score: number): KPI['status'] {
  if (score >= 100) return 'Completed';
  if (score >= 80) return 'On Track';
  if (score >= 50) return 'At Risk';
  return 'Off Track';
}

export function calculateOverallScore(kpis: KPI[]): number {
  const active = kpis.filter((k) => k.is_active);
  if (active.length === 0) return 0;
  const totalWeight = active.reduce((s, k) => s + k.weight, 0);
  if (totalWeight === 0) {
    const total = active.reduce((s, k) => s + k.current_score, 0);
    return Math.round(total / active.length);
  }
  const weighted = active.reduce((s, k) => s + k.current_score * k.weight, 0);
  return Math.round(weighted / totalWeight);
}

export function isOverdue(action: WeeklyAction): boolean {
  if (!action.due_date) return false;
  if (action.status === 'Completed' || action.status === 'Cancelled') return false;
  return new Date(action.due_date) < new Date();
}

export function isDueSoon(action: WeeklyAction, days = 7): boolean {
  if (!action.due_date) return false;
  if (action.status === 'Completed' || action.status === 'Cancelled') return false;
  const due = new Date(action.due_date);
  const now = new Date();
  const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

export function hasNoRecentUpdate(action: WeeklyAction, days = 7): boolean {
  if (action.status === 'Completed' || action.status === 'Cancelled') return false;
  const lastUpdated = new Date(action.last_updated || action.updated_at);
  const diff = (new Date().getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
  return diff > days;
}
