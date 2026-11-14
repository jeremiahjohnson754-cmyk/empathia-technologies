-- 0032 · The deficiency workflow, server-side (40/10 Commissioning Engineering Workstation directive: "Open, In Progress, Pending
-- Retest, Closed, Accepted Exception, Deferred"; the state machine is @empathia/commissioning-engine deficiencies.ts, shared with the
-- demonstration). The API takes each step through the engine; this migration is the backstop for every writer, the runtime role included.
--
-- app.room_issue keeps its state (OPEN / RESOLVED: what the readiness gate, analytics and acceptance already read) and gains:
--   workflow           where the deficiency is in the six states (CLOSED exactly when state = RESOLVED)
--   target_date, root_cause, corrective_action, fixed_by, retest, exception_ref, exception_requested_by, deferral, closed_by
-- Rules held by the guard trigger:
--   - a hand-taken step follows the machine: only the pairs below are accepted;
--   - the system's own resolution (a verified retest; a design check that stops firing) closes the workflow from any state, and the
--     system's reopening (the check fires again) reopens it — those writers change `state`, name their path in the transaction-local
--     setting app.issue_resolution, and the trigger keeps the two in step; any other write of RESOLVED is refused;
--   - CLOSED by hand needs a PASS retest, and a closer who is neither the fixer nor the retest's recorder (separation of duties);
--   - ACCEPTED_EXCEPTION needs an exception reference and an approver who is not its requester;
--   - DEFERRED needs a reason and a date in the future; a High/Critical deficiency is not deferred on the server (acceptance waits);
--   - PENDING_RETEST needs a root cause and a corrective action.
-- Each step is written to app.issue_event (kind 'workflow', append-only). Rollback: database/rollbacks/0032_deficiency_workflow.down.sql.

ALTER TABLE app.room_issue
  ADD COLUMN IF NOT EXISTS workflow text NOT NULL DEFAULT 'OPEN' CHECK (workflow IN ('OPEN', 'IN_PROGRESS', 'PENDING_RETEST', 'CLOSED', 'ACCEPTED_EXCEPTION', 'DEFERRED')),
  ADD COLUMN IF NOT EXISTS target_date date,
  ADD COLUMN IF NOT EXISTS root_cause text CHECK (root_cause IS NULL OR root_cause IN ('DESIGN', 'INSTALLATION', 'CONFIGURATION', 'EQUIPMENT_FAULT', 'FIRMWARE', 'INFRASTRUCTURE', 'ACOUSTICS', 'OTHER')),
  ADD COLUMN IF NOT EXISTS corrective_action text CHECK (corrective_action IS NULL OR length(corrective_action) BETWEEN 10 AND 2000),
  ADD COLUMN IF NOT EXISTS fixed_by uuid REFERENCES app.person(id),
  ADD COLUMN IF NOT EXISTS retest jsonb,
  ADD COLUMN IF NOT EXISTS exception_ref text,
  ADD COLUMN IF NOT EXISTS exception_requested_by uuid REFERENCES app.person(id),
  ADD COLUMN IF NOT EXISTS exception_approved_by uuid REFERENCES app.person(id),
  ADD COLUMN IF NOT EXISTS deferral jsonb,
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES app.person(id);

UPDATE app.room_issue SET workflow = 'CLOSED' WHERE state = 'RESOLVED' AND workflow <> 'CLOSED';
ALTER TABLE app.room_issue DROP CONSTRAINT IF EXISTS room_issue_workflow_matches_state;
ALTER TABLE app.room_issue ADD CONSTRAINT room_issue_workflow_matches_state CHECK ((workflow = 'CLOSED') = (state = 'RESOLVED'));

ALTER TABLE app.issue_event DROP CONSTRAINT IF EXISTS issue_event_kind_check;
ALTER TABLE app.issue_event ADD CONSTRAINT issue_event_kind_check CHECK (kind IN ('created', 'seen_again', 'correlated', 'assigned', 'resolved', 'reopened', 'work_order', 'workflow'));

CREATE OR REPLACE FUNCTION app.room_issue_workflow_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- the system's resolution and reopening move `state`; the workflow follows
  IF NEW.state IS DISTINCT FROM OLD.state AND NEW.workflow = OLD.workflow THEN
    IF NEW.state = 'RESOLVED' THEN
      -- only the system's own resolution paths close a deficiency this way, and they say which (set_config, transaction-local)
      IF coalesce(current_setting('app.issue_resolution', true), '') NOT IN ('verified_retest', 'design_check') THEN
        RAISE EXCEPTION 'a deficiency is resolved by a verified retest, by its design check no longer firing, or by its workflow — not by setting its state' USING ERRCODE = 'EM011'; END IF;
      NEW.workflow := 'CLOSED';
    ELSE NEW.workflow := 'OPEN'; NEW.retest := NULL; NEW.closed_by := NULL; END IF;
    RETURN NEW;
  END IF;
  IF NEW.workflow IS NOT DISTINCT FROM OLD.workflow THEN RETURN NEW; END IF;
  IF (OLD.workflow, NEW.workflow) NOT IN (
       ('OPEN', 'IN_PROGRESS'), ('IN_PROGRESS', 'PENDING_RETEST'), ('PENDING_RETEST', 'IN_PROGRESS'), ('PENDING_RETEST', 'CLOSED'),
       ('OPEN', 'ACCEPTED_EXCEPTION'), ('IN_PROGRESS', 'ACCEPTED_EXCEPTION'), ('OPEN', 'DEFERRED'), ('IN_PROGRESS', 'DEFERRED'),
       ('DEFERRED', 'OPEN'), ('CLOSED', 'OPEN')) THEN
    RAISE EXCEPTION 'a deficiency does not go from % to %', OLD.workflow, NEW.workflow USING ERRCODE = 'EM011';
  END IF;
  IF NEW.workflow = 'IN_PROGRESS' AND OLD.workflow = 'OPEN' AND (NEW.owner_role IS NULL OR NEW.target_date IS NULL) THEN
    RAISE EXCEPTION 'work starts with an owner and a target date' USING ERRCODE = 'EM011'; END IF;
  IF NEW.workflow = 'PENDING_RETEST' AND (NEW.root_cause IS NULL OR NEW.corrective_action IS NULL OR NEW.fixed_by IS NULL) THEN
    RAISE EXCEPTION 'a retest is asked for once the root cause and the corrective action are recorded' USING ERRCODE = 'EM011'; END IF;
  IF NEW.workflow = 'CLOSED' THEN
    IF coalesce(NEW.retest->>'result', '') <> 'PASS' THEN RAISE EXCEPTION 'closing needs a passing retest' USING ERRCODE = 'EM011'; END IF;
    IF NEW.closed_by IS NULL OR NEW.closed_by = NEW.fixed_by OR NEW.closed_by::text = NEW.retest->>'by' THEN
      RAISE EXCEPTION 'the closer is neither the fixer nor the retest''s recorder (separation of duties)' USING ERRCODE = 'EM011'; END IF;
  END IF;
  IF NEW.workflow = 'ACCEPTED_EXCEPTION' AND (NEW.exception_ref IS NULL OR NEW.exception_requested_by IS NULL OR NEW.exception_approved_by IS NULL OR NEW.exception_approved_by = NEW.exception_requested_by) THEN
    RAISE EXCEPTION 'an accepted exception references its approved record, and its approver is not its requester' USING ERRCODE = 'EM011'; END IF;
  IF NEW.workflow = 'DEFERRED' THEN
    IF NEW.severity IN ('High', 'Critical') THEN RAISE EXCEPTION 'a % deficiency is not deferred', NEW.severity USING ERRCODE = 'EM011'; END IF;
    IF NEW.deferral IS NULL OR length(coalesce(NEW.deferral->>'reason', '')) < 10 OR (NEW.deferral->>'until')::date <= current_date THEN
      RAISE EXCEPTION 'a deferral gives its reason and a date in the future' USING ERRCODE = 'EM011'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS room_issue_workflow_guard ON app.room_issue;
CREATE TRIGGER room_issue_workflow_guard BEFORE UPDATE ON app.room_issue FOR EACH ROW EXECUTE FUNCTION app.room_issue_workflow_guard();
