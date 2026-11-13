/**
 * Lite for the other three worlds (13 Nov 2026): #/lite/w/<world>, #/lite/w/<world>/b/<building or level>, #/lite/w/<world>/f/<level>,
 * #/lite/w/<world>/r/<room>. Down by tapping the scene, up by the page's links and Back, as on the Enterprise campus. A furnished room is
 * V2.5.3's own drawing for its type, from the estate's record; the rest are shown as rooms on their floor. Everything is synthetic.
 */
import { useMemo, useState } from 'react';
import { PageHero, Card, Chip, Icon, EmptyState, StatTile } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { scene, poly, line, label, hit, box, useCam, L3View, type Cam, type RGB, type L3Scene } from './l3.js';
import { V253RoomStage } from './V253Room.js';
import { v253Drawable } from './v253/v253room.js';
import { LiteMissing, LiteNav, storedLens } from './LiteApp.js';
import { isLiteWorld, WORLD_NAME, worldIndex, topOf, levelsOf, levelPlan, roomsUnder, kids, upOf, archOf, worldRoomHref, worldLevelHref, worldPlaceHref, type LiteWorld } from './worlds.js';
import type { Overlay } from './model.js';
import type { EstateNode } from '../estate/model.js';
import { fixturesFor, type FixtureLayout } from './fixtures.js';

const go = (to: string) => { location.hash = to.replace(/^#/, ''); };
const ROOM: RGB = [62, 60, 54], FURN: RGB = [70, 104, 88], LVL: RGB = [70, 67, 60], BLD: RGB = [74, 71, 64];
const short = (s: string, n = 18) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function LiteWorldPage(props: PageProps & { world: string; rest: string[] }) {
  const { world, rest } = props; if (!isLiteWorld(world)) return <LiteMissing what={`world “${world}”`} />;
  const [k, id] = [rest[0], rest[1] ? decodeURIComponent(rest[1]) : undefined];
  if (!k) return <WorldHome {...props} w={world} />;
  const ix = worldIndex(world); const n = id ? ix.byId.get(id) : undefined;
  if (!n) return <LiteMissing what={`place “${id ?? ''}” in ${WORLD_NAME[world]}`} />;
  if (k === 'b') return <WorldPlace {...props} w={world} n={n} />;
  if (k === 'f' && n.kind === 'level') return <WorldLevel {...props} w={world} n={n} />;
  if (k === 'r' && n.kind === 'room') return <WorldRoom {...props} w={world} n={n} />;
  return <LiteMissing what={`place “${id}” in ${WORLD_NAME[world]}`} />;
}

function Crumbs({ w, trail }: { w: LiteWorld; trail: Array<[string, string | null]> }) {
  return <nav aria-label="Breadcrumb" className="crumbs"><ol><li><a href="#/lite">Lite</a></li><li>{trail.length ? <a href={`#/lite/w/${w}`}>{WORLD_NAME[w]}</a> : <span aria-current="page">{WORLD_NAME[w]}</span>}</li>
    {trail.map(([t, h], i) => <li key={i}>{h ? <a href={h}>{t}</a> : <span aria-current="page">{t}</span>}</li>)}</ol></nav>;
}

// ------------------------------------------------------------------------------------------------ the world
function worldScene(cam: Cam, w: LiteWorld): L3Scene {
  const ix = worldIndex(w); const tops = topOf(w);
  if (w !== 'university') {   // a venue: its levels drawn apart, each plate a button
    const plans = tops.map((l) => levelPlan(w, l.id)); const W = Math.max(...plans.map((p) => p.W)), D = Math.max(...plans.map((p) => p.D)); const G = Math.max(8, Math.min(W, D) / 4);
    const sc = scene(W / 2, D / 2, Math.hypot(W, D) / 2, (tops.length - 1) * G + 3);
    tops.forEach((l, i) => { const z = i * G, P = plans[i]!, to = worldLevelHref(w, l.id);
      box(sc, cam, { x: W / 2, y: D / 2, z: z - 0.6, w: W, d: D, h: 0.6 }, LVL, { pri: -2, L: 2, top: 'url(#l3slab)', stroke: 'rgba(255,246,232,.26)', sw: 0.7, nav: to });
      for (const it of P.items) box(sc, cam, { x: it.x + it.w / 2, y: it.y + it.d / 2, z, w: it.w, d: it.d, h: 1.6 }, it.furnished ? FURN : ROOM, { stroke: 'rgba(255,246,232,.22)', nav: to });
      const n = roomsUnder(ix, l.id).length;
      label(sc, [0, D, z + 0.8], l.name, { anchor: 'start', big: true, sub: `${n} rooms`, nav: to, testId: `lw-level-label-${l.id}` });
      hit(sc, [W / 2, D / 2, z + 1], { nav: to, r: 22, label: `${l.name}: ${n} rooms. Opens the level.`, testId: `lw-level-${l.id}` }); });
    return sc;
  }
  // University: each building at the scale of its largest level, the campuses side by side
  const groups = new Map<string, EstateNode[]>(); for (const b of tops) { const c = b.parent || ''; groups.set(c, [...(groups.get(c) || []), b]); }
  // each campus is a block of buildings in rows; the blocks sit one behind the other, so the whole university fits one view
  const placed: Array<{ b: EstateNode; x: number; y: number; w: number; d: number; levels: number }> = []; let gy = 0; let maxX = 0; const width = 120;
  for (const [, bs] of groups) { let x = 0, y = gy, rowD = 0;
    for (const b of bs) { const ls = levelsOf(ix, b); const ps = ls.map((l) => levelPlan(w, l.id)); const bw = Math.min(46, Math.max(18, ...ps.map((p) => p.W)) * 0.8), bd = Math.min(30, Math.max(14, ...ps.map((p) => p.D)) * 0.8);
      if (x + bw > width) { x = 0; y += rowD + 12; rowD = 0; } placed.push({ b, x, y, w: bw, d: bd, levels: Math.max(1, ls.length) }); x += bw + 12; rowD = Math.max(rowD, bd); maxX = Math.max(maxX, x - 12); }
    gy = y + rowD + 26; }
  const W = maxX, D = gy - 26; const sc = scene(W / 2, D / 2, Math.hypot(W, D) / 2, 10);
  poly(sc, 0, [[-10, -10, -0.05], [W + 10, -10, -0.05], [W + 10, D + 10, -0.05], [-10, D + 10, -0.05]], { f: 'rgba(30,44,36,.9)', s: 'none' });
  for (const p of placed) { const to = worldPlaceHref(w, p.b.id); const n = roomsUnder(ix, p.b.id).length;
    box(sc, cam, { x: p.x + p.w / 2, y: p.y + p.d / 2, w: p.w, d: p.d, h: 3.6 * p.levels }, BLD, { stroke: 'rgba(255,246,232,.3)', nav: to });
    label(sc, [p.x + p.w / 2, p.y + p.d / 2, 3.6 * p.levels + 0.5], short(p.b.name.replace(/ (Building|Centre|Hall|House)$/, ''), 16), { cls: 'soft', nav: to, testId: `lw-bld-label-${p.b.id}` });
    hit(sc, [p.x + p.w / 2, p.y + p.d / 2, 1.8 * p.levels], { nav: to, r: 20, label: `${p.b.name}: ${n} rooms. Opens the building.`, testId: `lw-bld-${p.b.id}` }); }
  return sc;
}
function WorldHome({ w }: PageProps & { w: LiteWorld }) {
  const c = useCam({ yaw: -30, pitch: w === 'university' ? 44 : 24, zoom: 1 }); const sc = useMemo(() => worldScene(c.cam, w), [c.cam, w]);
  const ix = worldIndex(w); const tops = topOf(w); const rooms = ix.estate.nodes.filter((n) => n.kind === 'room'); const furn = rooms.filter((r) => archOf(r) && r.dims);
  return <section className="lt-page lt-page--scene" data-testid="lw-home" data-world={w}>
    <Crumbs w={w} trail={[]} />
    <PageHero product="lite" plain eyebrow="Empathia Lite · another world" title={WORLD_NAME[w]} lede={`${tops.length} ${w === 'university' ? 'buildings' : 'levels'}, ${rooms.length} rooms, every one furnished: ${furn.length} by V2.5.3’s layouts for their type, ${rooms.length - furn.length} by Empathia’s own layouts for the types V2.5.3 never drew. Fictional and synthetic.`} />
    <figure className="stage lt-stage lt-stage--hero" data-stage=""><L3View sc={sc} c={c} onNav={go} label={`${WORLD_NAME[w]} in 3D. Each ${w === 'university' ? 'building' : 'level'} is a button.`} testId="lw-world-3d" tall S={w === 'university' ? 7 : 4} v253 />
      <figcaption className="stage__cap">Tap a {w === 'university' ? 'building' : 'level'} to go inside: {w === 'university' ? 'building, level, room' : 'level, room'}. Laid out by a stated rule from the estate’s records; not a surveyed plan.</figcaption></figure>
    <Card title={w === 'university' ? 'Buildings' : 'Levels'} icon="building" testId="lw-tops"><ul className="lt-wlist">{tops.map((t) => <li key={t.id}><a href={w === 'university' ? worldPlaceHref(w, t.id) : worldLevelHref(w, t.id)} data-testid={`lw-top-${t.id}`}><b>{t.name}</b><span className="ui-meta">{roomsUnder(ix, t.id).length} rooms{t.group ? ` · ${t.group}` : ''}</span></a></li>)}</ul></Card>
    <p className="ui-meta">Also: <a href={`#/estate/${w}`}>{WORLD_NAME[w]} estate</a> · <a href="#/lite">the Enterprise campus in Lite</a></p>
    <LiteNav here="" role={null} />
  </section>;
}

// ------------------------------------------------------------------------------------------------ a building (University) or a venue level
function placeScene(cam: Cam, w: LiteWorld, b: EstateNode): L3Scene {
  const ix = worldIndex(w); const ls = levelsOf(ix, b); const plans = ls.map((l) => levelPlan(w, l.id));
  const W = Math.max(10, ...plans.map((p) => p.W)), D = Math.max(10, ...plans.map((p) => p.D)); const G = Math.max(6.5, Math.min(W, D) / 3);
  const sc = scene(W / 2, D / 2, Math.hypot(W, D) / 2, (ls.length - 1) * G + 2.5);
  ls.forEach((l, i) => { const z = i * G, P = plans[i]!, to = worldLevelHref(w, l.id);
    box(sc, cam, { x: W / 2, y: D / 2, z: z - 0.35, w: W, d: D, h: 0.35 }, LVL, { pri: -2, L: 2, top: 'url(#l3slab)', stroke: 'rgba(255,246,232,.26)', sw: 0.7, nav: to });
    for (const it of P.items) box(sc, cam, { x: it.x + it.w / 2, y: it.y + it.d / 2, z, w: it.w, d: it.d, h: 1.5 }, it.furnished ? FURN : ROOM, { stroke: 'rgba(255,246,232,.22)', nav: to });
    label(sc, [0, D, z + 0.4], l.name, { anchor: 'start', big: true, sub: `${P.items.length} rooms`, nav: to, testId: `lw-level-label-${l.id}` });
    hit(sc, [W / 2, D / 2, z + 1], { nav: to, r: 22, label: `${l.name}: ${P.items.length} rooms. Opens the level.`, testId: `lw-level-${l.id}` }); });
  return sc;
}
function WorldPlace({ w, n }: PageProps & { w: LiteWorld; n: EstateNode }) {
  const c = useCam({ yaw: -34, pitch: 22, zoom: 1 }); const sc = useMemo(() => placeScene(c.cam, w, n), [c.cam, w, n]);
  const ix = worldIndex(w); const ls = levelsOf(ix, n);
  return <section className="lt-page lt-page--scene" data-testid="lw-place" data-place={n.id}>
    <Crumbs w={w} trail={[[n.name, null]]} />
    <PageHero product="lite" plain eyebrow={`${WORLD_NAME[w]} · ${n.type}`} title={n.name} lede={`${ls.length} level${ls.length === 1 ? '' : 's'}, ${roomsUnder(ix, n.id).length} rooms.${n.group ? ` ${n.group}.` : ''}`} />
    <figure className="stage lt-stage" data-stage=""><L3View sc={sc} c={c} onNav={go} label={`The levels of ${n.name}, drawn apart. Each level is a button.`} testId="lw-place-3d" tall S={12} /></figure>
    <Card title="Levels" icon="layers"><ul className="lt-wlist">{ls.map((l) => <li key={l.id}><a href={worldLevelHref(w, l.id)} data-testid={`lw-lv-${l.id}`}><b>{l.name}</b><span className="ui-meta">{roomsUnder(ix, l.id).length} rooms</span></a></li>)}</ul></Card>
    <p><a className="ui-btn" href={`#/lite/w/${w}`} data-testid="lw-up-world">All of {WORLD_NAME[w]}</a></p>
    <LiteNav here="" role={null} />
  </section>;
}

// ------------------------------------------------------------------------------------------------ a level
function levelScene(cam: Cam, w: LiteWorld, l: EstateNode, mark?: string | null): L3Scene {
  const P = levelPlan(w, l.id); const sc = scene(P.W / 2, P.D / 2, Math.hypot(P.W, P.D) / 2, 1.6);
  poly(sc, 0, [[0, 0, 0], [P.W, 0, 0], [P.W, P.D, 0], [0, P.D, 0]], { f: 'url(#l3slab)', s: 'rgba(255,246,232,.24)' });
  for (const c of P.corridors) { poly(sc, 0, [[c.x, c.y, 0.01], [c.x + c.w, c.y, 0.01], [c.x + c.w, c.y + c.d, 0.01], [c.x, c.y + c.d, 0.01]], { f: 'rgba(255,246,232,.09)', s: 'none' }); line(sc, 0, [[c.x + 0.4, c.y + c.d / 2, 0.012], [c.x + c.w - 0.4, c.y + c.d / 2, 0.012]], { s: 'rgba(255,246,232,.18)', sw: 0.8, da: '5 5' }); }
  const many = P.items.length > 40;
  for (const it of P.items) { const x = it.x + it.w / 2, y = it.y + it.d / 2, to = worldRoomHref(w, it.id), on = mark === it.id;
    poly(sc, 1, [[it.x, it.y, 0.02], [it.x + it.w, it.y, 0.02], [it.x + it.w, it.y + it.d, 0.02], [it.x, it.y + it.d, 0.02]], { f: it.furnished ? 'rgba(46,92,86,.95)' : 'rgba(62,60,54,.95)', s: on ? 'var(--l3-teal)' : it.furnished ? 'rgba(69,207,193,.6)' : 'rgba(255,246,232,.24)', sw: on ? 1.6 : 0.8, nav: to });
    box(sc, cam, { x, y, w: it.w, d: 0.15, h: 0.9 }, it.furnished ? [60, 110, 104] : [96, 92, 84], { nav: to });
    if (!many || it.furnished && it.w * it.d > 60) label(sc, [x, y, 1], short(it.label), { tone: it.furnished ? 'space' : undefined, on, nav: to, testId: `lw-item-${it.id}` });
    hit(sc, [x, y, 0.5], { nav: to, r: many ? 10 : 16, label: `${it.label}${it.furnished ? ', furnished' : ''}. Opens it.`, testId: `lw-open-${it.id}` }); }
  return sc;
}
function WorldLevel({ w, n }: PageProps & { w: LiteWorld; n: EstateNode }) {
  const c = useCam({ yaw: -30, pitch: 52, zoom: 1 }); const sc = useMemo(() => levelScene(c.cam, w, n), [c.cam, w, n]);
  const ix = worldIndex(w); const { building } = upOf(ix, n.id); const P = levelPlan(w, n.id); const [all, setAll] = useState(false);
  const rank = (x: (typeof P.items)[number]) => (archOf(x.node) ? 0 : x.furnished ? 1 : 2);   // the rooms people meet in first, then the rest
  const list = [...P.items].sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label, 'en', { numeric: true }));
  return <section className="lt-page lt-page--scene" data-testid="lw-level" data-level={n.id}>
    <Crumbs w={w} trail={[...(building ? [[building.name, worldPlaceHref(w, building.id)] as [string, string]] : []), [n.name, null]]} />
    <PageHero product="lite" plain eyebrow={`${WORLD_NAME[w]}${building ? ` · ${building.name}` : ''}`} title={n.name} lede={`${P.items.length} rooms, ${P.items.filter((i) => i.furnished).length} furnished. Rooms along corridors in name order, each at its recorded size; illustrative.`} />
    <figure className="stage lt-stage" data-stage=""><L3View sc={sc} c={c} onNav={go} label={`${n.name} in 3D. Each room is a button.`} testId="lw-level-3d" tall S={P.W > 120 ? 6 : 14} /></figure>
    <Card title="Rooms on this level" icon="room" testId="lw-rooms"><ul className="lt-wlist">{(all ? list : list.slice(0, 24)).map((it) => <li key={it.id}><a href={worldRoomHref(w, it.id)} data-testid={`lw-room-${it.id}`}><b>{it.label}</b><span className="ui-meta">{it.node.type.replace(/-/g, ' ')}{it.node.capacity ? ` · ${it.node.capacity} places` : ''}</span></a></li>)}</ul>
      {list.length > 24 && !all ? <button type="button" className="ui-btn ui-btn--small" onClick={() => setAll(true)} data-testid="lw-rooms-all">All {list.length} rooms</button> : null}</Card>
    <p className="lt-acts">{building ? <a className="ui-btn" href={worldPlaceHref(w, building.id)} data-testid="lw-up-place">All levels of {building.name}</a> : null}<a className="ui-btn" href={`#/lite/w/${w}`} data-testid="lw-up-world">All of {WORLD_NAME[w]}</a></p>
    <LiteNav here="" role={null} />
  </section>;
}

// ------------------------------------------------------------------------------------------------ a room
function WorldRoom({ w, n, role, query }: PageProps & { w: LiteWorld; n: EstateNode }) {
  const ix = worldIndex(w); const { level, building } = upOf(ix, n.id); const assets = ix.assetsOf.get(n.id) || [];
  const lens = storedLens(role, query.get('mode')) || 'visitor'; const furnished = !!archOf(n) && !!n.dims && v253Drawable(n.id);
  const fixtures = useMemo(() => (!furnished && n.dims ? fixturesFor(n.type, Math.max(n.dims[0], n.dims[1]), Math.min(n.dims[0], n.dims[1]), n.capacity) : null), [n, furnished]);
  const [ov, setOv] = useState<Set<Overlay>>(new Set()); const [pick, setPick] = useState<string | null>(null);
  const tog = (k: Overlay) => setOv((s) => { const x = new Set(s); if (x.has(k)) x.delete(k); else x.add(k); return x; });
  const [L, Wd, H] = n.dims || [0, 0, 0];
  return <section className="lt-page lt-roompage lt-page--scene" data-testid="lw-room" data-room={n.id} data-furnished={furnished ? 'yes' : fixtures ? 'empathia' : 'no'}>
    <Crumbs w={w} trail={[...(building ? [[building.name, worldPlaceHref(w, building.id)] as [string, string]] : []), ...(level ? [[level.name, worldLevelHref(w, level.id)] as [string, string]] : []), [n.name, null]]} />
    <PageHero product="lite" icon="room" plain eyebrow={`${WORLD_NAME[w]} · ${n.type.replace(/-/g, ' ')}${n.capacity ? ` · ${n.capacity} places` : ''}`} title={n.name} />
    {furnished ? <figure className="stage lt-stage lt-stage--room" data-stage="">
      <V253RoomStage roomId={n.id} lens={lens} state="current" layers={new Set(['furniture', 'av'])} overlays={ov} role={role} sel={pick} onPick={(p) => setPick(p ? p.obj.id : null)} label={`${n.name}, furnished, in 3D. Turn, tilt and zoom with the buttons, the arrow keys or a drag.`} />
      <figcaption className="stage__cap">Drawn by V2.5.3’s layout for this type of room, from the estate’s record: {L} × {Wd} m, {H} m high{n.capacity ? `, ${n.capacity} places` : ''}, and its equipment classes. Modelled, not surveyed.</figcaption></figure>
      : fixtures ? <figure className="stage lt-stage lt-stage--room" data-stage=""><FixtureStage n={n} F={fixtures} />
        <figcaption className="stage__cap">Furnished by Empathia’s own layout for a {n.type.replace(/-/g, ' ')} (V2.5.3 never drew one), from the record’s size{n.capacity ? ` and ${n.capacity} places` : ''}. Illustrative: no fixture here is a surveyed or verified asset.</figcaption></figure>
      : <EmptyState title="Shown on its floor, not furnished" icon="room">A {n.type.replace(/-/g, ' ')} is not one of the room types V2.5.3 drew, so nothing is invented for it. {level ? <a href={worldLevelHref(w, level.id)}>See it on {level.name}</a> : null}</EmptyState>}
    {furnished && lens !== 'visitor' && <fieldset className="lt-switches" data-testid="lw-overlays"><legend>Coverage</legend>{([['camera', 'Camera view'], ['mic', 'Microphone pickup'], ['speaker', 'Loudspeakers'], ['sight', 'Sightlines']] as Array<[Overlay, string]>).map(([k, t]) => <button key={k} type="button" role="switch" aria-checked={ov.has(k)} className={`lt-switch${ov.has(k) ? ' on' : ''}`} onClick={() => tog(k)} data-testid={`lw-ov-${k}`}><span className="lt-switch__name">{t}</span><span className="lt-switch__knob" aria-hidden="true" /></button>)}</fieldset>}
    <div className="kit-grid kit-grid--tiles wk-tiles3">
      <StatTile label="Size" value={`${L} × ${Wd}`} unit="m" icon="layers" tone="info" hint={`${H} m high · from the estate record`} />
      <StatTile label="Places" value={n.capacity ?? '—'} icon="users" tone="ok" hint={n.layout || 'as recorded'} />
      <StatTile label="Equipment" value={assets.reduce((s, a) => s + a.qty, 0)} icon="device" tone="muted" hint={`${assets.length} classes · synthetic`} />
    </div>
    <Card title="Equipment on record" icon="device" testId="lw-equipment">{assets.length ? <ul className="lt-wlist">{assets.map((a) => <li key={a.id}><span><b>{a.label}</b><span className="ui-meta">{a.qty} × {a.cls} · installed {a.installed}</span></span><Chip small tone={a.state === 'ATTENTION' ? 'warn' : a.state === 'PLANNED' ? 'muted' : 'ok'}>{a.state === 'IN_SERVICE' ? 'in service' : a.state.toLowerCase()}</Chip></li>)}</ul> : <p className="ui-meta">No equipment on record for this room.</p>}</Card>
    <p className="lt-acts">{level ? <a className="ui-btn" href={worldLevelHref(w, level.id)} data-testid="lw-up-level">{level.name}</a> : null}{building ? <a className="ui-btn" href={worldPlaceHref(w, building.id)}>{building.name}</a> : null}<a className="ui-btn" href={`#/lite/w/${w}`}>All of {WORLD_NAME[w]}</a>
      <a className="ui-btn ui-btn--quiet" href={`#/estate/${w}`} data-testid="lw-estate"><Icon name="book" size={16} /> {WORLD_NAME[w]} estate</a><a className="ui-btn ui-btn--quiet" href={`#/search?q=${encodeURIComponent(n.name)}`} data-testid="lw-search"><Icon name="search" size={16} /> Search Party</a></p>
    <LiteNav here="" role={null} />
  </section>;
}
export { kids };

// ------------------------------------------------------------------------------------------------ a room furnished by Empathia's own rule
/** The room's shell and fixtures from ./fixtures.ts: floor, walls (the front wall open at the door), each fixture a box at its height,
 *  each one a button that names it. */
function fixtureScene(cam: Cam, dims: [number, number, number], F: FixtureLayout, sel: string | null): L3Scene {
  const [w, d, hh] = dims; const H = Math.min(hh, 3.2); const sc = scene(w / 2, d / 2, Math.hypot(w, d) / 2 * 1.03, H * 0.9);
  poly(sc, 0, [[-0.3, -0.3, -0.02], [w + 0.3, -0.3, -0.02], [w + 0.3, d + 0.3, -0.02], [-0.3, d + 0.3, -0.02]], { f: 'rgba(0,0,0,.35)', s: 'none' });
  poly(sc, 0, [[0, 0, 0], [w, 0, 0], [w, d, 0], [0, d, 0]], { f: 'url(#l3slab)', s: 'rgba(255,246,232,.3)' });
  const WALL: RGB = [112, 106, 96], t = 0.12;
  box(sc, cam, { x: w / 2, y: d - t / 2, w, d: t, h: H }, WALL, { pri: -1 }); box(sc, cam, { x: t / 2, y: d / 2, w: t, d, h: H }, WALL, { pri: -1 }); box(sc, cam, { x: w - t / 2, y: d / 2, w: t, d, h: H }, WALL, { pri: -1 });
  const door = Math.min(1.2, w * 0.3); box(sc, cam, { x: (w - door) / 4, y: t / 2, w: (w - door) / 2, d: t, h: 0.9 }, WALL, {}); box(sc, cam, { x: w - (w - door) / 4, y: t / 2, w: (w - door) / 2, d: t, h: 0.9 }, WALL, {});
  label(sc, [w / 2, -0.2, 0.05], 'Way in', { cls: 'soft', tone: 'here' });
  const named = new Set<string>();
  F.items.forEach((f, i) => { const id = `fx${i}`; const on = sel === id;
    box(sc, cam, { x: f.x, y: f.y, z: f.z || 0, w: f.w, d: f.d, h: f.h }, f.col, { stroke: on ? 'var(--l3-teal)' : 'rgba(0,0,0,.25)', sw: on ? 1.6 : 0.5 });
    if (on || (!named.has(f.kind) && F.items.length < 60)) { named.add(f.kind); label(sc, [f.x, f.y, (f.z || 0) + f.h + 0.1], f.label.replace(/ \d+$/, ''), { cls: on ? undefined : 'soft', on, lift: 8 }); }
    hit(sc, [f.x, f.y, (f.z || 0) + f.h / 2], { o: id, r: 12, label: `${f.label}. Shows what it is.` }); });
  return sc;
}
function FixtureStage({ n, F }: { n: EstateNode; F: FixtureLayout }) {
  const [L, Wd, H] = n.dims!; const w = Math.max(L, Wd), d = Math.min(L, Wd); const big = w > 30;
  const c = useCam({ yaw: 30, pitch: big ? 46 : 36, zoom: 1 }); const [sel, setSel] = useState<string | null>(null);
  const sc = useMemo(() => fixtureScene(c.cam, [w, d, H], F, sel), [c.cam, w, d, H, F, sel]);
  const f = sel ? F.items[Number(sel.slice(2))] : null;
  return <><div data-testid="lw-fixture-3d" data-objects={F.items.length} data-rule={F.rule}><L3View sc={sc} c={c} onNav={go} label={`${n.name}, furnished by Empathia’s layout for a ${n.type.replace(/-/g, ' ')}, in 3D. Each fixture is a button.`} S={big ? 14 : 44} tall v253 sel={sel} onObj={(id) => setSel(sel === id ? null : id)} /></div>
    <p className="ui-meta" aria-live="polite" data-testid="lw-fixture-sel">{f ? `${f.label}: ${f.w.toFixed(1)} × ${f.d.toFixed(1)} m, ${f.h.toFixed(1)} m high · illustrative` : 'Tap a fixture to see what it is.'}</p></>;
}
