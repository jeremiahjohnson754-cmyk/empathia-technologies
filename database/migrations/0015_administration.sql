-- 0015 · Administration (ADR-0006; owner decision 2026-10-30): invitations, scoped memberships, policy reads — all audited.
CREATE TABLE app.invitation (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES app.tenant(id),
  email        text NOT NULL CHECK (email ~ '^[^@\s]+@[^@\s]+$'),
  role_key     text NOT NULL REFERENCES app.role(key),
  site_scope   uuid[],
  token_hash   text NOT NULL UNIQUE,     -- sha256 of the one-time token; the token itself is shown once to the inviter
  invited_by   uuid NOT NULL REFERENCES app.person(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  accepted_at  timestamptz,
  accepted_by  uuid REFERENCES app.person(id),
  revoked_at   timestamptz,
  UNIQUE (tenant_id, id)
);
-- the founder role is grantable only in the founder organization (ADR-0001)
CREATE OR REPLACE FUNCTION app.founder_role_boundary() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role_key = 'founder' AND NOT EXISTS (SELECT 1 FROM app.tenant t WHERE t.id = NEW.tenant_id AND t.slug = 'empathia-founder') THEN RAISE EXCEPTION 'EM008 the founder role exists only in the founder organization'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER invitation_founder_boundary BEFORE INSERT OR UPDATE ON app.invitation FOR EACH ROW EXECUTE FUNCTION app.founder_role_boundary();
CREATE TRIGGER membership_founder_boundary BEFORE INSERT OR UPDATE ON app.membership FOR EACH ROW EXECUTE FUNCTION app.founder_role_boundary();
-- RLS ENABLED (the runtime role sees its own tenant's invitations) but not FORCED: app.accept_invitation below runs as the definer before
-- any tenant is chosen, exactly like the sign-in functions of 0002_core.sql.
ALTER TABLE app.invitation ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.invitation USING (tenant_id = app.current_tenant()) WITH CHECK (tenant_id = app.current_tenant());
-- accepting an invitation is unauthenticated (the token is the credential): a SECURITY DEFINER function does the whole step atomically
CREATE OR REPLACE FUNCTION app.accept_invitation(p_token_hash text, p_display_name text, p_password_hash text)
  RETURNS TABLE (tenant_slug text, role_key text, person_id uuid)
  -- plpgsql: OUT names shadow columns, so every table column below is qualified
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_temp AS $$
#variable_conflict use_column
DECLARE inv app.invitation; pid uuid;
BEGIN
  SELECT * INTO inv FROM app.invitation WHERE token_hash = p_token_hash AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EM007 the invitation is unknown, used, revoked or expired'; END IF;
  SELECT p.id INTO pid FROM app.person p WHERE p.email = inv.email;
  IF pid IS NULL THEN INSERT INTO app.person (email, display_name, password_hash) VALUES (inv.email, p_display_name, p_password_hash) RETURNING id INTO pid; END IF;
  INSERT INTO app.membership AS m (tenant_id, person_id, role_key, site_scope) VALUES (inv.tenant_id, pid, inv.role_key, inv.site_scope)
    ON CONFLICT (tenant_id, person_id, role_key) DO UPDATE SET site_scope = EXCLUDED.site_scope, revoked_at = NULL;
  UPDATE app.invitation i SET accepted_at = now(), accepted_by = pid WHERE i.id = inv.id;
  RETURN QUERY SELECT t.slug, inv.role_key, pid FROM app.tenant t WHERE t.id = inv.tenant_id;
END $$;
REVOKE ALL ON FUNCTION app.accept_invitation(text, text, text) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT, UPDATE ON app.invitation TO empathia_app;
    GRANT SELECT, INSERT, UPDATE ON app.membership TO empathia_app;
    GRANT EXECUTE ON FUNCTION app.accept_invitation(text, text, text) TO empathia_app;
  END IF;
END $$;
