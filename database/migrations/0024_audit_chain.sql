-- 0024 Evidence Ledger integrity (P1, ADR-0010): a per-tenant SHA-256 hash chain over app.audit_event.
-- Sealing happens after commit, not inside the request's transaction: a request never waits on a chain lock, so no new deadlock path.
-- app.seal_audit(tenant) gives every committed, unsealed row the next sequence number in that tenant's chain:
--   hash = sha256(prev_hash || canonical(row)), prev_hash of the first row = 32 zero bytes.
-- The canonical form is a JSON array of every column (jsonb text output is deterministic), so a change to any field breaks the chain.
-- seq / prev_hash / hash are write-once: the append-only trigger allows exactly the NULL → value transition of those three and nothing else.
-- Limits (documented): rows are unsealed between commit and the next seal; a database superuser who rewrites a row AND every later
-- hash is detectable only against a head hash kept outside the database (the verification endpoint returns the head for that purpose).

ALTER TABLE app.audit_event ADD COLUMN seq bigint, ADD COLUMN prev_hash bytea, ADD COLUMN hash bytea, ADD COLUMN sealed_at timestamptz;
CREATE UNIQUE INDEX audit_chain_seq ON app.audit_event (tenant_id, seq) WHERE seq IS NOT NULL;
CREATE INDEX audit_unsealed_idx ON app.audit_event (tenant_id, id) WHERE seq IS NULL;

CREATE OR REPLACE FUNCTION app.audit_canonical(e app.audit_event) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_array(e.tenant_id, e.seq, to_char(e.at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), e.actor_id, e.actor_role,
                           e.action, e.outcome, e.aggregate_type, e.aggregate_id, e.correlation_id, e.detail, e.id)::text
$$;

-- append-only, except the one-time seal of the integrity columns
CREATE OR REPLACE FUNCTION app.audit_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.seq IS NULL AND NEW.seq IS NOT NULL AND NEW.hash IS NOT NULL AND NEW.prev_hash IS NOT NULL
     AND (OLD.id, OLD.tenant_id, OLD.at, OLD.actor_id, OLD.actor_role, OLD.action, OLD.outcome, OLD.aggregate_type, OLD.aggregate_id, OLD.correlation_id, OLD.detail)
         IS NOT DISTINCT FROM
         (NEW.id, NEW.tenant_id, NEW.at, NEW.actor_id, NEW.actor_role, NEW.action, NEW.outcome, NEW.aggregate_type, NEW.aggregate_id, NEW.correlation_id, NEW.detail)
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'app.audit_event is append-only (only the one-time seal of seq/prev_hash/hash is permitted)' USING ERRCODE = 'P0001';
END $$;
DROP TRIGGER audit_append_only ON app.audit_event;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON app.audit_event FOR EACH ROW EXECUTE FUNCTION app.audit_guard();

-- the sealer: serialized per tenant by a short advisory lock held only while sealing; callable by the app for its own tenant only
CREATE OR REPLACE FUNCTION app.seal_audit(p_tenant uuid, p_max int DEFAULT 5000) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_temp AS $$
DECLARE head_seq bigint; head_hash bytea; r app.audit_event; n int := 0;
BEGIN
  IF current_setting('app.tenant_id', true) IS NOT NULL AND current_setting('app.tenant_id', true) <> '' AND current_setting('app.tenant_id', true)::uuid <> p_tenant THEN
    RAISE EXCEPTION 'seal_audit: a tenant seals only its own chain' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('app.tenant_id', p_tenant::text, true);   -- RLS is forced on the owner too: seal under the tenant's own policy
  PERFORM pg_advisory_xact_lock(hashtextextended('app.audit_chain:' || p_tenant::text, 0));
  SELECT seq, hash INTO head_seq, head_hash FROM app.audit_event WHERE tenant_id = p_tenant AND seq IS NOT NULL ORDER BY seq DESC LIMIT 1;
  head_seq := coalesce(head_seq, 0); head_hash := coalesce(head_hash, '\x0000000000000000000000000000000000000000000000000000000000000000'::bytea);
  FOR r IN SELECT * FROM app.audit_event WHERE tenant_id = p_tenant AND seq IS NULL ORDER BY id LIMIT p_max LOOP
    r.seq := head_seq + 1;
    UPDATE app.audit_event SET seq = r.seq, prev_hash = head_hash, hash = sha256(head_hash || convert_to(app.audit_canonical(r), 'UTF8')), sealed_at = now()
     WHERE id = r.id RETURNING seq, hash INTO head_seq, head_hash;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- the worker's entry point: every tenant (the worker holds no tenant context and cannot read audit rows itself)
CREATE OR REPLACE FUNCTION app.seal_audit_all(p_max int DEFAULT 5000) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_temp AS $$
DECLARE t uuid; n int := 0;
BEGIN
  FOR t IN SELECT id FROM app.tenant ORDER BY id LOOP
    PERFORM set_config('app.tenant_id', '', true);
    n := n + app.seal_audit(t, p_max);
  END LOOP;
  PERFORM set_config('app.tenant_id', '', true);
  RETURN n;
END $$;

-- seal what already exists (the chain starts here: it proves nothing about changes made before this migration)
SELECT app.seal_audit_all(1000000);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT EXECUTE ON FUNCTION app.seal_audit(uuid, int) TO empathia_app;
    GRANT EXECUTE ON FUNCTION app.audit_canonical(app.audit_event) TO empathia_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_worker') THEN GRANT EXECUTE ON FUNCTION app.seal_audit_all(int) TO empathia_worker; END IF;
  REVOKE EXECUTE ON FUNCTION app.seal_audit_all(int) FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION app.seal_audit(uuid, int) FROM PUBLIC;
END $$;
