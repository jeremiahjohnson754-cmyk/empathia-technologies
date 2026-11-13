/**
 * The investor start (2.5.5 landing composition, at V2.5.3's richness): a gradient hero with three ways in, the campus right now (every
 * number computed from the records), the seven scenarios with the problem each solves, the View-as shelf, what it is for, disclosures.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PageProps, RoleKey } from '../registry.types.js';
import { WorkWith } from '../enquiry/WorkWith.js';
import { AREAS, NATIVE } from '../registry.js';
import { ROLES, ROLE_KEYS } from '../access/policy.js';
import { useViewAs } from '../viewas/context.js';
import { opensNative } from './Shell.js';

const BUILD = '#/v25/build';
const OPENS_AS: RoleKey = 'designer';
import { campusStats, BAND_LABEL } from '../campus/metrics.js';
import { load as loadWorkspace } from '../workspace/store.js';
import { ScoreRing, Icon, Chip } from '../spatial/parts.js';
import { CampusMap } from '../spatial/Spatial.js';
import { openPages, recordsFor, typeCounts } from '../viewas/scope.js';
import { PAGES } from '../registry.pages.js';
import { reducedMotion } from '../viewas/role.js';

/** A small drawing of what each role mostly looks at (a trend, a room, passports, a queue, a plan, a shield); decorative. */
const ART: Record<string, number> = { exec: 0, bpm: 0, ops: 1, designer: 1, syseng: 1, service: 2, installer: 2, svcmgr: 3, ipm: 3, employee: 3, sitechamp: 3, cxeng: 4, qa: 4, steward: 5, architect: 5, visitor: 1 };
function RoleArt({ k }: { k: string }) {
  const i = ART[k] ?? 0;
  return <svg className="shelf__art" viewBox="0 0 120 56" aria-hidden="true" focusable="false">
    <rect x="1" y="1" width="118" height="54" rx="8" className="shelf__art-bg" />
    {i === 0 && <><polyline points="10,44 32,34 50,38 70,20 92,24 110,10" className="shelf__art-l" /><circle cx="70" cy="20" r="3" className="shelf__art-d" /></>}
    {i === 1 && <><ellipse cx="38" cy="28" rx="20" ry="12" className="shelf__art-l" /><rect x="66" y="12" width="44" height="6" rx="3" className="shelf__art-f" /><rect x="66" y="24" width="34" height="6" rx="3" className="shelf__art-f" /><rect x="66" y="36" width="40" height="6" rx="3" className="shelf__art-f" /></>}
    {i === 2 && <>{[14, 30, 46, 62, 78, 94].map((x, j) => <rect key={x} x={x} y={46 - [18, 26, 14, 32, 22, 36][j]!} width="10" height={[18, 26, 14, 32, 22, 36][j]} rx="2" className={j === 5 ? 'shelf__art-d' : 'shelf__art-f'} />)}</>}
    {i === 3 && <>{[10, 24, 38].map((y) => <g key={y}><circle cx="16" cy={y + 4} r="3" className="shelf__art-d" /><rect x="26" y={y} width={y === 24 ? 60 : 78} height="8" rx="4" className="shelf__art-f" /></g>)}</>}
    {i === 4 && <><rect x="12" y="10" width="60" height="36" rx="4" className="shelf__art-l" /><polyline points="22,30 30,38 44,20" className="shelf__art-l" /><rect x="82" y="14" width="26" height="6" rx="3" className="shelf__art-f" /><rect x="82" y="26" width="26" height="6" rx="3" className="shelf__art-f" /><rect x="82" y="38" width="18" height="6" rx="3" className="shelf__art-d" /></>}
    {i === 5 && <><path d="M60 8 L84 16 V30 C84 40 72 48 60 50 C48 48 36 40 36 30 V16 Z" className="shelf__art-l" /><circle cx="60" cy="29" r="5" className="shelf__art-d" /></>}
  </svg>;
}

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
/** Every role, the one being viewed first; the Product Architect (every surface) last. */
const shelfOrder = (role: RoleKey): RoleKey[] => [role, ...ROLE_KEYS.filter((k) => k !== role && k !== 'architect'), ...(role === 'architect' ? [] : ['architect' as RoleKey])];
/** What it is for (V2.5.3's four audiences). */
const FOR = [
  ['For the operator', 'One room record from request to recommission, with the people, the money, the design, the tests, the documents and the service history on it — and the authority behind each.'],
  ['For the engineer', 'Adaptive commissioning from a rule pack, measurement provenance that refuses dBFS as SPL, a golden baseline that is never a score, APEX that cites its evidence and names its uncertainty.'],
  ['For the executive', 'Twenty-seven passports that show their numerator and denominator, pending decisions with their scope revision, and usage that says “not measurable” instead of inventing a number.'],
  ['For the technician', 'Assigned jobs with everything needed on one screen, a preflight that refuses to start on a booked room or stale parts, an offline queue that will not upload without a fresh sign-in.'],
] as const;

export default function Landing({ role }: PageProps) {
  const va = useViewAs();
  // D44: a role that cannot open the builder is never handed a link to a refusal; it opens as the Designer, said on the button
  const build = opensNative(role, BUILD);
  const c = useMemo(() => { let w = null; try { w = loadWorkspace(); } catch { /* none */ } return campusStats(w); }, []);
  const tiles = Object.fromEntries(c.buildings.map((s) => [s.b.key, { score: s.score, band: s.band, issues: s.open, rooms: s.rooms }]));
  return (
    <div className="lnd">
      <section className="hero lnd__hero">
        <div className="lnd__top"><div>
        <p className="kicker">Investor demonstration · </p>
        <h1>Every state here has a guard, an actor and an event behind it.</h1>
        <p className="lead">Declared is not verified; modeled is not measured — and the product says so itself. Three ways in:</p>
        </div>
        <figure className="lnd__art stage" data-stage="" aria-label="The living campus in 3D"><CampusMap tiles={tiles} onOpen={(b) => { location.hash = `#/campus/${b.key}`; }} /><figcaption className="stage__cap">The living campus: six buildings, each tinted by its modelled health. Select one to go inside.</figcaption></figure>
        </div>
        <div className="start">
          {build
            ? <a className="go launch" href={BUILD}><span className="go__ic" aria-hidden="true"><Icon name="cube" size={22} /></span><b>Launch interactive room builder</b><span>Design a room and watch it reach drawings, commissioning, Search Party and Pro.</span></a>
            : <button type="button" className="go launch" onClick={() => { va.switchTo(OPENS_AS); setTimeout(() => { location.hash = BUILD; }, 0); }}><span className="go__ic" aria-hidden="true"><Icon name="cube" size={22} /></span><b>Launch interactive room builder</b><span>Design a room and watch it reach drawings, commissioning, Search Party and Pro.</span><span className="ui-meta">Opens as Designer · you can switch back any time</span></button>}
          <a className="go" href="#/tours/investor"><span className="go__ic" aria-hidden="true"><Icon name="spark" size={22} /></span><b>Watch a guided scenario</b><span>Seven scenarios · about 14 minutes</span></a>
          <a className="go" href="#problems"><span className="go__ic" aria-hidden="true"><Icon name="check" size={22} /></span><b>What each workflow solves</b><span>The customer problem behind each scenario</span></a>
        </div>
        <a className="lnd__worlds" href="#/worlds" data-testid="worlds-entry"><b>Choose a world</b><span>Enterprise, Stadium, University or Convention: a handful of everyday journeys each, in 2D first</span></a>
        <ul className="lnd__facts" aria-label="This edition"><li><Chip tone="accent">Offline · self-contained</Chip></li><li><Chip tone="warn">Synthetic data</Chip></li><li><Chip tone="muted">No request leaves the page</Chip></li><li><Chip tone="muted">A demonstration of authorisation, not security</Chip></li></ul>
      </section>

      <section className="lnd__now" aria-labelledby="now-h" data-testid="landing-now">
        <div className="lnd__nowhead"><h2 id="now-h">The campus right now</h2><span className="ui-meta">Computed from the {c.rooms} room records and the service workspace · MODELED, not measured</span></div>
        <div className="lnd__nowgrid">
          <a className="lnd__score" href="#/home"><ScoreRing score={c.score} band={c.band} size={84} label="Campus health" caption={`${c.scored} rooms scored`} /></a>
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

      <RoleShelf role={role} />

      <section className="lnd__for" aria-labelledby="for-h">
        <h2 id="for-h">What it is for</h2>
        <ul>{FOR.map(([h, p]) => <li key={h}><p className="kicker">{h}</p><p>{p}</p></li>)}</ul>
      </section>

      <WorkWith />

      <section className="status lnd__disc">
        <h2>Disclosures and coverage</h2>
        <ul className="lnd__dl">
          <li>Every person, organisation, room, device, figure and approval is synthetic; no customer data is present.</li>
          <li>Roles, personas and permissions are a front-end demonstration of a policy, never production security.</li>
          <li>No device, network or acoustic measurement is taken by this page; every health score is modeled from the records.</li>
          <li>This demonstration is built as modular pages from the Living Campus V2.5.3 source. {AREAS.filter((a) => NATIVE.has(a.key)).length} of {AREAS.length} address areas land on a native page; <a href="#/parity">the map of every original address</a> is computed from the page registry, never typed.</li>
        </ul>
      </section>
    </div>
  );
}

/** "Every role, one Core": a carousel of all roles (3 November screen 03), each a flashcard with an illustration, the records and the
 *  surfaces its share of the Core gives it, computed from the policy; the viewed role is first and marked. */
function RoleShelf({ role }: { role: RoleKey }) {
  const va = useViewAs();
  const list = useMemo(() => shelfOrder(role), [role]);
  const [types, setTypes] = useState<Record<string, number> | null>(null);
  useEffect(() => { let on = true; typeCounts().then((t) => { if (on) setTypes(t); }).catch(() => { /* counts stay — */ }); return () => { on = false; }; }, []);
  const track = useRef<HTMLUListElement>(null);
  // 90-2: the shelf's arrows say when there is nothing further that way (disabled at either end), instead of doing nothing
  const [ends, setEnds] = useState<[boolean, boolean]>([true, false]);
  useEffect(() => { const el = track.current; if (!el) return; const up = () => setEnds([el.scrollLeft <= 2, el.scrollLeft + el.clientWidth >= el.scrollWidth - 2]); up();
    el.addEventListener('scroll', up, { passive: true }); window.addEventListener('resize', up); return () => { el.removeEventListener('scroll', up); window.removeEventListener('resize', up); }; }, [list.length]);
  const step = (dir: 1 | -1) => { const el = track.current; if (!el) return; const card = el.querySelector('li'); const w = card ? card.getBoundingClientRect().width + 10 : 220; el.scrollBy({ left: dir * w * 2, behavior: reducedMotion() ? 'auto' : 'smooth' }); };
  return (
    <section className="shelf" aria-labelledby="shelf-h" data-testid="role-shelf">
      <div className="shelf__head"><div>
        <p className="kicker">Perspectives</p>
        <h2 id="shelf-h">Every role, one Core</h2>
        <p className="ui-meta">Each role is given its own share of the same records. View as switches this demonstration to that perspective and opens the page the role starts from — announced, with the way back. A perspective grants nothing.</p>
      </div>
        <div className="shelf__nav"><span className="ui-meta">{list.length} roles</span><button type="button" className="shelf__btn" onClick={() => step(-1)} disabled={ends[0]} aria-label="Earlier roles"><Icon name="chevron-left" size={16} /></button><button type="button" className="shelf__btn" onClick={() => step(1)} disabled={ends[1]} aria-label="Later roles"><Icon name="chevron-right" size={16} /></button></div>
      </div>
      <ul className="shelf__list shelf__track" ref={track}>
        {list.map((k) => { const r = ROLES[k]; const pages = openPages(k).length; const rec = types ? recordsFor(k, types) : null; const here = k === role; return (
          <li key={k}>
            <button type="button" className="shelf__role" data-r={k} data-role-key={k} aria-pressed={here} onClick={() => { if (!here) va.switchTo(k); else location.hash = '#/home'; }}>
              <RoleArt k={k} />
              <span className="shelf__body">
                <b>{r.label}{r.internal && <span className="role-internal" data-testid="role-internal">Internal role</span>}</b>
                <span className="shelf__blurb">{r.blurb}</span>
                <span className="shelf__n" data-testid="shelf-counts">{rec ? <>{rec.records.toLocaleString('en-US')} of {rec.of.toLocaleString('en-US')} records · </> : ''}{pages} of {PAGES.filter((p) => !p.path.includes(':')).length} surfaces</span>
                <span className="shelf__go">{here ? 'Viewing now · open Mission Control' : 'View as'} <Icon name="chevron-right" size={14} /></span>
              </span>
            </button>
          </li>); })}
      </ul>
    </section>
  );
}
