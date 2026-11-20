-- 0046 · Vocabulary from the founder's workbooks (source reconciliation item 7): user impact on a commissioning or design deficiency
-- (incidents carry it since 0039), and region and zone on a site. Structure only.
--
--   * app.room_issue.user_impact: the same five words as an incident (none … executive impact); recorded by someone who opens or
--     assigns issues, each change an issue event (kind 'impact') with who and why, so the history says who judged the impact.
--   * app.site.region, app.site.zone: free names (up to 60 characters), set by an administrator; read wherever sites are listed.
-- A "Blocked" status for a deficiency is not added here: the deficiency workflow's states are the engine's (0032), and a deficiency
-- waiting on something outside it is DEFERRED with its reason and date. Incidents have Blocked (0039).

ALTER TABLE app.room_issue ADD COLUMN IF NOT EXISTS user_impact text CHECK (user_impact IS NULL OR user_impact IN ('none', 'minor_annoyance', 'moderate_disruption', 'major_disruption', 'executive_impact'));
ALTER TABLE app.issue_event DROP CONSTRAINT IF EXISTS issue_event_kind_check;
ALTER TABLE app.issue_event ADD CONSTRAINT issue_event_kind_check CHECK (kind IN ('created', 'seen_again', 'correlated', 'assigned', 'resolved', 'reopened', 'work_order', 'workflow', 'blocked', 'unblocked', 'escalated', 'impact'));

ALTER TABLE app.site ADD COLUMN IF NOT EXISTS region text CHECK (region IS NULL OR length(btrim(region)) BETWEEN 1 AND 60);
ALTER TABLE app.site ADD COLUMN IF NOT EXISTS zone   text CHECK (zone IS NULL OR length(btrim(zone)) BETWEEN 1 AND 60);
-- (the runtime role already updates app.room_issue and app.site: 0004)
