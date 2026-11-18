-- 0043 · Documentation & Submission: the documentation matrix of a room and its two-signature sign-off.
-- 50/10 master directive §3.1 (V3.9: "Required documentation must be present"; "introduce Documentation & Submission as an explicit
-- mandatory gate between functional verification and final handoff, with its own visibility, approval status and auditable
-- submissions") and §9 ("Build a formal documentation completeness matrix", "evidence-linked signoff"). Source reconciliation item 3:
-- the workbooks' documentation tracker and sign-off packet with a vendor date and an internal date (structure only).
--
--   * app.room_document            one row per submitted version of one named document of a room, resting on a stored evidence file.
--                                  Submitted while the room is installed or being commissioned; reviewed once (APPROVED or REJECTED)
--                                  by someone other than its submitter; content never changes, never deleted. A new version may be
--                                  submitted once the last one is decided; the latest version is the document's state.
--   * app.documentation_signature  the integrator's (VENDOR) and the owner's (INTERNAL) signature over the packet as it stands: the
--                                  database computes the packet's hash from the latest version of every document (all decided, all
--                                  approved) and writes it on the signature; a later approval, rejection or new version changes the
--                                  hash, and the signature no longer covers the packet. The two sides of one packet are signed by
--                                  two different people. Append-only.
--
-- Which documents a room requires follows from what it contains (@empathia/commissioning-engine documentation.ts); the acceptance gate
-- (domain/rooms.ts → lifecycleBlockers) refuses ACCEPTED until every required document is approved and both sides have signed the
-- current packet.

CREATE TABLE app.room_document (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES app.tenant(id),
  room_id        uuid NOT NULL,
  kind           text NOT NULL CHECK (kind IN ('as_built_drawings', 'rack_elevation', 'ip_schema', 'dsp_file', 'control_code', 'firmware_list', 'photo_set',
                   'photo_rack', 'photo_front_of_room', 'photo_ceiling', 'screenshot_dsp', 'screenshot_camera', 'screenshot_uc', 'commissioning_report')),
  version        integer NOT NULL CHECK (version >= 1),
  evidence_id    uuid NOT NULL,
  note           text CHECK (note IS NULL OR length(note) <= 1000),
  submitted_by   uuid NOT NULL REFERENCES app.person(id),
  submitted_role text NOT NULL,
  submitted_at   timestamptz NOT NULL DEFAULT now(),
  state          text NOT NULL DEFAULT 'SUBMITTED' CHECK (state IN ('SUBMITTED', 'APPROVED', 'REJECTED')),
  reviewed_by    uuid REFERENCES app.person(id),
  reviewed_at    timestamptz,
  review_note    text CHECK (review_note IS NULL OR length(review_note) <= 1000),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, room_id, kind, version),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  FOREIGN KEY (tenant_id, evidence_id) REFERENCES app.evidence_object(tenant_id, id),
  CONSTRAINT room_document_reviewed CHECK ((state = 'SUBMITTED') = (reviewed_by IS NULL) AND (reviewed_by IS NULL) = (reviewed_at IS NULL)),
  CONSTRAINT room_document_not_self_reviewed CHECK (reviewed_by IS NULL OR reviewed_by <> submitted_by),
  CONSTRAINT room_document_rejection_says_why CHECK (state <> 'REJECTED' OR length(btrim(coalesce(review_note, ''))) >= 5)
);
SELECT app.tenant_rls('app.room_document');

CREATE OR REPLACE FUNCTION app.room_document_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE l text; last record;
BEGIN
  SELECT lifecycle INTO l FROM app.room WHERE id = NEW.room_id AND tenant_id = NEW.tenant_id;
  IF l NOT IN ('INSTALLED_UNVERIFIED', 'COMMISSIONING') THEN
    RAISE EXCEPTION 'EM021 documents are submitted for an installed room until it is accepted (this one is %)', l USING ERRCODE = 'EM021'; END IF;
  SELECT version, state INTO last FROM app.room_document WHERE tenant_id = NEW.tenant_id AND room_id = NEW.room_id AND kind = NEW.kind ORDER BY version DESC LIMIT 1;
  IF FOUND AND last.state = 'SUBMITTED' THEN RAISE EXCEPTION 'EM021 version % of this document is still awaiting review', last.version USING ERRCODE = 'EM021'; END IF;
  IF NEW.version <> coalesce(last.version, 0) + 1 THEN RAISE EXCEPTION 'EM021 version % does not follow %', NEW.version, coalesce(last.version, 0) USING ERRCODE = '23505'; END IF;
  NEW.state := 'SUBMITTED'; NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.review_note := NULL; NEW.submitted_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER room_document_insert BEFORE INSERT ON app.room_document FOR EACH ROW EXECUTE FUNCTION app.room_document_insert();

CREATE OR REPLACE FUNCTION app.room_document_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'EM021 a submitted document is never deleted' USING ERRCODE = 'EM021'; END IF;
  IF (NEW.room_id, NEW.kind, NEW.version, NEW.evidence_id, NEW.note, NEW.submitted_by, NEW.submitted_role, NEW.submitted_at)
     IS DISTINCT FROM (OLD.room_id, OLD.kind, OLD.version, OLD.evidence_id, OLD.note, OLD.submitted_by, OLD.submitted_role, OLD.submitted_at) THEN
    RAISE EXCEPTION 'EM021 a submitted document is immutable; submit a new version' USING ERRCODE = 'EM021'; END IF;
  IF OLD.state <> 'SUBMITTED' THEN RAISE EXCEPTION 'EM021 this version was reviewed already (%)', OLD.state USING ERRCODE = 'EM021'; END IF;
  IF NEW.state = 'SUBMITTED' THEN RAISE EXCEPTION 'EM021 a review is APPROVED or REJECTED' USING ERRCODE = 'EM021'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER room_document_guard BEFORE UPDATE OR DELETE ON app.room_document FOR EACH ROW EXECUTE FUNCTION app.room_document_guard();

-- The packet as it stands: the latest version of every document of the room. NULL while any is undecided or rejected, or none exists.
CREATE OR REPLACE FUNCTION app.documentation_packet(p_room uuid) RETURNS text LANGUAGE sql STABLE AS $$
  WITH latest AS (SELECT DISTINCT ON (kind) kind, version, evidence_id, state FROM app.room_document WHERE room_id = p_room ORDER BY kind, version DESC)
  SELECT CASE WHEN count(*) = 0 OR bool_or(state <> 'APPROVED') THEN NULL
              ELSE encode(sha256(convert_to(string_agg(kind || ':' || version || ':' || evidence_id, '|' ORDER BY kind), 'UTF8')), 'hex') END
    FROM latest
$$;

CREATE TABLE app.documentation_signature (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES app.tenant(id),
  room_id        uuid NOT NULL,
  side           text NOT NULL CHECK (side IN ('VENDOR', 'INTERNAL')),
  packet_sha256  text NOT NULL CHECK (packet_sha256 ~ '^[0-9a-f]{64}$'),
  documents      jsonb NOT NULL,
  signed_by      uuid NOT NULL REFERENCES app.person(id),
  signed_role    text NOT NULL,
  signed_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, room_id, side, packet_sha256),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id)
);
SELECT app.tenant_rls('app.documentation_signature');
CREATE TRIGGER documentation_signature_append_only BEFORE UPDATE OR DELETE ON app.documentation_signature FOR EACH ROW EXECUTE FUNCTION app.refuse_change();

CREATE OR REPLACE FUNCTION app.documentation_signature_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE h text; l text;
BEGIN
  SELECT lifecycle INTO l FROM app.room WHERE id = NEW.room_id AND tenant_id = NEW.tenant_id;
  IF l NOT IN ('INSTALLED_UNVERIFIED', 'COMMISSIONING') THEN RAISE EXCEPTION 'EM021 the packet is signed before the room is accepted (this one is %)', l USING ERRCODE = 'EM021'; END IF;
  h := app.documentation_packet(NEW.room_id);
  IF h IS NULL THEN RAISE EXCEPTION 'EM021 the packet is signed once every document is reviewed and approved' USING ERRCODE = 'EM021'; END IF;
  NEW.packet_sha256 := h; NEW.signed_at := now();
  NEW.documents := (SELECT jsonb_agg(jsonb_build_object('kind', kind, 'version', version, 'evidenceId', evidence_id) ORDER BY kind)
                      FROM (SELECT DISTINCT ON (kind) kind, version, evidence_id FROM app.room_document WHERE room_id = NEW.room_id ORDER BY kind, version DESC) d);
  IF EXISTS (SELECT 1 FROM app.documentation_signature s WHERE s.room_id = NEW.room_id AND s.packet_sha256 = h AND s.side <> NEW.side AND s.signed_by = NEW.signed_by) THEN
    RAISE EXCEPTION 'EM021 the two signatures of a packet are by two different people' USING ERRCODE = 'EM021'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER documentation_signature_insert BEFORE INSERT ON app.documentation_signature FOR EACH ROW EXECUTE FUNCTION app.documentation_signature_insert();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT, UPDATE ON app.room_document TO empathia_app;
    GRANT SELECT, INSERT ON app.documentation_signature TO empathia_app;
    GRANT EXECUTE ON FUNCTION app.documentation_packet(uuid) TO empathia_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_worker') THEN
    GRANT SELECT ON app.room_document, app.documentation_signature TO empathia_worker;
  END IF;
END $$;
