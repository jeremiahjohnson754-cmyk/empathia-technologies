/**
 * Empathia Lite: the living campus for the people who use it — visitors, employees, room users — and for the engineers, executive
 * support and designers who keep it working. One lazily loaded chunk serves every Lite address (V2.5.3's #/lite… space):
 *   #/lite                        the campus scene, the lenses, the 14 spaces, guides, visit, wayfinding, QR, Commons and Scouter (D41)
 *   #/lite/b/<B>[/<floor>]        building and floor browsing
 *   #/lite/room/<id>?mode&state&ov&cfg   every room of the 45 as an interactive 3D room with layers, overlays and four states
 *   #/lite/space/<id> · services · guides[/<g>[/<ch>]] · way?to= · visit · qr · commons?scene=
 * Access is the shell's policy (D44): lenses, layers and overlays a role may not use are not rendered at all.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { PageHero, Card, Chip, ScoreRing, MeterRow, StatusDot, bandOf, Icon, EmptyState, type IconName } from '@empathia/ui';
import type { PageProps, RoleKey } from '../registry.types.js';
import { allows } from '../access/policy.js';
import { SITE, PLAN_ROOMS, ESTATE_ROOMS, REGIONAL_SITES, BUILDINGS, shortName, buildingByKey } from '../campus/canon.js';
import { roomRecord, openIssues } from '../campus/design.js';
import { LIFE_TONE } from '../campus/CampusPage.js';
import { LITE_TAGLINE, SPACES, GUIDES, VISITOR_PATH, CAMPUS_PLAZA } from './data/v253.js';
import { lensesFor, lensFor, ALL_SITES, roomsOf, buildingSummary, campusSummary, readiness, liteRoomHref, chapterCount, type Lens } from './model.js';
import { LiteRoom } from './LiteRoom.js';
import { LitePortfolio } from './LitePortfolio.js';
import { SpacePage, ServicesPage, GuidesPage, WayPage, VisitPage, QrPage, CommonsPage } from './LitePlaces.js';

const LENS_KEY = 'empathia.lite.lens';
/** the viewer's chosen lens (a per-viewer convenience; the policy decides what is offered) */
export function storedLens(role: RoleKey, asked?: string | null): Lens | null {
  let saved: string | null = null; try { saved = localStorage.getItem(LENS_KEY); } catch { /* storage may be blocked */ }
  return lensFor(role, asked || saved);
}
export function saveLens(l: string) { try { localStorage.setItem(LENS_KEY, l); } catch { /* storage may be blocked */ } }
export const setQuery = (base: string, q: URLSearchParams) => { const s = q.toString(); history.replaceState(null, '', `${base}${s ? `?${s}` : ''}`); dispatchEvent(new HashChangeEvent('hashchange')); };

export default function LiteApp(props: PageProps) {
  const sub = (props.params['*'] || '').split('/').filter(Boolean).map((s) => decodeURIComponent(s));
  const [a, b, c] = sub;
  let body: ReactNode;
  if (!a) body = <LiteHome {...props} />;
  else if (a === 'b' && b) body = <LiteBuilding {...props} b={b} f={c} />;
  else if (a === 'room' && b) body = <LiteRoom {...props} id={b} />;
  else if (a === 'space' && b) body = <SpacePage {...props} id={b} />;
  else if (a === 'services' || a === 'spaces') body = <ServicesPage {...props} />;
  else if (a === 'guides') body = <GuidesPage {...props} g={b} ch={c} />;
  else if (a === 'way') body = <WayPage {...props} />;
  else if (a === 'visit') body = <VisitPage {...props} />;
  else if (a === 'qr') body = <QrPage {...props} />;
  else if (a === 'commons') body = <CommonsPage {...props} />;
  else if (a === 'optimize') body = allows({ lens: 'optimize' }, props.role) ? <LitePortfolio {...props} /> : <LiteMissing what="Portfolio Optimize for this role" />;
  else body = <LiteMissing what={`the Lite address “${sub.join('/')}”`} />;
  return <div className="lt" data-native="" data-testid="lite">{body}</div>;
}

export function LiteMissing({ what }: { what: string }) {
  return <section className="lt-page"><LiteNav here="" role={null} /><EmptyState title="Not in Lite" icon="map">There is no {what} on the synthetic campus. <a href="#/lite">Back to the campus</a></EmptyState></section>;
}

const NAV: Array<[string, string, IconName, (r: RoleKey) => boolean]> = [
  ['', 'Campus', 'campus', () => true],
  ['services', 'Places', 'place', (r) => allows({ area: 'lite.services' }, r)],
  ['guides', 'Guides', 'book', (r) => allows({ area: 'lite.guides' }, r)],
  ['way', 'Wayfinding', 'route', () => true],
  ['visit', 'Visit', 'user', () => true],
  ['commons', 'Commons', 'users', () => true],
  ['qr', 'QR', 'grid', () => true],
  ['optimize', 'Optimize', 'chart', (r) => allows({ lens: 'optimize' }, r)],
];
/** Lite's own navigation (within the shell): every place a role may open, Scouter kept discoverable (D41). */
export function LiteNav({ here, role }: { here: string; role: RoleKey | null }) {
  const items = NAV.filter(([, , , ok]) => !role || ok(role));
  const scouter = role && allows({ area: 'scouter' }, role);
  return (
    <nav className="lt-nav" aria-label="Empathia Lite">
      <a className="lt-nav__brand" href="#/lite"><span className="lt-nav__mark" aria-hidden="true">L</span><span>Empathia <b>Lite</b></span></a>
      <ul>{items.map(([k, label, icon]) => <li key={k}><a href={`#/lite${k ? `/${k}` : ''}`} aria-current={here === k ? 'page' : undefined}><Icon name={icon} size={16} /><span>{label}</span></a></li>)}
        {scouter && <li><a href="#/lite/scouter" className="lt-nav__scouter"><Icon name="spark" size={16} /><span>Scouter</span></a></li>}</ul>
    </nav>
  );
}

function LensPicker({ role, lens, onPick }: { role: RoleKey; lens: Lens | null; onPick: (l: Lens) => void }) {
  const open = lensesFor(role);
  if (open.length < 2) return null;
  return (
    <div className="lt-lenses" role="radiogroup" aria-label="Lite lens">
      {open.map((l) => <button key={l.key} type="button" role="radio" aria-checked={lens === l.key} className={`lt-lens${lens === l.key ? ' on' : ''}`} onClick={() => onPick(l.key)} data-testid={`lite-lens-${l.key}`}><b>{l.label}</b><span>{l.gives} · {l.says}</span></button>)}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ home: the campus scene
function LiteHome({ role }: PageProps) {
  const [lens, setLens] = useState<Lens | null>(() => storedLens(role));
  const s = useMemo(() => campusSummary(), []);
  const scouter = allows({ area: 'scouter' }, role); const services = allows({ area: 'lite.services' }, role);
  const pick = (l: Lens) => { saveLens(l); setLens(l); };
  return (
    <section className="lt-page" data-testid="lite-home">
      <LiteNav here="" role={role} />
      <PageHero product="lite" icon="campus" eyebrow="Empathia Lite · Living campus experience" title={SITE.name}
        lede={<>{LITE_TAGLINE} {BUILDINGS.length} buildings on the campus and {REGIONAL_SITES.length} fictional sites beyond it, {s.rooms} rooms — {s.plan} added by the rooms plan and {ESTATE_ROOMS.length} by the 90-room estate — {SPACES.length} workplace spaces and {GUIDES.length} guides of {chapterCount()} chapters. Synthetic, modeled, never surveyed.</>}
        meta={[<Chip key="a" small tone="ok" icon="check">{s.accepted} accepted</Chip>, <Chip key="c" small tone="warn" icon="clock">{s.commissioning} commissioning</Chip>, <Chip key="i" small tone={s.issues ? 'warn' : 'ok'} icon="alert">{s.issues} open issue{s.issues === 1 ? '' : 's'}</Chip>, <Chip key="s" small tone="muted">Synthetic campus · seed 20261020</Chip>]}
        aside={<ScoreRing value={s.score} label="Campus readiness" caption="Computed from the room records: verified tests and open issues" />} />
      <LensPicker role={role} lens={lens} onPick={pick} />
      <div className="lt-home">
        <Card title="The campus" sub="Choose a building. Height is floors; colour is readiness from the record." icon="campus" pad={false} testId="lite-campus-card">
          <figure className="stage lt-stage" data-stage=""><CampusScene onOpen={(k) => { location.hash = `#/lite/b/${k}`; }} /><figcaption className="stage__cap lt-capchips"><Chip small tone="muted" icon="moon">Stage stays dark (D36)</Chip><Chip small tone="ok">green · healthy</Chip><Chip small tone="warn">amber · monitor</Chip><Chip small tone="bad">red · action</Chip><span>Footprints from V2.5.3 BUILDINGS · readiness computed from the room records</span></figcaption></figure>
        </Card>
        <div className="lt-side">
          {scouter && <Card title="Scouter in Lite" sub="Does this device suit this room?" icon="spark" tone="lite" testId="lite-scouter-card">
            <p className="ui-muted">Each catalogued model checked against the room’s own record — seats, geometry, connections and power — with the source of every figure, before anyone buys it.</p>
            <a className="ui-btn ui-btn--primary lt-cta" href="#/lite/scouter">Ask Scouter</a></Card>}
          <Card title="Buildings" icon="building">
            <ul className="lt-meters">{ALL_SITES.map((B) => { const b = buildingSummary(B.key); return <li key={B.key}><MeterRow label={B.name} sub={`${b.rooms} rooms${b.issues ? ` · ${b.issues} open issue${b.issues === 1 ? '' : 's'}` : ''}${B.source.includes('regional') ? ' · regional site' : ''}`} value={b.score} href={`#/lite/b/${B.key}`} /></li>; })}</ul>
          </Card>
        </div>
      </div>
      <h2 className="lt-h2">Explore</h2>
      <ul className="lt-tiles">
        {services && <Tile href="#/lite/services" icon="place" title="Places and services" sub={`${SPACES.length} spaces: lobby, Tech Zone, Commons, amenities`} />}
        <Tile href="#/lite/guides" icon="book" title="Guides" sub={`${GUIDES.length} guides · ${chapterCount()} chapters`} />
        <Tile href="#/lite/way" icon="route" title="Wayfinding" sub="A route to any room or place" />
        <Tile href="#/lite/visit" icon="user" title="Visit" sub="Arrive, check in, meet your host, sign out" />
        <Tile href="#/lite/commons" icon="users" title="The Commons" sub="Lunch, quiet work, busy day, events" />
        <Tile href="#/lite/qr" icon="grid" title="QR codes" sub="What each code on campus opens" />
      </ul>
      <h2 className="lt-h2">Fifteen rooms of the plan</h2>
      <p className="ui-muted lt-lede">Town halls, an auditorium, war rooms, operations centres and the Global Operations Control Tower — each with one scenario. Operations rooms are simulated and non-operational.</p>
      <ul className="lt-rooms">{PLAN_ROOMS.map((o) => <li key={o.id}><RoomCard id={o.id} extra={o.scenario} /></li>)}</ul>
      <EstateSectors />
    </section>
  );
}

function Tile({ href, icon, title, sub }: { href: string; icon: IconName; title: string; sub: string }) {
  return <li><a className="lt-tile" href={href}><span className="lt-tile__icon" aria-hidden="true"><Icon name={icon} size={20} /></span><b>{title}</b><span className="ui-muted">{sub}</span></a></li>;
}

export /** Rooms 46–90 of the 90-room estate, a sector at a time: nine sectors of five, each room with what it shows (docs/surpass/ENTERPRISE_90_ROOMS.md). */
function EstateSectors() {
  const sectors = useMemo(() => [...new Set(ESTATE_ROOMS.map((o) => o.sector!))], []); const [sector, setSector] = useState(sectors[0]!);
  const rooms = ESTATE_ROOMS.filter((o) => o.sector === sector);
  return (
    <section aria-labelledby="lt-estate-h" data-testid="lite-estate" data-sector={sector}>
      <h2 className="lt-h2" id="lt-estate-h">Forty-five more rooms, in nine sectors</h2>
      <p className="ui-muted lt-lede">The estate beyond the first forty-five: briefing centres, broadcast and operations rooms, clinics and lecture halls, plants and galleries. Each is designed from an archetype, with one scenario. Synthetic and modeled.</p>
      <div className="lt-sectors" role="group" aria-label="Sector">{sectors.map((x) => <button key={x} type="button" className="lt-sector" aria-pressed={x === sector} onClick={() => setSector(x)} data-testid="lite-sector">{x}</button>)}</div>
      <ul className="lt-rooms" aria-live="polite">{rooms.map((o) => <li key={o.id}><RoomCard id={o.id} extra={`${o.scenario} Shows: ${o.roster!.showcase}.`} /></li>)}</ul>
    </section>
  );
}
function RoomCard({ id, extra }: { id: string; extra?: string }) {
  const r = roomRecord(id)!; const o = r.outline; const score = readiness(r); const n = openIssues(r).length;
  return (
    <a className="lt-room" href={liteRoomHref(id)} data-testid={`lite-room-${id}`}>
      <span className="lt-room__top"><span className="lt-room__name">{o.name}</span><StatusDot state={bandOf(score)} hideLabel /></span>
      <span className="ui-meta">{shortName(o)} · {r.archetypeName} · {o.capacity} seats</span>
      <span className="lt-room__chips"><Chip small tone={LIFE_TONE[r.lifecycle] || 'muted'}>{r.lifecycle.toLowerCase().replace(/_/g, ' ')}</Chip>{n > 0 && <Chip small tone="warn" icon="alert">{n} open</Chip>}{o.nonOperational && <Chip small tone="muted">non-operational</Chip>}{o.divisible && <Chip small tone="info">divisible</Chip>}</span>
      {extra && <span className="lt-room__extra">{extra}</span>}
    </a>
  );
}

/** The campus in isometric 3D: buildings as extruded blocks at their footprints, height by floors, tone by readiness. */
function CampusScene({ onOpen, current }: { onOpen: (k: string) => void; current?: string }) {
  const S = 70; const cos = Math.cos(Math.PI / 6), sin = Math.sin(Math.PI / 6); const FH = 0.36;
  const P = (x: number, y: number, z: number): [number, number] => [(x - y) * cos * S, ((x + y) * sin - z) * S];
  const pts = (a: Array<[number, number, number]>) => a.map(([x, y, z]) => P(x, y, z).map((v) => v.toFixed(1)).join(',')).join(' ');
  const campus = ALL_SITES.filter((b) => !REGIONAL_SITES.some((x) => x.key === b.key));   // the campus map draws its own six buildings; every other site is listed, not drawn
  const order = [...campus].sort((a, b) => a.map.x + a.map.y - (b.map.x + b.map.y));
  const W = 10, D = 8.4; const minX = P(0, D, 0)[0] - 20, maxX = P(W, 0, 0)[0] + 20, maxY = P(W, D, 0)[1] + 20;
  const minY = Math.min(P(0, 0, 0)[1], ...campus.map((b) => P(b.map.x, b.map.y, b.floors * FH)[1])) - 70;
  return (
    <svg className="lt-svg lt-svg--campus" viewBox={`${minX.toFixed(0)} ${minY.toFixed(0)} ${(maxX - minX).toFixed(0)} ${(maxY - minY).toFixed(0)}`} role="group" aria-label="Campus in 3D: six buildings" data-testid="lite-campus-3d">
      <polygon points={pts([[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]])} className="lt-ground" />
      <polyline points={pts(VISITOR_PATH.map(([x, y]) => [x, y, 0.01] as [number, number, number]))} className="lt-route lt-route--way" />
      <polygon points={pts([[CAMPUS_PLAZA[0] - 0.5, CAMPUS_PLAZA[1] - 0.5, 0], [CAMPUS_PLAZA[0] + 0.5, CAMPUS_PLAZA[1] - 0.5, 0], [CAMPUS_PLAZA[0] + 0.5, CAMPUS_PLAZA[1] + 0.5, 0], [CAMPUS_PLAZA[0] - 0.5, CAMPUS_PLAZA[1] + 0.5, 0]])} className="lt-plaza" />
      {order.map((B) => {
        const { x, y, w, d } = B.map; const z = B.floors * FH; const s = buildingSummary(B.key); const band = bandOf(s.score);
        const [lx, ly] = P(x + w / 2, y + d / 2, z);
        return (
          <g key={B.key} className={`lt-bld lt-bld--${band}${current === B.key ? ' on' : ''}`} role="button" tabIndex={0} aria-label={`${B.name}: ${s.rooms} rooms, readiness ${s.score ?? 'not scored'}, ${s.issues} open issue${s.issues === 1 ? '' : 's'}`}
            data-testid={`lite-bld-${B.key}`} onClick={() => onOpen(B.key)} onKeyDown={(e: { key: string; preventDefault: () => void }) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(B.key); } }}>
            <polygon points={pts([[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, z], [x, y + d, z]])} className="lt-bld__s1" />
            <polygon points={pts([[x + w, y, 0], [x + w, y + d, 0], [x + w, y + d, z], [x + w, y, z]])} className="lt-bld__s2" />
            <polygon points={pts([[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]])} className="lt-bld__top" />
            {Array.from({ length: B.floors - 1 }, (_, i) => <polyline key={i} points={pts([[x, y + d, (i + 1) * FH], [x + w, y + d, (i + 1) * FH], [x + w, y, (i + 1) * FH]])} className="lt-bld__floor" />)}
            <g transform={`translate(${lx.toFixed(1)} ${(ly - 18).toFixed(1)})`} className="lt-pill"><rect x={-58} y={-19} width={116} height={38} rx={12} /><text y={-2} textAnchor="middle">{B.short}</text><text y={13} textAnchor="middle" className="lt-pill__fl">{B.floors} floors · {s.rooms} rooms</text>{s.issues > 0 && <g transform="translate(58 -12)" className="lt-pill__n"><circle r={12} /><text y={4} textAnchor="middle">{s.issues}</text></g>}</g>
          </g>
        );
      })}
    </svg>
  );
}

// ------------------------------------------------------------------------------------------------ buildings and floors
function LiteBuilding({ role, b, f }: PageProps & { b: string; f?: string }) {
  const B = buildingByKey(b);
  if (!B || !ALL_SITES.some((x) => x.key === b)) return <LiteMissing what={`building “${b}”`} />;
  const floor = f != null ? Number(f) : null;
  if (floor != null && !(Number.isInteger(floor) && floor >= 1 && floor <= B.floors)) return <LiteMissing what={`floor ${f} of ${B.name}`} />;
  const s = buildingSummary(b); const floors = Array.from({ length: B.floors }, (_, i) => i + 1);
  const rooms = roomsOf(b, floor ?? undefined);
  const regional = REGIONAL_SITES.some((x) => x.key === B.key);
  return (
    <section className="lt-page" data-testid="lite-building">
      <LiteNav here="" role={role} />
      <nav aria-label="Breadcrumb" className="crumbs"><ol><li><a href="#/lite">Lite</a></li><li>{floor == null ? <span aria-current="page">{B.name}</span> : <a href={`#/lite/b/${b}`}>{B.name}</a>}</li>{floor != null && <li><span aria-current="page">Floor {floor}</span></li>}</ol></nav>
      <PageHero product="lite" icon="building" compact eyebrow={regional ? 'Fictional regional site' : `${B.short} · opened ${B.opened}`} title={floor == null ? B.name : `${B.name} · floor ${floor}`}
        lede={`${B.purpose}. ${s.rooms} room${s.rooms === 1 ? '' : 's'} in the campus model${regional ? '; not on the Northstar campus map' : ''}.`}
        aside={<ScoreRing value={s.score} size={96} label="Readiness" caption="Average of its rooms" />} />
      <div className="lt-floors" role="list" aria-label="Floors">
        <a role="listitem" className={`lt-floor${floor == null ? ' on' : ''}`} href={`#/lite/b/${b}`} aria-current={floor == null ? 'page' : undefined}><b>All</b><span>{s.rooms}</span></a>
        {floors.reverse().map((n) => { const c = roomsOf(b, n).length; return <a role="listitem" key={n} className={`lt-floor${floor === n ? ' on' : ''}${c ? '' : ' empty'}`} href={`#/lite/b/${b}/${n}`} aria-current={floor === n ? 'page' : undefined} aria-label={`Floor ${n}: ${c} room${c === 1 ? '' : 's'}`} data-testid={`lite-floor-${n}`}><b>{n}</b><span>{c}</span></a>; })}
      </div>
      {floor != null && rooms.length > 0 && <FloorPlan rooms={rooms.map((o) => o.id)} />}
      {rooms.length ? <ul className="lt-rooms">{rooms.map((o) => <li key={o.id}><RoomCard id={o.id} extra={o.scenario} /></li>)}</ul>
        : <EmptyState title="No modelled room on this floor" icon="building">The campus model has {s.rooms} rooms in {B.name}; none is on floor {floor}. Try another floor.</EmptyState>}
    </section>
  );
}

/** A floor plan: the floor's rooms as tiles proportional to their modelled footprint, wrapped in rows, keyboard reachable. */
function FloorPlan({ rooms }: { rooms: string[] }) {
  const recs = rooms.map((id) => roomRecord(id)!); const S = 22; const maxW = 34; let x = 0, y = 0, rowH = 0;
  const placed = recs.map((r) => { const [w, l] = r.outline.dims; if (x > 0 && x + w > maxW) { x = 0; y += rowH + 1.2; rowH = 0; } const p = { r, x, y, w, l }; x += w + 1.2; rowH = Math.max(rowH, l); return p; });
  const W = Math.max(...placed.map((p) => p.x + p.w)), H = y + rowH;
  return (
    <figure className="stage lt-stage" data-stage="" data-testid="lite-floorplan">
      <svg className="lt-svg" viewBox={`-12 -12 ${W * S + 24} ${H * S + 40}`} role="group" aria-label="Floor plan">
        <rect x={-8} y={-8} width={W * S + 16} height={H * S + 16} rx={10} className="lt-slab" />
        {placed.map(({ r, x: px, y: py, w, l }) => { const sc = readiness(r); const band = bandOf(sc); return (
          <a key={r.outline.id} href={liteRoomHref(r.outline.id)} aria-label={`${shortName(r.outline)} ${r.outline.name}: readiness ${sc}`} className={`lt-tilept lt-tilept--${band}`}>
            <rect x={px * S} y={py * S} width={w * S} height={l * S} rx={6} />
            <text x={px * S + 8} y={py * S + 18} className="lt-tilept__n">{r.outline.number}</text>
            <text x={px * S + 8} y={py * S + 34} className="lt-tilept__l">{r.outline.name.length > Math.floor(w * 2.6) ? `${r.outline.name.slice(0, Math.floor(w * 2.6) - 1)}…` : r.outline.name}</text>
          </a>); })}
        <text x={0} y={H * S + 28} className="fp__scale">Footprints are modelled dimensions (not surveyed) · {S} px = 1 m</text>
      </svg>
    </figure>
  );
}
