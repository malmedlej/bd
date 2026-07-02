/*
# BD Pulse - Simple Username/PIN Authentication (app_users)

Removes Supabase Auth entirely in favor of a simple internal username+PIN
login, per product decision: this is a small internal tool, not a public
SaaS, and email-based Supabase Auth + an Edge Function just to create users
was more machinery than the project needs.

Reuses the existing `profiles` table (renamed to `app_users`) instead of
creating a disconnected new table, so every existing ownership link --
kpis.owner_id/created_by, weekly_actions.owner_id/created_by/
manager_feedback_by, action_updates.updated_by, milestones.owner_id,
share_of_wallet.owner_id, weekly_checkins.employee_id,
monthly_reviews.employee_id/created_by, activity_plan.owner_id,
audit_log.changed_by, alerts.user_id -- keeps working. Renaming a table in
Postgres does not touch foreign keys; they follow the table by OID, not by
name.

SECURITY NOTE (read before running in production):
Once the frontend stops calling supabase.auth.signInWithPassword, there is
no Supabase Auth session anymore, so auth.uid() is permanently NULL and
every RLS policy that depended on it (get_user_role(), auth.uid() = ...)
would silently block all reads/writes. Per explicit product decision this
migration replaces those with permissive USING (true) policies across every
table and grants the `anon` Postgres role the same access `authenticated`
had, moving ALL authorization into the React frontend (isOwner/isManager
checks, screen gating). Concretely this means: anyone holding the public
anon key can read and write every row in every app table, including the
app_users table where PINs are stored in PLAIN TEXT. That is an accepted
trade-off for this internal tool, but it is a real one -- the anon key is
public (shipped in the JS bundle) and there is no per-user Postgres
enforcement left. If this app ever needs to hold anything sensitive, harden
this later (hashed PINs checked via a SECURITY DEFINER RPC, at minimum).
*/

-- ============================================================
-- 1. profiles -> app_users
-- ============================================================
ALTER TABLE IF EXISTS public.profiles RENAME TO app_users;

-- profiles.id was tied to Supabase Auth (auth.users); app_users rows are
-- now standalone and no longer require a matching auth.users row.
ALTER TABLE public.app_users DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Drop every auth-era policy (from all prior migrations) before touching columns.
DROP POLICY IF EXISTS "profiles_select" ON public.app_users;
DROP POLICY IF EXISTS "profiles_insert" ON public.app_users;
DROP POLICY IF EXISTS "profiles_update_own" ON public.app_users;
DROP POLICY IF EXISTS "profiles_insert_self_employee" ON public.app_users;
DROP POLICY IF EXISTS "profiles_insert_self_member" ON public.app_users;
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.app_users;
DROP POLICY IF EXISTS "profiles_insert_owner" ON public.app_users;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.app_users;
DROP POLICY IF EXISTS "profiles_update_owner" ON public.app_users;

-- The get_user_role()/is_owner()/is_admin() helpers queried `profiles` by
-- name and are no longer referenced by any policy after this migration --
-- drop them so nothing is left silently broken by the rename above.
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_owner();
DROP FUNCTION IF EXISTS public.is_admin();

-- ============================================================
-- 2. New login columns; drop email (no longer used anywhere)
-- ============================================================
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS pin text;

ALTER TABLE public.app_users DROP COLUMN IF EXISTS email;

-- Backfill any pre-existing rows (old demo/seed profiles) so username/pin
-- can be made NOT NULL below. These were demo rows only -- under the old
-- Supabase Auth flow they never had a matching auth.users row and could
-- never actually log in -- so synthetic values here are safe and just
-- preserve their existing KPI/action ownership history.
UPDATE public.app_users
SET username = 'user_' || substr(id::text, 1, 8)
WHERE username IS NULL;

UPDATE public.app_users
SET pin = lpad((floor(random() * 9000) + 1000)::text, 4, '0')
WHERE pin IS NULL;

-- ============================================================
-- 3. Seed/repair the real owner login
-- ============================================================
-- Prefer updating the existing owner profile (if one already exists) so
-- their existing KPIs/actions/history stay linked to the same id; insert a
-- fresh row only if no owner profile exists yet.
DO $$
DECLARE
  v_existing_id uuid;
BEGIN
  SELECT id INTO v_existing_id
  FROM public.app_users
  WHERE full_name = 'Medlej Almedlej' OR role = 'owner'
  ORDER BY (role = 'owner') DESC, created_at ASC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.app_users
    SET full_name = 'Medlej Almedlej',
        username = 'medlej',
        pin = '1234',
        role = 'owner',
        department = 'Business Development',
        is_active = true,
        updated_at = now()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.app_users (full_name, username, pin, role, department, is_active)
    VALUES ('Medlej Almedlej', 'medlej', '1234', 'owner', 'Business Development', true);
  END IF;
END $$;

-- ============================================================
-- 4. Enforce the real column constraints now that every row is backfilled
-- ============================================================
ALTER TABLE public.app_users ALTER COLUMN username SET NOT NULL;
ALTER TABLE public.app_users ALTER COLUMN pin SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_users_username_key'
  ) THEN
    ALTER TABLE public.app_users ADD CONSTRAINT app_users_username_key UNIQUE (username);
  END IF;
END $$;

-- ============================================================
-- 5. Permissive RLS for app_users (login has to work with zero session)
-- ============================================================
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.app_users TO anon, authenticated;

CREATE POLICY "app_users_select" ON public.app_users
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "app_users_insert" ON public.app_users
FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "app_users_update" ON public.app_users
FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 6. Every other table: grant `anon` the access `authenticated` had, and
--    replace get_user_role()/auth.uid()-based policies with permissive
--    ones (see SECURITY NOTE above -- auth.uid() is now always NULL).
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
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
TO anon;

-- KPIs
DROP POLICY IF EXISTS "kpis_select" ON public.kpis;
DROP POLICY IF EXISTS "kpis_insert" ON public.kpis;
DROP POLICY IF EXISTS "kpis_update" ON public.kpis;
DROP POLICY IF EXISTS "kpis_delete" ON public.kpis;
CREATE POLICY "kpis_all" ON public.kpis FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Weekly actions
DROP POLICY IF EXISTS "actions_select" ON public.weekly_actions;
DROP POLICY IF EXISTS "actions_insert" ON public.weekly_actions;
DROP POLICY IF EXISTS "actions_update" ON public.weekly_actions;
DROP POLICY IF EXISTS "actions_delete" ON public.weekly_actions;
CREATE POLICY "actions_all" ON public.weekly_actions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Action update history
DROP POLICY IF EXISTS "action_updates_select" ON public.action_updates;
DROP POLICY IF EXISTS "action_updates_insert" ON public.action_updates;
CREATE POLICY "action_updates_all" ON public.action_updates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Milestones
DROP POLICY IF EXISTS "milestones_select" ON public.milestones;
DROP POLICY IF EXISTS "milestones_insert" ON public.milestones;
DROP POLICY IF EXISTS "milestones_update" ON public.milestones;
DROP POLICY IF EXISTS "milestones_delete" ON public.milestones;
CREATE POLICY "milestones_all" ON public.milestones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Share of wallet
DROP POLICY IF EXISTS "sow_select" ON public.share_of_wallet;
DROP POLICY IF EXISTS "sow_insert" ON public.share_of_wallet;
DROP POLICY IF EXISTS "sow_update" ON public.share_of_wallet;
DROP POLICY IF EXISTS "sow_delete" ON public.share_of_wallet;
CREATE POLICY "sow_all" ON public.share_of_wallet FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Weekly check-ins
DROP POLICY IF EXISTS "checkins_select" ON public.weekly_checkins;
DROP POLICY IF EXISTS "checkins_insert" ON public.weekly_checkins;
DROP POLICY IF EXISTS "checkins_update" ON public.weekly_checkins;
DROP POLICY IF EXISTS "checkins_delete" ON public.weekly_checkins;
CREATE POLICY "checkins_all" ON public.weekly_checkins FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Monthly reviews
DROP POLICY IF EXISTS "reviews_select" ON public.monthly_reviews;
DROP POLICY IF EXISTS "reviews_insert" ON public.monthly_reviews;
DROP POLICY IF EXISTS "reviews_update" ON public.monthly_reviews;
DROP POLICY IF EXISTS "reviews_delete" ON public.monthly_reviews;
CREATE POLICY "reviews_all" ON public.monthly_reviews FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Activity plan
DROP POLICY IF EXISTS "activity_select" ON public.activity_plan;
DROP POLICY IF EXISTS "activity_insert" ON public.activity_plan;
DROP POLICY IF EXISTS "activity_update" ON public.activity_plan;
DROP POLICY IF EXISTS "activity_delete" ON public.activity_plan;
CREATE POLICY "activity_all" ON public.activity_plan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Audit log
DROP POLICY IF EXISTS "audit_select" ON public.audit_log;
DROP POLICY IF EXISTS "audit_insert" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;
CREATE POLICY "audit_log_all" ON public.audit_log FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Alerts
DROP POLICY IF EXISTS "alerts_select" ON public.alerts;
DROP POLICY IF EXISTS "alerts_insert" ON public.alerts;
DROP POLICY IF EXISTS "alerts_update" ON public.alerts;
DROP POLICY IF EXISTS "alerts_delete" ON public.alerts;
CREATE POLICY "alerts_all" ON public.alerts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
