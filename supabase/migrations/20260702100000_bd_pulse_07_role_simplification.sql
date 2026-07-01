/*
# BD Pulse - Role Simplification (Owner / Manager / Member)

Simplifies the four-role system (admin, manager, employee, director) down to
three roles: owner, manager, member.

Role mapping applied to existing data:
  admin    -> owner
  director -> manager
  employee -> member

Permissions:
  owner   - full system access: manages user profiles/roles/active status,
            and everything a manager can do.
  manager - team/business data access (KPIs, actions, milestones, share of
            wallet, check-ins, reviews, alerts, audit log), but cannot manage
            user profiles or roles.
  member  - only their own actions, check-ins, and alerts.

Existing logged-in users are not signed out: their profile row is remapped
in place by the UPDATE below, so their next request just resolves to the new
role name under the same auth.uid().

Do not run frontend code with a service role key. Creating/inviting Auth
users must happen in Supabase Dashboard or via a secure backend/Edge
Function.
*/

-- 1. Drop the old CHECK constraint so old values can be remapped, then
--    remap existing rows before the new, stricter constraint is added.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

UPDATE public.profiles
SET role = CASE role
    WHEN 'admin' THEN 'owner'
    WHEN 'director' THEN 'manager'
    WHEN 'employee' THEN 'member'
    ELSE role
  END,
  updated_at = now()
WHERE role IN ('admin', 'director', 'employee');

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'member';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'manager', 'member'));

-- 2. Drop policies/functions that reference the old role vocabulary.
DROP POLICY IF EXISTS "profiles_insert_self_employee" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP FUNCTION IF EXISTS public.is_admin();

-- 3. Recreate the role helper functions against the new vocabulary.
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
    'member'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.get_user_role() = 'owner'
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;

-- 4. Profiles: only owners manage other profiles; self-signup rows must be 'member'.
CREATE POLICY "profiles_insert_self_member" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  id = auth.uid()
  AND role = 'member'
  AND is_active = true
);

CREATE POLICY "profiles_insert_owner" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (public.is_owner());

CREATE POLICY "profiles_update_owner" ON public.profiles
FOR UPDATE TO authenticated
USING (public.is_owner())
WITH CHECK (public.is_owner());

-- 5. KPIs
DROP POLICY IF EXISTS "kpis_insert" ON public.kpis;
DROP POLICY IF EXISTS "kpis_update" ON public.kpis;
DROP POLICY IF EXISTS "kpis_delete" ON public.kpis;

CREATE POLICY "kpis_insert" ON public.kpis
FOR INSERT TO authenticated
WITH CHECK (public.get_user_role() IN ('owner', 'manager'));

CREATE POLICY "kpis_update" ON public.kpis
FOR UPDATE TO authenticated
USING (public.get_user_role() IN ('owner', 'manager'))
WITH CHECK (public.get_user_role() IN ('owner', 'manager'));

CREATE POLICY "kpis_delete" ON public.kpis
FOR DELETE TO authenticated
USING (public.get_user_role() = 'owner');

-- 6. Weekly actions
DROP POLICY IF EXISTS "actions_select" ON public.weekly_actions;
DROP POLICY IF EXISTS "actions_insert" ON public.weekly_actions;
DROP POLICY IF EXISTS "actions_update" ON public.weekly_actions;
DROP POLICY IF EXISTS "actions_delete" ON public.weekly_actions;

CREATE POLICY "actions_select" ON public.weekly_actions
FOR SELECT TO authenticated
USING (
  public.get_user_role() IN ('owner', 'manager')
  OR owner_id = auth.uid()
  OR created_by = auth.uid()
);

CREATE POLICY "actions_insert" ON public.weekly_actions
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('owner', 'manager')
  OR owner_id = auth.uid()
);

CREATE POLICY "actions_update" ON public.weekly_actions
FOR UPDATE TO authenticated
USING (
  public.get_user_role() IN ('owner', 'manager')
  OR owner_id = auth.uid()
)
WITH CHECK (
  public.get_user_role() IN ('owner', 'manager')
  OR owner_id = auth.uid()
);

CREATE POLICY "actions_delete" ON public.weekly_actions
FOR DELETE TO authenticated
USING (public.get_user_role() = 'owner');

-- 7. Action update history
DROP POLICY IF EXISTS "action_updates_select" ON public.action_updates;
DROP POLICY IF EXISTS "action_updates_insert" ON public.action_updates;

CREATE POLICY "action_updates_select" ON public.action_updates
FOR SELECT TO authenticated
USING (
  public.get_user_role() IN ('owner', 'manager')
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
  public.get_user_role() IN ('owner', 'manager')
  OR EXISTS (
    SELECT 1
    FROM public.weekly_actions wa
    WHERE wa.id = action_updates.action_id
      AND wa.owner_id = auth.uid()
  )
);

-- 8. Milestones
DROP POLICY IF EXISTS "milestones_insert" ON public.milestones;
DROP POLICY IF EXISTS "milestones_update" ON public.milestones;
DROP POLICY IF EXISTS "milestones_delete" ON public.milestones;

CREATE POLICY "milestones_insert" ON public.milestones
FOR INSERT TO authenticated
WITH CHECK (public.get_user_role() IN ('owner', 'manager'));

CREATE POLICY "milestones_update" ON public.milestones
FOR UPDATE TO authenticated
USING (public.get_user_role() IN ('owner', 'manager') OR owner_id = auth.uid())
WITH CHECK (public.get_user_role() IN ('owner', 'manager') OR owner_id = auth.uid());

CREATE POLICY "milestones_delete" ON public.milestones
FOR DELETE TO authenticated
USING (public.get_user_role() = 'owner');

-- 9. Share of wallet
DROP POLICY IF EXISTS "sow_insert" ON public.share_of_wallet;
DROP POLICY IF EXISTS "sow_update" ON public.share_of_wallet;
DROP POLICY IF EXISTS "sow_delete" ON public.share_of_wallet;

CREATE POLICY "sow_insert" ON public.share_of_wallet
FOR INSERT TO authenticated
WITH CHECK (public.get_user_role() IN ('owner', 'manager'));

CREATE POLICY "sow_update" ON public.share_of_wallet
FOR UPDATE TO authenticated
USING (public.get_user_role() IN ('owner', 'manager') OR owner_id = auth.uid())
WITH CHECK (public.get_user_role() IN ('owner', 'manager') OR owner_id = auth.uid());

CREATE POLICY "sow_delete" ON public.share_of_wallet
FOR DELETE TO authenticated
USING (public.get_user_role() = 'owner');

-- 10. Weekly check-ins
DROP POLICY IF EXISTS "checkins_select" ON public.weekly_checkins;
DROP POLICY IF EXISTS "checkins_insert" ON public.weekly_checkins;
DROP POLICY IF EXISTS "checkins_update" ON public.weekly_checkins;
DROP POLICY IF EXISTS "checkins_delete" ON public.weekly_checkins;

CREATE POLICY "checkins_select" ON public.weekly_checkins
FOR SELECT TO authenticated
USING (
  public.get_user_role() IN ('owner', 'manager')
  OR employee_id = auth.uid()
);

CREATE POLICY "checkins_insert" ON public.weekly_checkins
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('owner', 'manager')
  OR employee_id = auth.uid()
);

CREATE POLICY "checkins_update" ON public.weekly_checkins
FOR UPDATE TO authenticated
USING (public.get_user_role() IN ('owner', 'manager') OR employee_id = auth.uid())
WITH CHECK (public.get_user_role() IN ('owner', 'manager') OR employee_id = auth.uid());

CREATE POLICY "checkins_delete" ON public.weekly_checkins
FOR DELETE TO authenticated
USING (public.get_user_role() = 'owner');

-- 11. Monthly reviews
DROP POLICY IF EXISTS "reviews_select" ON public.monthly_reviews;
DROP POLICY IF EXISTS "reviews_insert" ON public.monthly_reviews;
DROP POLICY IF EXISTS "reviews_update" ON public.monthly_reviews;
DROP POLICY IF EXISTS "reviews_delete" ON public.monthly_reviews;

CREATE POLICY "reviews_select" ON public.monthly_reviews
FOR SELECT TO authenticated
USING (public.get_user_role() IN ('owner', 'manager') OR employee_id = auth.uid());

CREATE POLICY "reviews_insert" ON public.monthly_reviews
FOR INSERT TO authenticated
WITH CHECK (public.get_user_role() IN ('owner', 'manager'));

CREATE POLICY "reviews_update" ON public.monthly_reviews
FOR UPDATE TO authenticated
USING (public.get_user_role() IN ('owner', 'manager'))
WITH CHECK (public.get_user_role() IN ('owner', 'manager'));

CREATE POLICY "reviews_delete" ON public.monthly_reviews
FOR DELETE TO authenticated
USING (public.get_user_role() = 'owner');

-- 12. Activity plan
DROP POLICY IF EXISTS "activity_insert" ON public.activity_plan;
DROP POLICY IF EXISTS "activity_update" ON public.activity_plan;
DROP POLICY IF EXISTS "activity_delete" ON public.activity_plan;

CREATE POLICY "activity_insert" ON public.activity_plan
FOR INSERT TO authenticated
WITH CHECK (public.get_user_role() IN ('owner', 'manager') OR owner_id = auth.uid());

CREATE POLICY "activity_update" ON public.activity_plan
FOR UPDATE TO authenticated
USING (public.get_user_role() IN ('owner', 'manager') OR owner_id = auth.uid())
WITH CHECK (public.get_user_role() IN ('owner', 'manager') OR owner_id = auth.uid());

CREATE POLICY "activity_delete" ON public.activity_plan
FOR DELETE TO authenticated
USING (public.get_user_role() = 'owner');

-- 13. Audit log
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;

CREATE POLICY "audit_log_select" ON public.audit_log
FOR SELECT TO authenticated
USING (
  public.get_user_role() IN ('owner', 'manager')
  OR changed_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.weekly_actions wa
    WHERE wa.id = audit_log.entity_id
      AND wa.owner_id = auth.uid()
  )
);

-- 14. Alerts
DROP POLICY IF EXISTS "alerts_select" ON public.alerts;
DROP POLICY IF EXISTS "alerts_insert" ON public.alerts;
DROP POLICY IF EXISTS "alerts_update" ON public.alerts;
DROP POLICY IF EXISTS "alerts_delete" ON public.alerts;

CREATE POLICY "alerts_select" ON public.alerts
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.get_user_role() IN ('owner', 'manager')
);

CREATE POLICY "alerts_insert" ON public.alerts
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.get_user_role() IN ('owner', 'manager')
);

CREATE POLICY "alerts_update" ON public.alerts
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR public.get_user_role() IN ('owner', 'manager')
)
WITH CHECK (
  user_id = auth.uid()
  OR public.get_user_role() IN ('owner', 'manager')
);

CREATE POLICY "alerts_delete" ON public.alerts
FOR DELETE TO authenticated
USING (public.get_user_role() = 'owner');
