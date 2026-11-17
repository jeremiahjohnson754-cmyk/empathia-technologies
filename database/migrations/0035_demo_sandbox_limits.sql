-- 0035 · Demonstration sandboxes: storage bounded by construction (ADR-0013 §9).
-- A sandbox is opened by anyone, so what one visitor — or one script — can make the demonstration database hold has a ceiling:
--   * max_total     sandboxes ever opened in this database (live or not). Sandboxes are never deleted by the API, so when the ceiling is
--                   reached no new one opens until the operator recreates the database (EM017).
--   * max_writes    audit rows one sandbox may hold. Every write is audited, so this bounds every table of the sandbox at once.
--   * max_evidence  evidence files one sandbox may hold (each at most the upload limit the API applies to a sandbox).
-- The runtime role reads a sandbox's own budget through app.demo_budget(); it still has no privilege on the tables.

ALTER TABLE app.demo_config
  ADD COLUMN max_total    integer NOT NULL DEFAULT 5000 CHECK (max_total BETWEEN 1 AND 1000000),
  ADD COLUMN max_writes   integer NOT NULL DEFAULT 4000 CHECK (max_writes BETWEEN 100 AND 1000000),
  ADD COLUMN max_evidence integer NOT NULL DEFAULT 60 CHECK (max_evidence BETWEEN 1 AND 10000);

-- what the calling sandbox has used, and its limits (nothing for a tenant that is not a live sandbox)
CREATE OR REPLACE FUNCTION app.demo_budget()
  RETURNS TABLE (writes integer, max_writes integer, evidence integer, max_evidence integer)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp AS
$$ SELECT (SELECT count(*)::int FROM app.audit_event e WHERE e.tenant_id = s.tenant_id),
          c.max_writes,
          (SELECT count(*)::int FROM app.evidence_object o WHERE o.tenant_id = s.tenant_id),
          c.max_evidence
     FROM app.demo_sandbox s, app.demo_config c
    WHERE s.tenant_id = app.current_tenant() AND s.closed_at IS NULL AND s.expires_at > now() $$;

-- availability now says how many sandboxes this database has ever opened and its ceiling (the return type changes, so the function is replaced)
DROP FUNCTION app.demo_status();
CREATE FUNCTION app.demo_status()
  RETURNS TABLE (enabled boolean, max_live integer, ttl_hours integer, live integer, opened integer, max_total integer)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp AS
$$ SELECT c.enabled, c.max_live, c.ttl_hours, (SELECT count(*)::int FROM app.demo_sandbox s WHERE s.closed_at IS NULL AND s.expires_at > now()),
          (SELECT count(*)::int FROM app.demo_sandbox), c.max_total FROM app.demo_config c $$;

-- the opening function of 0033 with the total ceiling added (EM017); everything else as it was
CREATE OR REPLACE FUNCTION app.demo_open_sandbox(p_key_hash text, p_remote_hash text, p_roles text[], p_replace uuid DEFAULT NULL, p_replace_key_hash text DEFAULT NULL)
  RETURNS TABLE (sandbox_id uuid, tenant_id uuid, tenant_slug text, expires_at timestamptz)
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_temp AS $$
#variable_conflict use_column
DECLARE cfg app.demo_config; v_n int; v_tid uuid; v_sid uuid; v_site uuid; v_slug text; v_role text; v_pid uuid; v_exp timestamptz; v_prev text;
BEGIN
  SELECT * INTO cfg FROM app.demo_config FOR UPDATE;   -- one open at a time: the caps below are exact
  IF NOT FOUND OR NOT cfg.enabled THEN RAISE EXCEPTION 'demonstration sandboxes are not enabled for this database' USING ERRCODE = 'EM012'; END IF;
  IF p_replace IS NOT NULL THEN
    UPDATE app.demo_sandbox s SET closed_at = now(), closed_reason = 'reset' WHERE s.id = p_replace AND s.key_hash = p_replace_key_hash AND s.closed_at IS NULL AND s.expires_at > now();
    IF NOT FOUND THEN RAISE EXCEPTION 'the sandbox to replace is unknown, closed or expired, or its key is not right' USING ERRCODE = 'EM015'; END IF;
  END IF;
  SELECT count(*) INTO v_n FROM app.demo_sandbox;
  IF v_n >= cfg.max_total THEN RAISE EXCEPTION 'this demonstration database has opened its % sandboxes', v_n USING ERRCODE = 'EM017'; END IF;
  SELECT count(*) INTO v_n FROM app.demo_sandbox s WHERE s.closed_at IS NULL AND s.expires_at > now();
  IF v_n >= cfg.max_live THEN RAISE EXCEPTION 'every demonstration sandbox is in use (% live)', v_n USING ERRCODE = 'EM013'; END IF;
  SELECT count(*) INTO v_n FROM app.demo_sandbox s WHERE s.remote_hash = p_remote_hash AND s.created_at > now() - interval '1 hour';
  IF v_n >= cfg.per_remote_hour THEN RAISE EXCEPTION 'this address opened % sandboxes in the last hour', v_n USING ERRCODE = 'EM014'; END IF;
  IF p_roles IS NULL OR cardinality(p_roles) = 0 OR cardinality(p_roles) > 24 THEN RAISE EXCEPTION 'a sandbox names between 1 and 24 roles' USING ERRCODE = 'EM012'; END IF;
  FOREACH v_role IN ARRAY p_roles LOOP
    IF v_role IN ('architect', 'founder', 'secadmin') OR NOT EXISTS (SELECT 1 FROM app.role x WHERE x.key = v_role) THEN
      RAISE EXCEPTION 'role % is not a sandbox role', v_role USING ERRCODE = 'EM012'; END IF;
  END LOOP;
  v_slug := 'sbx-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
  v_exp := now() + make_interval(hours => cfg.ttl_hours);
  INSERT INTO app.tenant (slug, name, synthetic) VALUES (v_slug, 'Demonstration sandbox ' || v_slug || ' (synthetic)', true) RETURNING id INTO v_tid;
  INSERT INTO app.demo_sandbox (tenant_id, key_hash, remote_hash, expires_at) VALUES (v_tid, p_key_hash, p_remote_hash, v_exp) RETURNING id INTO v_sid;
  v_prev := current_setting('app.tenant_id', true);
  PERFORM set_config('app.tenant_id', v_tid::text, true);
  INSERT INTO app.site (tenant_id, code, name) VALUES (v_tid, 'SITE-DEMO', 'Demonstration Campus (synthetic)') RETURNING id INTO v_site;
  INSERT INTO app.building (tenant_id, site_id, code, name, floors) VALUES (v_tid, v_site, 'ATL', 'Atlas Tower (synthetic)', 12);
  FOREACH v_role IN ARRAY p_roles LOOP
    INSERT INTO app.person (email, display_name) SELECT replace(v_role, '_', '-') || '@' || v_slug || '.empathia.invalid', x.label || ' (synthetic)' FROM app.role x WHERE x.key = v_role RETURNING id INTO v_pid;
    INSERT INTO app.membership (tenant_id, person_id, role_key) VALUES (v_tid, v_pid, v_role);
  END LOOP;
  PERFORM set_config('app.tenant_id', coalesce(v_prev, ''), true);
  RETURN QUERY SELECT v_sid, v_tid, v_slug, v_exp;
END $$;

REVOKE ALL ON FUNCTION app.demo_budget(), app.demo_status() FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN GRANT EXECUTE ON FUNCTION app.demo_budget(), app.demo_status() TO empathia_app; END IF;
END $$;
