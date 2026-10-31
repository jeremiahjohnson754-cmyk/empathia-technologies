-- 0018 · Owner decisions of 2026-10-30 20:48 CT on ADR-0008.
-- 1. The request catalogue is extensible and configurable: platform defaults (tenant_id NULL — the nine provisionally approved types) plus
--    tenant rows that add industry- or customer-specific types or disable a default. The effective catalogue is defaults ∪ tenant rows,
--    a tenant row with a default's key overriding it.
-- 2. Concept authorization is separate from execution authorization: an approved brief authorizes preliminary design, feasibility studies,
--    concept layouts and preliminary budgets before funding; release for construction and every field step still need FUNDED.

CREATE TABLE app.request_type (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid REFERENCES app.tenant(id),             -- NULL = platform default
  key         text NOT NULL CHECK (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  label       text NOT NULL CHECK (length(label) BETWEEN 1 AND 80),
  summary     text NOT NULL DEFAULT '',
  industry    text NOT NULL DEFAULT 'general',             -- e.g. general, healthcare, education, broadcast, industrial
  source      text NOT NULL DEFAULT 'tenant configuration',
  enabled     boolean NOT NULL DEFAULT true,
  sort        int NOT NULL DEFAULT 100,
  created_by  uuid REFERENCES app.person(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX request_type_default_key ON app.request_type (key) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX request_type_tenant_key ON app.request_type (tenant_id, key) WHERE tenant_id IS NOT NULL;
INSERT INTO app.request_type (tenant_id, key, label, summary, industry, source, sort) VALUES
  (NULL, 'new_room', 'New room', 'A new room the business has asked for, with the capacity and purpose agreed with the sponsor.', 'general', 'v25 intake: new_room / new_install; Pro kind "Room build"', 10),
  (NULL, 'room_refresh', 'Room refresh', 'A room that no longer meets its purpose or its standard, brought back to it.', 'general', 'Pro kind "Room refresh"', 20),
  (NULL, 'camera_replacement', 'Camera replacement', 'A camera, its mount and its automation replaced in an existing room.', 'general', 'v25 intake work type', 30),
  (NULL, 'dsp_upgrade', 'DSP / audio upgrade', 'Audio processing, microphones or loudspeakers upgraded in an existing room.', 'general', 'v25 intake work type', 40),
  (NULL, 'network_change', 'Network change', 'Room devices moved to managed segments so they can be supported and secured.', 'general', 'v25 intake work type; Pro kind "Network"', 50),
  (NULL, 'lifecycle_replacement', 'Lifecycle replacement', 'Devices reaching the end of support replaced before they fail.', 'general', 'Pro kind "Lifecycle"', 60),
  (NULL, 'signage', 'Signage', 'Displays, players and publishing so visitors and staff find their way and see priority messages.', 'general', 'Pro kind "Signage"', 70),
  (NULL, 'break_fix', 'Break / fix', 'A fault in an existing room, corrected and retested.', 'general', 'v25 intake work type; V25_WORK_NEEDS.break_fix', 80),
  (NULL, 'room_verification', 'Room verification', 'A room re-verified against its baseline without a design change.', 'general', 'V25_WORK_NEEDS.room_verification', 90);

-- platform defaults are written by the migration (owner) before RLS is forced; from here on, tenant rows only
-- RLS: everyone reads the defaults and their own tenant's rows; writes are tenant rows only (a default is never edited by a tenant)
ALTER TABLE app.request_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.request_type FORCE ROW LEVEL SECURITY;
CREATE POLICY request_type_read ON app.request_type FOR SELECT USING (tenant_id IS NULL OR tenant_id = app.current_tenant());
CREATE POLICY request_type_write ON app.request_type FOR INSERT WITH CHECK (tenant_id = app.current_tenant());
CREATE POLICY request_type_update ON app.request_type FOR UPDATE USING (tenant_id = app.current_tenant()) WITH CHECK (tenant_id = app.current_tenant());

-- the request's type is validated against the effective catalogue by the service, not by a fixed enum
ALTER TABLE app.project_request DROP CONSTRAINT project_request_type_check;
ALTER TABLE app.project_request ADD CONSTRAINT project_request_type_format CHECK (type ~ '^[a-z][a-z0-9_]{1,39}$');

-- concept authorization (separate from funding = execution authorization)
ALTER TABLE app.project
  ADD COLUMN concept_authorized_by uuid REFERENCES app.person(id),
  ADD COLUMN concept_authorized_at timestamptz,
  ADD COLUMN concept_scope_rev     int;
-- a design revision is CONCEPT work (feasibility, concept layout, preliminary estimate) or a DETAILED design (release for construction)
ALTER TABLE app.project_design_revision
  ADD COLUMN phase        text NOT NULL DEFAULT 'DETAILED' CHECK (phase IN ('CONCEPT', 'DETAILED')),
  ADD COLUMN estimate_usd numeric(14,2) CHECK (estimate_usd IS NULL OR estimate_usd >= 0),   -- a preliminary budget on a concept, labelled, never a quote
  ADD COLUMN feasibility  jsonb;                                                              -- {finding, risks[], options[]} for a feasibility study

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT, UPDATE ON app.request_type TO empathia_app;
  END IF;
END $$;
