
/*
# BD Pulse – Core Schema (Part 3): Share of Wallet, Check-ins, Reviews, Activity, Audit, Alerts

Creates remaining tables: share_of_wallet, weekly_checkins, monthly_reviews,
activity_plan, audit_log, and alerts.
*/

-- Share of Wallet
CREATE TABLE IF NOT EXISTS share_of_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  spend_2025 numeric DEFAULT 0,
  spend_2026_ytd numeric DEFAULT 0,
  opportunity_identified text,
  cross_sell_area text,
  next_action text,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'Flat' CHECK (status IN ('Growing','Flat','Declining','Opportunity','At Risk')),
  comments text,
  is_sample boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE share_of_wallet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sow_select" ON share_of_wallet;
CREATE POLICY "sow_select" ON share_of_wallet FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sow_insert" ON share_of_wallet;
CREATE POLICY "sow_insert" ON share_of_wallet FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "sow_update" ON share_of_wallet;
CREATE POLICY "sow_update" ON share_of_wallet FOR UPDATE TO authenticated
USING (get_user_role() IN ('admin','manager') OR owner_id = auth.uid())
WITH CHECK (get_user_role() IN ('admin','manager') OR owner_id = auth.uid());

DROP POLICY IF EXISTS "sow_delete" ON share_of_wallet;
CREATE POLICY "sow_delete" ON share_of_wallet FOR DELETE TO authenticated
USING (get_user_role() IN ('admin','manager'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_sow') THEN
    CREATE TRIGGER set_updated_at_sow BEFORE UPDATE ON share_of_wallet FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Weekly Check-ins
CREATE TABLE IF NOT EXISTS weekly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  completed_text text,
  in_progress_text text,
  blocked_text text,
  next_week_focus text,
  support_required text,
  generated_summary text,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkins_select" ON weekly_checkins;
CREATE POLICY "checkins_select" ON weekly_checkins FOR SELECT TO authenticated
USING (get_user_role() IN ('admin','manager','director') OR employee_id = auth.uid());

DROP POLICY IF EXISTS "checkins_insert" ON weekly_checkins;
CREATE POLICY "checkins_insert" ON weekly_checkins FOR INSERT TO authenticated
WITH CHECK (employee_id = auth.uid() OR get_user_role() IN ('admin','manager'));

DROP POLICY IF EXISTS "checkins_update" ON weekly_checkins;
CREATE POLICY "checkins_update" ON weekly_checkins FOR UPDATE TO authenticated
USING (employee_id = auth.uid() OR get_user_role() IN ('admin','manager'))
WITH CHECK (employee_id = auth.uid() OR get_user_role() IN ('admin','manager'));

-- Monthly Reviews
CREATE TABLE IF NOT EXISTS monthly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_month text NOT NULL,
  overall_kpi_score numeric,
  overall_status text,
  achievements text,
  delays text,
  risks text,
  manager_feedback text,
  employee_commitment text,
  support_required text,
  review_date date,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE monthly_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select" ON monthly_reviews;
CREATE POLICY "reviews_select" ON monthly_reviews FOR SELECT TO authenticated
USING (get_user_role() IN ('admin','manager','director') OR employee_id = auth.uid());

DROP POLICY IF EXISTS "reviews_insert" ON monthly_reviews;
CREATE POLICY "reviews_insert" ON monthly_reviews FOR INSERT TO authenticated
WITH CHECK (get_user_role() IN ('admin','manager'));

DROP POLICY IF EXISTS "reviews_update" ON monthly_reviews;
CREATE POLICY "reviews_update" ON monthly_reviews FOR UPDATE TO authenticated
USING (get_user_role() IN ('admin','manager'))
WITH CHECK (get_user_role() IN ('admin','manager'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_reviews') THEN
    CREATE TRIGGER set_updated_at_reviews BEFORE UPDATE ON monthly_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Activity Plan
CREATE TABLE IF NOT EXISTS activity_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_title text NOT NULL,
  kpi_area text,
  purpose text,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  expected_output text,
  status text DEFAULT 'Planned' CHECK (status IN ('Planned','In Progress','Completed','Cancelled')),
  notes text,
  is_sample boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE activity_plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_select" ON activity_plan;
CREATE POLICY "activity_select" ON activity_plan FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "activity_insert" ON activity_plan;
CREATE POLICY "activity_insert" ON activity_plan FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "activity_update" ON activity_plan;
CREATE POLICY "activity_update" ON activity_plan FOR UPDATE TO authenticated
USING (get_user_role() IN ('admin','manager') OR owner_id = auth.uid())
WITH CHECK (get_user_role() IN ('admin','manager') OR owner_id = auth.uid());

DROP POLICY IF EXISTS "activity_delete" ON activity_plan;
CREATE POLICY "activity_delete" ON activity_plan FOR DELETE TO authenticated
USING (get_user_role() IN ('admin','manager'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_activity') THEN
    CREATE TRIGGER set_updated_at_activity BEFORE UPDATE ON activity_plan FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  change_type text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select" ON audit_log;
CREATE POLICY "audit_select" ON audit_log FOR SELECT TO authenticated
USING (get_user_role() IN ('admin','manager') OR changed_by = auth.uid());

DROP POLICY IF EXISTS "audit_insert" ON audit_log;
CREATE POLICY "audit_insert" ON audit_log FOR INSERT TO authenticated
WITH CHECK (changed_by = auth.uid() OR get_user_role() IN ('admin','manager'));

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  title text NOT NULL,
  message text,
  is_read boolean DEFAULT false,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts_select" ON alerts;
CREATE POLICY "alerts_select" ON alerts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR get_user_role() IN ('admin','manager'));

DROP POLICY IF EXISTS "alerts_insert" ON alerts;
CREATE POLICY "alerts_insert" ON alerts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR get_user_role() IN ('admin','manager'));

DROP POLICY IF EXISTS "alerts_update" ON alerts;
CREATE POLICY "alerts_update" ON alerts FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_checkins_employee ON weekly_checkins(employee_id);
