-- 0009 · Public leads: what the public website's forms send (request a demonstration, pilot partnership, contact).
-- Not tenant data: a lead belongs to Empathia as the operator of the site. The runtime role may INSERT one from an unauthenticated
-- request only inside a transaction that set app.public_inbound = on; it may read or update leads only when app.lead_admin = on,
-- which the API sets after a security administrator's authority check (policy.configure). Nothing here is ever deleted by the
-- application roles: a lead marked SPAM or ANSWERED keeps its record for the retention policy to act on.
CREATE TABLE app.public_lead (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL CHECK (kind IN ('demo', 'pilot', 'contact')),
  name            text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  organization    text NOT NULL CHECK (length(organization) BETWEEN 1 AND 160),
  email           text NOT NULL CHECK (length(email) BETWEEN 3 AND 200 AND position('@' IN email) > 1),
  audience        text CHECK (audience IS NULL OR length(audience) <= 80),
  scope           text CHECK (scope IS NULL OR length(scope) <= 80),
  message         text NOT NULL CHECK (length(message) BETWEEN 1 AND 4000),
  consent         boolean NOT NULL CHECK (consent),
  consent_text    text NOT NULL,                          -- the consent sentence shown, as of this submission
  source_ip_hash  text,                                   -- pseudonymous (salted hash): still personal data, kept under the same retention
  user_agent      text CHECK (user_agent IS NULL OR length(user_agent) <= 300),
  correlation_id  text NOT NULL,
  status          text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'ANSWERED', 'SPAM')),
  notified        boolean NOT NULL DEFAULT false,         -- whether an email notification went out (false until an adapter is configured)
  notify_note     text,                                   -- e.g. 'email adapter not configured'
  handled_by      uuid,
  handled_at      timestamptz,
  notes           text CHECK (notes IS NULL OR length(notes) <= 4000),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX public_lead_status_idx ON app.public_lead (status, created_at DESC);
ALTER TABLE app.public_lead ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.public_lead FORCE ROW LEVEL SECURITY;
CREATE POLICY lead_public_insert ON app.public_lead FOR INSERT WITH CHECK (current_setting('app.public_inbound', true) = 'on');
CREATE POLICY lead_admin_read ON app.public_lead FOR SELECT USING (current_setting('app.lead_admin', true) = 'on');
CREATE POLICY lead_admin_update ON app.public_lead FOR UPDATE USING (current_setting('app.lead_admin', true) = 'on') WITH CHECK (current_setting('app.lead_admin', true) = 'on');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT, UPDATE ON app.public_lead TO empathia_app;
  END IF;
END $$;
