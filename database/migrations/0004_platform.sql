-- 0004 · Platform: audit log, transactional outbox, idempotency keys, notifications, operational read model, integration registry,
-- knowledge documents and AI request log; then the runtime role's grants.

-- Append-only audit log: every state change and every refusal, with the actor, the correlation id and the before/after summary.
CREATE TABLE app.audit_event (
  id              bigserial PRIMARY KEY,
  tenant_id       uuid NOT NULL REFERENCES app.tenant(id),
  at              timestamptz NOT NULL DEFAULT now(),
  actor_id        uuid REFERENCES app.person(id),
  actor_role      text,
  action          text NOT NULL,
  outcome         text NOT NULL CHECK (outcome IN ('ALLOWED', 'DENIED', 'FAILED')),
  aggregate_type  text,
  aggregate_id    text,
  correlation_id  text NOT NULL,
  detail          jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX audit_aggregate_idx ON app.audit_event (tenant_id, aggregate_type, aggregate_id, at DESC);
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON app.audit_event FOR EACH ROW EXECUTE FUNCTION app.refuse_change();
SELECT app.tenant_rls('app.audit_event');

-- Transactional outbox: written in the same transaction as the change; delivered at least once by the worker.
CREATE TABLE app.outbox_event (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES app.tenant(id),
  type             text NOT NULL,
  schema_version   text NOT NULL,
  aggregate_type   text NOT NULL,
  aggregate_id     text NOT NULL,
  aggregate_rev    integer NOT NULL,
  payload          jsonb NOT NULL,
  actor_id         uuid,
  correlation_id   text NOT NULL,
  occurred_at      timestamptz NOT NULL DEFAULT now(),
  status           text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DELIVERED', 'DEAD_LETTER')),
  attempts         integer NOT NULL DEFAULT 0,
  next_attempt_at  timestamptz NOT NULL DEFAULT now(),
  last_error       text,
  delivered_at     timestamptz
);
CREATE INDEX outbox_pending_idx ON app.outbox_event (next_attempt_at) WHERE status = 'PENDING';
SELECT app.tenant_rls('app.outbox_event');
-- the worker reads across tenants: it runs with app.worker = on, which this extra policy honours (never set by request handlers)
CREATE POLICY outbox_worker ON app.outbox_event USING (current_setting('app.worker', true) = 'on') WITH CHECK (current_setting('app.worker', true) = 'on');

-- Idempotency keys: a retried POST with the same key returns the first response instead of doing the work twice.
CREATE TABLE app.idempotency_key (
  tenant_id     uuid NOT NULL REFERENCES app.tenant(id),
  person_id     uuid NOT NULL REFERENCES app.person(id),
  key           text NOT NULL CHECK (length(key) BETWEEN 8 AND 128),
  request_hash  text NOT NULL,
  status_code   integer NOT NULL,
  response      jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, person_id, key)
);
SELECT app.tenant_rls('app.idempotency_key');

CREATE TABLE app.notification (
  id          bigserial PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES app.tenant(id),
  to_role     text,
  to_person   uuid REFERENCES app.person(id),
  kind        text NOT NULL,
  title       text NOT NULL,
  link        text,
  event_id    uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  read_at     timestamptz,
  UNIQUE (event_id, kind, to_role)
);
SELECT app.tenant_rls('app.notification');
CREATE POLICY notification_worker ON app.notification USING (current_setting('app.worker', true) = 'on') WITH CHECK (current_setting('app.worker', true) = 'on');

-- The operational read model (Pro): one denormalized row per room, rebuilt by the outbox worker from the canonical tables.
CREATE TABLE app.room_read_model (
  tenant_id        uuid NOT NULL,
  room_id          uuid NOT NULL,
  room_code        text NOT NULL,
  name             text NOT NULL,
  lifecycle        text NOT NULL,
  lifecycle_label  text NOT NULL,
  archetype        text,
  devices          integer NOT NULL,
  open_issues      integer NOT NULL,
  open_high        integer NOT NULL,
  applicable_tests integer NOT NULL,
  results          jsonb NOT NULL,
  live_health      text NOT NULL DEFAULT 'NOT_MONITORED' CHECK (live_health IN ('NOT_MONITORED')),
  last_event_at    timestamptz NOT NULL,
  rebuilt_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, room_id),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id)
);
COMMENT ON COLUMN app.room_read_model.live_health IS 'Only NOT_MONITORED is allowed until a verified monitoring integration exists: no invented live health.';
SELECT app.tenant_rls('app.room_read_model');
CREATE POLICY read_model_worker ON app.room_read_model USING (current_setting('app.worker', true) = 'on') WITH CHECK (current_setting('app.worker', true) = 'on');

-- Integration registry: the catalogue with honest states. A row can be VERIFIED only with recorded evidence of a tested connection.
CREATE TABLE app.integration (
  key          text PRIMARY KEY,
  category     text NOT NULL,
  vendor       text NOT NULL,
  product      text NOT NULL,
  state        text NOT NULL CHECK (state IN ('MOCK', 'CONTRACT_ONLY', 'NOT_CONFIGURED', 'VERIFIED')),
  mode         text NOT NULL CHECK (mode IN ('READ_ONLY', 'READ_WRITE', 'NONE')),
  evidence     text,
  note         text NOT NULL DEFAULT '',
  CHECK (state <> 'VERIFIED' OR evidence IS NOT NULL)
);
COMMENT ON TABLE app.integration IS 'Catalogue only. No partnership, certification or connection is implied by a row.';

CREATE TABLE app.knowledge_document (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES app.tenant(id),
  title          text NOT NULL,
  source         text NOT NULL,
  version        integer NOT NULL DEFAULT 1,
  allowed_roles  text[] NOT NULL,
  body           text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id)
);
SELECT app.tenant_rls('app.knowledge_document');

-- Every AI request is logged with its outcome. No model is configured in the starter: requests are recorded as NOT_CONFIGURED.
CREATE TABLE app.ai_request (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES app.tenant(id),
  person_id   uuid NOT NULL REFERENCES app.person(id),
  purpose     text NOT NULL,
  prompt_sha256 text NOT NULL,
  outcome     text NOT NULL CHECK (outcome IN ('NOT_CONFIGURED', 'REFUSED', 'ANSWERED')),
  sources     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
SELECT app.tenant_rls('app.ai_request');

-- ------------------------------------------------------------------------------------------- the runtime role
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT USAGE ON SCHEMA app TO empathia_app;
    GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA app TO empathia_app;
    GRANT DELETE ON app.idempotency_key TO empathia_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO empathia_app;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO empathia_app;
    REVOKE INSERT, UPDATE ON app.role, app.integration, app.tenant, app.person FROM empathia_app;
    GRANT UPDATE (disabled) ON app.person TO empathia_app;
  END IF;
END $$;
