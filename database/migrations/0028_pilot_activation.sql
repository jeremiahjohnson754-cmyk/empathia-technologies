-- 0028 Pilot activation (handoff v1.8 §4, ADR-023; contract PILOT_ACTIVATION v1.8).
-- A pilot carries five SEPARATE states — readiness, payment, entitlement, connector authorization, deployment — because a verified
-- payment grants the software entitlement for the purchased SKU and scope and nothing else. The rules that must hold whatever code runs
-- are constraints here:
--   * no ACTIVE entitlement without a VERIFIED payment (pilot_entitlement_needs_payment);
--   * no discovery or source step without an APPROVED connector authorization (pilot_source_needs_consent);
--   * one entitlement per pilot, and one processing of a provider event (unique keys): a webhook delivered twice grants once;
--   * no more rooms or sites than the pilot's scope (app.pilot_room_guard), counted under a lock on the pilot;
--   * provider events and state transitions are append-only.
-- Nothing here stores a card, a bank detail or a provider secret: only the provider's own non-sensitive ids.
-- Rollback: database/rollbacks/0028_pilot_activation.down.sql (tested by tests/integration/pilot-activation.test.mjs). The operational
-- rollback of ADR-023 needs no schema change: PILOT_CHECKOUT=off refuses new checkouts while every record stays readable.

CREATE TABLE app.pilot (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES app.tenant(id),
  code                     text NOT NULL CHECK (code ~ '^PLT-[0-9]{4,10}$'),
  sku                      text NOT NULL CHECK (sku IN ('PILOT-DISCOVERY', 'PILOT-READONLY', 'PILOT-HARDWARE', 'PILOT-CAMPUS')),
  readiness_state          text NOT NULL CHECK (readiness_state IN ('READY_TO_PURCHASE', 'READY_AFTER_CUSTOMER_ACTION', 'REQUIRES_SALES_REVIEW', 'NOT_CURRENTLY_SUPPORTED')),
  payment_state            text NOT NULL DEFAULT 'NOT_STARTED' CHECK (payment_state IN ('NOT_STARTED', 'CHECKOUT_STARTED', 'PENDING', 'VERIFIED', 'FAILED', 'REFUNDED', 'DISPUTED')),
  entitlement_state        text NOT NULL DEFAULT 'NONE' CHECK (entitlement_state IN ('NONE', 'PROVISIONING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED')),
  connector_authorization  text NOT NULL DEFAULT 'NONE' CHECK (connector_authorization IN ('NONE', 'REQUESTED', 'APPROVED', 'DENIED', 'REVOKED')),
  deployment_state         text NOT NULL DEFAULT 'NOT_STARTED' CHECK (deployment_state IN ('NOT_STARTED', 'TENANT_READY', 'IDENTITY_APPROVED', 'DISCOVERY_IN_PROGRESS', 'FIRST_SOURCE_VERIFIED', 'ASSETS_RECONCILED', 'PILOT_ACTIVE', 'FIRST_REPORT_DELIVERED', 'REVIEW_READY', 'CONVERSION_APPROVED', 'PILOT_ENDED', 'BLOCKED')),
  resume_to                text,                                      -- where the deployment was when it was blocked
  room_limit               integer NOT NULL CHECK (room_limit >= 0),
  site_limit               integer NOT NULL CHECK (site_limit >= 0),
  connector_limit          integer NOT NULL CHECK (connector_limit >= 0),
  price_cents              integer NOT NULL CHECK (price_cents >= 0),  -- the list price at creation, from the server's catalogue (never from the client)
  currency                 text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  days                     integer NOT NULL CHECK (days > 0),
  connector_key            text REFERENCES app.integration(key),
  intake                   jsonb NOT NULL DEFAULT '{}'::jsonb,          -- the readiness answers: non-secret metadata only
  blocking_reasons         text[] NOT NULL DEFAULT '{}',
  first_verified_source_event_id text,
  activated_at             timestamptz,
  ends_at                  timestamptz,
  converted_at             timestamptz,
  converted_plan           text,
  created_by               uuid NOT NULL REFERENCES app.person(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code),
  CONSTRAINT pilot_entitlement_needs_payment CHECK (entitlement_state NOT IN ('PROVISIONING', 'ACTIVE') OR payment_state = 'VERIFIED'),
  CONSTRAINT pilot_source_needs_consent CHECK (deployment_state NOT IN ('DISCOVERY_IN_PROGRESS', 'FIRST_SOURCE_VERIFIED', 'ASSETS_RECONCILED') OR connector_authorization = 'APPROVED'),
  CONSTRAINT pilot_consent_names_connector CHECK (connector_authorization = 'NONE' OR connector_key IS NOT NULL),
  CONSTRAINT pilot_verified_source_recorded CHECK (deployment_state <> 'FIRST_SOURCE_VERIFIED' OR first_verified_source_event_id IS NOT NULL)
);
CREATE TRIGGER pilot_touch BEFORE UPDATE ON app.pilot FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
SELECT app.tenant_rls('app.pilot');
COMMENT ON TABLE app.pilot IS 'A pilot and its five separate states (ADR-023). Payment grants the software entitlement only; connector authorization is a separate act of the customer.';

-- A hosted checkout session at the payment provider. Only the provider''s session id and the amount the SERVER set are kept.
CREATE TABLE app.pilot_checkout (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  pilot_id      uuid NOT NULL,
  provider      text NOT NULL CHECK (provider ~ '^[a-z][a-z0-9_-]{1,30}$'),
  session_id    text NOT NULL CHECK (length(session_id) BETWEEN 8 AND 200),
  amount_cents  integer NOT NULL CHECK (amount_cents >= 0),
  currency      text NOT NULL CHECK (currency = 'USD'),
  status        text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'COMPLETED', 'FAILED', 'EXPIRED')),
  created_by    uuid NOT NULL REFERENCES app.person(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  closed_at     timestamptz,
  UNIQUE (provider, session_id),
  FOREIGN KEY (tenant_id, pilot_id) REFERENCES app.pilot(tenant_id, id)
);
CREATE UNIQUE INDEX pilot_checkout_one_open ON app.pilot_checkout (tenant_id, pilot_id) WHERE status = 'OPEN';
SELECT app.tenant_rls('app.pilot_checkout');

-- Every verified provider event, once (the unique key is the idempotency of webhook delivery). Append-only.
CREATE TABLE app.payment_event (
  id                   bigserial PRIMARY KEY,
  tenant_id            uuid NOT NULL REFERENCES app.tenant(id),
  provider             text NOT NULL,
  event_id             text NOT NULL CHECK (length(event_id) BETWEEN 4 AND 200),
  type                 text NOT NULL,
  pilot_id             uuid,
  session_id           text,
  amount_cents         integer,
  currency             text,
  provider_created_at  timestamptz NOT NULL,
  received_at          timestamptz NOT NULL DEFAULT now(),
  outcome              text NOT NULL CHECK (outcome IN ('APPLIED', 'STALE', 'REJECTED')),
  detail               jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id       text NOT NULL,
  UNIQUE (provider, event_id)
);
CREATE TRIGGER payment_event_append_only BEFORE UPDATE OR DELETE ON app.payment_event FOR EACH ROW EXECUTE FUNCTION app.refuse_change();
SELECT app.tenant_rls('app.payment_event');

-- The grant: one per pilot, for the SKU and scope that were paid for, naming the provider event that granted it.
CREATE TABLE app.pilot_entitlement (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  pilot_id         uuid NOT NULL,
  sku              text NOT NULL,
  state            text NOT NULL CHECK (state IN ('PROVISIONING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED')),
  room_limit       integer NOT NULL, site_limit integer NOT NULL, connector_limit integer NOT NULL,
  granted_event    text NOT NULL,
  granted_at       timestamptz NOT NULL DEFAULT now(),
  ends_at          timestamptz NOT NULL,
  state_reason     text,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, pilot_id),
  FOREIGN KEY (tenant_id, pilot_id) REFERENCES app.pilot(tenant_id, id)
);
CREATE TRIGGER pilot_entitlement_touch BEFORE UPDATE ON app.pilot_entitlement FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
SELECT app.tenant_rls('app.pilot_entitlement');

-- The customer's connector authorization: requested, then decided by the customer's administrator; read-only, always.
CREATE TABLE app.pilot_connector_consent (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  pilot_id       uuid NOT NULL,
  connector_key  text NOT NULL REFERENCES app.integration(key),
  mode           text NOT NULL DEFAULT 'READ_ONLY' CHECK (mode = 'READ_ONLY'),
  state          text NOT NULL DEFAULT 'REQUESTED' CHECK (state IN ('REQUESTED', 'APPROVED', 'DENIED', 'REVOKED')),
  requested_by   uuid NOT NULL REFERENCES app.person(id),
  requested_at   timestamptz NOT NULL DEFAULT now(),
  decided_by     uuid REFERENCES app.person(id),
  decided_at     timestamptz,
  consent_text   text,
  revoked_by     uuid REFERENCES app.person(id),
  revoked_at     timestamptz,
  revoke_reason  text,
  FOREIGN KEY (tenant_id, pilot_id) REFERENCES app.pilot(tenant_id, id),
  CHECK (state <> 'APPROVED' OR (decided_by IS NOT NULL AND consent_text IS NOT NULL))
);
CREATE UNIQUE INDEX pilot_consent_one_open ON app.pilot_connector_consent (tenant_id, pilot_id) WHERE state IN ('REQUESTED', 'APPROVED');
SELECT app.tenant_rls('app.pilot_connector_consent');

-- Rooms enrolled in a pilot. The guard counts under a lock on the pilot, so two concurrent enrolments cannot both take the last place.
CREATE TABLE app.pilot_room (
  tenant_id    uuid NOT NULL,
  pilot_id     uuid NOT NULL,
  room_id      uuid NOT NULL,
  site_id      uuid NOT NULL,
  enrolled_by  uuid NOT NULL REFERENCES app.person(id),
  enrolled_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, pilot_id, room_id),
  FOREIGN KEY (tenant_id, pilot_id) REFERENCES app.pilot(tenant_id, id),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  FOREIGN KEY (tenant_id, site_id) REFERENCES app.site(tenant_id, id)
);
SELECT app.tenant_rls('app.pilot_room');
CREATE OR REPLACE FUNCTION app.pilot_room_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p app.pilot; n int; s int;
BEGIN
  SELECT * INTO p FROM app.pilot WHERE tenant_id = NEW.tenant_id AND id = NEW.pilot_id FOR UPDATE;
  IF p.entitlement_state <> 'ACTIVE' THEN
    RAISE EXCEPTION 'pilot %: the software entitlement is %, not ACTIVE — no room is enrolled', p.code, p.entitlement_state USING ERRCODE = '23514', CONSTRAINT = 'pilot_room_needs_entitlement';
  END IF;
  SELECT count(*), count(DISTINCT site_id) FILTER (WHERE site_id <> NEW.site_id) INTO n, s FROM app.pilot_room WHERE tenant_id = NEW.tenant_id AND pilot_id = NEW.pilot_id;
  IF n + 1 > p.room_limit THEN
    RAISE EXCEPTION 'pilot %: its scope is % room(s); room % is refused', p.code, p.room_limit, n + 1 USING ERRCODE = '23514', CONSTRAINT = 'pilot_room_limit';
  END IF;
  IF s + 1 > p.site_limit THEN
    RAISE EXCEPTION 'pilot %: its scope is % site(s); a room at another site is refused', p.code, p.site_limit USING ERRCODE = '23514', CONSTRAINT = 'pilot_site_limit';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER pilot_room_guard BEFORE INSERT ON app.pilot_room FOR EACH ROW EXECUTE FUNCTION app.pilot_room_guard();

-- Every change of any of the five states, with who or what caused it. Append-only.
CREATE TABLE app.pilot_transition (
  id                 bigserial PRIMARY KEY,
  tenant_id          uuid NOT NULL,
  pilot_id           uuid NOT NULL,
  machine            text NOT NULL CHECK (machine IN ('readiness', 'payment', 'entitlement', 'connector', 'deployment')),
  from_state         text NOT NULL,
  to_state           text NOT NULL,
  reason             text NOT NULL,
  actor_id           uuid REFERENCES app.person(id),          -- null when the payment provider's verified event caused it
  actor              text NOT NULL,                           -- the role, or 'provider:<name>'
  provider_event_id  text,
  correlation_id     text NOT NULL,
  at                 timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, pilot_id) REFERENCES app.pilot(tenant_id, id)
);
CREATE INDEX pilot_transition_idx ON app.pilot_transition (tenant_id, pilot_id, id);
CREATE TRIGGER pilot_transition_append_only BEFORE UPDATE OR DELETE ON app.pilot_transition FOR EACH ROW EXECUTE FUNCTION app.refuse_change();
SELECT app.tenant_rls('app.pilot_transition');

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT, UPDATE ON app.pilot, app.pilot_checkout, app.pilot_entitlement, app.pilot_connector_consent TO empathia_app;
    GRANT SELECT, INSERT ON app.payment_event, app.pilot_room, app.pilot_transition TO empathia_app;
    GRANT USAGE, SELECT ON SEQUENCE app.payment_event_id_seq, app.pilot_transition_id_seq TO empathia_app;
  END IF;
END $$;
