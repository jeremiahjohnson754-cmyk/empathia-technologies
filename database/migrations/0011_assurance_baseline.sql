-- 0011 · Versioned, immutable Assurance baselines (ADR-0003; owner decision RT-04, 2026-10-30).
-- A baseline is published when a room is accepted (and again after an authorized recommissioning). A version is never edited: a new
-- version supersedes the current one and the lineage stays. It binds the exact design revision, commissioning plan, result labels and
-- evidence objects it was accepted on. Exceptions (an accepted deviation from the baseline) are their own governed records.
CREATE TABLE app.assurance_baseline (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES app.tenant(id),
  room_id          uuid NOT NULL,
  version          integer NOT NULL CHECK (version >= 1),
  state            text NOT NULL DEFAULT 'CURRENT' CHECK (state IN ('CURRENT', 'SUPERSEDED', 'WITHDRAWN')),
  design_revision  integer NOT NULL,
  design_sha256    text NOT NULL,
  plan_id          uuid,
  results          jsonb NOT NULL,                 -- test id → result label at publication
  evidence_ids     uuid[] NOT NULL DEFAULT '{}',   -- the evidence objects the accepted results cite
  devices          jsonb NOT NULL,                 -- as-accepted device list (id, category, label)
  reason           text NOT NULL CHECK (length(reason) BETWEEN 1 AND 1000),
  published_by     uuid NOT NULL REFERENCES app.person(id),
  published_at     timestamptz NOT NULL DEFAULT now(),
  supersedes       uuid REFERENCES app.assurance_baseline(id),
  superseded_at    timestamptz,
  superseded_by    uuid REFERENCES app.person(id),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, room_id, version),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  CHECK ((state = 'CURRENT') = (superseded_at IS NULL))
);
CREATE UNIQUE INDEX assurance_baseline_current ON app.assurance_baseline (tenant_id, room_id) WHERE state = 'CURRENT';
-- immutable except the single transition CURRENT → SUPERSEDED | WITHDRAWN (which only records when and by whom)
CREATE OR REPLACE FUNCTION app.baseline_transition_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'EM005 assurance baselines are never deleted'; END IF;
  IF OLD.state <> 'CURRENT' OR NEW.state = 'CURRENT' THEN RAISE EXCEPTION 'EM005 a baseline version can only move from CURRENT to SUPERSEDED or WITHDRAWN'; END IF;
  IF NEW.version <> OLD.version OR NEW.results <> OLD.results OR NEW.devices <> OLD.devices OR NEW.design_revision <> OLD.design_revision OR NEW.design_sha256 <> OLD.design_sha256 OR NEW.evidence_ids <> OLD.evidence_ids OR NEW.published_by <> OLD.published_by OR NEW.published_at <> OLD.published_at OR NEW.room_id <> OLD.room_id THEN
    RAISE EXCEPTION 'EM005 the content of a published baseline is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER baseline_immutable BEFORE UPDATE OR DELETE ON app.assurance_baseline FOR EACH ROW EXECUTE FUNCTION app.baseline_transition_only();
SELECT app.tenant_rls('app.assurance_baseline');

CREATE TABLE app.baseline_exception (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenant(id),
  room_id       uuid NOT NULL,
  baseline_id   uuid NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('ACCEPTED_DEVIATION', 'TEMPORARY_WAIVER', 'KNOWN_GAP')),
  dimension     text NOT NULL,
  rationale     text NOT NULL CHECK (length(rationale) BETWEEN 10 AND 4000),
  state         text NOT NULL DEFAULT 'REQUESTED' CHECK (state IN ('REQUESTED', 'APPROVED', 'REJECTED', 'EXPIRED')),
  requested_by  uuid NOT NULL REFERENCES app.person(id),
  requested_at  timestamptz NOT NULL DEFAULT now(),
  decided_by    uuid REFERENCES app.person(id),
  decided_at    timestamptz,
  decision_note text,
  expires_at    timestamptz,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  FOREIGN KEY (tenant_id, baseline_id) REFERENCES app.assurance_baseline(tenant_id, id),
  CHECK (decided_by IS NULL OR decided_by <> requested_by)   -- separation of duties: no self-approval
);
SELECT app.tenant_rls('app.baseline_exception');

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT, UPDATE ON app.assurance_baseline, app.baseline_exception TO empathia_app;
    GRANT SELECT ON app.assurance_baseline TO empathia_worker;
  END IF;
END $$;
