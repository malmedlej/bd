
/*
# BD Pulse – Core Schema (Part 2): KPIs, Actions, Updates, Milestones

Creates KPI tracker, weekly actions, action update history, and milestones tables.
All tables have RLS enabled with role-based access via get_user_role() helper.
*/

-- KPIs
CREATE TABLE IF NOT EXISTS kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_name text NOT NULL,
  objective text,
  weight numeric DEFAULT 0 CHECK (weight >= 0 AND weight <= 100),
  formula_type text DEFAULT 'action_completion' CHECK (formula_type IN ('manual','action_completion','milestone_completion','share_of_wallet','mixed')),
  target_value numeric DEFAULT 100,
  current_score numeric DEFAULT 0,
  status text DEFAULT 'On Track' CHECK (status IN ('On Track','At Risk','Off Track','Completed')),
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  display_order int DEFAULT 0,
  color text DEFAULT '#0d9488',
  is_active boolean DEFAULT true,
  is_sample boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kpis_select" ON kpis;
CREATE POLICY "kpis_select" ON kpis FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "kpis_insert" ON kpis;
CREATE POLICY "kpis_insert" ON kpis FOR INSERT TO authenticated
WITH CHECK (get_user_role() IN ('admin','manager'));

DROP POLICY IF EXISTS "kpis_update" ON kpis;
CREATE POLICY "kpis_update" ON kpis FOR UPDATE TO authenticated
USING (get_user_role() IN ('admin','manager'))
WITH CHECK (get_user_role() IN ('admin','manager'));

DROP POLICY IF EXISTS "kpis_delete" ON kpis;
CREATE POLICY "kpis_delete" ON kpis FOR DELETE TO authenticated
USING (get_user_role() IN ('admin','manager'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_kpis') THEN
    CREATE TRIGGER set_updated_at_kpis BEFORE UPDATE ON kpis FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Weekly Actions
CREATE TABLE IF NOT EXISTS weekly_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_title text NOT NULL,
  description text,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  linked_kpi_id uuid REFERENCES kpis(id) ON DELETE SET NULL,
  client_name text,
  category text DEFAULT 'General',
  priority text DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Critical')),
  status text DEFAULT 'Not Started' CHECK (status IN ('Not Started','In Progress','Completed','Delayed','Blocked','Cancelled')),
  progress numeric DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date date,
  due_date date,
  closure_date date,
  dependency text,
  risk_issue text,
  employee_update text,
  next_action text,
  manager_feedback text,
  manager_feedback_at timestamptz,
  manager_feedback_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  need_manager_support boolean DEFAULT false,
  evidence_link text,
  last_updated timestamptz DEFAULT now(),
  is_sample boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE weekly_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "actions_select" ON weekly_actions;
CREATE POLICY "actions_select" ON weekly_actions FOR SELECT TO authenticated
USING (
  get_user_role() IN ('admin','manager','director')
  OR owner_id = auth.uid()
  OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "actions_insert" ON weekly_actions;
CREATE POLICY "actions_insert" ON weekly_actions FOR INSERT TO authenticated
WITH CHECK (get_user_role() IN ('admin','manager') OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "actions_update" ON weekly_actions;
CREATE POLICY "actions_update" ON weekly_actions FOR UPDATE TO authenticated
USING (get_user_role() IN ('admin','manager') OR owner_id = auth.uid())
WITH CHECK (get_user_role() IN ('admin','manager') OR owner_id = auth.uid());

DROP POLICY IF EXISTS "actions_delete" ON weekly_actions;
CREATE POLICY "actions_delete" ON weekly_actions FOR DELETE TO authenticated
USING (get_user_role() IN ('admin','manager'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_weekly_actions') THEN
    CREATE TRIGGER set_updated_at_weekly_actions BEFORE UPDATE ON weekly_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Action Updates (immutable history)
CREATE TABLE IF NOT EXISTS action_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES weekly_actions(id) ON DELETE CASCADE,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text,
  progress numeric,
  update_text text,
  next_action text,
  risk_issue text,
  need_manager_support boolean,
  evidence_link text,
  new_due_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE action_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "action_updates_select" ON action_updates;
CREATE POLICY "action_updates_select" ON action_updates FOR SELECT TO authenticated
USING (
  get_user_role() IN ('admin','manager','director')
  OR updated_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM weekly_actions wa
    WHERE wa.id = action_updates.action_id AND wa.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "action_updates_insert" ON action_updates;
CREATE POLICY "action_updates_insert" ON action_updates FOR INSERT TO authenticated
WITH CHECK (
  get_user_role() IN ('admin','manager')
  OR EXISTS (
    SELECT 1 FROM weekly_actions wa
    WHERE wa.id = action_updates.action_id AND wa.owner_id = auth.uid()
  )
);

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid REFERENCES kpis(id) ON DELETE SET NULL,
  milestone_name text NOT NULL,
  description text,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  start_date date,
  due_date date,
  completion numeric DEFAULT 0 CHECK (completion >= 0 AND completion <= 100),
  status text DEFAULT 'Not Started' CHECK (status IN ('Not Started','In Progress','Completed','Delayed','Blocked','Cancelled')),
  evidence_link text,
  comments text,
  is_sample boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "milestones_select" ON milestones;
CREATE POLICY "milestones_select" ON milestones FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "milestones_insert" ON milestones;
CREATE POLICY "milestones_insert" ON milestones FOR INSERT TO authenticated
WITH CHECK (get_user_role() IN ('admin','manager'));

DROP POLICY IF EXISTS "milestones_update" ON milestones;
CREATE POLICY "milestones_update" ON milestones FOR UPDATE TO authenticated
USING (get_user_role() IN ('admin','manager') OR owner_id = auth.uid())
WITH CHECK (get_user_role() IN ('admin','manager') OR owner_id = auth.uid());

DROP POLICY IF EXISTS "milestones_delete" ON milestones;
CREATE POLICY "milestones_delete" ON milestones FOR DELETE TO authenticated
USING (get_user_role() IN ('admin','manager'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_milestones') THEN
    CREATE TRIGGER set_updated_at_milestones BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weekly_actions_owner ON weekly_actions(owner_id);
CREATE INDEX IF NOT EXISTS idx_weekly_actions_kpi ON weekly_actions(linked_kpi_id);
CREATE INDEX IF NOT EXISTS idx_weekly_actions_status ON weekly_actions(status);
CREATE INDEX IF NOT EXISTS idx_weekly_actions_due_date ON weekly_actions(due_date);
CREATE INDEX IF NOT EXISTS idx_action_updates_action ON action_updates(action_id);
CREATE INDEX IF NOT EXISTS idx_milestones_kpi ON milestones(kpi_id);
