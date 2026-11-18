-- 0044 · The support directory: organizations, contacts and support paths.
-- Source reconciliation item 2 ("Support paths and a contact directory are not records ... The Power Apps model answers 'who do I
-- call for audio at this site, and who is their backup', including people who never sign in. That is what the name Search Party
-- meant first.") Structure only: the workbook's organisations, contacts and support paths; no row of it is copied.
--
--   * app.organization  the owner, the integrator, a vendor, a manufacturer, a service provider.
--   * app.contact       a person to call, with or without an account here: a name, a role, an organization, channels. Recorded by
--                       someone who coordinates service or access; verified by a data steward who did not record it. A contact is
--                       never deleted: retired, with the reason.
--   * app.support_path  for one site and one domain (audio, video, network…): the primary contact, a backup who is someone else, an
--                       optional escalation contact and vendor, the queue and the hours. Proposed, then approved by a steward who did
--                       not propose it; one approved path per site and domain, a new one superseding it. A path's content never
--                       changes; it is superseded or retired.
--
-- Contact channels here are synthetic in every demonstration; nothing in the repository is a real person's address or number.

CREATE TABLE app.organization (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES app.tenant(id),
  code        text NOT NULL CHECK (code ~ '^ORG-[0-9]{4,}$'),
  name        text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 120),
  kind        text NOT NULL CHECK (kind IN ('OWNER', 'INTEGRATOR', 'VENDOR', 'MANUFACTURER', 'SERVICE_PROVIDER')),
  note        text CHECK (note IS NULL OR length(note) <= 500),
  recorded_by uuid NOT NULL REFERENCES app.person(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code), UNIQUE (tenant_id, name)
);
SELECT app.tenant_rls('app.organization');
CREATE TRIGGER organization_no_delete BEFORE DELETE ON app.organization FOR EACH ROW EXECUTE FUNCTION app.refuse_change();

CREATE TABLE app.contact (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenant(id),
  code          text NOT NULL CHECK (code ~ '^CON-[0-9]{4,}$'),
  org_id        uuid NOT NULL,
  person_id     uuid REFERENCES app.person(id),
  display_name  text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 2 AND 120),
  role_title    text NOT NULL CHECK (length(btrim(role_title)) BETWEEN 2 AND 120),
  channels      jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(channels) = 'array' AND jsonb_array_length(channels) <= 6),
  recorded_by   uuid NOT NULL REFERENCES app.person(id),
  recorded_at   timestamptz NOT NULL DEFAULT now(),
  verified_by   uuid REFERENCES app.person(id),
  verified_at   timestamptz,
  retired_at    timestamptz,
  retired_by    uuid REFERENCES app.person(id),
  retired_reason text,
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id, org_id) REFERENCES app.organization(tenant_id, id),
  CONSTRAINT contact_verified CHECK ((verified_by IS NULL) = (verified_at IS NULL)),
  CONSTRAINT contact_not_self_verified CHECK (verified_by IS NULL OR verified_by <> recorded_by),
  CONSTRAINT contact_retired CHECK ((retired_at IS NULL) = (retired_by IS NULL) AND (retired_at IS NULL OR length(btrim(coalesce(retired_reason, ''))) >= 5))
);
SELECT app.tenant_rls('app.contact');

-- a contact's identity never changes after it is recorded; it is verified once and retired once
CREATE OR REPLACE FUNCTION app.contact_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'EM022 a contact is never deleted: retire it with the reason' USING ERRCODE = 'EM022'; END IF;
  IF (NEW.code, NEW.org_id, NEW.person_id, NEW.display_name, NEW.role_title, NEW.recorded_by, NEW.recorded_at) IS DISTINCT FROM
     (OLD.code, OLD.org_id, OLD.person_id, OLD.display_name, OLD.role_title, OLD.recorded_by, OLD.recorded_at) THEN
    RAISE EXCEPTION 'EM022 a contact is recorded once: record a new one and retire this one' USING ERRCODE = 'EM022'; END IF;
  IF OLD.verified_by IS NOT NULL AND (NEW.verified_by, NEW.verified_at) IS DISTINCT FROM (OLD.verified_by, OLD.verified_at) THEN
    RAISE EXCEPTION 'EM022 the contact was verified already' USING ERRCODE = 'EM022'; END IF;
  IF OLD.verified_by IS NOT NULL AND NEW.channels IS DISTINCT FROM OLD.channels THEN
    RAISE EXCEPTION 'EM022 the channels of a verified contact do not change: record a new contact' USING ERRCODE = 'EM022'; END IF;
  IF OLD.retired_at IS NOT NULL THEN RAISE EXCEPTION 'EM022 the contact is retired' USING ERRCODE = 'EM022'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER contact_guard BEFORE UPDATE OR DELETE ON app.contact FOR EACH ROW EXECUTE FUNCTION app.contact_guard();

CREATE TABLE app.support_path (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES app.tenant(id),
  code           text NOT NULL CHECK (code ~ '^SPT-[0-9]{4,}$'),
  site_id        uuid NOT NULL,
  domain         text NOT NULL CHECK (domain IN ('audio', 'video', 'network', 'control', 'av_infrastructure', 'power_ups', 'lighting', 'signage', 'conferencing', 'integration')),
  primary_id     uuid NOT NULL,
  backup_id      uuid NOT NULL,
  escalation_id  uuid,
  vendor_org_id  uuid,
  queue          text CHECK (queue IS NULL OR length(queue) <= 120),
  hours          text NOT NULL CHECK (length(btrim(hours)) BETWEEN 3 AND 120),
  state          text NOT NULL DEFAULT 'PROPOSED' CHECK (state IN ('PROPOSED', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'RETIRED')),
  proposed_by    uuid NOT NULL REFERENCES app.person(id),
  proposed_at    timestamptz NOT NULL DEFAULT now(),
  decided_by     uuid REFERENCES app.person(id),
  decided_at     timestamptz,
  decision_note  text,
  superseded_by  uuid,
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id, site_id) REFERENCES app.site(tenant_id, id),
  FOREIGN KEY (tenant_id, primary_id) REFERENCES app.contact(tenant_id, id),
  FOREIGN KEY (tenant_id, backup_id) REFERENCES app.contact(tenant_id, id),
  FOREIGN KEY (tenant_id, escalation_id) REFERENCES app.contact(tenant_id, id),
  FOREIGN KEY (tenant_id, vendor_org_id) REFERENCES app.organization(tenant_id, id),
  CONSTRAINT support_path_backup_is_someone_else CHECK (backup_id <> primary_id),
  CONSTRAINT support_path_decided CHECK ((state = 'PROPOSED') = (decided_by IS NULL) AND (decided_by IS NULL) = (decided_at IS NULL)),
  CONSTRAINT support_path_not_self_decided CHECK (decided_by IS NULL OR decided_by <> proposed_by),
  CONSTRAINT support_path_rejection_says_why CHECK (state <> 'REJECTED' OR length(btrim(coalesce(decision_note, ''))) >= 5)
);
SELECT app.tenant_rls('app.support_path');
CREATE UNIQUE INDEX support_path_one_approved ON app.support_path (tenant_id, site_id, domain) WHERE state = 'APPROVED';

-- the people on a path are current contacts; its content never changes; states move only forward
CREATE OR REPLACE FUNCTION app.support_path_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'EM022 a support path is never deleted: retire it' USING ERRCODE = 'EM022'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM app.contact c WHERE c.id IN (NEW.primary_id, NEW.backup_id, NEW.escalation_id) AND c.retired_at IS NOT NULL) THEN
      RAISE EXCEPTION 'EM022 a support path names current contacts, not retired ones' USING ERRCODE = 'EM022'; END IF;
    NEW.state := 'PROPOSED'; NEW.decided_by := NULL; NEW.decided_at := NULL; NEW.decision_note := NULL; NEW.superseded_by := NULL; NEW.proposed_at := now();
    RETURN NEW;
  END IF;
  IF (NEW.code, NEW.site_id, NEW.domain, NEW.primary_id, NEW.backup_id, NEW.escalation_id, NEW.vendor_org_id, NEW.queue, NEW.hours, NEW.proposed_by, NEW.proposed_at)
     IS DISTINCT FROM (OLD.code, OLD.site_id, OLD.domain, OLD.primary_id, OLD.backup_id, OLD.escalation_id, OLD.vendor_org_id, OLD.queue, OLD.hours, OLD.proposed_by, OLD.proposed_at) THEN
    RAISE EXCEPTION 'EM022 a support path does not change: propose a new one, which supersedes it when approved' USING ERRCODE = 'EM022'; END IF;
  IF NOT ((OLD.state = 'PROPOSED' AND NEW.state IN ('APPROVED', 'REJECTED')) OR (OLD.state = 'APPROVED' AND NEW.state IN ('SUPERSEDED', 'RETIRED')) OR (OLD.state = NEW.state AND OLD.decided_by IS NOT DISTINCT FROM NEW.decided_by)) THEN
    RAISE EXCEPTION 'EM022 a support path goes from % to % only by its rules', OLD.state, NEW.state USING ERRCODE = 'EM022'; END IF;
  IF OLD.state <> 'PROPOSED' AND (NEW.decided_by, NEW.decided_at) IS DISTINCT FROM (OLD.decided_by, OLD.decided_at) THEN
    RAISE EXCEPTION 'EM022 the decision on a support path is taken once' USING ERRCODE = 'EM022'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER support_path_guard BEFORE INSERT OR UPDATE OR DELETE ON app.support_path FOR EACH ROW EXECUTE FUNCTION app.support_path_guard();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT ON app.organization TO empathia_app;
    GRANT SELECT, INSERT, UPDATE ON app.contact, app.support_path TO empathia_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_worker') THEN
    GRANT SELECT ON app.organization, app.contact, app.support_path TO empathia_worker;
  END IF;
END $$;
