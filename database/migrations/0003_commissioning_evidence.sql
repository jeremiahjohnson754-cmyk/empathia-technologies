-- 0003 · Drawings, commissioning plans, evidence, results, verification, issues and work orders.
-- The rules that matter most are enforced here as well as in the API (defence in depth):
--   * a result is recorded only on a room in COMMISSIONING, with an evidence object of the same tenant;
--   * a verification is never by the person who recorded the result, and only for a PASS;
--   * results, verifications, evidence and issue history are append-only;
--   * closing a work order cannot change a result (there is no column through which it could).

CREATE TABLE app.drawing_revision (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  room_id      uuid NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('plan','placement','schedule','relationships','signal','network','summary')),
  rev_no       integer NOT NULL CHECK (rev_no >= 1),
  design_rev   integer NOT NULL,                 -- the room revision it was generated from
  input_sha256 text NOT NULL CHECK (input_sha256 ~ '^[0-9a-f]{64}$'),
  state        text NOT NULL DEFAULT 'GENERATED' CHECK (state IN ('GENERATED', 'APPROVED', 'SUPERSEDED')),
  stamp        text NOT NULL DEFAULT 'GENERATED DIAGRAM — not an engineer-stamped construction drawing or approved shop drawing',
  generated_by uuid NOT NULL REFERENCES app.person(id),
  approved_by  uuid REFERENCES app.person(id),
  approved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (room_id, kind, rev_no),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  CHECK ((state = 'APPROVED') = (approved_by IS NOT NULL) OR state = 'SUPERSEDED')
);
SELECT app.tenant_rls('app.drawing_revision');

-- A compiled commissioning plan: the whole library judged for one room revision by the server-side engine.
CREATE TABLE app.cx_plan (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  room_id         uuid NOT NULL,
  design_rev      integer NOT NULL,
  engine_version  text NOT NULL,
  rule_version    text NOT NULL,
  library_size    integer NOT NULL CHECK (library_size > 0),
  applicable      integer NOT NULL CHECK (applicable >= 0 AND applicable <= library_size),
  context         jsonb NOT NULL,
  trigger         text NOT NULL,
  signature       text NOT NULL,                  -- sha256 of (test, applicable, status, result) for every row: a plan is stored only when it changes
  compiled_by     uuid REFERENCES app.person(id),
  compiled_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id)
);
CREATE INDEX cx_plan_room_idx ON app.cx_plan (tenant_id, room_id, compiled_at DESC);
SELECT app.tenant_rls('app.cx_plan');

CREATE TABLE app.cx_plan_row (
  tenant_id   uuid NOT NULL,
  plan_id     uuid NOT NULL,
  test_id     text NOT NULL,
  label       text NOT NULL,
  pack        text,
  domain      text NOT NULL,
  phase       integer NOT NULL,
  tier        integer NOT NULL,
  applicable  boolean NOT NULL,
  status      text NOT NULL CHECK (status IN ('NOT_APPLICABLE','PENDING_INFORMATION','BLOCKED_BY_PREREQUISITE','REQUIRES_PHYSICAL_EXECUTION')),
  why         jsonb NOT NULL,
  personas    text[] NOT NULL DEFAULT '{}',
  evidence    text[] NOT NULL DEFAULT '{}',
  instrument  boolean NOT NULL DEFAULT false,
  devices     text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (plan_id, test_id),
  FOREIGN KEY (tenant_id, plan_id) REFERENCES app.cx_plan(tenant_id, id),
  CHECK (applicable = (status <> 'NOT_APPLICABLE'))
);
SELECT app.tenant_rls('app.cx_plan_row');

-- Evidence objects: the bytes live in object storage, addressed by their SHA-256; this row is the metadata, ownership and retention.
CREATE TABLE app.evidence_object (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES app.tenant(id),
  sha256           text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  bytes            bigint NOT NULL CHECK (bytes > 0 AND bytes <= 104857600),
  media_type       text NOT NULL,
  file_name        text NOT NULL CHECK (length(file_name) <= 200),
  storage_key      text NOT NULL,
  classification   text NOT NULL DEFAULT 'CONFIDENTIAL_TECHNICAL',
  uploaded_by      uuid NOT NULL REFERENCES app.person(id),
  uploaded_at      timestamptz NOT NULL DEFAULT now(),
  retention_until  date NOT NULL,
  legal_hold       boolean NOT NULL DEFAULT false,
  UNIQUE (tenant_id, id)
);
CREATE INDEX evidence_sha_idx ON app.evidence_object (tenant_id, sha256);
CREATE TRIGGER evidence_append_only BEFORE UPDATE OR DELETE ON app.evidence_object FOR EACH ROW EXECUTE FUNCTION app.refuse_change();
SELECT app.tenant_rls('app.evidence_object');

-- Test results. A new recording for the same test supersedes the earlier one (both are kept: append-only).
CREATE TABLE app.test_result (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  room_id        uuid NOT NULL,
  test_id        text NOT NULL,
  state          text NOT NULL CHECK (state IN ('PASS', 'FAIL', 'NOT_SUPPORTED', 'INCONCLUSIVE')),
  evidence_id    uuid NOT NULL,
  evidence_kind  text NOT NULL,
  instrument     text,
  recorded_by    uuid NOT NULL REFERENCES app.person(id),
  recorded_role  text NOT NULL,
  recorded_at    timestamptz NOT NULL DEFAULT now(),
  supersedes     uuid,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  FOREIGN KEY (tenant_id, evidence_id) REFERENCES app.evidence_object(tenant_id, id)
);
CREATE INDEX test_result_room_idx ON app.test_result (tenant_id, room_id, test_id, recorded_at DESC);
CREATE OR REPLACE FUNCTION app.result_only_in_commissioning() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE l text;
BEGIN
  SELECT lifecycle INTO l FROM app.room WHERE id = NEW.room_id AND tenant_id = NEW.tenant_id;
  IF l IS DISTINCT FROM 'COMMISSIONING' THEN
    RAISE EXCEPTION 'results are recorded on a room in COMMISSIONING (this one is %)', l USING ERRCODE = 'EM002';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER test_result_lifecycle BEFORE INSERT ON app.test_result FOR EACH ROW EXECUTE FUNCTION app.result_only_in_commissioning();
CREATE TRIGGER test_result_append_only BEFORE UPDATE OR DELETE ON app.test_result FOR EACH ROW EXECUTE FUNCTION app.refuse_change();
SELECT app.tenant_rls('app.test_result');

-- Independent verification of a PASS. recorded_by is copied so the database itself can refuse self-verification.
CREATE TABLE app.verification (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  result_id    uuid NOT NULL UNIQUE,
  recorded_by  uuid NOT NULL,
  verified_by  uuid NOT NULL REFERENCES app.person(id),
  verified_role text NOT NULL,
  verified_at  timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, result_id) REFERENCES app.test_result(tenant_id, id),
  CONSTRAINT verification_is_independent CHECK (verified_by <> recorded_by)
);
CREATE OR REPLACE FUNCTION app.verify_only_pass() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s text; r uuid;
BEGIN
  SELECT state, recorded_by INTO s, r FROM app.test_result WHERE id = NEW.result_id AND tenant_id = NEW.tenant_id;
  IF s IS DISTINCT FROM 'PASS' THEN RAISE EXCEPTION 'only a recorded PASS can be verified' USING ERRCODE = 'EM003'; END IF;
  IF r IS DISTINCT FROM NEW.recorded_by THEN RAISE EXCEPTION 'recorded_by does not match the result' USING ERRCODE = 'EM003'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER verification_pass_only BEFORE INSERT ON app.verification FOR EACH ROW EXECUTE FUNCTION app.verify_only_pass();
CREATE TRIGGER verification_append_only BEFORE UPDATE OR DELETE ON app.verification FOR EACH ROW EXECUTE FUNCTION app.refuse_change();
SELECT app.tenant_rls('app.verification');

-- The one result label every reader uses (R3-2): never a bare PASS.
CREATE OR REPLACE VIEW app.current_result WITH (security_invoker = true) AS
SELECT DISTINCT ON (r.tenant_id, r.room_id, r.test_id)
       r.tenant_id, r.room_id, r.test_id, r.id AS result_id, r.state, r.evidence_id, r.evidence_kind, r.recorded_by, r.recorded_at,
       v.verified_by, v.verified_at,
       CASE WHEN r.state = 'PASS' AND v.verified_by IS NOT NULL AND v.verified_by <> r.recorded_by THEN 'PASS_VERIFIED'
            WHEN r.state = 'PASS' THEN 'PASS_UNVERIFIED'
            ELSE r.state END AS result_label
  FROM app.test_result r LEFT JOIN app.verification v ON v.result_id = r.id
 ORDER BY r.tenant_id, r.room_id, r.test_id, r.recorded_at DESC, r.id DESC;

-- Issues: one per underlying deficiency (correlation key unique per room). Design deficiencies resolve when their check stops firing;
-- installation / commissioning deficiencies resolve only by a verified retest.
CREATE TABLE app.room_issue (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  room_id     uuid NOT NULL,
  code        text NOT NULL,
  key         text NOT NULL,
  category    text NOT NULL CHECK (category IN ('DESIGN_DEFICIENCY', 'INSTALLATION_COMMISSIONING_DEFICIENCY')),
  check_name  text NOT NULL,
  severity    text NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
  title       text NOT NULL,
  rationale   text NOT NULL,
  assets      text[] NOT NULL DEFAULT '{}',
  state       text NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN', 'RESOLVED')),
  owner_role  text,
  owner_id    uuid REFERENCES app.person(id),
  resolution  jsonb,
  first_seen_rev integer NOT NULL,
  last_seen_rev  integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code), UNIQUE (room_id, key),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  CHECK ((state = 'RESOLVED') = (resolution IS NOT NULL))
);
CREATE INDEX room_issue_open_idx ON app.room_issue (tenant_id, room_id) WHERE state = 'OPEN';
CREATE TRIGGER room_issue_touch BEFORE UPDATE ON app.room_issue FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
SELECT app.tenant_rls('app.room_issue');

CREATE TABLE app.issue_event (
  id         bigserial PRIMARY KEY,
  tenant_id  uuid NOT NULL,
  issue_id   uuid NOT NULL,
  kind       text NOT NULL CHECK (kind IN ('created', 'seen_again', 'correlated', 'assigned', 'resolved', 'reopened', 'work_order')),
  detail     jsonb NOT NULL,
  actor_id   uuid REFERENCES app.person(id),
  at         timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, issue_id) REFERENCES app.room_issue(tenant_id, id)
);
CREATE TRIGGER issue_event_append_only BEFORE UPDATE OR DELETE ON app.issue_event FOR EACH ROW EXECUTE FUNCTION app.refuse_change();
SELECT app.tenant_rls('app.issue_event');

-- ServiceHands work orders for installation / commissioning deficiencies. Closing one records the field work; it never passes a test.
CREATE TABLE app.work_order (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  issue_id     uuid NOT NULL,
  code         text NOT NULL,
  state        text NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN', 'CLOSED')),
  assigned_role text NOT NULL,
  note         text NOT NULL DEFAULT '',
  created_by   uuid NOT NULL REFERENCES app.person(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  closed_by    uuid REFERENCES app.person(id),
  closed_at    timestamptz,
  closing_note text,
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id, issue_id) REFERENCES app.room_issue(tenant_id, id),
  CHECK ((state = 'CLOSED') = (closed_at IS NOT NULL))
);
SELECT app.tenant_rls('app.work_order');
