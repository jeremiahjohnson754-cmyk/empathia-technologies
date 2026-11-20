-- Rollback of 0032_deficiency_workflow.sql: drops the workflow guard and columns (the workflow history stays in app.issue_event as
-- 'workflow' events, which the restored kind check would refuse: delete them first, as the superuser, after taking a dump).
DROP TRIGGER IF EXISTS room_issue_workflow_guard ON app.room_issue;
DROP FUNCTION IF EXISTS app.room_issue_workflow_guard();
ALTER TABLE app.room_issue DROP CONSTRAINT IF EXISTS room_issue_workflow_matches_state;
ALTER TABLE app.room_issue DROP COLUMN IF EXISTS workflow, DROP COLUMN IF EXISTS target_date, DROP COLUMN IF EXISTS root_cause, DROP COLUMN IF EXISTS corrective_action,
  DROP COLUMN IF EXISTS fixed_by, DROP COLUMN IF EXISTS retest, DROP COLUMN IF EXISTS exception_ref, DROP COLUMN IF EXISTS exception_requested_by,
  DROP COLUMN IF EXISTS exception_approved_by, DROP COLUMN IF EXISTS deferral, DROP COLUMN IF EXISTS closed_by;
ALTER TABLE app.issue_event DROP CONSTRAINT IF EXISTS issue_event_kind_check;
ALTER TABLE app.issue_event ADD CONSTRAINT issue_event_kind_check CHECK (kind IN ('created', 'seen_again', 'correlated', 'assigned', 'resolved', 'reopened', 'work_order'));
