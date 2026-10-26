-- 0002 · Core: tenants, people, roles and memberships; sites and buildings; planned rooms with immutable revisions; planned assets with
-- tenant-unique canonical ids; proposed connections; a typed relationship graph. Every foreign key is composite (tenant_id, id), so a
-- row can never point at another tenant's row, and every table is under row-level security.

CREATE TABLE app.tenant (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name        text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  synthetic   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN app.tenant.synthetic IS 'true for demonstration tenants: every record in them is synthetic.';
-- a tenant sees only itself. RLS is ENABLED (applies to the runtime role) but not FORCED on the three identity tables, so the
-- SECURITY DEFINER sign-in functions at the end of this file (owned by the schema owner) can resolve an email and its memberships
-- before any tenant is chosen. Every other table FORCES RLS.
ALTER TABLE app.tenant ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_self ON app.tenant USING (id = app.current_tenant());

-- People are global identities (one person may belong to several tenants); credentials are for the development provider only.
CREATE TABLE app.person (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL UNIQUE CHECK (email ~ '^[^@\s]+@[^@\s]+$'),
  display_name   text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
  password_hash  text,               -- scrypt; null for people who sign in through an external identity provider
  external_subject text UNIQUE,      -- the OIDC subject, when an external provider is configured
  disabled       boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN app.person.password_hash IS 'Development identity provider only (AUTH_MODE=dev). Production uses OIDC and leaves this null.';
-- people are read through their memberships; the runtime role may read the person row of members of the current tenant
ALTER TABLE app.person ENABLE ROW LEVEL SECURITY;

-- Roles carry authorities (the demonstrator's persona policy, seeded from packages/domain-data/data/V25_PERSONAS.json).
CREATE TABLE app.role (
  key          text PRIMARY KEY CHECK (key ~ '^[a-z_]{2,40}$'),
  label        text NOT NULL,
  authorities  text[] NOT NULL,
  description  text NOT NULL DEFAULT ''
);
COMMENT ON TABLE app.role IS 'Global role catalogue. "*" (every authority) exists for the demonstration architect only and is never granted by the seed to a production tenant.';

CREATE TABLE app.membership (
  tenant_id   uuid NOT NULL REFERENCES app.tenant(id),
  person_id   uuid NOT NULL REFERENCES app.person(id),
  role_key    text NOT NULL REFERENCES app.role(key),
  site_scope  uuid[],                -- null = every site of the tenant
  created_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz,
  PRIMARY KEY (tenant_id, person_id, role_key)
);
ALTER TABLE app.membership ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.membership USING (tenant_id = app.current_tenant()) WITH CHECK (tenant_id = app.current_tenant());
CREATE POLICY person_member ON app.person USING (EXISTS (SELECT 1 FROM app.membership m WHERE m.person_id = person.id AND m.tenant_id = app.current_tenant()));

CREATE TABLE app.site (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES app.tenant(id),
  code       text NOT NULL CHECK (code ~ '^[A-Z0-9-]{2,24}$'),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code)
);
SELECT app.tenant_rls('app.site');

CREATE TABLE app.building (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL,
  site_id    uuid NOT NULL,
  code       text NOT NULL CHECK (code ~ '^[A-Z0-9-]{2,24}$'),
  name       text NOT NULL,
  floors     integer NOT NULL DEFAULT 1 CHECK (floors BETWEEN 1 AND 200),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id, site_id) REFERENCES app.site(tenant_id, id)
);
SELECT app.tenant_rls('app.building');

-- A room: the canonical record. `code` is the canonical room id people and other products use (R-PLN-0001 for planned rooms).
CREATE TABLE app.room (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL,
  building_id        uuid NOT NULL,
  code               text NOT NULL CHECK (code ~ '^R-[A-Z0-9-]{3,32}$'),
  name               text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  floor              integer NOT NULL DEFAULT 1,
  template           text NOT NULL,
  intended_use       text NOT NULL DEFAULT '',
  occupancy          integer NOT NULL CHECK (occupancy BETWEEN 1 AND 5000),
  unit               text NOT NULL DEFAULT 'm' CHECK (unit IN ('m', 'ft')),
  geometry           jsonb NOT NULL,
  lifecycle          text NOT NULL DEFAULT 'PLANNED' CHECK (lifecycle IN ('PLANNED','DESIGN_APPROVED','INSTALLATION_PENDING','INSTALLED_UNVERIFIED','COMMISSIONING','ACCEPTED','OPERATIONAL')),
  classification     jsonb,          -- the latest suggestion of the server-side classifier
  approved_class     jsonb,          -- an engineer's approval or override (with reason, who, when)
  rev                integer NOT NULL DEFAULT 1 CHECK (rev >= 1),   -- optimistic-concurrency version of the record
  approved_revision  integer,
  baseline           jsonb,          -- the signed accepted baseline (set only on ACCEPTED)
  created_by         uuid NOT NULL REFERENCES app.person(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id, building_id) REFERENCES app.building(tenant_id, id),
  CHECK (jsonb_typeof(geometry -> 'points') = 'array')
);
CREATE INDEX room_lifecycle_idx ON app.room (tenant_id, lifecycle);
CREATE TRIGGER room_touch BEFORE UPDATE ON app.room FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
SELECT app.tenant_rls('app.room');

-- Revisions are immutable snapshots of the whole design (geometry, devices, connections, classification) with a content hash.
CREATE TABLE app.room_revision (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  room_id     uuid NOT NULL,
  rev_no      integer NOT NULL CHECK (rev_no >= 1),
  reason      text NOT NULL CHECK (length(reason) <= 200),
  snapshot    jsonb NOT NULL,
  sha256      text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  created_by  uuid NOT NULL REFERENCES app.person(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (room_id, rev_no),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id)
);
CREATE TRIGGER room_revision_immutable BEFORE UPDATE OR DELETE ON app.room_revision FOR EACH ROW EXECUTE FUNCTION app.refuse_change();
SELECT app.tenant_rls('app.room_revision');

-- Planned assets: the canonical device identity (PA-0001). The id survives substitution; the model history is kept.
CREATE TABLE app.planned_asset (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  room_id       uuid NOT NULL,
  code          text NOT NULL CHECK (code ~ '^PA-[0-9]{4,10}$'),
  category      text NOT NULL,
  label         text NOT NULL,
  role          text NOT NULL,
  model         text NOT NULL DEFAULT 'generic',
  generic       boolean NOT NULL DEFAULT true,
  furniture     boolean NOT NULL DEFAULT false,
  x numeric(9,2) NOT NULL, y numeric(9,2) NOT NULL, z numeric(6,2) NOT NULL DEFAULT 0, rot numeric(6,1) NOT NULL DEFAULT 0,
  mount         text NOT NULL,
  props         jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  lifecycle     text NOT NULL DEFAULT 'PLANNED',
  removed_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id)
);
CREATE INDEX planned_asset_room_idx ON app.planned_asset (tenant_id, room_id) WHERE removed_at IS NULL;
SELECT app.tenant_rls('app.planned_asset');

CREATE TABLE app.connection (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  room_id     uuid NOT NULL,
  code        text NOT NULL,
  from_asset  uuid NOT NULL,
  to_asset    uuid NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('signal', 'network', 'control', 'power')),
  why         text NOT NULL DEFAULT '',
  removed_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  FOREIGN KEY (tenant_id, from_asset) REFERENCES app.planned_asset(tenant_id, id),
  FOREIGN KEY (tenant_id, to_asset) REFERENCES app.planned_asset(tenant_id, id),
  CHECK (from_asset <> to_asset)
);
CREATE UNIQUE INDEX connection_live_unique ON app.connection (tenant_id, from_asset, to_asset, kind) WHERE removed_at IS NULL;
SELECT app.tenant_rls('app.connection');

-- The typed relationship graph (Search Party). Edges are facts with provenance; traversal is in packages/relationship-engine.
CREATE TABLE app.relationship (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES app.tenant(id),
  from_type   text NOT NULL, from_id text NOT NULL,
  rel         text NOT NULL CHECK (rel ~ '^[A-Z_]{2,40}$'),
  to_type     text NOT NULL, to_id text NOT NULL,
  provenance  text NOT NULL DEFAULT 'DECLARED',
  created_at  timestamptz NOT NULL DEFAULT now(),
  removed_at  timestamptz,
  UNIQUE (tenant_id, id)
);
CREATE UNIQUE INDEX relationship_live_unique ON app.relationship (tenant_id, from_type, from_id, rel, to_type, to_id) WHERE removed_at IS NULL;
CREATE INDEX relationship_to_idx ON app.relationship (tenant_id, to_type, to_id) WHERE removed_at IS NULL;
SELECT app.tenant_rls('app.relationship');

-- Projects (minimal: the commercial wrapper a room design belongs to)
CREATE TABLE app.project (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES app.tenant(id),
  code       text NOT NULL,
  name       text NOT NULL,
  state      text NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN', 'CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code)
);
SELECT app.tenant_rls('app.project');

-- per-tenant counters for human-readable canonical codes (R-PLN-0001, PA-0001, CN-0001 ...)
CREATE TABLE app.code_counter (
  tenant_id  uuid NOT NULL REFERENCES app.tenant(id),
  kind       text NOT NULL,
  value      bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, kind)
);
SELECT app.tenant_rls('app.code_counter');
CREATE OR REPLACE FUNCTION app.next_code(k text, prefix text, width int DEFAULT 4) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v bigint;
BEGIN
  INSERT INTO app.code_counter (tenant_id, kind, value) VALUES (app.current_tenant(), k, 1)
    ON CONFLICT (tenant_id, kind) DO UPDATE SET value = app.code_counter.value + 1 RETURNING value INTO v;
  RETURN prefix || lpad(v::text, width, '0');
END $$;

-- ------------------------------------------------------------------------------------------- sign-in (before a tenant is chosen)
CREATE OR REPLACE FUNCTION app.auth_person_by_email(p_email text)
  RETURNS TABLE (id uuid, display_name text, password_hash text, disabled boolean)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp AS
$$ SELECT id, display_name, password_hash, disabled FROM app.person WHERE lower(email) = lower(p_email) $$;

CREATE OR REPLACE FUNCTION app.auth_memberships(p_person uuid)
  RETURNS TABLE (tenant_id uuid, tenant_slug text, tenant_name text, role_key text, authorities text[], site_scope uuid[])
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp AS
$$ SELECT t.id, t.slug, t.name, m.role_key, r.authorities, m.site_scope
     FROM app.membership m JOIN app.tenant t ON t.id = m.tenant_id JOIN app.role r ON r.key = m.role_key
    WHERE m.person_id = p_person AND m.revoked_at IS NULL $$;

CREATE OR REPLACE FUNCTION app.auth_person(p_person uuid)
  RETURNS TABLE (display_name text, disabled boolean)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp AS
$$ SELECT display_name, disabled FROM app.person WHERE id = p_person $$;
