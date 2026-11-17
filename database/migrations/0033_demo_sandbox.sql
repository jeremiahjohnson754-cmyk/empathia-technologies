-- 0033 · Demonstration sandboxes (ADR-0013; founder, 17 Nov 2026: "Connect the actual interactive demo to the server-backed workflows,
-- using safe synthetic tenants, authenticated demo sessions, scoped permissions, and a resettable demonstration dataset").
--
-- A sandbox is an ordinary tenant that exists for one visitor of the public demonstration: its own people (one per role, no password,
-- no external subject), its own site and building, and whatever that visitor does in it. It is reached only with a demonstration
-- session token, and a demonstration session token reaches nothing else. Row-level security is what it is for every tenant: a sandbox
-- can read and write its own rows only. Nothing in a sandbox is ever deleted by the API (the append-only records stay append-only): a
-- reset closes the sandbox and opens a new one.
--
--   * app.demo_config    one row, written by the schema owner only. Sandboxes are DISABLED until the owner enables them for a database.
--   * app.demo_sandbox   one row per sandbox: its tenant, the SHA-256 of its key (the key is shown once, to the visitor), a salted hash
--                        of the address that opened it (rate limiting only; the address is never stored), its expiry and its closing.
--   * the runtime role has no privilege on either table: it opens, finds and closes sandboxes through the functions below, which can
--     create a tenant only as a sandbox, only while enabled, only under the caps, and only with the roles a sandbox may hold.
--   * guards: a sandbox holds only its own people and never the architect, founder or security-administrator roles; a sandbox person
--     joins no other tenant; a sandbox invites nobody.

CREATE TABLE app.demo_config (
  singleton        boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled          boolean NOT NULL DEFAULT false,
  max_live         integer NOT NULL DEFAULT 200 CHECK (max_live BETWEEN 1 AND 5000),
  ttl_hours        integer NOT NULL DEFAULT 72 CHECK (ttl_hours BETWEEN 1 AND 720),
  per_remote_hour  integer NOT NULL DEFAULT 12 CHECK (per_remote_hour BETWEEN 1 AND 1000),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
INSERT INTO app.demo_config DEFAULT VALUES;
COMMENT ON TABLE app.demo_config IS 'Demonstration sandboxes: disabled by default. Only the schema owner writes this row (node dist/src/db/demo.js enable|disable).';

CREATE TABLE app.demo_sandbox (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL UNIQUE REFERENCES app.tenant(id),
  key_hash       text NOT NULL CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  remote_hash    text NOT NULL CHECK (remote_hash ~ '^[0-9a-f]{64}$'),
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  closed_at      timestamptz,
  closed_reason  text CHECK (closed_reason IN ('reset', 'operator')),
  CHECK ((closed_at IS NULL) = (closed_reason IS NULL))
);
CREATE INDEX demo_sandbox_live ON app.demo_sandbox (expires_at) WHERE closed_at IS NULL;
CREATE INDEX demo_sandbox_remote ON app.demo_sandbox (remote_hash, created_at);
COMMENT ON COLUMN app.demo_sandbox.key_hash IS 'SHA-256 of the sandbox key. The key itself is returned once, when the sandbox opens, and is never stored.';
COMMENT ON COLUMN app.demo_sandbox.remote_hash IS 'SHA-256 of a deployment salt and the address that opened the sandbox: rate limiting only. The address is not stored.';

-- no row-level policy and no grant: the runtime role cannot read or write these tables at all
ALTER TABLE app.demo_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.demo_sandbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.demo_config, app.demo_sandbox FROM PUBLIC;

-- ------------------------------------------------------------------------------------------------------------------ reads
CREATE OR REPLACE FUNCTION app.is_demo_tenant(p_tenant uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM app.demo_sandbox s WHERE s.tenant_id = p_tenant) $$;

CREATE OR REPLACE FUNCTION app.demo_sandbox_live(p_tenant uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM app.demo_sandbox s WHERE s.tenant_id = p_tenant AND s.closed_at IS NULL AND s.expires_at > now()) $$;

-- the sandbox a key opens (the key is the credential): nothing is returned for a wrong key, a closed sandbox or an expired one
CREATE OR REPLACE FUNCTION app.demo_sandbox_by_key(p_id uuid, p_key_hash text)
  RETURNS TABLE (sandbox_id uuid, tenant_id uuid, tenant_slug text, created_at timestamptz, expires_at timestamptz)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp AS
$$ SELECT s.id, s.tenant_id, t.slug, s.created_at, s.expires_at FROM app.demo_sandbox s JOIN app.tenant t ON t.id = s.tenant_id
    WHERE s.id = p_id AND s.key_hash = p_key_hash AND s.closed_at IS NULL AND s.expires_at > now() $$;

-- the sandbox of the calling tenant (a signed-in demonstration session reads its own expiry)
CREATE OR REPLACE FUNCTION app.demo_sandbox_current()
  RETURNS TABLE (sandbox_id uuid, tenant_slug text, created_at timestamptz, expires_at timestamptz)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp AS
$$ SELECT s.id, t.slug, s.created_at, s.expires_at FROM app.demo_sandbox s JOIN app.tenant t ON t.id = s.tenant_id
    WHERE s.tenant_id = app.current_tenant() AND s.closed_at IS NULL AND s.expires_at > now() $$;

-- whether sandboxes are enabled here, and the caps (no sandbox data)
CREATE OR REPLACE FUNCTION app.demo_status()
  RETURNS TABLE (enabled boolean, max_live integer, ttl_hours integer, live integer)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp AS
$$ SELECT c.enabled, c.max_live, c.ttl_hours, (SELECT count(*)::int FROM app.demo_sandbox s WHERE s.closed_at IS NULL AND s.expires_at > now()) FROM app.demo_config c $$;

-- ------------------------------------------------------------------------------------------------------------------ open / close
-- EM012 not enabled or not permitted · EM013 the cap of live sandboxes is reached · EM014 this address opened too many in the last hour
-- EM015 the sandbox to replace is unknown, closed or expired, or its key is not right.
-- A reset is one call: the sandbox the key opens is closed and the new one opened in the same transaction, so a refused opening closes
-- nothing, and the sandbox being replaced does not count against the live cap.
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
  -- the business tables FORCE row-level security, the owner included: the rest of this function writes as the new tenant, and the
  -- caller's tenant setting is put back before returning
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

-- closing by the key without a replacement (a sandbox whose scenario could not be prepared) — the tenant and its records stay; its sessions stop at once
CREATE OR REPLACE FUNCTION app.demo_close_sandbox(p_id uuid, p_key_hash text) RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_temp AS $$
DECLARE n int;
BEGIN
  UPDATE app.demo_sandbox s SET closed_at = now(), closed_reason = 'reset' WHERE s.id = p_id AND s.key_hash = p_key_hash AND s.closed_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n = 1;
END $$;

-- ------------------------------------------------------------------------------------------------------------------ guards
-- a sandbox holds only its own people, never a privileged role; a sandbox person joins no other tenant
CREATE OR REPLACE FUNCTION app.demo_membership_boundary() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_temp AS $$
DECLARE v_slug text; v_mail text; v_sbx boolean;
BEGIN
  SELECT p.email INTO v_mail FROM app.person p WHERE p.id = NEW.person_id;
  SELECT t.slug, EXISTS (SELECT 1 FROM app.demo_sandbox s WHERE s.tenant_id = t.id) INTO v_slug, v_sbx FROM app.tenant t WHERE t.id = NEW.tenant_id;
  IF v_sbx THEN
    IF NEW.role_key IN ('architect', 'founder', 'secadmin') THEN RAISE EXCEPTION 'role % is not a sandbox role', NEW.role_key USING ERRCODE = 'EM012'; END IF;
    IF v_mail IS NULL OR right(v_mail, length(v_slug) + 18) <> '@' || v_slug || '.empathia.invalid' THEN
      RAISE EXCEPTION 'a demonstration sandbox holds only its own synthetic people' USING ERRCODE = 'EM012'; END IF;
  ELSIF v_mail ~ '@sbx-[0-9a-f]{16}\.empathia\.invalid$' THEN
    RAISE EXCEPTION 'a sandbox person joins no other tenant' USING ERRCODE = 'EM012';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER membership_demo_boundary BEFORE INSERT OR UPDATE ON app.membership FOR EACH ROW EXECUTE FUNCTION app.demo_membership_boundary();

CREATE OR REPLACE FUNCTION app.demo_no_invitation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_temp AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM app.demo_sandbox s WHERE s.tenant_id = NEW.tenant_id) THEN
    RAISE EXCEPTION 'a demonstration sandbox does not invite people' USING ERRCODE = 'EM012'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER invitation_demo_boundary BEFORE INSERT ON app.invitation FOR EACH ROW EXECUTE FUNCTION app.demo_no_invitation();

REVOKE ALL ON FUNCTION app.demo_open_sandbox(text, text, text[], uuid, text), app.demo_close_sandbox(uuid, text), app.demo_sandbox_by_key(uuid, text),
  app.demo_sandbox_current(), app.demo_status(), app.is_demo_tenant(uuid), app.demo_sandbox_live(uuid) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    REVOKE ALL ON app.demo_config, app.demo_sandbox FROM empathia_app;
    GRANT EXECUTE ON FUNCTION app.demo_open_sandbox(text, text, text[], uuid, text), app.demo_close_sandbox(uuid, text), app.demo_sandbox_by_key(uuid, text),
      app.demo_sandbox_current(), app.demo_status(), app.is_demo_tenant(uuid), app.demo_sandbox_live(uuid) TO empathia_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_worker') THEN
    REVOKE ALL ON app.demo_config, app.demo_sandbox FROM empathia_worker;
  END IF;
END $$;
