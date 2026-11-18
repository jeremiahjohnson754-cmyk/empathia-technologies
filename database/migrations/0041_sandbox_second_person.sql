-- 0041 · A sandbox may hold more than one person of a role.
-- Founder, 17 Nov 2026, 19:05: "a second technician whose permissions are actively tested".
--
-- A sandbox opened with one person for each role named (0033). Only the service technician holds work.accept, so the service pool
-- was one person: Search Party's answer was always the one who passes, nobody was ever shown failing a gate, and "only the technician
-- the job was assigned to" had nobody else to refuse. Naming a role twice now makes a second person of it:
--   address   service-2@<sandbox>.empathia.invalid   (still the sandbox's own address: the membership boundary of 0033 holds)
--   name      Service technician 2 (synthetic)
-- Nothing else changes. The function is the one of 0035 with the two marked lines; who may execute it is unchanged.
-- What the second person may do is decided where it always was: by the role's authorities, the hard gates over verified competency
-- records, and the assignment. The scenario (domain/demo.ts) gives the second technician a staff profile and a credential that is
-- recorded and NOT yet verified, so the gate refuses them until someone other than its recorder and its holder verifies it.

CREATE OR REPLACE FUNCTION app.demo_open_sandbox(p_key_hash text, p_remote_hash text, p_roles text[], p_replace uuid DEFAULT NULL, p_replace_key_hash text DEFAULT NULL)
  RETURNS TABLE (sandbox_id uuid, tenant_id uuid, tenant_slug text, expires_at timestamptz)
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_temp AS $$
#variable_conflict use_column
DECLARE cfg app.demo_config; v_n int; v_tid uuid; v_sid uuid; v_site uuid; v_slug text; v_role text; v_pid uuid; v_exp timestamptz; v_prev text; v_seen text[] := '{}'; v_k int;
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
    -- 0041: a role named again is another person of that role, numbered from 2 in the address and in the name
    SELECT count(*) + 1 INTO v_k FROM unnest(v_seen) s WHERE s = v_role; v_seen := v_seen || v_role;
    INSERT INTO app.person (email, display_name)
      SELECT replace(v_role, '_', '-') || CASE WHEN v_k > 1 THEN '-' || v_k ELSE '' END || '@' || v_slug || '.empathia.invalid', x.label || CASE WHEN v_k > 1 THEN ' ' || v_k ELSE '' END || ' (synthetic)'
        FROM app.role x WHERE x.key = v_role RETURNING id INTO v_pid;
    INSERT INTO app.membership (tenant_id, person_id, role_key) VALUES (v_tid, v_pid, v_role);
  END LOOP;
  PERFORM set_config('app.tenant_id', coalesce(v_prev, ''), true);
  RETURN QUERY SELECT v_sid, v_tid, v_slug, v_exp;
END $$;
