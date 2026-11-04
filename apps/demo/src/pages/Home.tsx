/**
 * Home — Mission Control (#/home), V2.5.3's composition and further: one sentence that says what matters, the campus KPIs, the campus in
 * 3D with its buildings, what needs a person (rooms by attention, decisions waiting), recent changes and quick actions. Every number is
 * computed from the records — the room records, the programme and the service workspace (campus/metrics.ts) — never typed in.
 * Links a role cannot open are not offered (D44).
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import type { PageProps } from '../registry.types.js';
import { resolve } from '../registry.pages.js';
import { canOpen, ROLES } from '../access/policy.js';
import { allRecords, DEMO_NOW, PEOPLE } from '../campus/design.js';
import { shortName, roomHref, roomById } from '../campus/canon.js';
import { campusStats, attentionQueue, BAND_LABEL, type BuildingStats } from '../campus/metrics.js';
import { programme } from '../campus/programme.js';
import { load as loadWorkspace, type Workspace } from '../workspace/store.js';
import { CampusMap, Stage } from '../spatial/Spatial.js';
import { StatusDot, Chip, StatTile, Icon, Section, List, ListRow, MeterRow, EmptyState, stateOf } from '../spatial/parts.js';

const DAY = 864e5;
const ago = (t: number) => { const d = Math.floor((Date.now() - t) / DAY); return d <= 0 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`; };
const usd = (n: number) => `$${Math.round(n / 1000)}k`;
const who = (p: string) => PEOPLE[p]?.replace(' (synthetic)', '') || p;

function useWs(): Workspace | null {
  const [w, setW] = useState<Workspace | null>(() => { try { return loadWorkspace(); } catch { return null; } });
  useEffect(() => { const f = () => { try { setW(loadWorkspace()); } catch { /* keep */ } }; addEventListener('storage', f); return () => removeEventListener('storage', f); }, []);
  return w;
}

interface Decision { id: string; title: string; where: string; decides: string; href: string; tone: 'warn' | 'bad' | 'info' }
/** What waits for a person, from the records: exceptions pending approval, baselines pending acceptance, approved but unfunded projects, untriaged requests. */
export function decisionsWaiting(w: Workspace | null): Decision[] {
  const out: Decision[] = [];
  for (const r of allRecords()) {
    if (r.exception?.state === 'PENDING_APPROVAL') out.push({ id: r.exception.id, title: `Approve or refuse the design exception ${r.exception.id}`, where: shortName(r.outline), decides: 'An independent reviewer decides', href: `${roomHref(r.outline)}?tab=history`, tone: 'warn' });
    const pend = r.baselines.find((b) => b.state === 'PENDING_ACCEPTANCE');
    if (pend) out.push({ id: `${r.outline.id}-v${pend.version}`, title: `Accept baseline v${pend.version}${r.nextStep?.blockers.length ? ` — held: ${r.nextStep.blockers.length} reason${r.nextStep.blockers.length === 1 ? '' : 's'}` : ''}`, where: shortName(r.outline), decides: 'The QA reviewer decides', href: `${roomHref(r.outline)}?tab=history`, tone: 'warn' });
  }
  const P = programme();
  for (const p of P.projects) if (p.governance === 'APPROVED' && !P.funding.some((f) => f.projectId === p.id)) { const o = roomById(p.roomIds[0] || ''); out.push({ id: p.id, title: `Fund ${p.id} (approved, scope ${Math.max(...P.decisions.filter((d) => d.projectId === p.id).map((d) => d.scopeRev))})`, where: o ? shortName(o) : p.id, decides: 'The executive sponsor decides', href: '#/v25/decisions', tone: 'info' }); }
  for (const i of w?.incidents || []) if (i.state === 'OPEN') { const o = roomById(i.roomId); out.push({ id: i.id, title: `Triage ${i.id}: ${i.title}`, where: o ? shortName(o) : i.roomName, decides: 'The service manager decides', href: `#/v25/service?id=${i.id}`, tone: i.severity === 'High' || i.severity === 'Mission critical' ? 'bad' : 'warn' }); }
  return out;
}

interface Change { at: number; title: string; detail: string; where: string; href?: string; denied: boolean }
/** Changes recorded in the last 7 days: room events (relative to the demonstration's fixed now) and service workspace events. */
export function recentChanges(w: Workspace | null): Array<Change & { n: number }> {
  const out: Change[] = [];
  for (const r of allRecords()) for (const e of r.events) { const t = Date.parse(e.at); if (DEMO_NOW - t <= 7 * DAY && e.type !== 'record.kept') out.push({ at: Date.now() - (DEMO_NOW - t), title: e.type.replace(/^[a-z]+\./, '').replace(/_/g, ' '), detail: `${e.detail} · ${who(e.by)}`, where: shortName(r.outline), href: roomHref(r.outline), denied: e.outcome === 'DENIED' }); }
  for (const e of w?.events || []) { const t = Date.parse(e.at); if (Date.now() - t <= 7 * DAY) out.push({ at: t, title: e.type.replace(/^[a-z]+\./, '').replace(/_/g, ' '), detail: `${e.detail}${e.by ? ` · ${who(e.by)}` : ''}`, where: e.aggregate, denied: e.outcome === 'DENIED' }); }
  // the same change recorded in many rooms on the same day reads as one line naming how many rooms
  const groups = new Map<string, Change & { n: number }>();
  for (const x of out.sort((a, b) => b.at - a.at)) { const k = `${x.title}|${x.detail}|${Math.floor(x.at / DAY)}`; const g = groups.get(k); if (g) { g.n += 1; g.where = `${g.n} rooms`; g.href = undefined; } else groups.set(k, { ...x, n: 1 }); }
  return [...groups.values()];
}

function More<T>({ items, n, render, label }: { items: T[]; n: number; render: (x: T, i: number) => ReactElement; label: string }) {
  const [all, setAll] = useState(false);
  return <>{(all ? items : items.slice(0, n)).map(render)}{items.length > n && <li className="kit-row-li row--more"><button type="button" className="sp__more" aria-expanded={all} onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show ${items.length - n} more of ${items.length} ${label}`}</button></li>}</>;
}

export default function Home({ role }: PageProps) {
  const w = useWs();
  const opens = (href: string) => { const r = resolve(href); return !!r && canOpen(role, r); };
  const c = useMemo(() => campusStats(w), [w]);
  const queue = useMemo(() => attentionQueue(w), [w]);
  const dec = useMemo(() => decisionsWaiting(w), [w]);
  const changes = useMemo(() => recentChanges(w), [w]); const nChanges = changes.reduce((n, x) => n + x.n, 0);
  const P = programme(); const funded = P.funding.reduce((s, f) => s + f.amount, 0);
  const liveReq = (w?.incidents || []).filter((i) => !['CLOSED', 'CANCELLED', 'RESOLVED'].includes(i.state));
  const first = queue[0];
  const needAction = queue.filter((x) => x.h.band === 'action' || x.issues.some((i) => i.severity === 'High')).length;
  const watch = Math.max(0, queue.length - needAction);
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const entries = [
    { href: '#/room', icon: 'room', t: 'The technical room page', s: 'Atlas 4.218: health, the delivery spine, what moved, open issues' },
    { href: '#/search/scenarios/S1', icon: 'graph', t: 'Change impact', s: 'What a failing switch takes down, from recorded relationships' },
    { href: '#/room?tab=tests', icon: 'check', t: 'Commissioning', s: 'The engine-judged tests, who recorded and who verified each' },
    { href: '#/v25/build', icon: 'cube', t: 'Design a space', s: 'A furnished room you can change by hand' },
  ].filter((e) => opens(e.href.split('?')[0]!));
  const tiles = Object.fromEntries(c.buildings.map((s: BuildingStats) => [s.b.key, { score: s.score, band: s.band, issues: s.open, rooms: s.rooms }]));
  return (
    <section className="home" data-native="" data-testid="home">
      <header className="room__hero home__hero">
        <div className="home__heroT">
          <p className="kicker"><span className="home__live" aria-hidden="true" />{ROLES[role].label} · {today}</p>
          <h1>Mission Control</h1>
          <p className="room__intent">Health, issues, lifecycle and portfolio decisions across the campus.</p>
          <div className="room__chips"><Chip tone="muted">PROTOTYPE · NOT PRODUCTION MONITORING</Chip><Chip tone="muted">MODELED · NOT MEASURED</Chip></div>
          <p className="home__say" data-testid="home-say">
            <b>{needAction} room{needAction === 1 ? '' : 's'} need{needAction === 1 ? 's' : ''} action</b> and {watch} more {watch === 1 ? 'is' : 'are'} worth watching.
            {first && <> {opens(roomHref(first.r.outline).split('?')[0]!) ? <a href={roomHref(first.r.outline)}>{shortName(first.r.outline)}</a> : shortName(first.r.outline)} comes first{first.issues[0] ? <>: {first.issues[0].title.charAt(0).toLowerCase() + first.issues[0].title.slice(1)}</> : ''}.</>}
            {' '}<b>{dec.length} decision{dec.length === 1 ? ' is' : 's are'} waiting for a person</b>, and {nChanges} change{nChanges === 1 ? ' was' : 's were'} recorded this week.
          </p>
        </div>
        {entries.length > 0 && <div className="home__entries"><List label="Start here">{entries.map((e) => <ListRow key={e.href} href={e.href} leading={<span className="row__ic"><Icon name={e.icon} /></span>} title={e.t} sub={e.s} trailing={<span className="home__open">Open</span>} />)}</List></div>}
        <div className="room__acts">{opens('#/search') && <a className="ui-btn ui-btn--primary" href="#/search"><Icon name="search" /> Search everything</a>}{opens('#/tours') && <a className="ui-btn" href="#/tours"><Icon name="spark" /> Guided experience</a>}{opens('#/v25') && <a className="ui-btn" href="#/v25"><Icon name="cycle" /> Lifecycle stations</a>}</div>
      </header>

      <div className="home__grid">
        <div className="tiles tiles--home" data-testid="home-kpis">
          <StatTile label="Campus health" value={c.score ?? '—'} unit="/100" sub={`${BAND_LABEL[c.band]} · mean of ${c.scored} scored rooms`} tone={c.band} icon="heart" />
          <StatTile label="Healthy rooms" value={c.healthy} unit={`of ${c.rooms}`} sub="health 88 or more" icon="heart" />
          <StatTile label="Rooms needing attention" value={queue.length} sub={`${needAction} need action, ${watch} to watch`} tone={queue.length ? 'monitor' : undefined} icon="alert" />
          <StatTile label="Critical issues" testId="kpi-critical" value={c.high} sub={`${c.open} open issues in all`} tone={c.high ? 'action' : undefined} icon="alert" />
          <StatTile label="Commissioning readiness" value={c.verifiedPct ?? '—'} unit="%" sub={`${c.verified} of ${c.applicable} tests verified`} icon="check" />
          <StatTile label="Accepted rooms" value={c.accepted} unit={`of ${c.rooms}`} sub="with a current baseline" icon="cycle" />
          <StatTile label="Open service requests" value={liveReq.length} sub={`${(w?.workOrders || []).filter((x) => !['DONE', 'CANCELLED'].includes(x.state)).length} work orders open`} icon="device" />
          <StatTile label="Funding authorised" value={usd(funded)} sub={`${P.funding.length} of ${P.projects.length} projects funded · not a quote`} icon="passport" />
        </div>
        <Section title="Campus status" aside={opens('#/campus') ? <a href="#/campus">Open campus</a> : undefined} id="home-campus-h">
          <Stage label="Campus in 3D" testId="home-stage"><CampusMap tiles={tiles} onOpen={(b) => { if (opens(`#/campus/${b.key}`)) location.hash = `#/campus/${b.key}`; }} /></Stage>
          <ul className="kit-meters home__brows" aria-label="Buildings by health">{c.buildings.map((s) => <MeterRow key={s.b.key} href={opens(`#/campus/${s.b.key}`) ? `#/campus/${s.b.key}` : undefined} label={s.b.name} value={s.score} state={stateOf(s.band)} sub={`${s.rooms} rooms · ${s.open} open issue${s.open === 1 ? '' : 's'} · ${s.verifiedPct ?? '—'}${s.verifiedPct == null ? '' : '%'} verified`} />)}</ul>
        </Section>
      </div>

      <div className="room__two home__two">
        <div>
          <Section title="What needs you" aside={`Attention queue · ${queue.length} rooms · most urgent first`} id="home-att-h" testId="attention">
            {queue.length ? <List label="Attention queue"><More items={queue} n={4} label="rooms" render={(x) => <ListRow key={x.r.outline.id} href={opens(roomHref(x.r.outline)) ? roomHref(x.r.outline) : undefined} leading={<span className={`row__ic row__ic--${x.issues.some((i) => i.severity === 'High') ? 'bad' : 'warn'}`}><Icon name="alert" /></span>} title={x.issues[0]?.title || 'Health below the healthy band'} sub={`${shortName(x.r.outline)} · ${x.issues.length} open · ${x.issues[0]?.source || x.h.why}`} trailing={<StatusDot band={x.h.band} label={x.h.score == null ? 'not scored' : `${x.h.score}`} />} />} /></List>
              : <EmptyState title="Nothing needs attention" icon="check">No room has an open issue or a health below the healthy band.</EmptyState>}
          </Section>
          <Section title="Decision queue" aside={`${dec.length} waiting for a person`} id="home-dec-h" testId="decisions">
            {dec.length ? <List label="Decision queue"><More items={dec} n={4} label="decisions" render={(d) => <ListRow key={d.id} href={opens(d.href.split('?')[0]!) ? d.href : undefined} leading={<span className="row__ic"><Icon name="passport" /></span>} title={d.title} sub={`${d.where} · ${d.decides}`} trailing={<Chip tone={d.tone}>{d.id}</Chip>} />} /></List>
              : <EmptyState title="No decision waits" icon="check">Nothing in the records is pending a person.</EmptyState>}
          </Section>
        </div>
        <div>
          <Section title="Recent changes" aside="Last 7 days · newest first" id="home-chg-h" testId="changes">
            {changes.length ? <List label="Recent changes"><More items={changes} n={5} label="changes" render={(x, i) => <ListRow key={i} href={x.href && opens(x.href) ? x.href : undefined} leading={<span className={`row__ic${x.denied ? ' row__ic--bad' : ''}`}><Icon name="clock" /></span>} title={`${x.title} · ${x.where}`} sub={x.detail} trailing={<span className="ui-meta">{ago(x.at)}{x.denied ? ' · refused' : ''}</span>} />} /></List>
              : <EmptyState title="No change this week" icon="clock">Nothing was recorded in the last seven days.</EmptyState>}
          </Section>
          <Section title="Quick actions" id="home-qa-h">
            <nav className="campus__more home__quick" aria-label="Quick actions">{[
              ['#/servicehands/new', 'plus', 'Report a problem'], ['#/room', 'room', 'The reference room'], ['#/search/scenarios/S2', 'people', 'Who supports Atlas 4.218?'], ['#/v25/exec', 'passport', 'Executive passports'], ['#/rooms', 'building', 'Every room'],
            ].filter(([h]) => opens(h!)).map(([h, ic, t]) => <a key={h} href={h} className="mlink"><Icon name={ic!} /><span><b>{t}</b></span></a>)}</nav>
          </Section>
        </div>
      </div>
    </section>
  );
}
