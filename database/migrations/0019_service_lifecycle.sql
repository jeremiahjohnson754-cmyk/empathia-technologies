-- 0019 ServiceHands lifecycle (P6-A): the work order moves on @empathia/service-engine's governed machine —
--   OPEN → TRIAGED → ASSIGNED → ACCEPTED → IN_PROGRESS → VERIFYING → RESOLVED → CLOSED, RESOLVED → REOPENED → TRIAGED —
-- with hard-gated assignment (staff profiles), a recorded dispatch preflight, field evidence, separated verification and the
-- customer closure policy. Closing a work order still never passes a commissioning test.

ALTER TABLE app.work_order DROP CONSTRAINT work_order_state_check;
ALTER TABLE app.work_order ADD CONSTRAINT work_order_state_check
  CHECK (state IN ('OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'VERIFYING', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'));
ALTER TABLE app.work_order
  ADD COLUMN work_type        text NOT NULL DEFAULT 'break_fix' CHECK (work_type ~ '^[a-z_]{2,40}$'),
  ADD COLUMN severity         text CHECK (severity IN ('Mission critical', 'High', 'Standard')),
  ADD COLUMN triage           jsonb,                                  -- {scope, risk, byRole, at}
  ADD COLUMN window_from      timestamptz,
  ADD COLUMN window_to        timestamptz,
  ADD COLUMN assigned_to      uuid REFERENCES app.person(id),
  ADD COLUMN assignment       jsonb,                                  -- the candidate record at assignment: score and reasons (explained ranking)
  ADD COLUMN accepted_at      timestamptz,
  ADD COLUMN preflight        jsonb,                                  -- {ok, checks[], at}
  ADD COLUMN started_at       timestamptz,
  ADD COLUMN evidence         jsonb NOT NULL DEFAULT '[]',            -- [{kind, note, ref, recorderId, at}]
  ADD COLUMN verification     jsonb,                                  -- {outcome, note, verifierId, at}
  ADD COLUMN reopen_count     integer NOT NULL DEFAULT 0,
  ADD COLUMN customer_confirmed boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT work_order_assignee_check CHECK (state NOT IN ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'VERIFYING') OR assigned_to IS NOT NULL),
  ADD CONSTRAINT work_order_window_check CHECK (window_to IS NULL OR window_from IS NULL OR window_to >= window_from);
CREATE INDEX work_order_state_idx ON app.work_order (tenant_id, state);

-- every step, refusal-free (refusals are in the audit log), append-only
CREATE TABLE app.work_order_event (
  id            bigserial PRIMARY KEY,
  tenant_id     uuid NOT NULL,
  work_order_id uuid NOT NULL,
  kind          text NOT NULL CHECK (kind ~ '^[a-z_.]{2,40}$'),
  detail        jsonb NOT NULL DEFAULT '{}',
  actor_id      uuid REFERENCES app.person(id),
  at            timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, work_order_id) REFERENCES app.work_order(tenant_id, id)
);
CREATE INDEX work_order_event_idx ON app.work_order_event (tenant_id, work_order_id, id);
CREATE TRIGGER work_order_event_append_only BEFORE UPDATE OR DELETE ON app.work_order_event FOR EACH ROW EXECUTE FUNCTION app.refuse_change();
SELECT app.tenant_rls('app.work_order_event');

-- the facts the hard gates read: certifications with expiry, skills with level, approved sites, base building, leave, capacity,
-- the support agreement for external people. Synthetic in the seed; in production maintained by the service manager (P6-A admin).
CREATE TABLE app.staff_profile (
  tenant_id      uuid NOT NULL,
  person_id      uuid NOT NULL REFERENCES app.person(id),
  internal       boolean NOT NULL DEFAULT true,
  org_name       text,
  building_key   text,
  sites          text[] NOT NULL DEFAULT '{}',                        -- building codes, or '*' for every site
  skills         jsonb NOT NULL DEFAULT '{}',                         -- {"SK-AUD-1": {"level": "Working", "n": 4}}
  certs          jsonb NOT NULL DEFAULT '{}',                         -- {"cert.av_field": {"expires": "2027-06-30"}}
  leave_from     date,
  leave_to       date,
  capacity_hours integer NOT NULL DEFAULT 0 CHECK (capacity_hours >= 0),
  agreement      jsonb,                                               -- external people: {id, status, buildings[], domains[]}
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, person_id),
  FOREIGN KEY (tenant_id) REFERENCES app.tenant(id),
  CHECK (internal OR agreement IS NOT NULL)
);
CREATE TRIGGER staff_profile_touch BEFORE UPDATE ON app.staff_profile FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
SELECT app.tenant_rls('app.staff_profile');

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT ON app.work_order_event TO empathia_app;
    GRANT USAGE ON SEQUENCE app.work_order_event_id_seq TO empathia_app;
    GRANT SELECT, INSERT, UPDATE ON app.staff_profile TO empathia_app;
  END IF;
END $$;
