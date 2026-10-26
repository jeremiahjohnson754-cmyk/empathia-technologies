-- 0005 — readiness probe for the runtime role.
-- The runtime role has no access to app_meta (the migration ledger). The health endpoint needs only the count of applied
-- migrations, so it gets exactly that through a SECURITY DEFINER function rather than a grant on the ledger table.
CREATE OR REPLACE FUNCTION app.migrations_applied() RETURNS integer
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app_meta AS
$$ SELECT count(*)::int FROM app_meta.schema_migration $$;
REVOKE ALL ON FUNCTION app.migrations_applied() FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT EXECUTE ON FUNCTION app.migrations_applied() TO empathia_app;
  END IF;
END $$;
