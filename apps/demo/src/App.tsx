import React, { useEffect, useState } from 'react';
import { Tag, Notice, AppShell } from '@empathia/ui';
import { areaOf, AREAS, NATIVE } from './registry.js';
import { BuildRoom } from './build/BuildRoom.js';
import { SearchPartyDemo } from './search/SearchParty.js';
import { TourPanel } from './tour/Tour.js';

/** The seven investor scenarios of the 2.5.5 investor landing, with the customer problem each one solves (carried over verbatim in spirit). */
const SCENARIOS = [
  ['If this switch fails, what is affected?', 'Nobody can say what a failing device takes down. Search Party shows the room, the switch, its uplink, the rooms that share it and the power behind it, each with its freshness.'],
  ['Field Intelligence: what the collector declares', 'Monitoring tools report what a configuration file says, not what is true. Every observation is labelled declared, observed, verified, modeled, unknown or unavailable.'],
  ['Room optimisation in Lite', 'Rooms are changed on a hunch. Lite states a prediction with its uncertainty and never calls a scenario a measurement.'],
  ['Commissioning and governance', 'Rooms are accepted without proof. An adaptive plan states why each test applies, and an approval is refused in front of you with every unresolved item named.'],
  ['Incident → service → retest → closure', 'Repairs close on a technician\'s word. Hard gates before dispatch, evidence in the field, independent verification, and the baseline that decides whether it is fixed.'],
  ['Learn', 'Lessons stay in people\'s heads. Reviewed cases are written from what actually happened, with permission and de-identification, and training never grants authority.'],
  ['The connected ecosystem', 'Every system has its own numbers. Mission Control, 27 KPI passports with numerator and denominator, and the ledger behind every state.'],
] as const;
/** The 14 legacy perspectives, plus `qa` (the Document Reviewer / QA persona) so the demonstration can show an acceptance by someone who neither recorded nor verified (ADR-0005). */
const PERSPECTIVES = ['visitor', 'employee', 'exec', 'service', 'svcmgr', 'syseng', 'designer', 'installer', 'cxeng', 'ipm', 'bpm', 'ops', 'steward', 'architect', 'qa'];

export function App() {
  const [hash, setHash] = useState(location.hash || '#/investor'); const [as, setAs] = useState(() => { try { return localStorage.getItem('empathia.demo.perspective') || 'visitor'; } catch { return 'visitor'; } });
  useEffect(() => { if (!location.hash) history.replaceState(null, '', '#/investor'); const h = () => setHash(location.hash || '#/investor'); addEventListener('hashchange', h); return () => removeEventListener('hashchange', h); }, []);
  useEffect(() => { try { localStorage.setItem('empathia.demo.perspective', as); } catch { /* storage unavailable: the choice lasts the page */ } }, [as]);
  const area = areaOf(hash); const home = hash === '#/investor' || hash === '#/' || hash === '#' || !hash.startsWith('#/') || hash.startsWith('#/tours/investor');   // an in-page anchor (#problems) stays on the landing
  // the same product rail as the enterprise application, on the legacy address space (every product resolves to a native page or a boundary page)
  const k = area?.key || '';
  const products = [
    { key: 'home', label: 'Mission Control', href: '#/home', purpose: 'What changed, what matters, what needs action', active: k === 'home' },
    { key: 'pro', label: 'Pro', href: '#/suite/pro', purpose: 'Operational intelligence, portfolio, service performance', active: k.startsWith('pro') },
    { key: 'lite', label: 'Lite', href: '#/v25/build', purpose: 'Build a Room: spatial design on the real engine', active: k === 'v25.build' || k.startsWith('lite') },
    { key: 'search', label: 'Search Party', href: '#/search', purpose: 'Universal entity search and relationship intelligence', active: k.startsWith('search') },
    { key: 'cx', label: 'Commissioning & Assurance', href: '#/suite/commission', purpose: 'Plans, evidence, verification, acceptance, baselines', active: k.startsWith('commissioning') || k.startsWith('assurance') },
    { key: 'fi', label: 'Field Intelligence', href: '#/suite/integrations', purpose: 'What the collector declares, observes and verifies', active: k === 'fabric' },
    { key: 'learn', label: 'Learn', href: '#/suite/learn', purpose: 'Evidence-backed cases and training', active: k === 'learn' },
    { key: 'investor', label: 'Investor start', href: '#/investor', purpose: 'Three ways in: Build a Room, guided scenarios, the problems each workflow solves', active: home },
  ];
  return (
    <div className="demo">
      <AppShell products={products} edition="Living Campus" identity={{ name: 'Demonstration', role: as, organization: 'synthetic estate', mode: 'demonstration' }}
        actions={<label className="persp">Perspective <select value={as} onChange={(e) => setAs(e.target.value)} aria-describedby="persp-note">{PERSPECTIVES.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>}
        note={<><Tag tone="warn">DEMONSTRATION · SYNTHETIC DATA</Tag> <span id="persp-note">A perspective changes what the demonstration shows; it grants nothing. Real access is decided by the authenticated application's server.</span></>}>
        <TourPanel hash={hash} onPerspective={setAs} />
        <div className="wrap">{home ? <Landing /> : area?.key === 'v25.build' ? <BuildRoom perspective={as} /> : area?.key === 'search' || area?.key === 'search.graph' ? <SearchPartyDemo hash={hash} /> : <Boundary hash={hash} area={area} />}</div>
      </AppShell>
      <footer className="foot">Every person, organisation, room, device, figure and approval here is invented. Nothing is connected to a real system. <a href="#/investor">Back to the start</a></footer>
    </div>
  );
}
function Landing() {
  return (
    <>
      <section className="hero">
        <p className="kicker">Investor demonstration · release in migration</p>
        <h1>Every state here has a guard, an actor and an event behind it.</h1>
        <p className="lead">Declared is not verified; modeled is not measured — and the product says so itself. Three ways in:</p>
        <div className="start">
          <a className="go launch" href="#/v25/build"><b>Launch interactive room builder</b><span>Design a room and watch it reach drawings, commissioning, Search Party and Pro.</span></a>
          <a className="go" href="#/tours/investor"><b>Watch a guided scenario</b><span>Seven scenarios · about 14 minutes</span></a>
          <a className="go" href="#problems"><b>What each workflow solves</b><span>The customer problem behind each scenario</span></a>
        </div>
      </section>
      <section id="problems" className="scen">
        <h2>Seven scenarios</h2>
        <ol>{SCENARIOS.map(([t, p], i) => <li key={t}><a href={`#/tours/investor?scenario=${i + 1}`}><b>{i + 1} · {t}</b></a><p><i>The problem</i> {p}</p></li>)}</ol>
      </section>
      <section className="status">
        <h2>Migration status</h2>
        <p>This demonstration is being rebuilt as modular pages from the Living Campus V2.5.3 source, one area at a time. {AREAS.filter((a) => NATIVE.has(a.key)).length} of {AREAS.length} addresses (86 areas and 19 V2.5 pages) are native today; the rest state their status when opened (see the parity ledger in the repository).</p>
      </section>
    </>
  );
}
function Boundary({ hash, area }: { hash: string; area?: { key: string; label: string; target: string; status: string; newRoute: string } }) {
  if (!area) return <Notice tone="warn"><b>Unknown address.</b> This address is not part of the Living Campus. <a href="#/investor">Back to the start</a></Notice>;
  return (
    <section className="boundary">
      <h1>{area.label}</h1>
      <p className="ui-muted">Address <code>{hash}</code> · legacy area <code>{area.key}</code></p>
      <Notice tone={area.status.startsWith('DONE') ? 'ok' : 'info'}>
        <b>{area.status.startsWith('DONE') ? 'Native page. ' : 'Not migrated yet. '}</b>{area.status.startsWith('DONE') ? <>This area runs natively; its page is being connected to this shell.</> : <>This part of the demonstration has not been rebuilt in the new application yet. Parity ledger: target <b>{area.target}</b>, status <b>{area.status}</b>, planned route <code>{area.newRoute}</code>. Until it is, the original V2.5.3 demonstration remains the reference for this area.</>}
      </Notice>
      <p><a className="ui-btn" href="#/investor">Back to the start</a></p>
    </section>
  );
}
