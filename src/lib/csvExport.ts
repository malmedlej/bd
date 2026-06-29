import { WeeklyAction, KPI, Milestone, ShareOfWallet } from '../types';

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(row: unknown[]): string {
  return row.map(escapeCsv).join(',');
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportActionsToCsv(actions: WeeklyAction[]) {
  const headers = [
    'Task Title', 'Status', 'Priority', 'Progress %', 'Owner',
    'KPI', 'Client', 'Category', 'Due Date', 'Employee Update',
    'Next Action', 'Risk/Issue', 'Manager Feedback', 'Needs Support', 'Evidence Link',
    'Last Updated'
  ];
  const rows = actions.map((a) => [
    a.task_title, a.status, a.priority, a.progress,
    a.owner?.full_name ?? '', a.kpi?.kpi_name ?? '', a.client_name ?? '',
    a.category, a.due_date ?? '', a.employee_update ?? '', a.next_action ?? '',
    a.risk_issue ?? '', a.manager_feedback ?? '',
    a.need_manager_support ? 'Yes' : 'No',
    a.evidence_link ?? '', a.last_updated
  ]);
  const csv = [rowToCsv(headers), ...rows.map(rowToCsv)].join('\n');
  download(`bd-pulse-actions-${new Date().toISOString().split('T')[0]}.csv`, csv);
}

export function exportKpisToCsv(kpis: KPI[]) {
  const headers = ['KPI Name', 'Objective', 'Weight', 'Formula Type', 'Target', 'Current Score', 'Status'];
  const rows = kpis.map((k) => [
    k.kpi_name, k.objective ?? '', k.weight, k.formula_type,
    k.target_value, k.current_score, k.status
  ]);
  const csv = [rowToCsv(headers), ...rows.map(rowToCsv)].join('\n');
  download(`bd-pulse-kpis-${new Date().toISOString().split('T')[0]}.csv`, csv);
}

export function exportMilestonesToCsv(milestones: Milestone[]) {
  const headers = ['Milestone', 'KPI', 'Owner', 'Due Date', 'Completion %', 'Status', 'Comments'];
  const rows = milestones.map((m) => [
    m.milestone_name, m.kpi?.kpi_name ?? '', m.owner?.full_name ?? '',
    m.due_date ?? '', m.completion, m.status, m.comments ?? ''
  ]);
  const csv = [rowToCsv(headers), ...rows.map(rowToCsv)].join('\n');
  download(`bd-pulse-milestones-${new Date().toISOString().split('T')[0]}.csv`, csv);
}

export function exportSowToCsv(items: ShareOfWallet[]) {
  const headers = ['Client', '2025 Spend', '2026 YTD', 'Growth Amount', 'Growth %', 'Status', 'Opportunity', 'Next Action'];
  const rows = items.map((i) => {
    const growth = i.spend_2026_ytd - i.spend_2025;
    const pct = i.spend_2025 > 0 ? ((growth / i.spend_2025) * 100).toFixed(1) : '0';
    return [
      i.client_name, i.spend_2025, i.spend_2026_ytd,
      growth, `${pct}%`, i.status,
      i.opportunity_identified ?? '', i.next_action ?? ''
    ];
  });
  const csv = [rowToCsv(headers), ...rows.map(rowToCsv)].join('\n');
  download(`bd-pulse-sow-${new Date().toISOString().split('T')[0]}.csv`, csv);
}
