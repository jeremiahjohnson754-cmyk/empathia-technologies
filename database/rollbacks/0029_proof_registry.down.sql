-- Rollback of 0029 (Proof Registry). Drops only what 0029 created; no other table references these. Run as the schema owner, then delete
-- the 0029 row from the migration ledger so the runner can apply it again. Claims and their history are lost: export them first.
DROP TABLE IF EXISTS app.proof_claim_event;
DROP TABLE IF EXISTS app.proof_evidence;
DROP TABLE IF EXISTS app.proof_claim;
DROP FUNCTION IF EXISTS app.proof_claim_no_delete();
