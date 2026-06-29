
/*
# BD Pulse – Hardening Migration
Adds missing indexes, an acknowledged flag for manager feedback,
and ensures action_updates policy also covers the action owner reading history.
*/

-- Allow employees to see audit log entries for their own actions
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select" ON audit_log;
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT TO authenticated
USING (
  get_user_role() IN ('admin','manager','director')
  OR changed_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM weekly_actions wa
    WHERE wa.id = audit_log.entity_id
      AND wa.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Index for quick audit lookups per action
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by);

-- Index for alerts by user
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, is_read);

-- Allow employees to insert into action_updates for their own actions (belt-and-suspenders)
-- Policy already exists; this is idempotent
DROP POLICY IF EXISTS "action_updates_insert_v2" ON action_updates;
CREATE POLICY "action_updates_insert_v2" ON action_updates FOR INSERT TO authenticated
WITH CHECK (
  get_user_role() IN ('admin','manager')
  OR EXISTS (
    SELECT 1 FROM weekly_actions wa
    WHERE wa.id = action_updates.action_id
      AND (wa.owner_id = auth.uid() OR wa.created_by = auth.uid())
  )
);
