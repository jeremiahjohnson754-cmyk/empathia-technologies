-- 0027 · Outbox delivery guarantees (worker/outbox.ts):
--   1. per-aggregate ordering by COMMIT order, not by the producer's aggregate_rev (several producers hard-code their rev: a
--      commissioning failure is always Room rev 1, a work order's reassignment after a reopen is rev 2 again). `aggregate_seq` numbers each
--      aggregate's events 1, 2, 3 … in the order their transactions commit; it is assigned by the database (trigger below), never by the
--      producer, and the worker delivers an aggregate's events strictly in aggregate_seq order — a later event is held while an earlier one
--      is pending, retrying or dead-lettered. aggregate_rev stays as the domain's own revision, for consumers. `seq` is the global append
--      order (the order heads are served in);
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

ALTER TABLE app.outbox_event ADD COLUMN seq bigint, ADD COLUMN aggregate_seq bigint, ADD COLUMN lease_owner text, ADD COLUMN lease_until timestamptz,
  ADD COLUMN failure_kind text CHECK (failure_kind IN ('TRANSIENT', 'PERMANENT', 'NON_RETRYABLE')),
  ADD COLUMN replay_count integer NOT NULL DEFAULT 0 CHECK (replay_count >= 0),
  ADD COLUMN last_replay_audit_id bigint REFERENCES app.audit_event (id);
CREATE SEQUENCE app.outbox_event_seq OWNED BY app.outbox_event.seq;
COMMENT ON COLUMN app.outbox_event.aggregate_seq IS 'Position of the event in its aggregate, in commit order (1, 2, 3 …). Assigned at COMMIT by app.outbox_assign_aggregate_seq; NULL only inside the inserting transaction.';

-- the last sequence number given out per aggregate; its row is locked from the moment a committing transaction takes the next number until
-- that transaction ends, so a transaction that commits later on the same aggregate always gets a higher number
CREATE TABLE app.outbox_aggregate_head (
  tenant_id       uuid NOT NULL REFERENCES app.tenant (id),
  aggregate_type  text NOT NULL,
  aggregate_id    text NOT NULL,
  last_seq        bigint NOT NULL CHECK (last_seq > 0),
  PRIMARY KEY (tenant_id, aggregate_type, aggregate_id)
);
SELECT app.tenant_rls('app.outbox_aggregate_head');

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
    -- existing events keep the order the worker used until now: (aggregate_rev, seq) within each aggregate
    UPDATE app.outbox_event e SET aggregate_seq = s.rn
      FROM (SELECT id, row_number() OVER (PARTITION BY aggregate_type, aggregate_id ORDER BY aggregate_rev, seq) AS rn FROM app.outbox_event WHERE tenant_id = t) s
     WHERE e.id = s.id;
    INSERT INTO app.outbox_aggregate_head (tenant_id, aggregate_type, aggregate_id, last_seq)
      SELECT tenant_id, aggregate_type, aggregate_id, max(aggregate_seq) FROM app.outbox_event WHERE tenant_id = t GROUP BY tenant_id, aggregate_type, aggregate_id;
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
CREATE UNIQUE INDEX outbox_aggregate_seq_key ON app.outbox_event (tenant_id, aggregate_type, aggregate_id, aggregate_seq);
-- the worker's head-of-line lookups: the events of each aggregate that are not yet delivered, in delivery order
CREATE INDEX outbox_open_aggregate_idx ON app.outbox_event (tenant_id, aggregate_type, aggregate_id, aggregate_seq) WHERE status IN ('PENDING', 'DEAD_LETTER');
-- the committing transaction's own events that still need a number (rows exist here only between INSERT and COMMIT)
CREATE INDEX outbox_unsequenced_idx ON app.outbox_event (tenant_id, aggregate_type, aggregate_id, seq) WHERE aggregate_seq IS NULL;

-- The sequence is assigned at COMMIT (a deferred constraint trigger), for all of the committing transaction's events at once, taking the
-- head rows in one canonical order (tenant, aggregate type, aggregate id). Why at commit and in that order:
--   * commit order: the head row stays locked until the transaction ends, so a second transaction committing on the same aggregate waits
--     and then takes the next number;
--   * no deadlock: head rows are locked only here, at commit, after every other statement of the transaction has run, and always in the
--     same order. A transaction that emits for a Room and then a RoomIssue and one that emits for the RoomIssue and then the Room both lock
--     Room before RoomIssue at commit (sorted), so neither can hold one head while waiting for the other in the opposite order; and while
--     taking heads a committing transaction waits for nothing else (its own new rows are invisible to everyone else);
--   * whoever inserts: ctx.emit, the seed, a script or a superuser — the producer cannot choose or skip the number (a supplied value is
--     overwritten).
-- SECURITY DEFINER: the runtime role needs no privilege on the head table nor UPDATE on aggregate_seq. It runs under the inserted row's
-- tenant (RLS is forced on the owner too). An application transaction can only insert events for its own tenant, so all its events are
-- numbered in one call, in sorted order; a superuser transaction that inserts for several tenants is numbered tenant by tenant.
CREATE OR REPLACE FUNCTION app.outbox_assign_aggregate_seq() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_temp AS $$
DECLARE prev text := current_setting('app.tenant_id', true); r record; s bigint;
BEGIN
  PERFORM set_config('app.tenant_id', NEW.tenant_id::text, true);
  FOR r IN SELECT id, tenant_id, aggregate_type, aggregate_id FROM app.outbox_event
            WHERE aggregate_seq IS NULL AND tenant_id = NEW.tenant_id ORDER BY tenant_id, aggregate_type, aggregate_id, seq LOOP
    INSERT INTO app.outbox_aggregate_head AS h (tenant_id, aggregate_type, aggregate_id, last_seq) VALUES (r.tenant_id, r.aggregate_type, r.aggregate_id, 1)
      ON CONFLICT (tenant_id, aggregate_type, aggregate_id) DO UPDATE SET last_seq = h.last_seq + 1
      RETURNING last_seq INTO s;
    UPDATE app.outbox_event SET aggregate_seq = s WHERE id = r.id;
  END LOOP;
  PERFORM set_config('app.tenant_id', coalesce(prev, ''), true);
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION app.outbox_assign_aggregate_seq() FROM PUBLIC;
-- a producer-supplied number never survives: cleared on INSERT, assigned at COMMIT
CREATE OR REPLACE FUNCTION app.outbox_clear_aggregate_seq() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.aggregate_seq := NULL; RETURN NEW; END $$;
REVOKE EXECUTE ON FUNCTION app.outbox_clear_aggregate_seq() FROM PUBLIC;
CREATE TRIGGER outbox_clear_aggregate_seq BEFORE INSERT ON app.outbox_event FOR EACH ROW EXECUTE FUNCTION app.outbox_clear_aggregate_seq();
CREATE CONSTRAINT TRIGGER outbox_assign_aggregate_seq AFTER INSERT ON app.outbox_event DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION app.outbox_assign_aggregate_seq();

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
