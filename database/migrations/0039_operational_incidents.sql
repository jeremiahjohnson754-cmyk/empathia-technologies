-- 0039 · Operational incidents.
-- Founder, 17 Nov 2026, 19:05: "prioritize operational incident intelligence". And the reconciliation of the founder's own Operational
-- Issue Intelligence workbook against this schema (docs/product/SOURCE_RECONCILIATION.md): "Operational incidents are not a record.
-- The server knows a deficiency of a design and a deficiency of commissioning. The workbook is mostly about neither: a room in service
-- with a fault, found by a user, a support round or monitoring."
--
-- An operational incident is an issue of a room in service. It is NOT a new kind of thing beside app.room_issue with its own work
-- orders, events, diagnosis and search: that would be a second service desk inside the first. It is a room issue of a third category,
-- OPERATIONAL_INCIDENT, so everything that hangs on an issue already works for it and is governed the same way — the ServiceHands
-- work order and its hard gates, the issue's history, an APEX case, the relationship graph, the workflow (owner and date; root cause
-- and correction; confirmation that the room does again what it stopped doing; verification by someone who neither fixed nor
-- confirmed it) and its database guard (0032).
--
--   * app.incident   what an incident has that a deficiency has not, one row per incident issue: what kind of entry it is (an
--                    incident, or an engineering observation), the kind of issue, the domain, how it was found, who it affected and
--                    how much, the device when one is named, who reported it and when; whether it is blocked and why; whether it was
--                    escalated; how it was resolved; and the earlier incident it repeats. The facts of the report never change.
--                    recurrence_of is worked out here, by the database, when the incident is written: the most recent incident of
--                    the same kind in the same room (and on the same device, when both name one) reported in the thirty days before.
--                    Nobody types "recurring".
--
-- An incident is reported on a room that is in service (ACCEPTED or OPERATIONAL). Before that, what goes wrong is a deficiency of the
-- design or of commissioning and is recorded as one. EM020 is the incident guard (the API answers 422).

ALTER TABLE app.room_issue DROP CONSTRAINT room_issue_category_check;
ALTER TABLE app.room_issue ADD CONSTRAINT room_issue_category_check CHECK (category IN ('DESIGN_DEFICIENCY', 'INSTALLATION_COMMISSIONING_DEFICIENCY', 'OPERATIONAL_INCIDENT'));

-- an incident's history says when it was blocked, unblocked and escalated
ALTER TABLE app.issue_event DROP CONSTRAINT issue_event_kind_check;
ALTER TABLE app.issue_event ADD CONSTRAINT issue_event_kind_check CHECK (kind IN ('created', 'seen_again', 'correlated', 'assigned', 'resolved', 'reopened', 'work_order', 'workflow', 'blocked', 'unblocked', 'escalated'));

CREATE TABLE app.incident (
  issue_id           uuid PRIMARY KEY,
  tenant_id          uuid NOT NULL,
  room_id            uuid NOT NULL,
  entry_type         text NOT NULL CHECK (entry_type IN ('OPERATIONAL_INCIDENT', 'ENGINEERING_OBSERVATION')),
  issue_type         text NOT NULL CHECK (issue_type IN ('no_audio', 'low_audio', 'echo_aec_failure', 'video_no_signal', 'camera_tracking_failure', 'control_system_failure', 'network_connectivity', 'device_offline',
                       'firmware_issue', 'ui_ux_issue', 'documentation_missing', 'installation_defect', 'design_gap', 'vendor_performance', 'standards_violation', 'improvement_opportunity', 'user_error', 'other')),
  domain             text NOT NULL CHECK (domain IN ('audio', 'video', 'network', 'control', 'av_infrastructure', 'power_ups', 'lighting', 'signage', 'conferencing', 'design', 'vendor', 'integration')),
  detected_during    text NOT NULL CHECK (detected_during IN ('user_report', 'support_round', 'scheduled_maintenance', 'production', 'monitoring')),
  user_impact        text NOT NULL CHECK (user_impact IN ('none', 'minor_annoyance', 'moderate_disruption', 'major_disruption', 'executive_impact')),
  position_id        uuid,
  description        text NOT NULL CHECK (length(btrim(description)) BETWEEN 10 AND 4000),
  reported_by        uuid NOT NULL REFERENCES app.person(id),
  reported_role      text NOT NULL,
  reported_at        timestamptz NOT NULL DEFAULT now(),
  recurrence_of      uuid REFERENCES app.incident(issue_id),      -- set by the trigger below, never by the writer
  blocked_reason     text CHECK (blocked_reason IS NULL OR length(btrim(blocked_reason)) BETWEEN 5 AND 500),
  blocked_at         timestamptz,
  blocked_by         uuid REFERENCES app.person(id),
  escalation_reason  text CHECK (escalation_reason IS NULL OR length(btrim(escalation_reason)) BETWEEN 5 AND 500),
  escalated_at       timestamptz,
  escalated_by       uuid REFERENCES app.person(id),
  resolution_type    text CHECK (resolution_type IN ('configuration_fix', 'hardware_replacement', 'firmware_update', 'software_patch', 'training', 'design_change', 'escalation_to_vendor', 'workaround', 'no_action_required')),
  resolved_at        timestamptz,
  resolved_by        uuid REFERENCES app.person(id),
  UNIQUE (tenant_id, issue_id),
  FOREIGN KEY (tenant_id, issue_id) REFERENCES app.room_issue(tenant_id, id),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  FOREIGN KEY (tenant_id, position_id) REFERENCES app.planned_asset(tenant_id, id),
  CONSTRAINT incident_blocked CHECK ((blocked_reason IS NULL) = (blocked_at IS NULL) AND (blocked_reason IS NULL) = (blocked_by IS NULL)),
  CONSTRAINT incident_escalated CHECK ((escalation_reason IS NULL) = (escalated_at IS NULL) AND (escalation_reason IS NULL) = (escalated_by IS NULL)),
  CONSTRAINT incident_resolved CHECK ((resolution_type IS NULL) = (resolved_at IS NULL) AND (resolution_type IS NULL) = (resolved_by IS NULL))
);
CREATE INDEX incident_room_idx ON app.incident (tenant_id, room_id, issue_type, reported_at DESC);
SELECT app.tenant_rls('app.incident');

CREATE OR REPLACE FUNCTION app.incident_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE l text; c text; r uuid; prev uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'an incident is never deleted' USING ERRCODE = 'EM020'; END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT i.category, i.room_id INTO c, r FROM app.room_issue i WHERE i.tenant_id = NEW.tenant_id AND i.id = NEW.issue_id;
    IF c IS DISTINCT FROM 'OPERATIONAL_INCIDENT' OR r IS DISTINCT FROM NEW.room_id THEN RAISE EXCEPTION 'an incident is the detail of an OPERATIONAL_INCIDENT issue of the same room' USING ERRCODE = 'EM020'; END IF;
    SELECT lifecycle INTO l FROM app.room WHERE tenant_id = NEW.tenant_id AND id = NEW.room_id;
    IF l NOT IN ('ACCEPTED', 'OPERATIONAL') THEN
      RAISE EXCEPTION 'an operational incident is reported on a room in service (this one is %): before acceptance it is a deficiency', coalesce(l, 'unknown') USING ERRCODE = 'EM020'; END IF;
    IF NEW.position_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM app.planned_asset a WHERE a.tenant_id = NEW.tenant_id AND a.id = NEW.position_id AND a.room_id = NEW.room_id AND NOT a.furniture) THEN
      RAISE EXCEPTION 'the device named is a device position of this room' USING ERRCODE = 'EM020'; END IF;
    -- recurrence: worked out here, whatever the writer sent
    SELECT p.issue_id INTO prev FROM app.incident p
      WHERE p.tenant_id = NEW.tenant_id AND p.room_id = NEW.room_id AND p.issue_type = NEW.issue_type AND p.issue_id <> NEW.issue_id
        AND p.reported_at < NEW.reported_at AND p.reported_at >= NEW.reported_at - interval '30 days'
        AND (NEW.position_id IS NULL OR p.position_id IS NULL OR p.position_id = NEW.position_id)
      ORDER BY p.reported_at DESC LIMIT 1;
    NEW.recurrence_of := prev;
    NEW.blocked_reason := NULL; NEW.blocked_at := NULL; NEW.blocked_by := NULL; NEW.escalation_reason := NULL; NEW.escalated_at := NULL; NEW.escalated_by := NULL;
    NEW.resolution_type := NULL; NEW.resolved_at := NULL; NEW.resolved_by := NULL;
    RETURN NEW;
  END IF;
  IF (NEW.issue_id, NEW.tenant_id, NEW.room_id, NEW.entry_type, NEW.issue_type, NEW.domain, NEW.detected_during, NEW.user_impact, NEW.position_id, NEW.description, NEW.reported_by, NEW.reported_role, NEW.reported_at, NEW.recurrence_of)
     IS DISTINCT FROM (OLD.issue_id, OLD.tenant_id, OLD.room_id, OLD.entry_type, OLD.issue_type, OLD.domain, OLD.detected_during, OLD.user_impact, OLD.position_id, OLD.description, OLD.reported_by, OLD.reported_role, OLD.reported_at, OLD.recurrence_of) THEN
    RAISE EXCEPTION 'what an incident reported does not change: a correction is a note on its history' USING ERRCODE = 'EM020'; END IF;
  IF OLD.escalated_at IS NOT NULL AND (NEW.escalated_at, NEW.escalated_by, NEW.escalation_reason) IS DISTINCT FROM (OLD.escalated_at, OLD.escalated_by, OLD.escalation_reason) THEN
    RAISE EXCEPTION 'an escalation is recorded once' USING ERRCODE = 'EM020'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER incident_guard BEFORE INSERT OR UPDATE OR DELETE ON app.incident FOR EACH ROW EXECUTE FUNCTION app.incident_guard();

REVOKE ALL ON app.incident FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app.incident_guard() FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT ON app.incident TO empathia_app;
    GRANT UPDATE (blocked_reason, blocked_at, blocked_by, escalation_reason, escalated_at, escalated_by, resolution_type, resolved_at, resolved_by) ON app.incident TO empathia_app;
  END IF;
END $$;
