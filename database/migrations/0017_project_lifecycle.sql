-- 0017 · Governed project lifecycle (ADR-0008, P5): intake → review → brief → approval → collaborative design → execution/handoff →
-- operational transition. The two state machines are the demonstrator's (project_governance, design_and_commissioning); the engine
-- that guards them is @empathia/project-governance. Every record is append-only where the demonstrator said "history immutable":
-- briefs, decisions, funding, design revisions and RFIs are rows that are never updated in place except to close them.

-- A request (intake). The nine types are the demonstrator's intake work types ∪ its project kinds (see the engine's REQUEST_TYPES).
CREATE TABLE app.project_request (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES app.tenant(id),
  code             text NOT NULL,
  type             text NOT NULL CHECK (type IN ('new_room','room_refresh','camera_replacement','dsp_upgrade','network_change','lifecycle_replacement','signage','break_fix','room_verification')),
  title            text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  intent           text NOT NULL DEFAULT '',
  constraints      text NOT NULL DEFAULT '',
  site_id          uuid REFERENCES app.site(id),
  building_id      uuid REFERENCES app.building(id),
  room_id          uuid REFERENCES app.room(id),
  provisional_room text,
  archetype        text,
  capacity         int CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 5000),
  photo_policy     text NOT NULL DEFAULT 'DOCUMENTATION_REQUIRED' CHECK (photo_policy IN ('DOCUMENTATION_REQUIRED','LOCATION_VERIFICATION_REQUIRED','NOT_REQUIRED')),
  photos           jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [{name, takenAt, by}] — references, never the images themselves
  plans            jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [{name, kind, supported}]
  dimensions       jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [{name, value, unit, source, uncertainty}] with provenance, never guessed
  programme        boolean NOT NULL DEFAULT false,         -- a change applied across many rooms, one room at a time
  state            text NOT NULL DEFAULT 'DRAFT' CHECK (state IN ('DRAFT','SUBMITTED','WITHDRAWN')),
  requester_id     uuid NOT NULL REFERENCES app.person(id),
  vendor_id        uuid REFERENCES app.person(id),          -- the supplier contact the request is routed to (a person with vendor.acknowledge)
  internal_only    boolean NOT NULL DEFAULT false,
  submitted_at     timestamptz,
  withdrawn_at     timestamptz,
  withdrawn_reason text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code)
);
SELECT app.tenant_rls('app.project_request');

-- The project grows the governance and delivery states, the scope revision and the people in its approval chain.
ALTER TABLE app.project
  ADD COLUMN request_id        uuid,
  ADD COLUMN type              text,
  ADD COLUMN governance        text NOT NULL DEFAULT 'DRAFT' CHECK (governance IN ('DRAFT','SUBMITTED','VENDOR_ACKNOWLEDGED','INTERNAL_ROUTE_RECORDED','PITCH_READY','DECISION_PENDING','APPROVED','HELD','REJECTED','FUNDED','SUSPENDED')),
  ADD COLUMN delivery          text CHECK (delivery IS NULL OR delivery IN ('ENGINEERING_REVIEW','DESIGN_DRAFT','DESIGN_REVIEW','DESIGN_RELEASED','PLAN_COMPILED','FIELD_AUTHORIZED','FIELD_ACTIVE','TESTS_VERIFIED','DOCUMENTS_APPROVED','CUSTOMER_ACCEPTED','HANDED_OFF','BASELINED')),
  ADD COLUMN scope_rev         int NOT NULL DEFAULT 1 CHECK (scope_rev >= 1),
  ADD COLUMN vendor_id         uuid REFERENCES app.person(id),
  ADD COLUMN internal_only     boolean NOT NULL DEFAULT false,
  ADD COLUMN exception_reason  text,
  ADD COLUMN approver_id       uuid REFERENCES app.person(id),
  ADD COLUMN support_owner_id  uuid REFERENCES app.person(id),
  ADD COLUMN qa_signoff_by     uuid REFERENCES app.person(id),
  ADD COLUMN rule_pack_version text,
  ADD COLUMN field_authorization jsonb,                      -- {technicianId, technicianQualified, siteAccess, by, at} recorded by the service manager
  ADD COLUMN updated_at        timestamptz NOT NULL DEFAULT now();
ALTER TABLE app.project ADD CONSTRAINT project_request_fk FOREIGN KEY (tenant_id, request_id) REFERENCES app.project_request (tenant_id, id);
ALTER TABLE app.project_request ADD COLUMN project_id uuid;
ALTER TABLE app.project_request ADD CONSTRAINT request_project_fk FOREIGN KEY (tenant_id, project_id) REFERENCES app.project (tenant_id, id);

-- The engineering brief (the demonstrator's PitchDeck): versioned, bound to a scope revision, authored by a named person.
CREATE TABLE app.project_brief (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES app.tenant(id),
  project_id   uuid NOT NULL,
  rev          int NOT NULL CHECK (rev >= 1),
  scope_rev    int NOT NULL CHECK (scope_rev >= 1),
  author_id    uuid NOT NULL REFERENCES app.person(id),
  content      jsonb NOT NULL,          -- {summary, requirements[], spatial{...provenance}, comparableRooms[], romUsd, assumptions[]}
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, project_id, rev),
  FOREIGN KEY (tenant_id, project_id) REFERENCES app.project (tenant_id, id)
);
SELECT app.tenant_rls('app.project_brief');

-- Decisions (approve / hold / reject), each naming the scope revision it decided and whether the decider acted by delegation.
CREATE TABLE app.project_decision (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenant(id),
  project_id    uuid NOT NULL,
  decision      text NOT NULL CHECK (decision IN ('APPROVED','HELD','REJECTED')),
  scope_rev     int NOT NULL,
  decided_by    uuid NOT NULL REFERENCES app.person(id),
  delegation_id uuid REFERENCES app.delegation(id),
  reason        text NOT NULL DEFAULT '',
  review_date   date,
  decided_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), FOREIGN KEY (tenant_id, project_id) REFERENCES app.project (tenant_id, id)
);
SELECT app.tenant_rls('app.project_decision');

-- Funding: a signed budget against the approved scope revision; withdrawal is a new row, never an edit.
CREATE TABLE app.project_funding (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenant(id),
  project_id    uuid NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('AUTHORIZED','WITHDRAWN')),
  amount        numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency      text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  cost_center   text NOT NULL,
  scope_rev     int NOT NULL,
  reason        text NOT NULL DEFAULT '',
  recorded_by   uuid NOT NULL REFERENCES app.person(id),
  recorded_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), FOREIGN KEY (tenant_id, project_id) REFERENCES app.project (tenant_id, id)
);
SELECT app.tenant_rls('app.project_funding');

-- Collaborative design: project-level design revisions (files, Lite model reference, DIVR, needed domain reviews) and the reviews on them.
CREATE TABLE app.project_design_revision (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES app.tenant(id),
  project_id      uuid NOT NULL,
  rev             int NOT NULL CHECK (rev >= 1),
  author_id       uuid NOT NULL REFERENCES app.person(id),
  reason          text NOT NULL CHECK (length(reason) >= 3),
  files           jsonb NOT NULL DEFAULT '[]'::jsonb,      -- [{name, kind, sha256?}] references to design artefacts
  lite_model_room uuid REFERENCES app.room(id),              -- the room whose approved design revision is this revision's model
  divr            jsonb,                                     -- Design Intent & Verification Record {intent, verificationPlan[], recordedBy}
  domains_needed  text[] NOT NULL DEFAULT '{}',              -- subset of {dsp, camera, touch}
  state           text NOT NULL DEFAULT 'DRAFT' CHECK (state IN ('DRAFT','IN_REVIEW','RELEASED','SUPERSEDED')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, project_id, rev),
  FOREIGN KEY (tenant_id, project_id) REFERENCES app.project (tenant_id, id)
);
SELECT app.tenant_rls('app.project_design_revision');

CREATE TABLE app.project_design_review (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenant(id),
  revision_id   uuid NOT NULL,
  domain        text NOT NULL CHECK (domain IN ('dsp','camera','touch')),
  decision      text NOT NULL CHECK (decision IN ('APPROVED','CHANGES_REQUESTED')),
  note          text NOT NULL DEFAULT '',
  reviewed_by   uuid NOT NULL REFERENCES app.person(id),
  reviewed_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), FOREIGN KEY (tenant_id, revision_id) REFERENCES app.project_design_revision (tenant_id, id)
);
SELECT app.tenant_rls('app.project_design_review');

CREATE TABLE app.project_rfi (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenant(id),
  project_id    uuid NOT NULL,
  revision_id   uuid NOT NULL,
  code          text NOT NULL,
  question      text NOT NULL CHECK (length(question) >= 5),
  raised_by     uuid NOT NULL REFERENCES app.person(id),
  raised_at     timestamptz NOT NULL DEFAULT now(),
  answer        text,
  resolved_by   uuid REFERENCES app.person(id),
  resolved_at   timestamptz,
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id, project_id) REFERENCES app.project (tenant_id, id),
  FOREIGN KEY (tenant_id, revision_id) REFERENCES app.project_design_revision (tenant_id, id)
);
SELECT app.tenant_rls('app.project_rfi');

CREATE INDEX project_request_state_idx ON app.project_request (tenant_id, state);
CREATE INDEX project_governance_idx ON app.project (tenant_id, governance);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT, UPDATE ON app.project_request, app.project_brief, app.project_decision, app.project_funding, app.project_design_revision, app.project_design_review, app.project_rfi TO empathia_app;
  END IF;
END $$;
