-- 0021 Field Intelligence (P7): Physical Validation licences per site × archetype (a licence opens requests, never proofs) and the
-- v1.4 sessions — the engine's record is the row; every step is audited. The v1.3 plan is computed from the room's planned assets.
CREATE TABLE app.fi_licence (
  tenant_id   uuid NOT NULL REFERENCES app.tenant(id),
  site_id     uuid NOT NULL,
  archetype   text NOT NULL CHECK (archetype ~ '^[A-Z]{3}$'),
  granted     boolean NOT NULL DEFAULT false,
  granted_by  uuid NOT NULL REFERENCES app.person(id),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  note        text,
  PRIMARY KEY (tenant_id, site_id, archetype),
  FOREIGN KEY (tenant_id, site_id) REFERENCES app.site(tenant_id, id)
);
SELECT app.tenant_rls('app.fi_licence');

CREATE TABLE app.fi_session (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  room_id     uuid NOT NULL,
  code        text NOT NULL CHECK (code ~ '^FIS-[0-9]{4,10}$'),
  state       text NOT NULL,
  terminal    boolean NOT NULL DEFAULT false,
  session     jsonb NOT NULL,
  created_by  uuid NOT NULL REFERENCES app.person(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id)
);
CREATE INDEX fi_session_room_idx ON app.fi_session (tenant_id, room_id, created_at DESC);
SELECT app.tenant_rls('app.fi_session');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN GRANT SELECT, INSERT, UPDATE ON app.fi_licence, app.fi_session TO empathia_app; END IF;
END $$;
