-- 0001 · Foundation: the application schema, the tenant context used by row-level security, and shared helpers.
-- Runs as the schema owner (empathia_owner). The API connects as empathia_app (no BYPASSRLS), so every policy below applies to it.

CREATE SCHEMA IF NOT EXISTS app;
COMMENT ON SCHEMA app IS 'Empathia enterprise schema. Every business table is tenant-scoped and protected by row-level security.';

-- The tenant and user of the current transaction, set by the API with set_config(..., true) (transaction-local).
CREATE OR REPLACE FUNCTION app.current_tenant() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.tenant_id', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;

-- updated_at maintenance
CREATE OR REPLACE FUNCTION app.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

-- append-only tables: refuse UPDATE and DELETE (audit log, results history, issue history, evidence)
CREATE OR REPLACE FUNCTION app.refuse_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'table %.% is append-only (% refused)', TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP USING ERRCODE = 'EM001'; END $$;

-- Helper used by migrations to enable and force RLS with the standard tenant policy on a table.
CREATE OR REPLACE FUNCTION app.tenant_rls(tbl regclass) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
  EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %s', tbl);
  EXECUTE format('CREATE POLICY tenant_isolation ON %s USING (tenant_id = app.current_tenant()) WITH CHECK (tenant_id = app.current_tenant())', tbl);
END $$;
