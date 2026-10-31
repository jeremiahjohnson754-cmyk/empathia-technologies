-- 0016 · OIDC subjects (production identity): look a person up by the provider's subject, and bind a subject to an existing person on a
-- first verified sign-in (one subject per person, one person per subject; the email must match exactly and be unbound).
CREATE OR REPLACE FUNCTION app.auth_person_by_subject(p_subject text)
  RETURNS TABLE (id uuid, display_name text, disabled boolean)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp AS
$$ SELECT id, display_name, disabled FROM app.person WHERE external_subject = p_subject $$;
CREATE OR REPLACE FUNCTION app.auth_bind_subject(p_email text, p_subject text)
  RETURNS TABLE (id uuid, display_name text, disabled boolean)
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_temp AS $$
#variable_conflict use_column
BEGIN
  UPDATE app.person p SET external_subject = p_subject WHERE lower(p.email) = lower(p_email) AND p.external_subject IS NULL AND p.disabled = false;
  RETURN QUERY SELECT p.id, p.display_name, p.disabled FROM app.person p WHERE p.external_subject = p_subject;
END $$;
REVOKE ALL ON FUNCTION app.auth_person_by_subject(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.auth_bind_subject(text, text) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT EXECUTE ON FUNCTION app.auth_person_by_subject(text) TO empathia_app;
    GRANT EXECUTE ON FUNCTION app.auth_bind_subject(text, text) TO empathia_app;
  END IF;
END $$;
