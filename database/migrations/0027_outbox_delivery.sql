-- 0027 · Outbox delivery guarantees (worker/outbox.ts):
--   1. per-aggregate ordering: `seq` records the order in which events were appended (the tie-break for equal aggregate_rev), and the
--      worker delivers an aggregate's events strictly in (aggregate_rev, seq) order — a later event is held while an earlier one is
--      pending, retrying or dead-lettered;
--   2. per-(event, handler) delivery receipts (app.outbox_delivery): an internal handler's receipt commits with its effect; an external
--      sink's receipt is written after the sink accepted the event, outside any transaction that called it. The idempotency key
--      (outbox:<event id>:<handler>) is what an external consumer deduplicates on after a crash between its effect and the receipt;
--   3. a lease (lease_owner, lease_until) on an event whose internal effects are committed while its external sinks are in flight,
--      so no other worker redelivers it before the lease expires (a crashed worker's lease simply expires);
--   4. the worker's writes are confined to the tenant of the event being handled: the cross-tenant worker policies on notification and
--      room_read_model are dropped, so the standard tenant policy (tenant_id = app.current_tenant(), set by the worker per event) applies.
--      The outbox itself keeps its cross-tenant worker policy (the worker must claim every tenant's events; it can change status columns only);
--   5. the kind of the last failure: TRANSIENT (retrying at next_attempt_at), PERMANENT (attempts exhausted) or NON_RETRYABLE (the event
--      fails its contract — unknown type, payload, aggregate, schema version or tenant — and is dead-lettered without being handed to a handler);
--   6. replay traceability: replay_count and last_replay_audit_id (the Evidence Ledger record of the latest replay; every replay's record names
--      the event as its aggregate). A replay re-delivers the same row: id, type, aggregate, tenant, payload and correlation id never change —
--      the runtime role may update only the delivery-state columns of an event (column grants below), and the worker only its own.

ALTER TABLE app.outbox_event ADD COLUMN seq bigint, ADD COLUMN lease_owner text, ADD COLUMN lease_until timestamptz,
  ADD COLUMN failure_kind text CHECK (failure_kind IN ('TRANSIENT', 'PERMANENT', 'NON_RETRYABLE')),
  ADD COLUMN replay_count integer NOT NULL DEFAULT 0 CHECK (replay_count >= 0),
  ADD COLUMN last_replay_audit_id bigint REFERENCES app.audit_event (id);
CREATE SEQUENCE app.outbox_event_seq OWNED BY app.outbox_event.seq;

-- number the existing events in their historical order (RLS is forced on the owner too: one tenant at a time, under its own policy)
DO $$
DECLARE t uuid; base bigint := 0; n bigint;
BEGIN
  FOR t IN SELECT id FROM app.tenant ORDER BY id LOOP
    PERFORM set_config('app.tenant_id', t::text, true);
    UPDATE app.outbox_event e SET seq = base + s.rn
      FROM (SELECT id, row_number() OVER (ORDER BY occurred_at, aggregate_rev, id) AS rn FROM app.outbox_event WHERE tenant_id = t) s
     WHERE e.id = s.id;
    GET DIAGNOSTICS n = ROW_COUNT; base := base + n;
    -- every earlier dead letter exhausted its attempts; a pending event with an error is retrying
    UPDATE app.outbox_event SET failure_kind = CASE WHEN status = 'DEAD_LETTER' THEN 'PERMANENT' ELSE 'TRANSIENT' END
     WHERE tenant_id = t AND last_error IS NOT NULL AND status IN ('PENDING', 'DEAD_LETTER');
  END LOOP;
  PERFORM set_config('app.tenant_id', '', true);
  PERFORM setval('app.outbox_event_seq', base + 1, false);
END $$;
ALTER TABLE app.outbox_event ALTER COLUMN seq SET DEFAULT nextval('app.outbox_event_seq'), ALTER COLUMN seq SET NOT NULL;
ALTER TABLE app.outbox_event ADD CONSTRAINT outbox_event_seq_key UNIQUE (seq);
ALTER TABLE app.outbox_event ADD CONSTRAINT outbox_event_tenant_id_id_key UNIQUE (tenant_id, id);
ALTER TABLE app.outbox_event ADD CONSTRAINT outbox_event_lease_check CHECK ((lease_owner IS NULL) = (lease_until IS NULL));
-- the worker's head-of-line lookups: the events of each aggregate that are not yet delivered, in delivery order
CREATE INDEX outbox_open_aggregate_idx ON app.outbox_event (tenant_id, aggregate_type, aggregate_id, aggregate_rev, seq) WHERE status IN ('PENDING', 'DEAD_LETTER');

CREATE TABLE app.outbox_delivery (
  tenant_id        uuid NOT NULL,
  event_id         uuid NOT NULL,
  kind             text NOT NULL CHECK (kind IN ('INTERNAL', 'EXTERNAL')),
  handler          text NOT NULL CHECK (length(handler) BETWEEN 1 AND 80),
  idempotency_key  text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 200),
  worker           text,
  delivered_at     timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (event_id, kind, handler),
  FOREIGN KEY (tenant_id, event_id) REFERENCES app.outbox_event (tenant_id, id) ON DELETE CASCADE
);
COMMENT ON TABLE app.outbox_delivery IS 'One receipt per (event, handler) that has taken effect. The worker inserts; nobody updates. A replay re-runs only handlers without a receipt.';
SELECT app.tenant_rls('app.outbox_delivery');

-- worker writes confined to the event's tenant (see 4. above)
DROP POLICY IF EXISTS notification_worker ON app.notification;
DROP POLICY IF EXISTS read_model_worker ON app.room_read_model;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_worker') THEN
    GRANT UPDATE (lease_owner, lease_until, failure_kind) ON app.outbox_event TO empathia_worker;
    GRANT SELECT, INSERT ON app.outbox_delivery TO empathia_worker;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT USAGE, SELECT ON SEQUENCE app.outbox_event_seq TO empathia_app;
    GRANT SELECT ON app.outbox_delivery TO empathia_app;
    -- an event's identity is immutable: the runtime role appends events (ctx.emit) and, for a replay, changes delivery state only
    REVOKE UPDATE ON app.outbox_event FROM empathia_app;
    GRANT UPDATE (status, attempts, next_attempt_at, last_error, lease_owner, lease_until, failure_kind, replay_count, last_replay_audit_id) ON app.outbox_event TO empathia_app;
  END IF;
END $$;
