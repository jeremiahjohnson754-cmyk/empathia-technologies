/**
 * The application shell: sign-in gate, navigation, and the routed page. What the navigation shows depends on the principal returned
 * by /v1/me (resolved server-side); hiding a link is a convenience, never a control — the API refuses whatever the role may not do.
 */
import { useEffect } from 'react';
import { Loading, ErrorState, Button } from '@empathia/ui';
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
  const nav: Array<[string, string, boolean]> = [
    ['rooms', 'Rooms', true], ['projects', 'Projects', true], ['reports', 'Reports', true], ['inbox', 'Inbox', true],
    ['admin', 'Administration', can(['policy.configure', 'provenance.review', 'adapter.allowlist'])],
  ];
  return (
    <MeContext.Provider value={{ me: me.data, can }}>
      <a className="skip" href="#main">Skip to content</a>
      <div className="app">
        <header className="bar">
          <a className="brand" href={href('rooms')}><span className="brand__mark" aria-hidden="true">◈</span>Empathia <span className="brand__sub">Enterprise starter</span></a>
          <nav aria-label="Main" className="nav">{nav.filter(([, , show]) => show).map(([k, label]) => <a key={k} href={href(k)} aria-current={page === k ? 'page' : undefined}>{label}</a>)}</nav>
          <div className="who">
            <span className="who__name">{me.data.person.name}</span>
            <span className="who__role" title={me.data.authorities.join(', ')}>{me.data.role} · {me.data.tenant}{me.data.siteScope?.length ? ' · site-scoped' : ''}</span>
            <Button kind="quiet" small onClick={() => session.clear()}>Sign out</Button>
          </div>
        </header>
        <div className="synthetic" role="note">Synthetic data · local production starter · not production-ready · API {API_BASE}</div>
        <main id="main" tabIndex={-1} className="main">
          {page === 'rooms' && !route[1] ? <Rooms /> : null}
          {page === 'rooms' && route[1] ? <Room code={route[1]} tab={route[2] || 'overview'} /> : null}
          {page === 'projects' ? <Projects /> : null}
          {page === 'reports' ? <Reports /> : null}
          {page === 'inbox' ? <Inbox /> : null}
          {page === 'admin' ? <Admin tab={route[1] || 'integrations'} /> : null}
        </main>
      </div>
    </MeContext.Provider>
  );
}
