-- Render staging: create the two runtime roles BEFORE the first migration (the migrations GRANT to them only if they exist).
-- Run once as the database's default user (the schema owner), over the EXTERNAL URL with TLS, from the operator's machine:
--   psql "$RENDER_EXTERNAL_URL?sslmode=require" -v ON_ERROR_STOP=1 \
--        -v app_password="$EMPATHIA_APP_PASSWORD" -v worker_password="$EMPATHIA_WORKER_PASSWORD" -f deploy/render/bootstrap-roles.sql
-- Passwords come from the operator's environment (generate: openssl rand -base64 36), are stored only as Render secret environment
-- variables, and never in this repository.
--
-- GATE V-1 (go / no-go): the default user must be able to create roles. If the first SELECT shows rolcreaterole = false and
-- rolsuper = false, STOP: the tenant boundary depends on a runtime role that is not the owner and has NOBYPASSRLS. Do not fall back
-- to running the API as the owner. See docs/operations/RENDER_STAGING.md §V-1.
\set ON_ERROR_STOP on
SELECT current_user AS default_user, rolcreaterole, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolcreaterole OR rolsuper)) THEN
    RAISE EXCEPTION 'V-1 failed: % cannot create roles; stop and see RENDER_STAGING.md', current_user;
  END IF;
END $$;
SELECT format('CREATE ROLE empathia_app LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE', :'app_password')
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') \gexec
SELECT format('CREATE ROLE empathia_worker LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE', :'worker_password')
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_worker') \gexec
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database()) \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO empathia_app, empathia_worker', current_database()) \gexec
-- the result the operator records: both roles exist, neither can bypass row-level security
SELECT rolname, rolcanlogin, rolbypassrls, rolsuper FROM pg_roles WHERE rolname IN ('empathia_app', 'empathia_worker') ORDER BY 1;
