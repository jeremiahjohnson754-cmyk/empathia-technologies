-- Rollback of migration 0028 (pilot activation). Run as the schema owner; it is one transaction.
--
-- ADR-023's rollback is operational first: set PILOT_CHECKOUT=off and new checkouts are refused while every pilot, payment and audit
-- record stays readable. Use this script only to take the schema itself back to 0027.
--
-- It never destroys payment or audit history: every row of the seven tables is first copied, as JSON with its tenant, into
-- app_meta.rollback_archive (owner-only; the runtime role has no access to app_meta). app.audit_event is not touched: the audit rows of
-- every pilot action stay in the ledger. The per-tenant code counter is kept, so a re-applied 0028 never reuses a pilot code.
-- Re-applying 0028 afterwards creates empty tables; the archive is restored by hand if it is wanted.
-- Tested by tests/integration/pilot-activation.test.mjs (migrate, write, roll back, check the archive and the 0027 schema, re-apply).
BEGIN;
CREATE SCHEMA IF NOT EXISTS app_meta;
CREATE TABLE IF NOT EXISTS app_meta.rollback_archive (
  id            bigserial PRIMARY KEY,
  migration     text NOT NULL,
  source_table  text NOT NULL,
  tenant_id     uuid,
  row_data      jsonb NOT NULL,
  archived_at   timestamptz NOT NULL DEFAULT now()
);
-- row-level security is forced on the owner too; lift the force (not the policies) for the copy, inside this transaction
ALTER TABLE app.pilot NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.pilot_checkout NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.payment_event NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.pilot_entitlement NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.pilot_connector_consent NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.pilot_room NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.pilot_transition NO FORCE ROW LEVEL SECURITY;
INSERT INTO app_meta.rollback_archive (migration, source_table, tenant_id, row_data) SELECT '0028', 'app.pilot', tenant_id, to_jsonb(t) FROM app.pilot t ORDER BY created_at, id;
INSERT INTO app_meta.rollback_archive (migration, source_table, tenant_id, row_data) SELECT '0028', 'app.pilot_checkout', tenant_id, to_jsonb(t) FROM app.pilot_checkout t ORDER BY created_at, id;
INSERT INTO app_meta.rollback_archive (migration, source_table, tenant_id, row_data) SELECT '0028', 'app.payment_event', tenant_id, to_jsonb(t) FROM app.payment_event t ORDER BY id;
INSERT INTO app_meta.rollback_archive (migration, source_table, tenant_id, row_data) SELECT '0028', 'app.pilot_entitlement', tenant_id, to_jsonb(t) FROM app.pilot_entitlement t ORDER BY granted_at, id;
INSERT INTO app_meta.rollback_archive (migration, source_table, tenant_id, row_data) SELECT '0028', 'app.pilot_connector_consent', tenant_id, to_jsonb(t) FROM app.pilot_connector_consent t ORDER BY requested_at, id;
INSERT INTO app_meta.rollback_archive (migration, source_table, tenant_id, row_data) SELECT '0028', 'app.pilot_room', tenant_id, to_jsonb(t) FROM app.pilot_room t ORDER BY enrolled_at;
INSERT INTO app_meta.rollback_archive (migration, source_table, tenant_id, row_data) SELECT '0028', 'app.pilot_transition', tenant_id, to_jsonb(t) FROM app.pilot_transition t ORDER BY id;
DROP TABLE app.pilot_transition;
DROP TABLE app.pilot_room;
DROP FUNCTION app.pilot_room_guard();
DROP TABLE app.pilot_connector_consent;
DROP TABLE app.pilot_entitlement;
DROP TABLE app.payment_event;
DROP TABLE app.pilot_checkout;
DROP TABLE app.pilot;
DELETE FROM app_meta.schema_migration WHERE version = '0028';
COMMIT;
