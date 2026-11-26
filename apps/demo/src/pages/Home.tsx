/**
 * Mission Control (#/home) — the demonstration's front door. V2.5.3's Mission Control (role eyebrow and date, the narrative "N rooms need
 * action…", Room Assurance · Change impact · Commissioning · Design a space · Search everything · Guided experience, the campus status
 * mini-map, campus health, healthy rooms, rooms needing attention, critical issues), the rebuild's lifecycle stations (Intake → Service,
 * here the 45 rooms on their station of the delivery flow) and the inspiration's composition (hero with the Search Party bar, product
 * tiles, a greeting for the current role with what needs its attention, "What can I help you do?", stat tiles with sparklines, mission
 * flow, saved work, priority actions with Take action / Resume / Review, recent incidents, active rooms, the Search Party insight).
 *
 * Every number and row is computed from the records (campus/metrics.ts, campus/mission.ts) and opens the record it names. Role-aware:
 * View as changes whose work comes first, and a link the role cannot open is never offered (D44). Nothing here is live monitoring.
 *
 * 25 Nov 2026, metric integrity (campus/definitions.ts holds what each number means). The headline is the viewer's own count, the items
 * waiting for the viewed role; the sentence under it splits that count into parts that add up to it, then says how many rooms need
 * attention and how many of those are at risk. The hero button opens the record the sentence names first: it used to open the newest live
 * request (ISS-0421, a Standard request in Atlas 4.220) while the sentence named Atlas 4.218 and its High request ISS-0417.
 */
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type { PageProps } from '../registry.types.js';
import { resolve, hrefOf } from '../registry.pages.js';
import { canOpen, ROLES } from '../access/policy.js';
import { PRODUCTS, StatTile as KTile } from '@empathia/ui';
import { allRecords, DEMO_NOW, PEOPLE } from '../campus/design.js';
import { shortName, roomHref, roomById } from '../campus/canon.js';
import { campusStats, attentionQueue, BAND_LABEL, type BuildingStats } from '../campus/metrics.js';
import { METRICS, HOME_METRICS } from '../campus/definitions.js';
import { series, flow, priorities, prioritiesFor, incidents, activeRooms, savedWork, insight, type Priority, type StationKey } from '../campus/mission.js';
import { programme } from '../campus/programme.js';
import { load as loadWorkspace, type Workspace } from '../workspace/store.js';
import { loadDraft } from '../build/store.js';
import { openPages } from '../viewas/scope.js';
import { SearchBar } from '../search/SearchBar.js';
import { CampusMap, Stage } from '../spatial/Spatial.js';
import { StatusDot, Chip, Icon, Section, List, ListRow, MeterRow, EmptyState, ScoreRing, stateOf } from '../spatial/parts.js';
import { MISSION_ROLES } from '../campus/rolehome.js';
import RoleHome, { JumpBar, useStart } from './RoleHome.js';

const DAY = 864e5;
const ago = (t: number) => { const m = Math.round((Date.now() - t) / 6e4); return m < 60 ? `${Math.max(1, m)} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : Math.round(m / 1440) === 1 ? '1 day ago' : `${Math.round(m / 1440)} days ago`; };
const who = (p: string) => PEOPLE[p]?.replace(' (synthetic)', '') || p;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const SEV_TONE: Record<string, 'bad' | 'warn' | 'info'> = { 'Mission critical': 'bad', High: 'bad', Standard: 'info' };

function useWs(): Workspace | null {
  const [w, setW] = useState<Workspace | null>(() => { try { return loadWorkspace(); } catch { return null; } });
  useEffect(() => { const f = () => { try { setW(loadWorkspace()); } catch { /* keep */ } }; addEventListener('storage', f); return () => removeEventListener('storage', f); }, []);
  return w;
}

interface Decision { id: string; title: string; where: string; decides: string; href: string; tone: 'warn' | 'bad' | 'info' }
/** What waits for a person (kept for the other screens and tests that read it): see campus/mission.ts › priorities for the full queue. */
export function decisionsWaiting(w: Workspace | null): Decision[] {
  return priorities(w).filter((p) => p.verb === 'Review' || /^Triage /.test(p.title)).map((p) => ({ id: p.id, title: p.title, where: p.where, decides: p.decides, href: p.href, tone: p.tone }));
}

interface Change { at: number; title: string; detail: string; where: string; href?: string; denied: boolean }
/** 25 Nov 2026: the recorded event types, read aloud in plain words (an external review met "lifecycle refused" and could not tell what it
 *  meant). The record keeps its type; only the title changes. A type not listed falls back to its own words. */
const EVENT_TITLE: Record<string, string> = {
  'room.lifecycle_changed': 'Stage changed', 'room.lifecycle_refused': 'Stage change held back: a condition is not met', 'room.design_created': 'Room designed', 'room.revision_saved': 'Design revision saved', 'room.created': 'Room created', 'room.classification_approved': 'Room classification approved',
  'commission.result_recorded': 'Test result recorded', 'commission.result_verified': 'Test result verified by a second person', 'commission.asset_replaced': 'Unit replaced',
  'issue.opened': 'Issue opened', 'issue.assign': 'Issue assigned', 'policy.exception_requested': 'Design exception requested', 'baseline.approve': 'Baseline approved',
  'service.raise': 'Service request raised', 'service.triage': 'Service request triaged', 'service.assign': 'Technician assigned', 'service.dispatch': 'Technician dispatched', 'service.preflight': 'Pre-dispatch checks', 'service.evidence': 'Field evidence added', 'service.verify': 'Repair verified', 'service.handoff': 'Work handed over', 'service.replan': 'Work replanned', 'service.stock': 'Parts checked',
  'apex.open': 'Diagnosis opened', 'apex.opened': 'Diagnosis opened', 'apex.hypothesis_recorded': 'Possible cause recorded', 'apex.diagnosis_reviewed': 'Diagnosis reviewed', 'apex.act': 'Diagnosis acted on',
  'learn.propose': 'Lesson proposed', 'learn.case_proposed': 'Lesson proposed', 'learn.sme_review': 'Lesson reviewed by a specialist',
};
const eventTitle = (type: string) => EVENT_TITLE[type] || type.replace(/^[a-z]+\./, '').replace(/_/g, ' ');
/** Changes recorded in the last 7 days: room events (relative to the demonstration's fixed now) and service workspace events. */
export function recentChanges(w: Workspace | null): Array<Change & { n: number }> {
  const out: Change[] = [];
  for (const r of allRecords()) for (const e of r.events) { const t = Date.parse(e.at); if (DEMO_NOW - t <= 7 * DAY && e.type !== 'record.kept') out.push({ at: Date.now() - (DEMO_NOW - t), title: eventTitle(e.type), detail: `${e.detail} · ${who(e.by)}`, where: shortName(r.outline), href: roomHref(r.outline), denied: e.outcome === 'DENIED' }); }
  for (const e of w?.events || []) { const t = Date.parse(e.at); if (Date.now() - t <= 7 * DAY) out.push({ at: t, title: eventTitle(e.type), detail: `${e.detail}${e.by ? ` · ${who(e.by)}` : ''}`, where: e.aggregate, denied: e.outcome === 'DENIED' }); }
  // the same change recorded in many rooms on the same day reads as one line naming how many rooms
  const groups = new Map<string, Change & { n: number }>();
  for (const x of out.sort((a, b) => b.at - a.at)) { const k = `${x.title}|${x.detail}|${Math.floor(x.at / DAY)}`; const g = groups.get(k); if (g) { g.n += 1; g.where = `${g.n} rooms`; g.href = undefined; } else groups.set(k, { ...x, n: 1 }); }
  return [...groups.values()];
}

function More<T>({ items, n, render, label }: { items: T[]; n: number; render: (x: T, i: number) => ReactElement; label: string }) {
  const [all, setAll] = useState(false);
  return <>{(all ? items : items.slice(0, n)).map(render)}{items.length > n && <li className="kit-row-li row--more"><button type="button" className="sp__more" aria-expanded={all} onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show ${items.length - n} more of ${items.length} ${label}`}</button></li>}</>;
}

/* ------------------------------------------------------------------------------------------------ progressive disclosure (25 Nov 2026)
 * Commercial-readiness directive §5: the briefing, the Mission flow, your priorities and the campus stay open; the rest is one click away,
 * each group a native disclosure that remembers, per viewer, whether it was left open (§5.3: an experienced user who keeps "Every product"
 * open finds it open next time). Browser storage only for that convenience; every read and write may fail and the page works without it. */
const GROUPS_KEY = 'empathia.mc.open.v1';
const readOpen = (): Record<string, boolean> => { try { return JSON.parse(localStorage.getItem(GROUPS_KEY) || '{}') || {}; } catch { return {}; } };
function Group({ id, title, sub, count, children }: { id: string; title: string; sub: string; count?: number; children: ReactElement }) {
  const [open, setOpen] = useState(() => !!readOpen()[id]);
  return (
    <details className="mc-group" data-group={id} open={open} onToggle={(e: { currentTarget: HTMLDetailsElement }) => { const o = e.currentTarget.open; setOpen(o); try { localStorage.setItem(GROUPS_KEY, JSON.stringify({ ...readOpen(), [id]: o })); } catch { /* the choice lasts the page */ } }}>
      <summary><span className="mc-group__t"><b>{title}</b>{count != null && <span className="mc-count">{count}</span>}</span><span className="ui-meta">{sub}</span></summary>
      <div className="mc-group__body">{children}</div>
    </details>
  );
}

/* ------------------------------------------------------------------------------------------------ first visit (25 Nov 2026)
 * Directive §7: an optional introduction, built on what exists (the guided tours at #/tours, the investor welcome at #/investor, Core
 * Replay), shown once in a card above the briefing — never a dialog over the page, never on a deep link (it is part of #/home only) — dismissed
 * for good with "Not now" or by taking a path, and brought back with "Show the introduction again" at the foot of the page. */
const INTRO_KEY = 'empathia.intro.v1'; const INTRO_EVENT = 'empathia:intro';
const introSeen = () => { try { return localStorage.getItem(INTRO_KEY) === 'seen'; } catch { return true; } };
const markIntro = () => { try { localStorage.setItem(INTRO_KEY, 'seen'); } catch { /* shown again next visit */ } };
const forgetIntro = () => { try { localStorage.removeItem(INTRO_KEY); } catch { /* nothing kept */ } };
function FirstVisit({ opens }: { opens: (href: string) => boolean }) {
  const [show, setShow] = useState(() => !introSeen());
  useEffect(() => { const f = () => setShow(true); addEventListener(INTRO_EVENT, f); return () => removeEventListener(INTRO_EVENT, f); }, []);
  if (!show) return null;
  const paths = [
    { href: '#/tours', t: 'Take a guided tour', s: 'Seven short scenarios, narrated, step by step', primary: true },
    { href: '#/replay/R-ATL-4-218', t: 'Follow one room’s whole story', s: 'From the request to an accepted room in service' },
    { href: '#/investor', t: 'Choose what to see first', s: 'Six first choices, from a room in 3D to SIGNAL' },
  ].filter((x) => opens(x.href));
  const close = () => { markIntro(); setShow(false); };
  return (
    <aside className="mc-intro" aria-labelledby="mc-intro-h" data-testid="mc-intro">
      <div className="mc-intro__t">
        <h2 id="mc-intro-h">New to Empathia? Start here.</h2>
        <p>Empathia follows every room from the request to an engineered, commissioned and accepted space in operation, and keeps the evidence of each step. This is Mission Control, where the people who run the estate start. Every record in this demonstration is synthetic.</p>
      </div>
      <ul className="mc-intro__paths">{paths.map((x) => <li key={x.href}><a className={`mc-intro__path${x.primary ? ' is-primary' : ''}`} href={x.href} onClick={markIntro}><b>{x.t}</b><span className="ui-meta">{x.s}</span></a></li>)}</ul>
      <button type="button" className="ui-btn mc-intro__close" onClick={close} data-testid="mc-intro-close">Not now</button>
    </aside>
  );
}

/** One priority row: the verb is the row's one button and opens the record (Take action / Resume / Review). */
function PriorityRow({ p, mine }: { p: Priority; mine: boolean }) {
  return (
    <li className="mc-pri" data-tone={p.tone} data-testid="mc-priority">
      <span className={`row__ic row__ic--${p.tone === 'info' ? 'info' : p.tone}`} aria-hidden="true"><Icon name={p.verb === 'Resume' ? 'clock' : p.verb === 'Review' ? 'shield' : 'alert'} /></span>
      <span className="mc-pri__b"><b>{p.title}</b><span className="ui-meta">{p.where} · {p.decides}{p.at ? ` · ${ago(Date.parse(p.at))}` : ''}{mine ? '' : ' · another role’s work'}</span></span>
      <a className={`ui-btn ui-btn--sm${p.verb === 'Take action' && mine ? ' ui-btn--primary' : ''}`} href={p.href} aria-label={`${p.verb}: ${p.title}`}>{p.verb}</a>
    </li>
  );
}

/** #/home: Mission Control for the roles that run the estate (V2.5.3 viewHome), and every other role's own start page (viewHomeFor). */
export default function Home(props: PageProps) { return MISSION_ROLES.includes(props.role) ? <MissionControl {...props} /> : <RoleHome {...props} />; }

function MissionControl({ role }: PageProps) {
  const w = useWs(); const start = useStart(role);
  const draft = useMemo(() => loadDraft(), [w]);   // eslint-disable-line react-hooks/exhaustive-deps
  const opens = (href: string) => { const r = resolve(href.split('?')[0]!); return !!r && canOpen(role, r); };
  const R = ROLES[role];
  const c = useMemo(() => campusStats(w), [w]);
  const queue = useMemo(() => attentionQueue(w), [w]);
  const S = useMemo(() => series(w), [w]);
  const stations = useMemo(() => flow(w, draft), [w, draft]);
  const all = useMemo(() => priorities(w), [w]);
  const pri = prioritiesFor(role, opens, all);
  const inc = useMemo(() => incidents(w), [w]);
  const active = useMemo(() => activeRooms(w), [w]);
  const saved = useMemo(() => savedWork(w, draft), [w, draft]);
  const ins = useMemo(() => insight(w), [w]);
  const changes = useMemo(() => recentChanges(w), [w]); const nChanges = changes.reduce((n, x) => n + x.n, 0);
  const P = programme();
  const pages = useMemo(() => openPages(role), [role]);
  const liveReq = inc.filter((i) => i.live);
  const wos = (w?.workOrders || []).filter((x) => !['DONE', 'CANCELLED'].includes(x.state));
  // the headline: the items waiting for the viewed role (METRICS['actions.yours']); its parts by verb add up to it
  const yours = pri.mine.length; const byVerb = (v: Priority['verb']) => pri.mine.filter((p) => p.verb === v).length;
  const toAct = byVerb('Take action'), toResume = byVerb('Resume'), decisions = byVerb('Review');
  // the rooms: needing attention, and at risk (a part of it) — the same populations as the campus tiles and the rooms list filters
  const first = queue[0]; const watch = Math.max(0, c.attention - c.atRisk);
  // the record the sentence names first, and the one the hero button opens: the first room's first issue (most severe first)
  const firstIssue = first?.issues[0];
  const firstHref = !first ? undefined : firstIssue?.live && firstIssue.href && opens(firstIssue.href) ? firstIssue.href : opens(roomHref(first.r.outline)) ? roomHref(first.r.outline) : undefined;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const [station, setStation] = useState<StationKey | null>(null);
  const [others, setOthers] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);
  const last = (s: number[]) => s[s.length - 1] ?? 0; const prev = (s: number[]) => s[s.length - 2] ?? 0;

  // the nine products the role can open, in the canonical order (D37/D40), each with one number from the records
  const pnum: Record<string, string> = {
    'mission-control': plural(decisions, 'decision') + ' to review', lite: `${c.rooms} rooms modeled`, pro: plural(c.open, 'open issue'), 'search-party': `${c.devices} device positions`,
    servicehands: plural(liveReq.length, 'live request'), commissioning: c.verifiedPct == null ? 'no test on record' : `${c.verifiedPct}% tests verified`,
    // 25 Nov 2026: a count of nothing read as an unused product ("0 scans", "0 lessons"); where nothing has been started yet the tile says
    // what can be started instead. The number returns as soon as there is one; nothing is seeded to fill it.
    apex: (w?.apexCases || []).length ? plural((w?.apexCases || []).length, 'diagnosis', 'diagnoses') : 'Diagnose a fault',
    field: (w?.fiSessions || []).length ? plural((w?.fiSessions || []).length, 'scan') : 'Check a room on site',
    learn: (w?.learnCases || []).length ? plural((w?.learnCases || []).length, 'lesson') : 'Learn from a real case',
  };
  const products = PRODUCTS.map((p) => ({ p, landing: pages.find((x) => x.product === p.id && x.landing) ?? pages.find((x) => x.product === p.id) })).filter((x) => x.landing && x.p.id !== 'mission-control');
  // V2.5.3's entries and "What can I help you do?", role-filtered
  const actions = [
    { href: '#/room', icon: 'room', t: 'Room Assurance', s: 'Atlas 4.218: health, delivery stages, what moved' },
    { href: '#/search/scenarios/S1', icon: 'graph', t: 'Change impact', s: 'What a failing switch takes down' },
    { href: '#/room?tab=tests', icon: 'check', t: 'Commissioning', s: 'Tests, who recorded, who verified' },
    { href: '#/v25/build', icon: 'cube', t: 'Design a space', s: 'A furnished room you change by hand' },
    { href: '#/search', icon: 'search', t: 'Search everything', s: 'Rooms, devices, people, relationships' },
    { href: '#/tours', icon: 'spark', t: 'Guided experience', s: 'Seven scenarios, step by step' },
    { href: '#/servicehands/new', icon: 'plus', t: 'Report a problem', s: 'In plain words, followed to closure' },
    { href: '#/campus', icon: 'map', t: 'Find a room', s: 'The campus, building by building' },
  ].filter((a) => opens(a.href)).slice(0, 6);
  const tiles = Object.fromEntries(c.buildings.map((s: BuildingStats) => [s.b.key, { score: s.score, band: s.band, issues: s.open, rooms: s.rooms }]));
  const sel = stations.find((s) => s.key === station) || null;
  const roomLink = (href: string | undefined, label: string) => (href && opens(href) ? <a href={href}>{label}</a> : <>{label}</>);

  return (
    <section className="home mc" data-native="" data-testid="home" data-r={role}>
      {/* ================================================================ layer 1 · understand: the briefing (the one greeting on the page) */}
      <FirstVisit opens={opens} />
      <header className="mc-hero" data-testid="mc-hero">
        <div className="mc-hero__t">
          <p className="kicker"><span className="home__live" aria-hidden="true" />Mission Control · one connected lifecycle · {R.label} · {today}</p>
          <div className="mc-hero__h"><h1 tabIndex={-1} data-testid="mc-headline" data-count={yours}>{greeting()}, {R.label} — {yours === 0 ? 'nothing waits for you' : `${plural(yours, 'item')} wait${yours === 1 ? 's' : ''} for you`}</h1><span className="mc-hero__tag">Mission Control</span></div>
          <p className="home__say" data-testid="home-say">
            {yours ? <><b data-testid="mc-split">{toAct} to act on, {toResume} to resume and {plural(decisions, 'decision')} to review</b>.</> : <>Nothing on record waits for a {R.label}{pri.others.length ? `; ${plural(pri.others.length, 'item')} wait${pri.others.length === 1 ? 's' : ''} for other roles` : ''}.</>}
            {' '}Across the campus, <b data-testid="mc-attention">{plural(c.attention, 'room')} need{c.attention === 1 ? 's' : ''} attention</b>{c.atRisk ? <>; <b data-testid="mc-risk">{c.atRisk} of them {c.atRisk === 1 ? 'is' : 'are'} at risk</b>, because an open issue is critical or the room scores below 75</> : ''}{watch && c.atRisk ? <>, and {watch} {watch === 1 ? 'is' : 'are'} worth watching</> : ''}.
            {first && <> {roomLink(roomHref(first.r.outline), shortName(first.r.outline))} comes first{firstIssue ? <>: <span data-testid="mc-first-issue">{firstIssue.id}</span>, {firstIssue.title.charAt(0).toLowerCase() + firstIssue.title.slice(1)}</> : ''}.</>}
            {' '}{nChanges} change{nChanges === 1 ? ' was' : 's were'} recorded this week.
          </p>
          {opens('#/search') && <div className="mc-hero__search"><span className="mc-hero__sp" aria-hidden="true"><Icon name="search" size={20} /> Search Party</span><SearchBar hero role={role} answers={opens('#/find')} label="Ask Search Party" placeholder="Try “4.218”, “ISS-0417”, “switch” or a device category" /></div>}
          <div className="mc-hero__acts">{first && firstHref && <a className="ui-btn ui-btn--primary" href={firstHref} data-testid="mc-open-first" data-record={firstIssue?.id || first.r.outline.id} data-room={first.r.outline.id}><Icon name="alert" /> Open {firstIssue?.id || shortName(first.r.outline)}</a>}{opens('#/replay') && <a className="ui-btn" href="#/replay/R-ATL-4-218"><Icon name="clock" /> Replay a story</a>}</div>
          {opens('#/search') && <p className="mc-hero__try ui-meta">Try {[['#/search?q=4.218', '4.218'], ['#/search?q=camera', 'camera'], ['#/search/scenarios/S1', 'if this switch fails'], ['#/search/scenarios/S2', 'who supports']].filter(([h]) => opens(h!)).map(([h, l], i) => <span key={h}>{i ? ' · ' : ''}<a href={h}>{l}</a></span>)}</p>}
        </div>
        <div className="mc-hero__aside">
          <ScoreRing score={c.score} band={c.band} size={112} label={METRICS['health.average'].label} caption={`${BAND_LABEL[c.band]}${c.atRisk ? ` · ${plural(c.atRisk, 'room')} at risk` : ''} · average of ${c.scored} of ${c.rooms} rooms`} />
          <ul className="mc-hero__facts" aria-label="The campus in numbers">
            <li><b>{c.rooms}</b><span>rooms</span></li><li><b>{c.buildings.length + c.sites.length}</b><span>sites and buildings</span></li><li><b>{c.devices}</b><span>device positions</span></li>
          </ul>
          <p className="ui-meta mc-hero__honest">MODELED from the records · not live monitoring</p>
        </div>
      </header>

      <JumpBar s={start} />

      {/* ================================================================ the centerpiece: every room on its station of the Mission flow */}
      <section className="mc-card mc-flow" aria-labelledby="mc-flow-h" data-testid="mc-flow" ref={flowRef}>
        <div className="mc-card__head"><h2 id="mc-flow-h">Mission flow</h2><span className="ui-meta">Every room on its station, from the request to service · read from lifecycles, baselines and open issues</span>{opens('#/v25') && <a className="mc-link" href="#/v25">Lifecycle stations <Icon name="chevron" size={14} /></a>}</div>
        <ol className="mc-stations" aria-label="Stations">{stations.map((s, i) => (
          <li key={s.key} className={`mc-st${s.count ? ' mc-st--on' : ''}${s.blocked ? ' mc-st--held' : ''}`} data-station={s.key}>
            <button type="button" aria-pressed={station === s.key} aria-controls="mc-flow-rooms" onClick={() => setStation(station === s.key ? null : s.key)} aria-label={`${s.label}: ${plural(s.count, s.key === 'intake' ? 'request' : 'room')}${s.blocked ? `, ${s.blocked} held` : ''}. ${s.help}`}>
              <span className="mc-st__dot" aria-hidden="true">{s.count ? s.count : <Icon name="check" size={14} />}</span><b>{s.label}</b><span className="ui-meta">{s.blocked ? `${s.blocked} held` : i === stations.length - 1 ? 'nothing open' : s.count ? (s.key === 'intake' ? 'requests' : 'rooms') : 'none'}</span>
            </button>
          </li>))}</ol>
        <div id="mc-flow-rooms" className="mc-flow__rooms" aria-live="polite">
          {sel ? <><p className="ui-meta"><b>{sel.label}</b> · {sel.help}{sel.key !== 'intake' && sel.count > 0 && opens('#/rooms') ? <> · <a href={sel.href}>these {plural(sel.count, 'room')} in the room list</a></> : ''}</p>
            {sel.key === 'intake' ? <ul className="mc-chips">{(sel.items || []).map((x) => <li key={x}><Chip tone="accent" href={opens('#/v25/build') ? '#/v25/build' : undefined}>{x}</Chip></li>)}</ul>
              : sel.rooms.length ? <ul className="mc-chips">{sel.rooms.map((r) => <li key={r.id}><Chip tone="accent" href={opens(r.href) ? r.href : undefined}>{r.label}</Chip></li>)}</ul> : <p className="ui-meta">No room is on this station.</p>}</>
            : <p className="ui-meta">Choose a station to see its rooms.</p>}
        </div>
      </section>

      {/* ================================================================ layer 2 · act: your work, and the live requests */}
      <div className="mc-row mc-row--act">
        <section className="mc-card" aria-labelledby="mc-pri-h" data-testid="mc-priorities">
          <div className="mc-card__head"><h2 id="mc-pri-h">Priority actions</h2><span className="mc-count" data-testid="mc-pri-count" title="Waiting for you">{pri.mine.length}</span>{pri.others.length > 0 && <button type="button" className="mc-link" aria-pressed={others} onClick={() => setOthers(!others)}>{others ? 'Only mine' : `+${pri.others.length} for other roles`}</button>}</div>
          {pri.mine.length || (others && pri.others.length) ? <ul className="mc-pris" id="mc-pri-list"><More items={[...pri.mine.map((p) => [p, true] as const), ...(others ? pri.others.map((p) => [p, false] as const) : [])]} n={5} label="actions" render={([p, m]) => <PriorityRow key={p.id} p={p} mine={m} />} /></ul>
            : <EmptyState title={`Nothing waits for a ${R.label}`} icon="check">{pri.others.length ? 'Other roles have work on record; show it above.' : 'No decision, repair or test on record waits for a person.'}</EmptyState>}
        </section>
        <section className="mc-card" aria-labelledby="mc-inc-h" data-testid="mc-incidents">
          <div className="mc-card__head"><h2 id="mc-inc-h">Recent incidents</h2><span className="mc-count">{plural(liveReq.length, 'live', 'live')}</span>{opens('#/v25/service') && <a className="mc-link" href="#/v25/service">All <Icon name="chevron" size={14} /></a>}</div>
          {inc.length ? <List label="Recent incidents">{inc.slice(0, 4).map((i) => <ListRow key={i.id} href={opens(i.href) ? i.href : (i.roomHref && opens(i.roomHref) ? i.roomHref : undefined)} leading={<span className={`row__ic row__ic--${i.live ? SEV_TONE[i.severity] : 'muted'}`}><Icon name={i.live ? 'alert' : 'check'} /></span>} title={i.title} sub={`${i.id} · ${i.room} · ${ago(Date.parse(i.at))}`} trailing={<Chip tone={i.live ? SEV_TONE[i.severity] : 'muted'}>{i.live ? i.severity : i.state.toLowerCase()}</Chip>} />)}</List>
            : <EmptyState title="No incident on record" icon="check">The service workspace holds no request.</EmptyState>}
        </section>
      </div>

      {/* ================================================================ layer 3 · the environment: the campus, its health and its numbers */}
      <div className="mc-row mc-row--campus">
        <Section title="Campus status" aside={opens('#/campus') ? <a href="#/campus">Open campus</a> : undefined} id="home-campus-h">
          <Stage label="Campus in 3D" testId="home-stage"><CampusMap tiles={tiles} onOpen={(b) => { if (opens(`#/campus/${b.key}`)) location.hash = `#/campus/${b.key}`; }} /></Stage>
          <ul className="kit-meters home__brows" aria-label="Buildings by health">{[...c.buildings, ...c.sites].map((s) => <MeterRow key={s.b.key} href={opens(`#/campus/${s.b.key}`) ? `#/campus/${s.b.key}` : undefined} label={s.b.name} value={s.score} state={stateOf(s.band)} sub={`${plural(s.rooms, 'room')}${s.atRisk ? ` · ${s.atRisk} at risk` : ''} · ${plural(s.open, 'open issue')}${s.lowest && s.lowest.score < 88 ? ` · lowest ${s.lowest.label}, ${s.lowest.score}` : ''} · ${s.verifiedPct ?? '—'}${s.verifiedPct == null ? '' : '%'} verified`} />)}</ul>
        </Section>
        <div className="mc-numbers">
          <div className="mc-tiles" data-testid="home-kpis">
            <KTile label={METRICS['health.average'].label} testId="kpi-health" value={c.score} unit="/100" icon="pulse" tone={c.band === 'healthy' ? 'ok' : c.band === 'monitor' ? 'warn' : c.band === 'action' ? 'bad' : 'muted'} hint={`${BAND_LABEL[c.band]} · average of ${c.scored} scored rooms${c.lowest ? ` · lowest ${c.lowest.label}, ${c.lowest.score}` : ''}`} href={opens('#/campus') ? '#/campus' : undefined} />
            <KTile label={METRICS['rooms.healthy'].label} testId="kpi-healthy" value={c.healthy} unit={` of ${c.rooms}`} icon="pulse" tone="ok" hint={`${c.monitor} monitor · ${c.action} action required · ${c.unscored} not scored`} href={opens('#/rooms') ? '#/rooms?health=healthy' : undefined} />
            <KTile label={METRICS['rooms.attention'].label} testId="kpi-attention" value={c.attention} unit={` of ${c.rooms}`} icon="alert" tone={c.atRisk ? 'bad' : c.attention ? 'warn' : 'ok'} hint={`${c.atRisk} at risk · ${watch} to watch`} href={opens('#/rooms') ? '#/rooms?attention=all' : undefined} />
            <KTile label={METRICS['issues.critical'].label} testId="kpi-critical" value={c.high} icon="alert" tone={c.high ? 'bad' : 'ok'} hint={`severity High · in ${plural(c.highRooms, 'room')} · ${c.open} open in all`} href={opens('#/rooms') ? '#/rooms?attention=risk' : undefined} />
            <KTile label="Commissioning readiness" value={c.verifiedPct} unit="%" icon="check" tone="commissioning" spark={S.verified.values} delta={{ value: last(S.verified.values) - prev(S.verified.values), good: 'up', label: 'tests verified last month' }} href={opens('#/room') ? '#/room?tab=tests' : undefined} />
            <KTile label="Accepted rooms" value={c.accepted} unit={` of ${c.rooms}`} icon="route" tone="lite" spark={S.accepted.values} delta={{ value: last(S.accepted.values) - prev(S.accepted.values), good: 'up', label: 'since last month' }} href={opens('#/rooms') ? '#/rooms?state=ACCEPTED' : undefined} />
            <KTile label={METRICS['requests.open'].label} testId="kpi-requests" value={liveReq.length} icon="wrench" tone="servicehands" spark={S.requests.values} hint={`${plural(wos.length, 'work order')} open`} href={opens('#/v25/service') ? '#/v25/service' : undefined} />
            <KTile label="Funding authorized" value={`$${Math.round(P.funding.reduce((s, f) => s + f.amount, 0) / 1000)}k`} icon="ticket" tone="mission-control" hint={`${P.funding.length} of ${P.projects.length} projects funded · not a quote`} href={opens('#/v25/decisions') ? '#/v25/decisions' : undefined} />
          </div>
          <details className="mc-defs" data-testid="mc-defs"><summary>How these numbers are counted</summary>
            <dl>{HOME_METRICS.map((id) => { const m = METRICS[id]; return <div key={id} data-metric={id}><dt>{m.label}</dt><dd>{m.meaning} <span className="ui-meta">Counts {m.counts.charAt(0).toLowerCase() + m.counts.slice(1)} Leaves out {m.excludes.charAt(0).toLowerCase() + m.excludes.slice(1)} {m.denominator}{m.evidence === 'MODELED' ? ' Modeled from the synthetic records, not measured.' : ''}</span></dd></div>; })}</dl>
          </details>
        </div>
      </div>

      {/* ================================================================ layer 4 · discover: one click away, each group remembered open or closed */}
      <section className="mc-more" aria-labelledby="mc-more-h" data-testid="mc-more">
        <h2 id="mc-more-h" className="mc-more__h">More from Mission Control</h2>
        <Group id="products" title="Every product" count={products.length} sub="Nine products on one record">
          {products.length > 0 ? <nav className="mc-products" aria-label="Products" data-testid="mc-products">
            {products.map(({ p, landing }) => <a key={p.id} href={hrefOf(landing!.id)} className={`mc-prod kit-s--${p.id}`} data-p={p.id}><span className="mc-prod__mark" aria-hidden="true" /><b>{p.name}</b><span className="mc-prod__sub">{p.subtitle}</span><span className="mc-prod__n">{pnum[p.id]}</span><Icon name="chevron" size={16} /></a>)}
          </nav> : <p className="ui-meta">This role opens no product from here.</p>}
        </Group>
        <Group id="start" title="Start something" count={actions.length} sub="What can I help you do?">
          <section className="mc-help" aria-label="What can I help you do?" data-testid="mc-actions">
            {actions.length ? <ul className="mc-help__list">{actions.map((a) => <li key={a.href}><a href={a.href} className="mc-act"><span className="mc-act__ic" aria-hidden="true"><Icon name={a.icon} /></span><span><b>{a.t}</b><span className="ui-meta">{a.s}</span></span></a></li>)}</ul>
              : <EmptyState title="Nothing to start here" icon="inbox">This role’s work starts elsewhere.</EmptyState>}
          </section>
        </Group>
        <Group id="active" title="Active rooms" count={active.length} sub="A live request, commissioning or a baseline pending">
          <section aria-label="Active rooms" data-testid="mc-active">
            {active.length ? <ul className="mc-rooms">{active.slice(0, 6).map((a) => { const body = <><span className="mc-room__top"><b>{a.label}</b><StatusDot band={a.score == null ? 'none' : a.score >= 88 ? 'healthy' : a.score >= 75 ? 'monitor' : 'action'} label={a.score == null ? 'not scored' : String(a.score)} /></span><span className="mc-room__n">{a.name}</span><span className="ui-meta">{a.why}</span></>; return <li key={a.id} className={`mc-room kit-s--${a.tone}`}>{opens(a.href) ? <a href={a.href}>{body}</a> : <div>{body}</div>}</li>; })}</ul>
              : <EmptyState title="No room is active" icon="check">No live request, commissioning or pending baseline on record.</EmptyState>}
            {opens('#/rooms') && <a className="mc-link" href="#/rooms">Every room <Icon name="chevron" size={14} /></a>}
          </section>
        </Group>
        <Group id="insight" title="Search Party insight" sub="Questions answered from recorded relationships">
          <section className="mc-insight" aria-label="Search Party insight" data-testid="mc-insight">
            <p>{ins.text}</p>
            <p className="ui-meta">Computed from the records just now; each question below is answered from recorded relationships, with their sources.</p>
            <ul className="mc-asks">{ins.asks.filter((a) => opens(a.href)).map((a) => <li key={a.q}><a href={a.href} className="mc-ask"><Icon name="graph" size={16} /> {a.q}</a></li>)}</ul>
            {opens('#/search') && <a className="ui-btn ui-btn--primary" href="#/search"><Icon name="search" /> Open in Search Party</a>}
          </section>
        </Group>
        <Group id="saved" title="Saved work" count={saved.filter((x) => opens(x.href)).length || undefined} sub={saved.filter((x) => opens(x.href)).length ? 'Work left part-way, kept until it is finished' : 'Nothing left part-way: a draft, diagnosis or lesson you start waits here'}>
          <section aria-label="Saved work" data-testid="mc-saved">
            {saved.filter((x) => opens(x.href)).length ? <List label="Saved work">{saved.filter((x) => opens(x.href)).slice(0, 4).map((x) => <ListRow key={x.id} href={x.href} leading={<span className="row__ic"><Icon name={x.icon} /></span>} title={x.title} sub={`${x.sub}${x.at ? ` · ${ago(Date.parse(x.at))}` : ''}`} chevron />)}</List>
              : <EmptyState title="Nothing saved part-way" icon="inbox">A Build a Room draft, a diagnosis or a lesson you start is kept here until it is finished.{opens('#/v25/build') ? <> <a href="#/v25/build">Design a space</a>.</> : ''}</EmptyState>}
          </section>
        </Group>
        <Group id="changes" title="Recent changes" count={nChanges} sub="Last 7 days · newest first">
          <section aria-label="Recent changes" data-testid="changes">
            {changes.length ? <List label="Recent changes"><More items={changes} n={6} label="changes" render={(x, i) => <ListRow key={i} href={x.href && opens(x.href) ? x.href : undefined} leading={<span className={`row__ic${x.denied ? ' row__ic--bad' : ''}`}><Icon name="clock" /></span>} title={`${x.title} · ${x.where}`} sub={x.detail} trailing={<span className="ui-meta">{ago(x.at)}{x.denied ? ' · refused' : ''}</span>} />} /></List>
              : <EmptyState title="No change this week" icon="clock">Nothing was recorded in the last seven days.</EmptyState>}
          </section>
        </Group>
      </section>
      <p className="ui-meta mc-foot">Every figure on this page is computed from the demonstration’s synthetic records ({c.rooms} room records, the programme, the service workspace) when the page opens; nothing is measured or monitored. {roomById('R-ATL-4-218') ? 'Atlas 4.218 is the complete reference record.' : ''} <button type="button" className="mc-link" data-testid="mc-intro-again" onClick={() => { forgetIntro(); dispatchEvent(new Event(INTRO_EVENT)); scrollTo({ top: 0 }); }}>Show the introduction again</button></p>
    </section>
  );
}
