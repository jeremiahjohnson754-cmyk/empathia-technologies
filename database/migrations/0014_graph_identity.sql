-- 0014 · Graph identity by key (ADR-0004; owner decision RT-15, 2026-10-30).
-- Relationships keep their display codes but are now keyed by the stable identifiers of both ends (uuid) with a version; new edges must
-- carry the keys. Existing edges are back-filled where the code resolves (rooms, planned assets, buildings, issues); unresolved ones keep
-- NULL keys and are reported by the graph read model as LEGACY_CODE_ONLY until re-stated.
ALTER TABLE app.relationship ADD COLUMN from_key uuid, ADD COLUMN to_key uuid, ADD COLUMN rev integer NOT NULL DEFAULT 1;
UPDATE app.relationship r SET from_key = x.id FROM app.room x WHERE r.from_type = 'Room' AND x.code = r.from_id AND x.tenant_id = r.tenant_id;
UPDATE app.relationship r SET to_key   = x.id FROM app.room x WHERE r.to_type   = 'Room' AND x.code = r.to_id   AND x.tenant_id = r.tenant_id;
UPDATE app.relationship r SET from_key = x.id FROM app.planned_asset x WHERE r.from_type = 'PlannedAsset' AND x.code = r.from_id AND x.tenant_id = r.tenant_id;
UPDATE app.relationship r SET to_key   = x.id FROM app.planned_asset x WHERE r.to_type   = 'PlannedAsset' AND x.code = r.to_id   AND x.tenant_id = r.tenant_id;
UPDATE app.relationship r SET to_key   = x.id FROM app.building x WHERE r.to_type = 'Building' AND x.code = r.to_id AND x.tenant_id = r.tenant_id;
UPDATE app.relationship r SET from_key = x.id FROM app.room_issue x WHERE r.from_type = 'RoomIssue' AND x.code = r.from_id AND x.tenant_id = r.tenant_id;
CREATE INDEX relationship_from_key_idx ON app.relationship (tenant_id, from_key) WHERE removed_at IS NULL;
CREATE INDEX relationship_to_key_idx ON app.relationship (tenant_id, to_key) WHERE removed_at IS NULL;
