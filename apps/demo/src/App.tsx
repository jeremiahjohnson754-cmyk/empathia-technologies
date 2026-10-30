import React, { useEffect, useState } from 'react';
import { Tag, Notice } from '@empathia/ui';
import { areaOf, AREAS } from './registry.js';

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
const PERSPECTIVES = ['visitor', 'employee', 'exec', 'service', 'svcmgr', 'syseng', 'designer', 'installer', 'cxeng', 'ipm', 'bpm', 'ops', 'steward', 'architect'];

export function App() {
  const [hash, setHash] = useState(location.hash || '#/investor'); const [as, setAs] = useState(() => { try { return localStorage.getItem('empathia.demo.perspective') || 'visitor'; } catch { return 'visitor'; } });
  useEffect(() => { if (!location.hash) history.replaceState(null, '', '#/investor'); const h = () => setHash(location.hash || '#/investor'); addEventListener('hashchange', h); return () => removeEventListener('hashchange', h); }, []);
  useEffect(() => { try { localStorage.setItem('empathia.demo.perspective', as); } catch { /* storage unavailable: the choice lasts the page */ } }, [as]);
  const area = areaOf(hash); const home = hash === '#/investor' || hash === '#/' || hash === '#' || !hash.startsWith('#/');   // an in-page anchor (#problems) stays on the landing
  return (
    <div className="demo">
      <a className="skip" href="#main">Skip to content</a>
      <header className="top"><div className="bar">
        <a className="brand" href="#/investor"><span className="mark" aria-hidden="true" /> Empathia Living Campus</a>
        <span className="synthetic"><Tag tone="warn">DEMONSTRATION · SYNTHETIC DATA</Tag></span>
        <label className="persp">Perspective <select value={as} onChange={(e) => setAs(e.target.value)} aria-describedby="persp-note">{PERSPECTIVES.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
      </div><p id="persp-note" className="persp-note">A perspective changes what the demonstration shows; it grants nothing. Real access is decided by the authenticated application's server.</p></header>
      <main id="main" className="wrap">
        {home ? <Landing /> : <Boundary hash={hash} area={area} />}
      </main>
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
        <p>This demonstration is being rebuilt as modular pages from the Living Campus V2.5.3 source, one area at a time. {AREAS.filter((a) => a.status.startsWith('DONE')).length} of {AREAS.length} areas are native today; the rest state their status when opened (see the parity ledger in the repository).</p>
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
