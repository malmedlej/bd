export type Role = 'admin' | 'manager' | 'employee' | 'director';

export type ActionStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Delayed' | 'Blocked' | 'Cancelled';
export type ActionPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type KpiStatus = 'On Track' | 'At Risk' | 'Off Track' | 'Completed';
export type KpiFormulaType = 'manual' | 'action_completion' | 'milestone_completion' | 'share_of_wallet' | 'mixed';
export type MilestoneStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Delayed' | 'Blocked' | 'Cancelled';
export type SowStatus = 'Growing' | 'Flat' | 'Declining' | 'Opportunity' | 'At Risk';
export type ActivityStatus = 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  avatar_url?: string | null;
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KPI {
  id: string;
  kpi_name: string;
  objective?: string;
  weight: number;
  formula_type: KpiFormulaType;
  target_value: number;
  current_score: number;
  status: KpiStatus;
  owner_id?: string | null;
  display_order: number;
  color: string;
  is_active: boolean;
  is_sample?: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  owner?: Profile;
}

export interface WeeklyAction {
  id: string;
  task_title: string;
  description?: string;
  owner_id?: string | null;
  created_by?: string | null;
  linked_kpi_id?: string | null;
  client_name?: string;
  category: string;
  priority: ActionPriority;
  status: ActionStatus;
  progress: number;
  start_date?: string | null;
  due_date?: string | null;
  closure_date?: string | null;
  dependency?: string;
  risk_issue?: string;
  employee_update?: string;
  next_action?: string;
  manager_feedback?: string;
  manager_feedback_at?: string | null;
  manager_feedback_by?: string | null;
  need_manager_support: boolean;
  evidence_link?: string;
  last_updated: string;
  is_sample?: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  owner?: Profile;
  kpi?: KPI;
}

export interface ActionUpdate {
  id: string;
  action_id: string;
  updated_by?: string | null;
  status?: string;
  progress?: number;
  update_text?: string;
  next_action?: string;
  risk_issue?: string;
  need_manager_support?: boolean;
  evidence_link?: string;
  new_due_date?: string | null;
  created_at: string;
  // Joined
  updater?: Profile;
}

export interface Milestone {
  id: string;
  kpi_id?: string | null;
  milestone_name: string;
  description?: string;
  owner_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  completion: number;
  status: MilestoneStatus;
  evidence_link?: string;
  comments?: string;
  is_sample?: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  owner?: Profile;
  kpi?: KPI;
}

export interface ShareOfWallet {
  id: string;
  client_name: string;
  spend_2025: number;
  spend_2026_ytd: number;
  opportunity_identified?: string;
  cross_sell_area?: string;
  next_action?: string;
  owner_id?: string | null;
  status: SowStatus;
  comments?: string;
  is_sample?: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  owner?: Profile;
}

export interface WeeklyCheckin {
  id: string;
  employee_id: string;
  week_start: string;
  week_end: string;
  completed_text?: string;
  in_progress_text?: string;
  blocked_text?: string;
  next_week_focus?: string;
  support_required?: string;
  generated_summary?: string;
  submitted_at: string;
  created_at: string;
  // Joined
  employee?: Profile;
}

export interface MonthlyReview {
  id: string;
  employee_id: string;
  review_month: string;
  overall_kpi_score?: number;
  overall_status?: string;
  achievements?: string;
  delays?: string;
  risks?: string;
  manager_feedback?: string;
  employee_commitment?: string;
  support_required?: string;
  review_date?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  employee?: Profile;
}

export interface ActivityPlan {
  id: string;
  activity_title: string;
  kpi_area?: string;
  purpose?: string;
  owner_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  expected_output?: string;
  status: ActivityStatus;
  notes?: string;
  is_sample?: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  owner?: Profile;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id?: string;
  changed_by?: string | null;
  change_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description?: string;
  created_at: string;
  // Joined
  changer?: Profile;
}

export interface Alert {
  id: string;
  user_id: string;
  alert_type: string;
  title: string;
  message?: string;
  is_read: boolean;
  related_entity_type?: string;
  related_entity_id?: string;
  created_at: string;
}

// UI helpers
export type Screen =
  | 'home'
  | 'actions'
  | 'kpis'
  | 'checkin'
  | 'manager'
  | 'director'
  | 'milestones'
  | 'wallet'
  | 'review'
  | 'activity'
  | 'alerts'
  | 'audit'
  | 'admin';
