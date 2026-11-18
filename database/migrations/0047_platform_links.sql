-- 0047 · Platform jumps (founder, 18 Nov 2026, 07:49: "add jumps to XiO Cloud, Utelogy, Teams Pro portal, M365, SharePoint, Q-SYS, Dante,
-- Appspace, digital signage platforms, Sennheiser, Autodesk, ServiceNow"). A jump is a link the organization points at its own portal:
-- Empathia opens it in the person's own browser and exchanges no data with it. Not an integration: nothing is read from or written to
-- the platform, and nothing here claims a certified integration or a partnership.
--
--   * app.platform_link   per tenant and platform: the organization's own address (https only), a label, enabled; set by the security
--                         administrator (policy.configure) or the operations lead (handoff.accept), each change audited. One row per platform; a change replaces the address.
--   * app.platform_ref    the address of one room or one device in a platform (the room's page in the organization's device cloud, say),
--                         recorded by someone who records rooms or devices; kept with who recorded it; replaced by a new one, never edited.

CREATE TABLE app.platform_link (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES app.tenant(id),
  platform    text NOT NULL CHECK (platform ~ '^[a-z0-9-]{2,40}$'),
  url         text NOT NULL CHECK (url ~ '^https://[A-Za-z0-9.-]+(:[0-9]{2,5})?(/[^\s<>"]*)?$' AND length(url) <= 300),
  label       text CHECK (label IS NULL OR length(btrim(label)) BETWEEN 2 AND 80),
  enabled     boolean NOT NULL DEFAULT true,
  set_by      uuid NOT NULL REFERENCES app.person(id),
  set_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, platform)
);
SELECT app.tenant_rls('app.platform_link');

CREATE TABLE app.platform_ref (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES app.tenant(id),
  platform    text NOT NULL CHECK (platform ~ '^[a-z0-9-]{2,40}$'),
  subject     text NOT NULL CHECK (subject IN ('room', 'device')),
  subject_ref text NOT NULL CHECK (length(subject_ref) BETWEEN 2 AND 80),
  url         text NOT NULL CHECK (url ~ '^https://[A-Za-z0-9.-]+(:[0-9]{2,5})?(/[^\s<>"]*)?$' AND length(url) <= 400),
  recorded_by uuid NOT NULL REFERENCES app.person(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  replaced_at timestamptz
);
SELECT app.tenant_rls('app.platform_ref');
CREATE UNIQUE INDEX platform_ref_current ON app.platform_ref (tenant_id, platform, subject, subject_ref) WHERE replaced_at IS NULL;

-- a recorded address is never edited: it is replaced (replaced_at set once) and a new one recorded
CREATE OR REPLACE FUNCTION app.platform_ref_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.tenant_id, NEW.platform, NEW.subject, NEW.subject_ref, NEW.url, NEW.recorded_by, NEW.recorded_at) IS DISTINCT FROM
     (OLD.tenant_id, OLD.platform, OLD.subject, OLD.subject_ref, OLD.url, OLD.recorded_by, OLD.recorded_at) OR OLD.replaced_at IS NOT NULL THEN
    RAISE EXCEPTION 'EM022 a recorded platform address is never edited: record a new one' USING ERRCODE = 'EM022'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER platform_ref_guard BEFORE UPDATE ON app.platform_ref FOR EACH ROW EXECUTE FUNCTION app.platform_ref_guard();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT, UPDATE ON app.platform_link TO empathia_app;
    GRANT SELECT, INSERT, UPDATE ON app.platform_ref TO empathia_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_worker') THEN
    GRANT SELECT ON app.platform_link, app.platform_ref TO empathia_worker;
  END IF;
END $$;
