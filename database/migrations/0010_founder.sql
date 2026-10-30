-- 0010 · The Founder Studio's private data boundary (ADR-0001 §3, ADR-0002).
-- Founder data lives in its own schema, under its own policy flag. The runtime role reaches a founder table only inside a transaction
-- in which the API, after verifying that the principal belongs to the founder organization and holds the founder role, set
-- app.founder = on; and only for rows of that organization (tenant). An enterprise tenant's transaction never sets the flag, so an
-- enterprise principal sees nothing here whatever route it uses; a founder principal's transactions run in the founder tenant, whose
-- enterprise tables are empty, so the founder sees no customer records either. Both directions are negative tests.
CREATE SCHEMA founder;
CREATE OR REPLACE FUNCTION founder.rls(tbl regclass) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
  EXECUTE format('CREATE POLICY founder_only ON %s USING (current_setting(''app.founder'', true) = ''on'' AND tenant_id = app.current_tenant()) WITH CHECK (current_setting(''app.founder'', true) = ''on'' AND tenant_id = app.current_tenant())', tbl);
END $$;

-- the founder's workspace state (what the local studio kept in localStorage): one row per founder
CREATE TABLE founder.workspace_state (
  tenant_id   uuid NOT NULL REFERENCES app.tenant(id),
  person_id   uuid NOT NULL REFERENCES app.person(id),
  state       jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(state) < 262144),
  revision    integer NOT NULL DEFAULT 1,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, person_id)
);
SELECT founder.rls('founder.workspace_state');

-- founder decisions: a governed record of a decision, its rationale and its revisions (never edited in place)
CREATE TABLE founder.decision (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES app.tenant(id),
  code        text NOT NULL CHECK (code ~ '^FD-[0-9]{4}$'),
  title       text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  area        text NOT NULL CHECK (area IN ('product', 'engineering', 'commercial', 'operations', 'investor', 'legal')),
  status      text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'DECIDED', 'REVISITED', 'WITHDRAWN')),
  revision    integer NOT NULL DEFAULT 1,
  created_by  uuid NOT NULL REFERENCES app.person(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
SELECT founder.rls('founder.decision');
CREATE TABLE founder.decision_revision (
  id          bigserial PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES app.tenant(id),
  decision_id uuid NOT NULL REFERENCES founder.decision(id),
  revision    integer NOT NULL,
  status      text NOT NULL,
  rationale   text NOT NULL CHECK (length(rationale) BETWEEN 1 AND 8000),
  options     jsonb NOT NULL DEFAULT '[]'::jsonb,
  decided_by  uuid NOT NULL REFERENCES app.person(id),
  at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (decision_id, revision)
);
SELECT founder.rls('founder.decision_revision');
CREATE TRIGGER decision_revision_append_only BEFORE UPDATE OR DELETE ON founder.decision_revision FOR EACH ROW EXECUTE FUNCTION app.refuse_change();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT USAGE ON SCHEMA founder TO empathia_app;
    GRANT SELECT, INSERT, UPDATE ON founder.workspace_state, founder.decision TO empathia_app;
    GRANT SELECT, INSERT ON founder.decision_revision TO empathia_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA founder TO empathia_app;
  END IF;
END $$;
