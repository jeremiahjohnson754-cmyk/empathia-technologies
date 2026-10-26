-- 0006 — rooms belong to projects (optional). A project groups rooms for decision, funding and reporting.
ALTER TABLE app.room ADD COLUMN project_id uuid;
ALTER TABLE app.room ADD CONSTRAINT room_project_fk FOREIGN KEY (tenant_id, project_id) REFERENCES app.project (tenant_id, id);
CREATE INDEX room_project_idx ON app.room (tenant_id, project_id) WHERE project_id IS NOT NULL;
ALTER TABLE app.project ADD COLUMN created_by uuid REFERENCES app.person(id);
ALTER TABLE app.project ADD CONSTRAINT project_code_format CHECK (code ~ '^PRJ-[A-Z0-9-]{2,32}$');
