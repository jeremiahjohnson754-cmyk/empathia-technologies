/**
 * The living campus: site → building → floor → room. The isometric 3D campus (extruded buildings, health badges, status colours) sits on
 * a dark stage (D36); every building on it is keyboard reachable and is also in the buildings list with its health bar, so nothing on the
 * map is reachable only by pointer. Every number is computed from the room records (campus/metrics.ts).
 * Addresses: #/campus, #/campus/<B>, #/campus/<B>/<floor>, #/campus/<B>/<floor>/<room>, #/rooms.
 */
import { useEffect, useMemo, useState } from 'react';
import { Tag, Notice } from '@empathia/ui';
import { BUILDINGS, ROOMS, SITE, buildingByKey, roomsIn, roomById, shortName, roomHref, fullName, ARCHETYPE_NAME, REFERENCE_ROOM_ID, type Building } from './canon.js';
import { allRecords, roomRecord, type RoomRecord } from './design.js';
import { campusStats, roomHealth, roomIssues, BAND_LABEL, type BuildingStats } from './metrics.js';
import { load as loadWorkspace, type Workspace } from '../workspace/store.js';
import { CampusMap, FloorPlate, Stage, type CampusTile } from '../spatial/Spatial.js';
import { RoomView, LIFE_TONE } from '../rooms/RoomView.js';
import { StatusDot, Chip, ScoreRing, StatTile, Icon, Section, MeterRow, stateOf } from '../spatial/parts.js';
import type { RoleKey } from '../registry.types.js';
import { resolve } from '../registry.pages.js';
import { canOpen } from '../access/policy.js';

export { LIFE_TONE };
const KIND_LABEL: Record<string, string> = { reference: 'reference room', earlier: 'earlier record', designed: 'designed from archetype' };
const LIFE_ORDER = ['OPERATIONAL', 'ACCEPTED', 'COMMISSIONING', 'INSTALLED_UNVERIFIED', 'INSTALLATION_PENDING', 'DESIGN_APPROVED', 'PLANNED'];

export function parseCampus(hash: string): { b?: string; f?: number; room?: string } {
  const p = hash.replace(/^#\/?/, '').split('?')[0]!.split('/').filter(Boolean);
  if (p[0] !== 'campus') return {};
  return { b: p[1], f: p[2] != null ? Number(p[2]) : undefined, room: p[3] };
}

const go = (h: string) => { location.hash = h; };
function useWs(): Workspace | null {
  const [w, setW] = useState<Workspace | null>(() => { try { return loadWorkspace(); } catch { return null; } });
  useEffect(() => { const f = () => { try { setW(loadWorkspace()); } catch { /* keep */ } }; addEventListener('storage', f); return () => removeEventListener('storage', f); }, []);
  return w;
}
const tilesOf = (bs: BuildingStats[]): Record<string, CampusTile> => Object.fromEntries(bs.map((s) => [s.b.key, { score: s.score, band: s.band, issues: s.open, rooms: s.rooms }]));

export function CampusPage({ hash, sees, role }: { hash: string; sees?: (id: string) => boolean; role?: RoleKey }) {
  const { b, f, room } = parseCampus(hash);
  if (room) {
    const o = roomById(room);
    if (!o || o.building !== b || o.floor !== f) return <NotFound what={`room ${room}`} />;
    const opens = (href: string) => { if (!role) return true; const r = resolve(href); return !!r && canOpen(role, r); };
    return <RoomView id={room} hash={hash} sees={sees} opens={opens} />;
  }
  if (b) { const B = buildingByKey(b); if (!B) return <NotFound what={`building ${b}`} />; if (f != null) { if (!(Number.isInteger(f) && f >= 1 && f <= B.floors)) return <NotFound what={`floor ${f} of ${B.name}`} />; return <FloorPage b={b} f={f} />; } return <BuildingPage b={b} />; }
  return <SitePage />;
}

function NotFound({ what }: { what: string }) {
  return <section className="campus" data-native=""><header className="room__hero"><p className="kicker">Campus</p><h1>Not on this campus</h1><p className="room__intent">There is no {what} in the synthetic campus.</p><div className="room__acts"><a className="ui-btn ui-btn--primary" href="#/campus">Back to the campus</a><a className="ui-btn" href="#/rooms">Every room in a list</a></div></header><Notice tone="warn">There is no {what} in the synthetic campus. <a href="#/campus">Back to the campus</a></Notice></section>;
}

function Crumbs({ items }: { items: Array<[string, string?]> }) {
  return <nav aria-label="Breadcrumb" className="crumbs"><ol>{items.map(([t, h], i) => <li key={i}>{h ? <a href={h}>{t}</a> : <span aria-current="page">{t}</span>}</li>)}</ol></nav>;
}

/** The legend under the 3D stage: band glyphs, the modelled label. */
function Legend() {
  return <div className="legend" aria-label="Legend"><StatusDot band="healthy" label="Healthy 88+" /><StatusDot band="monitor" label="Monitor 75–87" /><StatusDot band="action" label="Action required" /><StatusDot band="none" label="Not scored" /><Chip tone="muted">MODELED · NOT MEASURED</Chip></div>;
}

/** The side preview of the building under the pointer or focus (or the given one). */
function Preview({ s }: { s: BuildingStats }) {
  return (
    <div className="cprev" aria-live="polite" data-testid="campus-preview">
      <div className="cprev__head"><ScoreRing score={s.score} band={s.band} size={72} label="Health" /><div><b>{s.b.name}</b><span className="ui-meta">{s.b.purpose}</span></div></div>
      <dl className="cprev__facts"><div><dt>Rooms</dt><dd>{s.rooms}</dd></div><div><dt>Open issues</dt><dd>{s.open}</dd></div><div><dt>Devices</dt><dd>{s.devices}</dd></div><div><dt>Tests verified</dt><dd>{s.verifiedPct == null ? '—' : `${s.verifiedPct}%`}</dd></div></dl>
      <p className="ui-meta">{s.b.floors} floors · opened {s.b.opened} · {s.scored} of {s.rooms} rooms scored</p>
      <a className="ui-btn ui-btn--primary" href={`#/campus/${s.b.key}`}>Open {s.b.short} <Icon name="chevron" size={14} /></a>
    </div>
  );
}

function BuildingRows({ stats }: { stats: BuildingStats[] }) {
  return <ul className="kit-meters" data-testid="building-list" aria-label="Buildings by health">{stats.map((s) => <MeterRow key={s.b.key} href={`#/campus/${s.b.key}`} label={s.b.name} value={s.score} state={stateOf(s.band)} sub={`${s.rooms} rooms · ${s.open} open issue${s.open === 1 ? '' : 's'} · ${s.verifiedPct == null ? '—' : `${s.verifiedPct}%`} tests verified · ${s.devices} devices · ${s.score == null ? 'not scored' : BAND_LABEL[s.band]}`} />)}</ul>;
}

function SitePage() {
  const w = useWs();
  const c = useMemo(() => campusStats(w), [w]);
  const [peek, setPeek] = useState<Building | null>(null);
  const shown = c.buildings.find((s) => s.b.key === (peek?.key || 'ATL'))!;
  return (
    <section className="campus" data-native="" data-testid="campus-site">
      <header className="room__hero campus__hero">
        <div className="campus__herot">
          <p className="kicker">The living campus · synthetic</p>
          <h1>{SITE.name}</h1>
          <p className="room__intent">{BUILDINGS.length} buildings, {c.rooms} rooms, {c.devices} devices. Select a building to go inside.</p>
          <p className="ui-meta">One complete reference room, three that keep this demonstration’s earlier records, and {ROOMS.filter((r) => r.kind === 'designed').length} designed from their archetypes — modelled layouts and devices, never surveyed.</p>
        </div>
        <div className="campus__score"><ScoreRing score={c.score} band={c.band} size={104} label="Campus health" caption={`mean of ${c.scored} scored rooms`} /></div>
      </header>
      <div className="campus__stagewrap">
        <Stage label="Campus in 3D" testId="campus-stage"><CampusMap tiles={tilesOf(c.buildings)} onOpen={(B) => go(`#/campus/${B.key}`)} onPreview={setPeek} /><Legend /></Stage>
        <Preview s={shown} />
      </div>
      <div className="tiles">
        <StatTile label="Healthy rooms" value={c.healthy} unit={`of ${c.rooms}`} sub={`${c.monitor} to monitor · ${c.action} need action · ${c.unscored} not scored`} icon="heart" />
        <StatTile label="Open issues" value={c.open} sub={`${c.high} High · record issues and live service requests`} tone={c.high ? 'monitor' : undefined} icon="alert" />
        <StatTile label="Tests verified" value={c.verifiedPct ?? '—'} unit="%" sub={`${c.verified} of ${c.applicable} applicable tests passed and independently verified`} icon="check" />
        <StatTile label="Accepted rooms" value={c.accepted} unit={`of ${c.rooms}`} sub="with a current commissioning baseline" icon="cycle" />
      </div>
      <Section title="Buildings" aside="Health · rooms · issues · tests verified" id="bld-h"><BuildingRows stats={c.buildings} /></Section>
      <Section title="Rooms by lifecycle" aside={`${c.rooms} rooms`} id="life-h">
        <ul className="campus__stats lifebar" aria-label="Rooms by lifecycle">{LIFE_ORDER.filter((s) => c.byLife[s]).map((s) => <li key={s} className={`lifebar__s lifebar__s--${(LIFE_TONE[s] || 'muted')}`} style={{ flexGrow: c.byLife[s] }}><b>{c.byLife[s]}</b><span>{s.replace(/_/g, ' ').toLowerCase()}</span></li>)}</ul>
      </Section>
      <nav className="campus__more" aria-label="More on the campus">
        <a href="#/rooms" className="mlink"><Icon name="room" /><span><b>Every room in one list</b><span className="ui-meta">Filter by lifecycle and building</span></span></a>
        <a href={roomHref(roomById(REFERENCE_ROOM_ID)!)} className="mlink"><Icon name="cube" /><span><b>The reference room in 3D</b><span className="ui-meta">Atlas 4.218, its devices, tests and history</span></span></a>
        <a href="#/search/scenarios" className="mlink"><Icon name="people" /><span><b>Support paths</b><span className="ui-meta">Who supports each space, from recorded relationships</span></span></a>
        <a href="#/search" className="mlink"><Icon name="graph" /><span><b>The campus in the model</b><span className="ui-meta">Search Party: what connects to what</span></span></a>
      </nav>
    </section>
  );
}

function BuildingPage({ b }: { b: string }) {
  const w = useWs();
  const B = buildingByKey(b)!; const c = useMemo(() => campusStats(w), [w]); const s = c.buildings.find((x) => x.b.key === b)!;
  const floors = Array.from({ length: B.floors }, (_, i) => B.floors - i);
  return (
    <section className="campus" data-native="" data-testid="campus-building">
      <Crumbs items={[['Campus', '#/campus'], [B.name]]} />
      <header className="room__hero campus__hero">
        <div className="campus__herot"><p className="kicker">{B.short} · opened {B.opened} · {B.floors} floors</p><h1>{B.name}</h1><p className="room__intent">{B.purpose}.</p><p className="ui-meta">Source: {B.source}.</p></div>
        <div className="campus__score"><ScoreRing score={s.score} band={s.band} size={104} label="Building health" caption={s.score == null ? 'not scored' : `mean of ${s.scored} scored rooms`} /></div>
      </header>
      <div className="tiles">
        <StatTile label="Rooms" value={s.rooms} sub={`${s.scored} scored`} icon="room" />
        <StatTile label="Open issues" value={s.open} sub={`${s.high} High`} tone={s.high ? 'monitor' : undefined} icon="alert" />
        <StatTile label="Devices" value={s.devices} sub="positions across its rooms" icon="device" />
        <StatTile label="Tests verified" value={s.verifiedPct ?? '—'} unit={s.verifiedPct == null ? undefined : '%'} sub={`${s.verified} of ${s.applicable}`} icon="check" />
      </div>
      <div className="campus__stagewrap">
        <Stage label={`Campus in 3D with ${B.name} selected`} testId="campus-stage"><CampusMap tiles={tilesOf(c.buildings)} current={b} onOpen={(x) => go(`#/campus/${x.key}`)} /><Legend /></Stage>
        <Section title="Floors" aside="Top floor first" id="floors-h">
          <ul className="campus__floors floors">{floors.map((f) => { const rs = roomsIn(b, f); return (
            <li key={f}><a href={`#/campus/${b}/${f}`} className="campus__card floor" data-testid={`floor-${b}-${f}`}><span className="floor__n">{f}</span><span className="floor__body"><b>Floor {f}</b><span className="ui-meta">{rs.length ? `${rs.length} room${rs.length === 1 ? '' : 's'} in the canonical campus` : 'no room of the canonical campus on this floor'}</span>{rs.length > 0 && <span className="floor__rooms">{rs.map((r) => { const h = roomHealth(roomRecord(r.id)!, w); return <span key={r.id} className={`floor__room floor__room--${h.band}`}>{r.number}</span>; })}</span>}</span></a></li>); })}</ul>
        </Section>
      </div>
      <Section title="Rooms in this building" aside={`${s.rooms} rooms`} id="brooms-h"><RoomList rows={roomsIn(b).map((o) => roomRecord(o.id)!)} caption={`Rooms of ${B.name}`} w={w} /></Section>
    </section>
  );
}

function FloorPage({ b, f }: { b: string; f: number }) {
  const w = useWs();
  const B = buildingByKey(b)!; const rs = roomsIn(b, f).map((o) => roomRecord(o.id)!);
  return (
    <section className="campus" data-native="" data-testid="campus-floor">
      <Crumbs items={[['Campus', '#/campus'], [B.name, `#/campus/${b}`], [`Floor ${f}`]]} />
      <header className="campus__head"><div><p className="kicker">{B.name}</p><h1>Floor {f}</h1><p className="ui-muted">{rs.length ? `${rs.length} room${rs.length === 1 ? '' : 's'} of the canonical campus. Select a room to open it.` : 'No room of the canonical campus on this floor.'}</p></div><nav className="campus__step" aria-label="Floors">{f > 1 && <a className="ui-btn" href={`#/campus/${b}/${f - 1}`}>Floor {f - 1}</a>}{f < B.floors && <a className="ui-btn" href={`#/campus/${b}/${f + 1}`}>Floor {f + 1}</a>}</nav></header>
      {rs.length ? <Stage label={`Floor plate of ${B.name} floor ${f}`} testId="floor-stage"><FloorPlate rooms={rs.map((r) => ({ id: r.outline.id, label: shortName(r.outline), w: r.outline.dims[0], l: r.outline.dims[1], state: r.lifecycle, issues: roomIssues(r, w).length }))} onOpen={(id) => go(roomHref(roomById(id)!))} /></Stage>
        : <div className="empty"><b>No room of the canonical campus on this floor</b><p>The demonstration models thirty rooms; this floor has none of them. Other floors of {B.name} do.</p></div>}
      <RoomList rows={rs} w={w} />
    </section>
  );
}

export function RoomList({ rows, caption, w }: { rows: RoomRecord[]; caption?: string; w?: Workspace | null }) {
  if (!rows.length) return null;
  return (
    <div className="table-wrap"><table className="build__table" data-testid="room-list">{caption && <caption className="ui-visually-hidden">{caption}</caption>}
      <thead><tr><th scope="col">Room</th><th scope="col">Archetype</th><th scope="col">Seats</th><th scope="col">Lifecycle</th><th scope="col">Tests verified</th><th scope="col">Open issues</th><th scope="col">Health</th><th scope="col">Record</th></tr></thead>
      <tbody>{rows.map((r) => { const h = roomHealth(r, w); return <tr key={r.outline.id}><th scope="row"><a href={roomHref(r.outline)}>{fullName(r.outline)}</a><div className="ui-meta mono">{r.outline.id}</div></th><td>{ARCHETYPE_NAME[r.outline.archetype]}</td><td>{r.outline.capacity}</td><td><Tag tone={LIFE_TONE[r.lifecycle] || 'muted'}>{r.lifecycle}</Tag></td><td>{r.counts.verified} of {r.counts.applicable}</td><td>{roomIssues(r, w).length || '—'}</td><td><StatusDot band={h.band} label={h.score == null ? 'not scored' : String(h.score)} /></td><td>{KIND_LABEL[r.outline.kind]}</td></tr>; })}</tbody>
    </table></div>
  );
}

export function RoomsIndex({ hash }: { hash: string }) {
  const w = useWs();
  const q = new URLSearchParams(/\?(.*)$/.exec(hash)?.[1] || '');
  const state = q.get('state') || ''; const b = q.get('building') || ''; const band = q.get('health') || '';
  const all = allRecords(); const rows = all.filter((r) => (!state || r.lifecycle === state) && (!b || r.outline.building === b) && (!band || roomHealth(r, w).band === band));
  const set = (k: string, v: string) => { const n = new URLSearchParams(q); if (v) n.set(k, v); else n.delete(k); go(`#/rooms${n.toString() ? `?${n}` : ''}`); };
  return (
    <section className="campus" data-native="" data-testid="rooms-index">
      <Crumbs items={[['Campus', '#/campus'], ['Rooms']]} />
      <header className="campus__head"><div><p className="kicker">The canonical campus</p><h1>Thirty rooms</h1><p className="ui-muted">Every room opens in the same room page. Coverage says per room what is complete, modelled or a gap.</p></div></header>
      <div className="filters"><label>Lifecycle <select value={state} onChange={(e) => set('state', e.target.value)}><option value="">Every state</option>{[...new Set(all.map((r) => r.lifecycle))].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label>Building <select value={b} onChange={(e) => set('building', e.target.value)}><option value="">Every building</option>{BUILDINGS.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}</select></label>
        <label>Health <select value={band} onChange={(e) => set('health', e.target.value)}><option value="">Any</option>{(['healthy', 'monitor', 'action', 'none'] as const).map((x) => <option key={x} value={x}>{BAND_LABEL[x]}</option>)}</select></label>
        <span className="ui-meta" role="status">{rows.length} of {all.length} rooms</span></div>
      {rows.length ? <RoomList rows={rows} caption="Rooms of the canonical campus" w={w} /> : <div className="empty"><b>No room matches</b><p>Clear a filter to see more rooms.</p></div>}
    </section>
  );
}
