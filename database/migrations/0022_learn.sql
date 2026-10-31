-- 0022 Empathia Learn (P8): reviewed cases from what actually happened — written from a RESOLVED/CLOSED work order with the
-- customer's permission, de-identified against this organization's own names, reviewed by a subject-matter expert who is not the
-- proposer, approved by a steward who is neither — and training records, which never grant authority.
CREATE TABLE app.learn_case (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  work_order_id uuid NOT NULL,
  code          text NOT NULL CHECK (code ~ '^LC-[0-9]{4,10}$'),
  title         text NOT NULL CHECK (length(title) BETWEEN 3 AND 200),
  lesson        text NOT NULL CHECK (length(lesson) BETWEEN 10 AND 4000),
  permission    jsonb NOT NULL,                       -- {by, at, note}
  deidentified  boolean NOT NULL DEFAULT true,
  state         text NOT NULL DEFAULT 'PROPOSED' CHECK (state IN ('PROPOSED', 'SME_REVIEWED', 'REJECTED', 'APPROVED')),
  proposed_by   uuid NOT NULL REFERENCES app.person(id),
  proposed_at   timestamptz NOT NULL DEFAULT now(),
  sme_review    jsonb,                                -- {decision, by, at, note}
  approved_by   uuid REFERENCES app.person(id),
  approved_at   timestamptz,
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code), UNIQUE (tenant_id, work_order_id),
  FOREIGN KEY (tenant_id, work_order_id) REFERENCES app.work_order(tenant_id, id),
  CHECK ((state = 'APPROVED') = (approved_by IS NOT NULL))
);
SELECT app.tenant_rls('app.learn_case');

CREATE TABLE app.training_record (
  id         bigserial PRIMARY KEY,
  tenant_id  uuid NOT NULL,
  person_id  uuid NOT NULL REFERENCES app.person(id),
  kind       text NOT NULL CHECK (kind IN ('quiz', 'drill')),
  item_id    text NOT NULL CHECK (item_id ~ '^[A-Za-z0-9_.-]{1,80}$'),
  correct    boolean,
  score      integer CHECK (score IS NULL OR score >= 0),
  total      integer CHECK (total IS NULL OR total >= 0),
  elapsed_s  integer CHECK (elapsed_s IS NULL OR elapsed_s >= 0),
  at         timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id) REFERENCES app.tenant(id)
);
CREATE INDEX training_record_person_idx ON app.training_record (tenant_id, person_id, at DESC);
CREATE TRIGGER training_record_append_only BEFORE UPDATE OR DELETE ON app.training_record FOR EACH ROW EXECUTE FUNCTION app.refuse_change();
SELECT app.tenant_rls('app.training_record');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN GRANT SELECT, INSERT, UPDATE ON app.learn_case TO empathia_app; GRANT SELECT, INSERT ON app.training_record TO empathia_app; GRANT USAGE ON SEQUENCE app.training_record_id_seq TO empathia_app; END IF;
END $$;
