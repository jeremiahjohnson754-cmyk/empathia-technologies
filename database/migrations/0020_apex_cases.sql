-- 0020 APEX cases (P6-B): one diagnosis per deficiency on @empathia/apex-engine — the seven layers with the room's cited records,
-- the ranked hypotheses with their caveats, every action outcome (blocked ones included) and the reviewer's verdict.
CREATE TABLE app.apex_case (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  issue_id     uuid NOT NULL,
  room_id      uuid NOT NULL,
  code         text NOT NULL CHECK (code ~ '^APX-[0-9]{4,10}$'),
  symptom_key  text NOT NULL,
  layers       jsonb NOT NULL,
  hypotheses   jsonb NOT NULL,
  actions      jsonb NOT NULL DEFAULT '[]',
  review       jsonb,
  opened_by    uuid NOT NULL REFERENCES app.person(id),
  opened_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code), UNIQUE (tenant_id, issue_id),
  FOREIGN KEY (tenant_id, issue_id) REFERENCES app.room_issue(tenant_id, id),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id)
);
SELECT app.tenant_rls('app.apex_case');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN GRANT SELECT, INSERT, UPDATE ON app.apex_case TO empathia_app; END IF;
END $$;
