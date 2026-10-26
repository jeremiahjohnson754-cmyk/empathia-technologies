import type { Product } from '../data/products';
import { FILMS_DATA } from '../data/generated';
import { DemoFrame } from '../components/DemoFrame';
import { LadderRows } from '../components/Ladder';
import { href, useRoute } from '../lib/router';

export function Facts({ p }: { p: Product }) {
  const films = FILMS_DATA.filter((f) => p.films.includes(f.key));
  return (
    <aside className="stack" aria-label={`${p.name}: evidence and sources`}>
      <div className="panel pad stack">
        <h3>Evidence</h3>
        <LadderRows ladder={p.ladder} />
        <dl className="kv">
          <dt>Recorded state</dt><dd>{p.state}</dd>
          <dt>Proof level</dt><dd>{p.proof}</dd>
          <dt>Builder suites</dt><dd className="num">{p.builderSuites ? `${p.builderSuites.passed} passed of ${p.builderSuites.suites} naming its routes; ${p.builderSuites.notRun} not run in that record` : 'none recorded'}</dd>
          <dt>Acceptance</dt><dd>{p.acceptance}</dd>
        </dl>
        {p.discrepancy && <div className="notice warn"><p className="muted">{p.discrepancy}</p></div>}
      </div>
      <div className="panel pad stack">
        <h3>What works</h3>
        <ul className="list ok">{p.whatWorks.map((w) => <li key={w}>{w}</li>)}</ul>
        <h3>Simulated or missing</h3>
        <ul className="list warn">{p.simulatedOrMissing.map((w) => <li key={w}>{w}</li>)}</ul>
      </div>
      <div className="panel pad stack">
        <h3>Source</h3>
        <ul className="list">{p.sources.map((s) => <li key={s}><code>{s}</code></li>)}</ul>
        {films.length > 0 && (<><h3>Films</h3><ul className="list">{films.map((f) => <li key={f.key}><a href={href('media', f.key)}>{f.title}</a></li>)}</ul></>)}
        <h3>Next engineering step</h3>
        <p className="muted">{p.nextStep}</p>
      </div>
    </aside>
  );
}

export function ProductPage({ p }: { p: Product }) {
  const r = useRoute();
  const want = r.params.get('route');
  const routes = want && p.routes.includes(want) ? [want, ...p.routes.filter((x) => x !== want)] : p.routes;
  return (
    <>
      <div className="page-head">
        <h1>{p.name}</h1>
        <p>{p.pitch}</p>
      </div>
      <div className="split">
        <DemoFrame routes={routes} persona={p.persona} title={p.name} />
        <Facts p={p} />
      </div>
    </>
  );
}
