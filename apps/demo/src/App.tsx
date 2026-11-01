import React, { useEffect, useState } from 'react';
import { ENQUIRY, ENTRY_POINTS, WEBSITE_URL } from './enquiry.js';
import { Tag, Notice, AppShell } from '@empathia/ui';
import { areaOf, areaKey, AREAS, NATIVE } from './registry.js';
import { BuildRoom } from './build/BuildRoom.js';
import { SearchPartyDemo } from './search/SearchParty.js';
import { TourPanel } from './tour/Tour.js';
import { ServicePage } from './pages/Service.js';
import { ApexPage } from './pages/Apex.js';
import { LearnPage } from './pages/Learn.js';
import { MissionControl, ExecPage, LedgerPage } from './pages/Control.js';
import { FieldIntelligencePage } from './pages/FieldIntelligence.js';
import { StoryPage } from './story/StoryPage.js';
import { storyRooms } from './story/assemble.js';
import { buildEstate } from './search/estate.js';

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
    { key: 'investor', label: 'Investor start', href: '#/investor', purpose: 'Three ways in: Build a Room, guided scenarios, the problems each workflow solves', active: home },
    { key: 'home', label: 'Mission Control', href: '#/v25', purpose: 'What changed, what matters, what needs action', active: k === 'home' || k === 'v25.home' },
    { key: 'pro', label: 'Pro', href: '#/v25/exec', purpose: 'Executive intelligence: KPI passports with their numerators and denominators', active: k.startsWith('pro') || k === 'v25.exec' },
    { key: 'lite', label: 'Lite', href: '#/v25/build', purpose: 'Build a Room: spatial design on the real engine', active: k === 'v25.build' || k.startsWith('lite') },
    { key: 'search', label: 'Search Party', href: '#/search', purpose: 'Universal entity search and relationship intelligence', active: k.startsWith('search') },
    { key: 'cx', label: 'Commissioning & Assurance', href: '#/suite/commission', purpose: 'Plans, evidence, verification, acceptance, baselines', active: k.startsWith('commissioning') || k.startsWith('assurance') },
    { key: 'fi', label: 'Field Intelligence', href: '#/v25/fi', purpose: 'What the collector declares, observes and verifies', active: k === 'fabric' || k === 'v25.fi' || k === 'v25.fipv' },
    { key: 'learn', label: 'Learn', href: '#/v25/learn', purpose: 'Evidence-backed cases and training', active: k === 'learn' || k === 'v25.learn' },
  ];
  return (
    <div className="demo">
      <AppShell products={products} edition="Living Campus" identity={{ name: 'Demonstration', role: as, organization: 'synthetic estate', mode: 'demonstration' }}
        actions={<label className="persp">Perspective <select value={as} onChange={(e) => setAs(e.target.value)} aria-describedby="persp-note">{PERSPECTIVES.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>}
        note={<><Tag tone="warn">DEMONSTRATION · SYNTHETIC DATA</Tag> <span id="persp-note">A perspective changes what the demonstration shows; it grants nothing. Real access is decided by the authenticated application's server.</span></>}>
        <TourPanel hash={hash} onPerspective={setAs} />
        <div className="wrap">{home ? <Landing /> : page(areaKey(hash), hash, as) || <Boundary hash={hash} area={area} />}</div>
      </AppShell>
      <footer className="foot">Every person, organisation, room, device, figure and approval here is invented. Nothing is connected to a real system; the only way out is Empathia's enquiry form, which opens on {ENQUIRY.host}. <a href="#/investor">Back to the start</a> · <a href={ENQUIRY.url} target="_blank" rel="noopener noreferrer" data-enquiry="footer">Contact Empathia<span className="ui-sr"> (opens the enquiry form on {ENQUIRY.host} in a new tab)</span></a> · <a href={WEBSITE_URL + '/founder'}>The founder</a></footer>
    </div>
  );
}
/** The native pages of this demonstration, by legacy area key (everything else is a boundary page that states its migration status). */
function page(key: string, hash: string, as: string): React.ReactNode {
  switch (key) {
    case 'v25.build': return <BuildRoom perspective={as} />;
    case 'search': case 'search.graph': return <SearchPartyDemo hash={hash} />;
    case 'v25.service': case 'service': case 'servicehands': return <ServicePage perspective={as} hash={hash} />;
    case 'v25.apex': return <ApexPage perspective={as} hash={hash} />;
    case 'v25.learn': case 'learn': return <LearnPage perspective={as} hash={hash} />;
    case 'v25.home': case 'home': return <MissionControl perspective={as} />;
    case 'v25.exec': case 'pro.exec': return <ExecPage perspective={as} />;
    case 'v25.ledger': case 'ledger': return <LedgerPage perspective={as} policy={false} hash={hash} />;
    case 'v25.policy': return <LedgerPage perspective={as} policy />;
    case 'v25.fi': case 'fabric': return <FieldIntelligencePage perspective={as} pv={false} hash={hash} />;
    case 'v25.fipv': return <FieldIntelligencePage perspective={as} pv hash={hash} />;
    case 'story': return <StoryPage perspective={as} hash={hash} />;
    default: return null;
  }
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
      <StoryCard />
      <section id="problems" className="scen">
        <h2>Seven scenarios</h2>
        <ol>{SCENARIOS.map(([t, p], i) => <li key={t}><a href={`#/tours/investor?scenario=${i + 1}`}><b>{i + 1} · {t}</b></a><p><i>The problem</i> {p}</p></li>)}</ol>
      </section>
      <WorkWith />
      <section className="status">
        <h2>Migration status</h2>
        <p>This demonstration is being rebuilt as modular pages from the Living Campus V2.5.3 source, one area at a time. {AREAS.filter((a) => NATIVE.has(a.key)).length} of {AREAS.length} addresses (86 areas and 19 V2.5 pages) are native today; the rest state their status when opened (see the parity ledger in the repository).</p>
      </section>
    </>
  );
}
/** The way from the demonstration to a real conversation: each entry point opens the hosted enquiry form in a new tab, with the disclosure beside it. */
function WorkWith() {
  return (
    <section className="workwith" aria-labelledby="workwith-h" data-testid="work-with">
      <h2 id="workwith-h">Work with Empathia</h2>
      <p className="workwith__lead">Everything above is a demonstration on invented data. To talk about your own rooms, a partnership or an investment, write to Empathia Technologies.</p>
      <ul className="workwith__list">{ENTRY_POINTS.map((e) => (
        <li key={e.key}>
          <a className="go workwith__go" href={ENQUIRY.url} target="_blank" rel="noopener noreferrer" data-enquiry={e.key}>
            <b>{e.title}<svg className="ext" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M6 3h7v7M13 3 5.5 10.5M11 13H3V5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></b>
            <span>{e.body}</span><span className="ui-sr"> (opens the enquiry form on {ENQUIRY.host} in a new tab)</span>
            <span className="workwith__choose">In the form, choose {e.choose.map((c, i) => <React.Fragment key={c}>{i ? ' or ' : ''}<q>{c}</q></React.Fragment>)}.</span>
          </a>
        </li>))}
      </ul>
      <p className="workwith__note" data-enquiry-note="demo">The form opens on {ENQUIRY.host}, Empathia's form provider. Empathia Technologies receives your enquiry; {ENQUIRY.provider} stores it for us in {ENQUIRY.storage}. Nothing you do in this demonstration is sent with it. <a href={WEBSITE_URL + '/privacy#enquiries'}>How enquiries are handled</a> · <a href={WEBSITE_URL + '/founder'}>About the founder</a></p>
    </section>
  );
}
/** The connected experience on the investor start: one room, its whole lifecycle, from the records (never typed). */
function StoryCard() {
  const rooms = storyRooms(buildEstate());
  return (
    <section className="storycard" aria-labelledby="storycard-h" data-testid="story-card">
      <div className="storycard__text"><p className="kicker">The connected experience</p><h2 id="storycard-h">Show me this room’s entire story</h2>
        <p>One room from request to lesson: every design revision, approval and refusal, test, verification, baseline, repair and Learn case the demonstration holds — in order, with who, why and how each is evidenced. Where nothing is recorded, it says so.</p></div>
      <ul className="storycard__rooms">{rooms.map((r) => <li key={r.id}><a href={`#/story/${r.id}`}><b>{r.label}</b><span>{r.subtitle}</span></a></li>)}</ul>
    </section>
  );
}
/** For an area not yet migrated as its own page, the native pages that already run the same engine (an address, a label, why it fits). */
const NATIVE_ELSEWHERE: Record<string, [string, string, string][]> = {
  commissioning: [
    ['#/v25/build?tab=checks', 'Build a Room: the commissioning plan', 'The adaptive plan with why each test applies, results, independent verification and acceptance to a baseline, on the shared commissioning engine.'],
    ['#/story/R-ATL-4-231', 'A room’s story: Atlas 4.231', 'Its verified tests and accepted baseline, in order, from the records.'],
  ],
  assurance: [
    ['#/v25/apex', 'APEX: diagnosis against the baseline', 'Cited hypotheses read against the accepted baseline, with bounded actions.'],
    ['#/v25/build?tab=checks', 'Build a Room: drift against baseline v1', 'Recommission an accepted room and see the difference from its baseline.'],
  ],
};
function Boundary({ hash, area }: { hash: string; area?: { key: string; label: string; target: string; status: string; newRoute: string } }) {
  if (!area) return <Notice tone="warn"><b>Unknown address.</b> This address is not part of the Living Campus. <a href="#/investor">Back to the start</a></Notice>;
  return (
    <section className="boundary">
      <h1>{area.label.charAt(0).toUpperCase() + area.label.slice(1)}</h1>
      <p className="ui-muted">Address <code>{hash}</code> · legacy area <code>{area.key}</code></p>
      <Notice tone={area.status.startsWith('DONE') ? 'ok' : 'info'}>
        <b>{area.status.startsWith('DONE') ? 'Native page. ' : 'Not migrated yet. '}</b>{area.status.startsWith('DONE') ? <>This area runs natively; its page is being connected to this shell.</> : <>This part of the demonstration has not been rebuilt in the new application yet. Parity ledger: target <b>{area.target}</b>, status <b>{area.status}</b>, planned route <code>{area.newRoute}</code>. Until it is, the original V2.5.3 demonstration remains the reference for this area.</>}
      </Notice>
      {NATIVE_ELSEWHERE[area.key] ? <div className="boundary__native" data-testid="boundary-native"><h2>Where this runs natively today</h2><ul>{NATIVE_ELSEWHERE[area.key]!.map(([href, label, why]) => <li key={href}><a href={href}><b>{label}</b><span>{why}</span></a></li>)}</ul></div> : null}
      <p><a className="ui-btn" href="#/investor">Back to the start</a></p>
    </section>
  );
}
