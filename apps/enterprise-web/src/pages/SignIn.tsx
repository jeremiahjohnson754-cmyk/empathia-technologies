/**
 * Development sign-in (AUTH_MODE=dev): pick a seeded synthetic person by role. In production the API refuses dev sign-in and this page
 * is replaced by an OIDC redirect; the rest of the app is unchanged because it only ever holds the access token.
 */
import { useState } from 'react';
import { Button, Field, ErrorState, Notice } from '@empathia/ui';
import { api, session, useMutation } from '../api.js';

const PEOPLE: Array<[string, string, string]> = [
  ['designer', 'Designer', 'designs rooms, adds devices, saves revisions'],
  ['syseng', 'Systems engineer', 'approves classifications, drawings and designs; starts commissioning'],
  ['opslead', 'Operations lead', 'approves installation windows, assigns issues'],
  ['installer', 'Installer', 'marks rooms installed, uploads evidence'],
  ['cxeng', 'Commissioning engineer', 'records results, uploads evidence'],
  ['qa_reviewer', 'QA reviewer', 'independently verifies passes, accepts rooms'],
  ['svcmgr', 'Service manager', 'raises and closes work orders'],
  ['service', 'Service technician', 'field work and evidence'],
  ['exec', 'Executive', 'decides projects'],
  ['steward', 'Data steward', 'reads the audit trail'],
  ['secadmin', 'Security administrator', 'people, outbox, integrations'],
  ['requestor', 'Requestor', 'reads; submits requests'],
];

export function SignIn() {
  const [role, setRole] = useState('designer');
  const [password, setPassword] = useState('');
  const m = useMutation(async () => { const t = await api.signIn({ email: `${role.replace(/_/g, '-')}@empathia-demo.empathia.invalid`, password, tenant: 'empathia-demo', role }); session.set(t.accessToken); return t; });
  return (
    <main className="signin">
      <form className="signin__card" onSubmit={(e) => { e.preventDefault(); void m.run(undefined); }}>
        <h1><span className="brand__mark" aria-hidden="true">◈</span> Empathia Enterprise</h1>
        <p className="lede">Production starter over a real API and database. Every person and room here is synthetic.</p>
        <Field label="Sign in as">{(id) => (
          <select id={id} value={role} onChange={(e) => setRole(e.target.value)} data-testid="role">
            {PEOPLE.map(([k, label, what]) => <option key={k} value={k}>{label} — {what}</option>)}
          </select>)}
        </Field>
        <Field label="Development password" hint="Seeded people share the development password documented in services/enterprise-api/src/db/seed.ts. The API refuses this sign-in in production.">{(id, d) => (
          <input id={id} aria-describedby={d} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="password" />)}
        </Field>
        {m.error ? <ErrorState error={m.error} /> : null}
        <Button kind="primary" type="submit" busy={m.busy} testId="signin">Sign in</Button>
        <Notice tone="muted">Development identity provider. The token is held for this browser tab only; permissions are decided by the server on every request.</Notice>
      </form>
    </main>
  );
}
