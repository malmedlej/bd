/*
# BD Pulse - Production RLS and Admin Permissions

Fixes production permission failures by explicitly granting the authenticated
role access to app tables and replacing app-facing RLS policies with
role-aware policies.

Manual admin bootstrap:
1. Find your Auth user UUID in Supabase Dashboard -> Authentication -> Users.
2. If your profile exists:
   UPDATE public.profiles
   SET role = 'admin', is_active = true, updated_at = now()
   WHERE id = '<YOUR_AUTH_USER_UUID>';
3. If your profile does not exist:
   INSERT INTO public.profiles (id, full_name, email, role, department, is_active)
   VALUES ('<YOUR_AUTH_USER_UUID>', '<Your Name>', '<you@company.com>', 'admin', 'Business Development', true);

Do not run frontend code with a service role key. Creating/inviting Auth users
must happen in Supabase Dashboard or via a secure backend/Edge Function.
*/

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.kpis,
  public.weekly_actions,
  public.action_updates,
  public.milestones,
  public.share_of_wallet,
  public.weekly_checkins,
  public.monthly_reviews,
  public.activity_plan,
  public.audit_log,
  public.alerts
TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.role
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
      LIMIT 1
    ),
    'employee'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.get_user_role() = 'admin'
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_of_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self_employee" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "profiles_insert_self_employee" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  id = auth.uid()
  AND role = 'employee'
  AND is_active = true
);

CREATE POLICY "profiles_insert_admin" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "profiles_update_admin" ON public.profiles
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- KPIs
DROP POLICY IF EXISTS "kpis_select" ON public.kpis;
DROP POLICY IF EXISTS "kpis_insert" ON public.kpis;
DROP POLICY IF EXISTS "kpis_update" ON public.kpis;
DROP POLICY IF EXISTS "kpis_delete" ON public.kpis;

CREATE POLICY "kpis_select" ON public.kpis
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "kpis_insert" ON public.kpis
FOR INSERT TO authenticated
WITH CHECK (public.get_user_role() IN ('admin','manager'));

CREATE POLICY "kpis_update" ON public.kpis
FOR UPDATE TO authenticated
USING (public.get_user_role() IN ('admin','manager'))
WITH CHECK (public.get_user_role() IN ('admin','manager'));

CREATE POLICY "kpis_delete" ON public.kpis
FOR DELETE TO authenticated
USING (public.get_user_role() = 'admin');

-- Weekly actions
DROP POLICY IF EXISTS "actions_select" ON public.weekly_actions;
DROP POLICY IF EXISTS "actions_insert" ON public.weekly_actions;
DROP POLICY IF EXISTS "actions_update" ON public.weekly_actions;
DROP POLICY IF EXISTS "actions_delete" ON public.weekly_actions;

CREATE POLICY "actions_select" ON public.weekly_actions
FOR SELECT TO authenticated
USING (
  public.get_user_role() IN ('admin','manager','director')
  OR owner_id = auth.uid()
  OR created_by = auth.uid()
);

CREATE POLICY "actions_insert" ON public.weekly_actions
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin','manager')
  OR owner_id = auth.uid()
);

CREATE POLICY "actions_update" ON public.weekly_actions
FOR UPDATE TO authenticated
USING (
  public.get_user_role() IN ('admin','manager')
  OR owner_id = auth.uid()
)
WITH CHECK (
  public.get_user_role() IN ('admin','manager')
  OR owner_id = auth.uid()
);

CREATE POLICY "actions_delete" ON public.weekly_actions
FOR DELETE TO authenticated
USING (public.get_user_role() = 'admin');

-- Action update history
DROP POLICY IF EXISTS "action_updates_select" ON public.action_updates;
DROP POLICY IF EXISTS "action_updates_insert" ON public.action_updates;
DROP POLICY IF EXISTS "action_updates_insert_v2" ON public.action_updates;

CREATE POLICY "action_updates_select" ON public.action_updates
FOR SELECT TO authenticated
USING (
  public.get_user_role() IN ('admin','manager','director')
  OR updated_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.weekly_actions wa
    WHERE wa.id = action_updates.action_id
      AND (wa.owner_id = auth.uid() OR wa.created_by = auth.uid())
  )
);

CREATE POLICY "action_updates_insert" ON public.action_updates
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin','manager')
  OR EXISTS (
    SELECT 1
    FROM public.weekly_actions wa
    WHERE wa.id = action_updates.action_id
      AND wa.owner_id = auth.uid()
  )
);

-- Milestones
DROP POLICY IF EXISTS "milestones_select" ON public.milestones;
DROP POLICY IF EXISTS "milestones_insert" ON public.milestones;
DROP POLICY IF EXISTS "milestones_update" ON public.milestones;
DROP POLICY IF EXISTS "milestones_delete" ON public.milestones;

CREATE POLICY "milestones_select" ON public.milestones
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "milestones_insert" ON public.milestones
FOR INSERT TO authenticated
WITH CHECK (public.get_user_role() IN ('admin','manager'));

CREATE POLICY "milestones_update" ON public.milestones
FOR UPDATE TO authenticated
USING (public.get_user_role() IN ('admin','manager') OR owner_id = auth.uid())
WITH CHECK (public.get_user_role() IN ('admin','manager') OR owner_id = auth.uid());

CREATE POLICY "milestones_delete" ON public.milestones
FOR DELETE TO authenticated
USING (public.get_user_role() = 'admin');

-- Share of wallet
DROP POLICY IF EXISTS "sow_select" ON public.share_of_wallet;
DROP POLICY IF EXISTS "sow_insert" ON public.share_of_wallet;
DROP POLICY IF EXISTS "sow_update" ON public.share_of_wallet;
DROP POLICY IF EXISTS "sow_delete" ON public.share_of_wallet;

CREATE POLICY "sow_select" ON public.share_of_wallet
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "sow_insert" ON public.share_of_wallet
FOR INSERT TO authenticated
WITH CHECK (public.get_user_role() IN ('admin','manager'));

CREATE POLICY "sow_update" ON public.share_of_wallet
FOR UPDATE TO authenticated
USING (public.get_user_role() IN ('admin','manager') OR owner_id = auth.uid())
WITH CHECK (public.get_user_role() IN ('admin','manager') OR owner_id = auth.uid());

CREATE POLICY "sow_delete" ON public.share_of_wallet
FOR DELETE TO authenticated
USING (public.get_user_role() = 'admin');

-- Weekly check-ins
DROP POLICY IF EXISTS "checkins_select" ON public.weekly_checkins;
DROP POLICY IF EXISTS "checkins_insert" ON public.weekly_checkins;
DROP POLICY IF EXISTS "checkins_update" ON public.weekly_checkins;
DROP POLICY IF EXISTS "checkins_delete" ON public.weekly_checkins;

CREATE POLICY "checkins_select" ON public.weekly_checkins
FOR SELECT TO authenticated
USING (
  public.get_user_role() IN ('admin','manager','director')
  OR employee_id = auth.uid()
);

CREATE POLICY "checkins_insert" ON public.weekly_checkins
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin','manager')
  OR employee_id = auth.uid()
);

CREATE POLICY "checkins_update" ON public.weekly_checkins
FOR UPDATE TO authenticated
USING (public.get_user_role() IN ('admin','manager') OR employee_id = auth.uid())
WITH CHECK (public.get_user_role() IN ('admin','manager') OR employee_id = auth.uid());

CREATE POLICY "checkins_delete" ON public.weekly_checkins
FOR DELETE TO authenticated
USING (public.get_user_role() = 'admin');

-- Monthly reviews
DROP POLICY IF EXISTS "reviews_select" ON public.monthly_reviews;
DROP POLICY IF EXISTS "reviews_insert" ON public.monthly_reviews;
DROP POLICY IF EXISTS "reviews_update" ON public.monthly_reviews;
DROP POLICY IF EXISTS "reviews_delete" ON public.monthly_reviews;

CREATE POLICY "reviews_select" ON public.monthly_reviews
FOR SELECT TO authenticated
USING (public.get_user_role() IN ('admin','manager','director') OR employee_id = auth.uid());

CREATE POLICY "reviews_insert" ON public.monthly_reviews
FOR INSERT TO authenticated
WITH CHECK (public.get_user_role() IN ('admin','manager'));

CREATE POLICY "reviews_update" ON public.monthly_reviews
FOR UPDATE TO authenticated
USING (public.get_user_role() IN ('admin','manager'))
WITH CHECK (public.get_user_role() IN ('admin','manager'));

CREATE POLICY "reviews_delete" ON public.monthly_reviews
FOR DELETE TO authenticated
USING (public.get_user_role() = 'admin');

-- Activity plan
DROP POLICY IF EXISTS "activity_select" ON public.activity_plan;
DROP POLICY IF EXISTS "activity_insert" ON public.activity_plan;
DROP POLICY IF EXISTS "activity_update" ON public.activity_plan;
DROP POLICY IF EXISTS "activity_delete" ON public.activity_plan;

CREATE POLICY "activity_select" ON public.activity_plan
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "activity_insert" ON public.activity_plan
FOR INSERT TO authenticated
WITH CHECK (public.get_user_role() IN ('admin','manager') OR owner_id = auth.uid());

CREATE POLICY "activity_update" ON public.activity_plan
FOR UPDATE TO authenticated
USING (public.get_user_role() IN ('admin','manager') OR owner_id = auth.uid())
WITH CHECK (public.get_user_role() IN ('admin','manager') OR owner_id = auth.uid());

CREATE POLICY "activity_delete" ON public.activity_plan
FOR DELETE TO authenticated
USING (public.get_user_role() = 'admin');

-- Audit log
DROP POLICY IF EXISTS "audit_select" ON public.audit_log;
DROP POLICY IF EXISTS "audit_insert" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;

CREATE POLICY "audit_log_select" ON public.audit_log
FOR SELECT TO authenticated
USING (
  public.get_user_role() IN ('admin','manager','director')
  OR changed_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.weekly_actions wa
    WHERE wa.id = audit_log.entity_id
      AND wa.owner_id = auth.uid()
  )
);

CREATE POLICY "audit_log_insert" ON public.audit_log
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Alerts
DROP POLICY IF EXISTS "alerts_select" ON public.alerts;
DROP POLICY IF EXISTS "alerts_insert" ON public.alerts;
DROP POLICY IF EXISTS "alerts_update" ON public.alerts;
DROP POLICY IF EXISTS "alerts_delete" ON public.alerts;

CREATE POLICY "alerts_select" ON public.alerts
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.get_user_role() IN ('admin','manager','director')
);

CREATE POLICY "alerts_insert" ON public.alerts
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.get_user_role() IN ('admin','manager')
);

CREATE POLICY "alerts_update" ON public.alerts
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR public.get_user_role() IN ('admin','manager','director')
)
WITH CHECK (
  user_id = auth.uid()
  OR public.get_user_role() IN ('admin','manager','director')
);

CREATE POLICY "alerts_delete" ON public.alerts
FOR DELETE TO authenticated
USING (public.get_user_role() = 'admin');
