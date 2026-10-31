/**
 * The application shell: sign-in gate, navigation, and the routed page. What the navigation shows depends on the principal returned
 * by /v1/me (resolved server-side); hiding a link is a convenience, never a control — the API refuses whatever the role may not do.
 */
import { useEffect } from 'react';
import { Loading, ErrorState, Button, AppShell } from '@empathia/ui';
import type { Me } from '@empathia/api-client';
import { api, session, useQuery, useToken, API_BASE } from './api.js';
import { useRoute, href } from './router.js';
import { SignIn } from './pages/SignIn.js';
import { Rooms } from './pages/Rooms.js';
import { Room } from './pages/Room.js';
import { Reports } from './pages/Reports.js';
import { Projects } from './pages/Projects.js';
import { Inbox } from './pages/Inbox.js';
import { Admin } from './pages/Admin.js';
import { SearchParty } from './pages/SearchParty.js';
import { CommissioningHome, FieldIntelligence, Learn } from './pages/Products.js';
import { MeContext } from './me.js';

export function App() {
  const token = useToken();
  const me = useQuery<Me>(token ? 'me' : null, () => api.call('getV1Me'));
  const route = useRoute();
  useEffect(() => { document.title = `Empathia Enterprise — ${route[0] || 'rooms'} (starter)`; }, [route[0]]);
  if (!token) return <SignIn />;
  if (me.error) return <main className="app-center"><ErrorState error={me.error} retry={() => session.clear()} /></main>;
  if (!me.data) return <main className="app-center"><Loading label="Signing in" /></main>;
  const can = (a: string | string[]) => me.data!.authorities.includes('*') || ([] as string[]).concat(a).some((x) => me.data!.authorities.includes(x));
  const page = route[0] || 'rooms';
  // the platform's products (ADR-0001: one platform, specialised applications). A product the role may not reach is shown locked with its reason —
  // the shape of the platform is not a secret; what is behind the door is decided by the API on every request.
  const admin = can(['policy.configure', 'provenance.review', 'adapter.allowlist']);
  const products = [
    { key: 'reports', label: 'Mission Control', href: href('reports'), purpose: 'What changed, what matters, what needs action — KPIs with definitions', active: page === 'reports' },
    { key: 'projects', label: 'Pro', href: href('projects'), purpose: 'Portfolio, projects, service performance and the notification inbox', active: page === 'projects' || page === 'inbox' },
    { key: 'rooms', label: 'Lite', href: href('rooms'), purpose: 'Campus → building → floor → room: spatial design, devices, drawings', active: page === 'rooms' },
    { key: 'search', label: 'Search Party', href: href('search'), purpose: 'Universal entity search and relationship intelligence', active: page === 'search' },
    { key: 'commissioning', label: 'Commissioning & Assurance', href: href('commissioning'), purpose: 'Plans, evidence, verification, acceptance, baselines, drift', active: page === 'commissioning' },
    { key: 'field', label: 'Field Intelligence', href: href('field'), purpose: 'Authorized reachability and health checks, adapters, measurements', active: page === 'field' },
    { key: 'learn', label: 'Learn', href: href('learn'), purpose: 'Evidence-backed knowledge and reviewed cases', active: page === 'learn' },
    { key: 'admin', label: 'Administration', href: href('admin'), purpose: 'People, invitations, policy, integrations, outbox, audit', active: page === 'admin', available: admin, lockedWhy: 'needs policy.configure, provenance.review or adapter.allowlist' },
  ];
  return (
    <MeContext.Provider value={{ me: me.data, can }}>
      <AppShell products={products} edition="Enterprise" identity={{ name: me.data.person.name, role: me.data.role, organization: me.data.tenant, scope: me.data.siteScope?.length ? 'site-scoped' : null, mode: 'authenticated' }}
        actions={<Button kind="quiet" small onClick={() => session.clear()}>Sign out</Button>}
        note={<>Synthetic data · local production starter · not production-ready · API {API_BASE}</>}>
        {page === 'rooms' && !route[1] ? <Rooms /> : null}
        {page === 'rooms' && route[1] ? <Room code={route[1]} tab={route[2] || 'overview'} /> : null}
        {page === 'search' ? <SearchParty type={route[1]} id={route[2]} /> : null}
        {page === 'projects' ? <Projects /> : null}
        {page === 'reports' ? <Reports /> : null}
        {page === 'inbox' ? <Inbox /> : null}
        {page === 'commissioning' ? <CommissioningHome /> : null}
        {page === 'field' ? <FieldIntelligence /> : null}
        {page === 'learn' ? <Learn /> : null}
        {page === 'admin' ? (admin ? <Admin tab={route[1] || 'integrations'} /> : <section className="page"><ErrorState error={{ status: 403, code: 'forbidden', detail: 'Administration needs policy.configure, provenance.review or adapter.allowlist. The server refuses these routes for your role as well.' }} /></section>) : null}
      </AppShell>
    </MeContext.Provider>
  );
}
