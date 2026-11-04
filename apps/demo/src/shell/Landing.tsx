/**
 * The investor start (2.5.5 landing composition, at V2.5.3's richness): a gradient hero with three ways in, the campus right now (every
 * number computed from the records), the seven scenarios with the problem each solves, the View-as shelf, what it is for, disclosures.
 */
import { useMemo } from 'react';
import type { PageProps, RoleKey } from '../registry.types.js';
import { WorkWith } from '../enquiry/WorkWith.js';
import { AREAS, NATIVE } from '../registry.js';
import { ROLES } from '../access/policy.js';
import { useViewAs } from '../viewas/context.js';
import { campusStats, BAND_LABEL } from '../campus/metrics.js';
import { load as loadWorkspace } from '../workspace/store.js';
import { ScoreRing, Icon, Chip } from '../spatial/parts.js';
import { CampusMap } from '../spatial/Spatial.js';

const SCENARIOS = [
  ['If this switch fails, what is affected?', 'Nobody can say what a failing device takes down. Search Party shows the room, the switch, its uplink, the rooms that share it and the power behind it, each with its freshness.', 'graph'],
  ['Field Intelligence: what the collector declares', 'Monitoring tools report what a configuration file says, not what is true. Every observation is labelled declared, observed, verified, modeled, unknown or unavailable.', 'search'],
  ['Room optimisation in Lite', 'Rooms are changed on a hunch. Lite states a prediction with its uncertainty and never calls a scenario a measurement.', 'cube'],
  ['Commissioning and governance', 'Rooms are accepted without proof. An adaptive plan states why each test applies, and an approval is refused in front of you with every unresolved item named.', 'check'],
  ['Incident → service → retest → closure', 'Repairs close on a technician\'s word. Hard gates before dispatch, evidence in the field, independent verification, and the baseline that decides whether it is fixed.', 'device'],
  ['Learn', 'Lessons stay in people\'s heads. Reviewed cases are written from what actually happened, with permission and de-identification, and training never grants authority.', 'people'],
  ['The connected ecosystem', 'Every system has its own numbers. Mission Control, 27 KPI passports with numerator and denominator, and the ledger behind every state.', 'passport'],
] as const;
/** The shelf: the roles an investor most often wants to see the platform as, one tap each (the full list is in View as). */
const SHELF: RoleKey[] = ['exec', 'ops', 'designer', 'service', 'cxeng', 'employee', 'visitor'];
/** What it is for (V2.5.3's four audiences). */
const FOR = [
  ['For the operator', 'One room record from request to recommission, with the people, the money, the design, the tests, the documents and the service history on it — and the authority behind each.'],
  ['For the engineer', 'Adaptive commissioning from a rule pack, measurement provenance that refuses dBFS as SPL, a golden baseline that is never a score, APEX that cites its evidence and names its uncertainty.'],
  ['For the executive', 'Twenty-seven passports that show their numerator and denominator, pending decisions with their scope revision, and usage that says “not measurable” instead of inventing a number.'],
  ['For the technician', 'Assigned jobs with everything needed on one screen, a preflight that refuses to start on a booked room or stale parts, an offline queue that will not upload without a fresh sign-in.'],
] as const;

export default function Landing({ role }: PageProps) {
  const va = useViewAs();
  const c = useMemo(() => { let w = null; try { w = loadWorkspace(); } catch { /* none */ } return campusStats(w); }, []);
  const tiles = Object.fromEntries(c.buildings.map((s) => [s.b.key, { score: s.score, band: s.band, issues: s.open, rooms: s.rooms }]));
  return (
    <div className="lnd">
      <section className="hero lnd__hero">
        <div className="lnd__top"><div>
        <p className="kicker">Investor demonstration · release in migration</p>
        <h1>Every state here has a guard, an actor and an event behind it.</h1>
        <p className="lead">Declared is not verified; modeled is not measured — and the product says so itself. Three ways in:</p>
        </div>
        <figure className="lnd__art stage" data-stage="" aria-label="The living campus in 3D"><CampusMap tiles={tiles} onOpen={(b) => { location.hash = `#/campus/${b.key}`; }} /><figcaption className="stage__cap">The living campus: six buildings, each tinted by its modelled health. Select one to go inside.</figcaption></figure>
        </div>
        <div className="start">
          <a className="go launch" href="#/v25/build"><span className="go__ic" aria-hidden="true"><Icon name="cube" size={22} /></span><b>Launch interactive room builder</b><span>Design a room and watch it reach drawings, commissioning, Search Party and Pro.</span></a>
          <a className="go" href="#/tours/investor"><span className="go__ic" aria-hidden="true"><Icon name="spark" size={22} /></span><b>Watch a guided scenario</b><span>Seven scenarios · about 14 minutes</span></a>
          <a className="go" href="#problems"><span className="go__ic" aria-hidden="true"><Icon name="check" size={22} /></span><b>What each workflow solves</b><span>The customer problem behind each scenario</span></a>
        </div>
        <ul className="lnd__facts" aria-label="This edition"><li><Chip tone="accent">Offline · self-contained</Chip></li><li><Chip tone="warn">Synthetic data</Chip></li><li><Chip tone="muted">No request leaves the page</Chip></li><li><Chip tone="muted">A demonstration of authorisation, not security</Chip></li></ul>
      </section>

      <section className="lnd__now" aria-labelledby="now-h" data-testid="landing-now">
        <div className="lnd__nowhead"><h2 id="now-h">The campus right now</h2><span className="ui-meta">Computed from the thirty room records and the service workspace · MODELED, not measured</span></div>
        <div className="lnd__nowgrid">
          <a className="lnd__score" href="#/home"><ScoreRing score={c.score} band={c.band} size={72} label="Campus health" /><span><b>Campus health</b><span>{BAND_LABEL[c.band]} · {c.scored} rooms scored</span></span></a>
          <a href="#/campus" className="lnd__k"><b>{c.rooms}</b><span>rooms in {c.buildings.length} buildings</span></a>
          <a href="#/rooms" className="lnd__k"><b>{c.devices}</b><span>device positions</span></a>
          <a href="#/room?tab=tests" className="lnd__k"><b>{c.verifiedPct ?? '—'}%</b><span>tests independently verified</span></a>
          <a href="#/home" className="lnd__k"><b>{c.open}</b><span>open issues · {c.high} High</span></a>
        </div>
      </section>

      <section id="problems" className="scen lnd__scen">
        <div className="lnd__nowhead"><h2>Seven scenarios</h2><span className="ui-meta">each opens the tour at its first step</span></div>
        <ol>{SCENARIOS.map(([t, p, ic], i) => <li key={t}><a href={`#/tours/investor?scenario=${i + 1}`}><span className="lnd__n">{i + 1}</span><span className="lnd__sic" aria-hidden="true"><Icon name={ic} /></span><b>{t}</b></a><p><i>The problem</i> {p}</p></li>)}</ol>
      </section>

      <section className="shelf" aria-labelledby="shelf-h">
        <h2 id="shelf-h">See it as the people who use it</h2>
        <p className="ui-meta">Each role is given what its work needs and nothing else; the tabs, buttons and screens change with it.</p>
        <ul className="shelf__list">
          {SHELF.map((k) => <li key={k}><button type="button" className="shelf__role" data-r={k} data-role-key={k} aria-pressed={k === role} onClick={() => va.switchTo(k)}><span className="ava" aria-hidden="true">{ROLES[k].initials}</span><span><b>{ROLES[k].label}</b><span>{ROLES[k].home}</span></span></button></li>)}
          <li><button type="button" className="shelf__role shelf__more" onClick={va.open}><span className="ava" aria-hidden="true">+</span><span><b>Every role</b><span>View as…</span></span></button></li>
        </ul>
      </section>

      <section className="lnd__for" aria-labelledby="for-h">
        <h2 id="for-h">What it is for</h2>
        <ul>{FOR.map(([h, p]) => <li key={h}><p className="kicker">{h}</p><p>{p}</p></li>)}</ul>
      </section>

      <WorkWith />

      <section className="status lnd__disc">
        <h2>Disclosures and migration status</h2>
        <ul className="lnd__dl">
          <li>Every person, organisation, room, device, figure and approval is synthetic; no customer data is present.</li>
          <li>Roles, personas and permissions are a front-end demonstration of a policy, never production security.</li>
          <li>No device, network or acoustic measurement is taken by this page; every health score is modeled from the records.</li>
          <li>This demonstration is being rebuilt as modular pages from the Living Campus V2.5.3 source, one area at a time. {AREAS.filter((a) => NATIVE.has(a.key)).length} of {AREAS.length} addresses (86 areas and 19 V2.5 pages) are native today; the rest state their status when opened (see the parity ledger in the repository).</li>
        </ul>
      </section>
    </div>
  );
}
