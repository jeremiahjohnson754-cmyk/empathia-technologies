import { useEffect, useState } from 'react';
import { PRODUCTS } from '../data/products';
import { DIAGRAMS } from '../data/generated';
import { DESTINATIONS } from '../nav';
import { href } from '../lib/router';
import { Ladder } from '../components/Ladder';

const CHAIN = ['intake', 'commissioning', 'field-intelligence', 'servicehands', 'assurance', 'pro', 'search-party'];
const SLICE = ['Room creation', 'Canonical database record', 'Device assignment', 'Graph relationship', 'Drawing revision', 'Commissioning plan', 'Issue detection', 'Service workflow', 'Evidence storage', 'Operational read model'];

/** Reads the production starter's health endpoint, if the founder has it running on this computer. */
function useApi(url: string) {
  const [s, setS] = useState<{ state: 'checking' | 'up' | 'down'; body?: unknown }>({ state: 'checking' });
  useEffect(() => {
    let live = true;
    fetch(`${url}/health`, { cache: 'no-store' }).then((r) => r.json()).then((b) => { if (live) setS({ state: 'up', body: b }); }).catch(() => { if (live) setS({ state: 'down' }); });
    return () => { live = false; };
  }, [url]);
  return s;
}

export function EnterprisePlatform() {
  const api = useApi('http://127.0.0.1:4100');
  const ctx = DIAGRAMS.find((d) => d.id === 'containers') || DIAGRAMS[0];
  return (
    <>
      <div className="page-head">
        <h1>The Enterprise Platform</h1>
        <p>The seven operational products are one lifecycle: a request becomes a funded design, a commissioning plan, field work, an accepted baseline, an operational view, and a searchable record of who and what is connected.</p>
      </div>
      <ol className="steps" aria-label="The operational lifecycle">
        {CHAIN.map((slug) => {
          const p = PRODUCTS.find((x) => x.slug === slug)!;
          const d = DESTINATIONS.find((x) => x.product === slug)!;
          return (
            <li key={slug} className="step">
              <div><b><a href={href(d.path)}>{p.name}</a></b><p>{p.pitch}</p></div>
              <div style={{ width: 168 }}><Ladder ladder={p.ladder} /></div>
            </li>
          );
        })}
      </ol>
      <section className="cols-2">
        <div className="panel pad stack">
          <h2>The production starter</h2>
          <p className="muted">A real backend for the same workflow: a TypeScript modular monolith, PostgreSQL with migrations and tenant-scoped records, server-side authorization, a transactional outbox, evidence in object storage, and the commissioning engine running on the server.</p>
          <div className="row">
            <span className={`chip ${api.state === 'up' ? 'ok' : api.state === 'down' ? 'plain' : 'info'}`}>{api.state === 'up' ? 'running on this computer' : api.state === 'down' ? 'not running' : 'checking…'}</span>
            <code>http://127.0.0.1:4100</code>
          </div>
          {api.state === 'up' ? <pre className="code">{JSON.stringify(api.body, null, 2)}</pre> : <p className="faint">Start it with <code>node scripts/dev.mjs</code> in the source repository (see GETTING_STARTED.md). It is a starter, not a production deployment.</p>}
          <a className="btn" href={href('docs')}>Read the engineering blueprint</a>
        </div>
        <div className="panel pad stack">
          <h2>The vertical slice</h2>
          <p className="muted">One production-style path, every step persisted in the database and every security-sensitive step checked on the server:</p>
          <ol className="list">{SLICE.map((s) => <li key={s}>{s}</li>)}</ol>
          <a className="btn" href={href('architecture', 'diagrams', { d: 'slice' })}>See the sequence</a>
        </div>
      </section>
      {ctx && <div className="diagram" aria-label={ctx.title} dangerouslySetInnerHTML={{ __html: ctx.svg }} />}
    </>
  );
}
