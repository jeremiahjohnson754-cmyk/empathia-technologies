-- 0008 — the outbox worker gets its own database role (fixes KV-08).
-- Before: the cross-tenant worker policies admitted any session that set app.worker = on, which the runtime role itself could set.
-- After: they admit only the role empathia_worker (created by scripts/db.mjs / the container init), which request handlers never use.
-- The worker role reads the tables its handlers read (tenant policies still apply per statement once the handler sets app.tenant_id)
-- and writes only the outbox status, notifications and read models.
DROP POLICY IF EXISTS outbox_worker ON app.outbox_event;
DROP POLICY IF EXISTS notification_worker ON app.notification;
DROP POLICY IF EXISTS read_model_worker ON app.room_read_model;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_worker') THEN
    RAISE EXCEPTION 'role empathia_worker is missing: run node scripts/db.mjs up (or the container init) before migrating';
  END IF;
END $$;
CREATE POLICY outbox_worker ON app.outbox_event TO empathia_worker USING (true) WITH CHECK (true);
CREATE POLICY notification_worker ON app.notification TO empathia_worker USING (true) WITH CHECK (true);
CREATE POLICY read_model_worker ON app.room_read_model TO empathia_worker USING (true) WITH CHECK (true);
GRANT USAGE ON SCHEMA app TO empathia_worker;
GRANT SELECT, UPDATE (status, attempts, next_attempt_at, last_error, delivered_at) ON app.outbox_event TO empathia_worker;
GRANT SELECT, INSERT, UPDATE ON app.notification, app.room_read_model TO empathia_worker;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO empathia_worker;
GRANT SELECT ON app.tenant, app.room, app.planned_asset, app.room_issue, app.cx_plan, app.cx_plan_row, app.current_result, app.test_result, app.verification TO empathia_worker;
GRANT EXECUTE ON FUNCTION app.current_tenant() TO empathia_worker;
