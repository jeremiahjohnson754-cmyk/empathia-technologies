/**
 * Lite's places: the fourteen V2.5.3 spaces (lobby and its parts, services, amenities, the Commons), the three guides and their
 * twenty-five chapters, wayfinding to any room or place, the ten-step visit, the QR codes and the Commons scenes.
 * Records come from data/v253.ts (extracted statically from V2.5.3); routes and layouts are modeled. Nothing leaves the page:
 * the visit's "host notified" is simulated and says so.
 */
import { useEffect, useMemo, useState } from 'react';
import { PageHero, Card, Chip, Icon, EmptyState } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { allows } from '../access/policy.js';
import { SPACES, GUIDES, SPACE_LAYOUTS, PODS_X, COMMONS_SCENES, COMMONS_CONTROL, VISIT_STEPS, QR_TYPES, QR_BASE } from './data/v253.js';
import type { SpaceLayout, SpaceObj } from './data/types.js';
import { DESTINATIONS, routeTo, chapterById, chapterCount, liteRoomHref } from './model.js';
import { SpaceScene, OrbitBar, useOrbit } from './Scene.js';
import { LiteNav, LiteMissing, setQuery } from './LiteApp.js';
import { qrMatrix, qrPath } from './qr.js';
import { BUILDINGS, roomById, shortName } from '../campus/canon.js';
import { PEOPLE } from '../campus/design.js';

// ------------------------------------------------------------------------------------------------ layouts
const O = (id: string, kind: string, label: string, x: number, y: number, w: number, d: number, h: number, extra: Partial<SpaceObj> = {}): SpaceObj => ({ id, kind, label, x, y, z: 0, w, d, h, rot: 0, ...extra });
const rect = (x0: number, y0: number, x1: number, y1: number): Array<[number, number]> => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
/** The Commons in each scene (V2.5.3's commonsLayout is procedural; this follows its scene descriptions). */
export function commonsLayout(scene: string): SpaceLayout {
  const objs: SpaceObj[] = [O('serve', 'counter', 'Serving line', 10, 0.7, 12, 0.9, 1.05), O('trays', 'counter', 'Tray return', 21.5, 13.6, 2.4, 0.7, 1.05), O('screen', 'screen', 'Commons screen', 2, 0.25, 1.6, 0.15, 1.9, { z: 0.8 })];
  const zones: SpaceLayout['zones'] = [];
  const tables = (skip: (x: number, y: number) => boolean = () => false) => { let i = 0; for (let x = 3; x <= 21; x += 3.6) for (let y = 4; y <= 12.5; y += 2.8) if (!skip(x, y)) { i += 1; objs.push(O(`t${i}`, i % 3 ? 'round' : 'table', i % 3 ? 'Round table' : 'Long table', x, y, i % 3 ? 1.2 : 2.2, i % 3 ? 1.2 : 0.9, 0.74)); } };
  if (scene === 'event') {
    zones.push({ id: 'z-stage', kind: 'presenter', label: 'Presenter zone', pts: rect(7, 11.6, 17, 14.4) }, { id: 'z-aud', kind: 'area', label: 'Audience layout', pts: rect(3, 3, 21, 10.8) });
    for (let r = 0; r < 6; r += 1) for (let c = 0; c < 12; c += 1) objs.push(O(`c${r}-${c}`, 'chair', 'Seat', 4.2 + c * 1.4 + (c > 5 ? 1.2 : 0), 3.6 + r * 1.2, 0.5, 0.5, 0.9));
    objs.push(O('lect', 'lectern', 'Lectern', 12, 13, 0.6, 0.5, 1.1), O('cam1', 'camera', 'Camera position 1', 2.2, 7, 0.4, 0.4, 1.8), O('cam2', 'camera', 'Camera position 2', 21.8, 7, 0.4, 0.4, 1.8), O('cam3', 'camera', 'Camera position 3', 12, 2.2, 0.4, 0.4, 1.8), O('prod', 'counter', 'Production position', 12, 1.9, 2.4, 0.8, 0.9), O('spkL', 'speaker', 'Loudspeaker', 6, 13.4, 0.5, 0.5, 2.2), O('spkR', 'speaker', 'Loudspeaker', 18, 13.4, 0.5, 0.5, 2.2));
  } else if (scene === 'quiet') {
    tables((x, y) => x < 9 && y > 8);
    zones.push({ id: 'z-quiet', kind: 'quiet', label: 'Recommended quiet area', pts: rect(0.6, 8.4, 9, 14.4) }, { id: 'z-bench', kind: 'area', label: 'Informal work: window bench', pts: rect(0.3, 2, 1.4, 14) });
    for (let i = 0; i < 3; i += 1) objs.push(O(`b${i}`, 'booth', 'Focus booth', 2.6 + i * 2.4, 12.6, 1.8, 1.4, 1.4));
    objs.push(O('bench', 'counter', 'Window bench', 0.8, 8, 0.6, 11, 0.74));
  } else if (scene === 'busy') {
    tables();
    zones.push({ id: 'z-hot', kind: 'hot', label: 'High density near the serving line', pts: rect(4, 1.4, 16, 5) }, { id: 'z-path', kind: 'path', label: 'High-traffic path', pts: rect(11.4, 5, 12.6, 15) }, { id: 'z-alt', kind: 'area', label: 'Alternate route: west door', pts: rect(0.2, 5, 1.6, 15) });
  } else if (scene === 'mobile') {
    tables((x, y) => x > 16 && y < 8);
    zones.push({ id: 'z-arc', kind: 'presenter', label: 'Sit inside the camera arc', pts: [[18, 4.6], [21.6, 3.8], [22.6, 6.4], [19.4, 7.4]] });
    objs.push(O('cart', 'cart', 'Mobile collaboration cart', 20.5, 2.6, 1.4, 0.7, 1.7), O('mt', 'table', 'Team table', 20.6, 5.6, 2.2, 0.9, 0.74));
  } else {
    tables();
    zones.push({ id: 'z-lane', kind: 'path', label: 'Clear lane for trays', pts: rect(1.4, 1.6, 22.6, 2.8) });
  }
  return { w: 24, d: 15, h: 4.2, zones, objs };
}
export function layoutFor(id: string): { layout: SpaceLayout; highlight?: string } | null {
  const s = SPACES.find((x) => x.id === id); if (!s) return null;
  if (s.part) return { layout: SPACE_LAYOUTS[s.part]!, highlight: id };
  if (id === 'SP-ATL-COMMONS') return { layout: commonsLayout('lunch') };
  if (id === 'SP-ATL-PODS') return { layout: { w: 9, d: 4.5, h: 2.8, zones: [{ id: 'z-c', kind: 'path', label: 'Corridor', pts: rect(0, 3.4, 9, 4.5) }], objs: PODS_X.map((x, i) => O(`pod${i + 1}`, 'booth', `Focus pod ${i + 1}`, x, 1.6, 1.8, 2, 2.3)) } };
  const L = SPACE_LAYOUTS[id]; return L ? { layout: L } : null;
}

const GROUPS = ['Lobby', 'Services', 'Amenities', 'Commons'];

// ------------------------------------------------------------------------------------------------ services (the 14 spaces)
export function ServicesPage({ role }: PageProps) {
  return (
    <section className="lt-page" data-testid="lite-services">
      <LiteNav here="services" role={role} />
      <PageHero product="lite" icon="place" compact eyebrow="Empathia Lite · Places" title="Places and services" lede={`${SPACES.length} workplace spaces in Atlas HQ: what each offers, when, how to use it and who looks after it.`} />
      {GROUPS.map((g) => { const items = SPACES.filter((s) => s.group === g); return items.length ? <div key={g}><h2 className="lt-h2">{g}</h2><ul className="lt-tiles">{items.map((s) => <li key={s.id}><a className="lt-tile" href={`#/lite/space/${s.id}`} data-testid={`lite-space-${s.id}`}><span className="lt-tile__icon" aria-hidden="true"><Icon name={g === 'Lobby' ? 'home' : g === 'Services' ? 'wrench' : g === 'Commons' ? 'users' : 'place'} size={20} /></span><b>{s.name}</b><span className="ui-muted">{s.kind} · floor {s.floor} · {s.hours}</span></a></li>)}</ul></div> : null; })}
    </section>
  );
}

export function SpacePage({ role, id }: PageProps & { id: string }) {
  const s = SPACES.find((x) => x.id === id);
  const orbit = useOrbit({ yaw: -28, pitch: 55, zoom: 1 });
  const [sel, setSel] = useState<string | null>(null);
  if (!s) return <LiteMissing what={`space “${id}”`} />;
  const L = layoutFor(id); const ch = chapterById(s.chapter); const obj = L?.layout.objs.find((o) => o.id === sel);
  const qr = `${QR_BASE}SPACE-${id}`;
  return (
    <section className="lt-page" data-testid="lite-space" data-space={id}>
      <LiteNav here="services" role={role} />
      <nav aria-label="Breadcrumb" className="crumbs"><ol><li><a href="#/lite">Lite</a></li>{allows({ area: 'lite.services' }, role) && <li><a href="#/lite/services">Places</a></li>}{s.part && <li><a href={`#/lite/space/${s.part}`}>{SPACES.find((x) => x.id === s.part)?.name}</a></li>}<li><span aria-current="page">{s.name}</span></li></ol></nav>
      <PageHero product="lite" icon="place" compact eyebrow={`${s.kind} · Atlas floor ${s.floor}`} title={s.name} lede={s.what} meta={[<Chip key="h" small icon="clock">{s.hours}</Chip>, <Chip key="w" small icon="users">{s.who}</Chip>]} />
      <div className="lt-roomgrid">
        <div className="lt-stagecol">{L ? <figure className="stage lt-stage" data-stage=""><div className="stage__bar"><OrbitBar orbit={orbit} /></div>
          <SpaceScene layout={L.layout} view={orbit.view} label={`${s.name} in 3D`} highlight={L.highlight} bind={orbit.bind} selected={sel} onSelect={(x) => setSel(x === sel ? null : x)} />
          <figcaption className="stage__cap">{L.highlight ? `Part of ${SPACES.find((x) => x.id === s.part)?.name}: highlighted. ` : ''}Layout from V2.5.3’s space layout (modeled, not surveyed).{obj ? <> Selected: <b>{obj.label}</b>.</> : ' Choose an object to name it.'}</figcaption></figure>
          : <EmptyState title="No layout on record" icon="map">V2.5.3 keeps no layout for this space.</EmptyState>}</div>
        <aside className="lt-panel">
          <h2 className="lt-h3">How it works</h2><ol className="lt-steps">{s.how.map((x) => <li key={x}>{x}</li>)}</ol>
          {s.etiquette && <><h2 className="lt-h3">Etiquette</h2><ul className="lt-bullets">{s.etiquette.map((x) => <li key={x}>{x}</li>)}</ul></>}
          <p><a className="ui-btn" href={`#/lite/way?to=${id}`}>Find the way</a></p>
        </aside>
      </div>
      {s.services && <Card title="Services" icon="wrench"><ul className="lt-svc">{s.services.map(([n, t]) => <li key={n}><b>{n}</b><span>{t}</span></li>)}</ul></Card>}
      <div className="lt-twocol">
        <Card title="If something is wrong" icon="alert"><ul className="lt-bullets">{s.issues.map((x) => <li key={x}>{x}</li>)}</ul><p className="ui-meta">{s.support}</p><p className="ui-meta">Upkeep: {s.upkeep}</p></Card>
        <Card title="Learn more and share" icon="book">{ch && <p><a href={`#/lite/guides/${ch.g.id}/${ch.c[0]}`}>{ch.g.name}: {ch.c[1]} →</a></p>}<div className="lt-qrsmall"><QrSvg text={qr} label={`QR code for ${s.name}`} size={120} /><span className="ui-meta mono">{qr}</span></div></Card>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------ guides
export function GuidesPage({ role, g, ch, query }: PageProps & { g?: string; ch?: string }) {
  const [q, setQ] = useState('');
  const G = g ? GUIDES.find((x) => x.id === g) : null;
  if (g && !G) return <LiteMissing what={`guide “${g}”`} />;
  if (G && ch) {
    const i = G.chapters.findIndex((c) => c[0] === ch); if (i < 0) return <LiteMissing what={`chapter “${ch}” of ${G.name}`} />;
    const [cid, title, sum, sections] = G.chapters[i]!; const prev = G.chapters[i - 1], next = G.chapters[i + 1];
    return (
      <section className="lt-page" data-testid="lite-chapter" data-chapter={cid}>
        <LiteNav here="guides" role={role} />
        <nav aria-label="Breadcrumb" className="crumbs"><ol><li><a href="#/lite/guides">Guides</a></li><li><a href={`#/lite/guides/${G.id}`}>{G.name}</a></li><li><span aria-current="page">Chapter {i + 1}</span></li></ol></nav>
        <PageHero product="lite" icon="book" compact eyebrow={`${G.name} · chapter ${i + 1} of ${G.chapters.length}`} title={title} lede={sum} />
        <article className="lt-chapter">{sections.map(([h, items]) => <section key={h}><h2 className="lt-h3">{h}</h2><ul className="lt-bullets">{items.map((x) => <li key={x}>{x}</li>)}</ul></section>)}</article>
        <nav className="lt-pager" aria-label="Chapters">{prev ? <a className="ui-btn" href={`#/lite/guides/${G.id}/${prev[0]}`}>← {prev[1]}</a> : <span />}{next ? <a className="ui-btn" href={`#/lite/guides/${G.id}/${next[0]}`}>{next[1]} →</a> : <span />}</nav>
      </section>
    );
  }
  const term = q.trim().toLowerCase();
  const hits = term ? GUIDES.flatMap((x) => x.chapters.filter((c) => JSON.stringify(c).toLowerCase().includes(term)).map((c) => ({ g: x, c }))) : [];
  const shown = G ? [G] : GUIDES; void query;
  return (
    <section className="lt-page" data-testid={G ? 'lite-guide' : 'lite-guides'}>
      <LiteNav here="guides" role={role} />
      <PageHero product="lite" icon="book" compact eyebrow="Empathia Lite · Guides" title={G ? G.name : 'Guides'} lede={G ? `${G.summary} For ${G.audience.toLowerCase()}.` : `${GUIDES.length} guides, ${chapterCount()} chapters: onboarding, everyday use of the workplace, and the AV and collaboration engineering manual.`} />
      {!G && <div className="lt-search"><label htmlFor="lt-gq">Search the chapters</label><input id="lt-gq" type="search" value={q} maxLength={80} onChange={(e) => setQ(String(e.target.value).slice(0, 80))} placeholder="e.g. badge, camera, Wi-Fi" autoComplete="off" />
        {term && <p role="status" className="ui-meta">{hits.length} chapter{hits.length === 1 ? '' : 's'} mention “{q.trim()}”</p>}
        {term && hits.length > 0 && <ul className="lt-list">{hits.map(({ g: x, c }) => <li key={c[0]}><a href={`#/lite/guides/${x.id}/${c[0]}`}><b>{c[1]}</b><span className="ui-meta">{x.name}</span></a></li>)}</ul>}</div>}
      {shown.map((x) => <Card key={x.id} title={x.name} sub={`${x.audience} · ${x.chapters.length} chapters`} icon="book" testId={`lite-guide-${x.id}`}>
        {!G && <p className="ui-muted">{x.summary}</p>}
        <ol className="lt-chapters">{x.chapters.map((c) => <li key={c[0]}><a href={`#/lite/guides/${x.id}/${c[0]}`}><b>{c[1]}</b><span className="ui-muted">{c[2]}</span></a></li>)}</ol>
      </Card>)}
    </section>
  );
}

// ------------------------------------------------------------------------------------------------ wayfinding
export function WayPage({ role, query }: PageProps) {
  const to = query.get('to') || '';
  const route = to ? routeTo(to) : null;
  const pick = (v: string) => { const n = new URLSearchParams(query); if (v) n.set('to', v); else n.delete('to'); setQuery('#/lite/way', n); };
  return (
    <section className="lt-page" data-testid="lite-way">
      <LiteNav here="way" role={role} />
      <PageHero product="lite" icon="route" compact eyebrow="Empathia Lite · Wayfinding" title="Find the way" lede="A walking route from the Atlas main entrance to any room or place on the campus. Routes are modeled from the campus plan; step-free throughout." />
      <div className="lt-search"><label htmlFor="lt-to">Where to?</label>
        <select id="lt-to" value={route ? to : ''} onChange={(e) => pick(String(e.target.value))} data-testid="lite-way-to"><option value="">Choose a destination</option>
          {['Places', 'Rooms'].map((g) => <optgroup key={g} label={g}>{DESTINATIONS.filter((d) => d.group === g).map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</optgroup>)}</select></div>
      {to && !route && <EmptyState title="That destination is not on the campus" icon="map">Choose one from the list.</EmptyState>}
      {route && <div className="lt-visit">
        {BUILDINGS.some((b) => b.key === route.building) && <figure className="stage lt-stage lt-visit__stage" data-stage="" data-testid="lite-way-plan"><CampusRoute to={route.building} floor={route.floor} key={route.to} />
          <figcaption className="stage__cap">From the Atlas main entrance{route.building === 'ATL' ? ' to the lifts' : ` to ${BUILDINGS.find((b) => b.key === route.building)!.name}`}{route.floor > 1 ? `, then floor ${route.floor}` : ''}. Modeled from the building footprints.</figcaption></figure>}
        <Card title={route.label} sub={route.minutes ? `About ${route.minutes} minute${route.minutes === 1 ? '' : 's'} on foot · modeled` : 'A regional site: travel there first'} icon="route" testId="lite-route">
        <ol className="lt-steps lt-steps--route">{route.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        <p><a className="ui-btn ui-btn--primary" href={route.href}>Open the destination</a></p></Card></div>}
    </section>
  );
}

/** A walking route drawn on the campus from above: the Atlas main entrance, along the plaza, to the destination building's entrance
 *  (the visitor walks it; reduced motion draws them there). Modeled from the canonical footprints, like the minutes beside it. */
function CampusRoute({ to, floor }: { to: string; floor: number }) {
  const S = 52; const X = (x: number) => 16 + x * S; const Y = (y: number) => 16 + y * S;
  const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const B = BUILDINGS.find((b) => b.key === to)!; const door: [number, number] = [B.map.x + B.map.w / 2, B.map.y + B.map.d + 0.05];
  const start: [number, number] = [3.65, 4.4]; const plaza = 4.95;
  const pts: Array<[number, number]> = to === 'ATL' ? [[3.65, 5.2], start] : door[1] <= plaza + 0.2 ? [start, [start[0], plaza], [door[0], plaza], door] : [start, [start[0], plaza], [door[0] < start[0] ? 2.95 : 6.75, plaza], [door[0] < start[0] ? 2.95 : 6.75, door[1] + 0.25], [door[0], door[1] + 0.25], door];
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' '); const end = pts[pts.length - 1]!;
  return (
    <svg className="lt-arrive" viewBox={`0 0 ${X(9.6) + 16} ${Y(8.2) + 8}`} role="img" aria-label={`The campus from above: the route from the Atlas main entrance to ${B.name}${floor > 1 ? `, floor ${floor}` : ''}`} data-testid="lite-way-svg" data-to={to}>
      {BUILDINGS.map((b) => <g key={b.key}><rect x={X(b.map.x)} y={Y(b.map.y)} width={b.map.w * S} height={b.map.d * S} rx={5} className={`lt-arrive__b${b.key === to ? ' on' : ''}`} /><text x={X(b.map.x + b.map.w / 2)} y={Y(b.map.y + b.map.d / 2) + 4} textAnchor="middle" className="lt-arrive__t">{b.short}{b.key === to && floor > 1 ? ` · floor ${floor}` : ''}</text></g>)}
      <path d={d} className="lt-route lt-route--way" />
      <circle cx={X(start[0])} cy={Y(start[1])} r={6} className="lt-arrive__door" />
      {still ? <g className="lt-walker lt-walker--flat" aria-hidden="true"><circle cx={X(end[0])} cy={Y(end[1])} r={11} className="lt-walker__ring" /><circle cx={X(end[0])} cy={Y(end[1])} r={6} className="lt-walker__head" /></g>
        : <g className="lt-walker lt-walker--flat" aria-hidden="true"><circle r={11} className="lt-walker__ring"><animateMotion dur="3.6s" fill="freeze" path={d} /></circle><circle r={6} className="lt-walker__head"><animateMotion dur="3.6s" fill="freeze" path={d} /></circle></g>}
    </svg>
  );
}

// ------------------------------------------------------------------------------------------------ visit
const HOSTS = ['opslead', 'svcmgr', 'syseng', 'designer', 'architect'].map((k) => ({ key: k, label: PEOPLE[k]! }));
/** The V2.5.3 visitor path through the Atlas lobby (SPACE_LAYOUTS spots: entrance, reception, check-in, wait, lifts), per step: the route
 *  walked so far, where the visitor stands and what to look at (founder 19 Nov 2026 09:09 B: "fully resolve v2.5.3 visitor experience
 *  wayfinding and sign in ... a non-verbal investor demonstration"). The lobby is the V2.5.3 layout; the walk is modeled. */
const LOBBY = 'SP-ATL-LOBBY';
const WALK: Record<string, { route: Array<[number, number]>; at: [number, number]; look?: string }> = {
  entrance: { route: [[8.5, 12.4], [8.5, 10.4]], at: [8.5, 10.4] },
  reception: { route: [[8.5, 10.6], [8.5, 5.4]], at: [8.5, 5.4], look: 'desk' },
  checkin: { route: [[8.5, 10.6], [8.5, 6.6], [13.2, 8.2]], at: [13.2, 8.2], look: 'k1' },
  confirm: { route: [[8.5, 6.6], [13.2, 8.2]], at: [13.2, 8.2], look: 'k1' },
  notified: { route: [[8.5, 6.6], [13.2, 8.2]], at: [13.2, 8.2], look: 'k1' },
  badge: { route: [[8.5, 6.6], [13.2, 8.2]], at: [13.2, 8.2], look: 'k1' },
  wait: { route: [[13.2, 8.2], [8.5, 7.6], [4.4, 8.3]], at: [4.4, 8.3], look: 'sofa1' },
  navigate: { route: [[4.4, 8.3], [2.6, 5.6], [1.1, 4.2]], at: [1.1, 4.2], look: 'lift2' },
  signout: { route: [[1.1, 4.2], [8.5, 6.8], [14.6, 8.0], [8.5, 10.6], [8.5, 12.4]], at: [14.6, 8.0], look: 'slot' },
};
const SAMPLE = { name: 'Sam Rivera (sample visitor)', host: 'syseng' };
export function VisitPage({ role, query }: PageProps) {
  const at = Math.max(0, VISIT_STEPS.findIndex((s) => s[0] === query.get('step')));
  const [name, setName] = useState(''); const [host, setHost] = useState(''); const [err, setErr] = useState('');
  const [auto, setAuto] = useState(false);
  const step = VISIT_STEPS[at]!; const go = (i: number) => { const n = new URLSearchParams(query); n.set('step', VISIT_STEPS[Math.max(0, Math.min(VISIT_STEPS.length - 1, i))]![0]); setQuery('#/lite/visit', n); };
  const clean = name.replace(/[\u0000-\u001f<>]/g, '').trim();
  const needsForm = step[0] === 'checkin'; const needsDetails = ['confirm', 'notified', 'badge'].includes(step[0]);
  const next = () => {
    if (needsForm) { if (clean.length < 2) { setErr('Enter your name (at least two letters).'); return; } if (!host) { setErr('Choose your host.'); return; } }
    if (needsDetails && (clean.length < 2 || !host)) { go(VISIT_STEPS.findIndex((s) => s[0] === 'checkin')); return; }
    setErr(''); go(at + 1);
  };
  // "Watch the visit": a sample visitor walks the ten steps on their own, a few seconds each, with nothing to read aloud or type; any
  // step can be taken over by hand (Pause), and it stops at the last step
  const watch = () => { setName(SAMPLE.name); setHost(SAMPLE.host); setErr(''); setAuto(true); if (at === VISIT_STEPS.length - 1) go(0); };
  useEffect(() => {
    if (!auto) return;
    if (at >= VISIT_STEPS.length - 1) { setAuto(false); return; }
    const t = window.setTimeout(() => go(at + 1), 3400);
    return () => window.clearTimeout(t);
  }, [auto, at]);   // eslint-disable-line react-hooks/exhaustive-deps
  const code = useMemo(() => `${QR_BASE}VISIT-${(clean.length * 7919 + (host.charCodeAt(0) || 0) * 31).toString(36).toUpperCase()}`, [clean, host]);
  const orbit = useOrbit({ yaw: -18, pitch: 56, zoom: 1 });
  const lobby = SPACE_LAYOUTS[LOBBY]; const walk = WALK[step[0]];
  return (
    <section className="lt-page" data-testid="lite-visit" data-step={step[0]} data-auto={auto}>
      <LiteNav here="visit" role={role} />
      <PageHero product="lite" icon="user" compact eyebrow="Empathia Lite · Visit" title="Visiting Northstar" lede="Arrive, check in, meet your host, sign out. A simulation: no message is sent and nothing is stored." />
      <div className="lt-visitbar">
        {auto ? <button type="button" className="ui-btn" onClick={() => setAuto(false)} data-testid="lite-visit-pause"><Icon name="clock" size={16} /> Pause</button>
          : <button type="button" className="ui-btn ui-btn--primary" onClick={watch} data-testid="lite-visit-watch"><Icon name="play" size={16} /> Watch the visit</button>}
        <span className="ui-meta">A sample visitor walks all ten steps, about half a minute. Take any step over by hand.</span>
      </div>
      <ol className="lt-stepper" aria-label="Visit steps">{VISIT_STEPS.map((s, i) => <li key={s[0]} className={i < at ? 'done' : i === at ? 'on' : ''} aria-current={i === at ? 'step' : undefined}><button type="button" onClick={() => { setAuto(false); go(i); }} aria-label={`Step ${i + 1}: ${s[1]}`}><span>{i + 1}</span><b>{s[1]}</b></button></li>)}</ol>
      <div className="lt-visit">
        <figure className="stage lt-stage lt-visit__stage" data-stage="" data-scene={walk ? 'lobby' : 'campus'} data-testid="lite-visit-stage">
          {walk && lobby ? <><div className="stage__bar"><OrbitBar orbit={orbit} /></div>
            <SpaceScene layout={lobby} view={orbit.view} label={`The Atlas lobby in 3D: ${step[1]}`} route={walk.route} walker={walk.at} selected={walk.look || null} highlight={step[0] === 'wait' ? 'z-wait' : ['checkin', 'confirm', 'notified', 'badge'].includes(step[0]) ? 'z-check' : undefined} bind={orbit.bind} /></>
            : <CampusArrive />}
          <figcaption className="stage__cap">{walk ? 'The Atlas lobby (V2.5.3 layout); the walk is modeled.' : 'Arriving: visitor parking on the south side, the lit path to Atlas HQ. Modeled.'}</figcaption>
        </figure>
        <Card title={`${at + 1}. ${step[1]}`} icon="route" testId="lite-visit-step">
          <p>{step[2]}</p>
          {needsForm && <form className="lt-form" onSubmit={(e) => { e.preventDefault(); next(); }} noValidate>
            <label htmlFor="lt-vn">Your name</label><input id="lt-vn" value={name} maxLength={60} autoComplete="off" onChange={(e) => { setName(String(e.target.value).slice(0, 60)); setErr(''); }} aria-invalid={!!err && clean.length < 2} aria-describedby="lt-verr" />
            <label htmlFor="lt-vh">Your host</label><select id="lt-vh" value={host} onChange={(e) => { setHost(String(e.target.value)); setErr(''); }}><option value="">Choose your host</option>{HOSTS.map((h) => <option key={h.key} value={h.key}>{h.label}</option>)}</select>
            <p id="lt-verr" className="lt-err" role="alert">{err}</p></form>}
          {needsDetails && clean.length >= 2 && host && <dl className="lt-dl"><dt>Visitor</dt><dd data-testid="lite-visit-name">{clean}</dd><dt>Host</dt><dd>{HOSTS.find((h) => h.key === host)?.label}</dd></dl>}
          {step[0] === 'notified' && <p className="ui-meta"><Chip small tone="muted" icon="info">Simulated · no message was sent</Chip></p>}
          {step[0] === 'badge' && clean.length >= 2 && <div className="lt-badge" data-testid="lite-badge"><b>VISITOR</b><span>{clean}</span><QrSvg text={code} label="Visitor badge code (simulated)" size={96} /></div>}
          {(step[3] === 'route' || step[0] === 'navigate') && <p><a href="#/lite/way?to=R-ATL-4-218">Route to Atlas 4.218 →</a></p>}
          <div className="lt-pager">{at > 0 ? <button type="button" className="ui-btn" onClick={() => { setAuto(false); go(at - 1); }}>Back</button> : <span />}
            {at < VISIT_STEPS.length - 1 ? <button type="button" className="ui-btn ui-btn--primary" onClick={() => { setAuto(false); next(); }} data-testid="lite-visit-next">{needsForm ? 'Check in' : step[0] === 'confirm' ? 'Confirm the visit' : 'Next'}</button>
              : <button type="button" className="ui-btn ui-btn--primary" onClick={() => { setAuto(false); setName(''); setHost(''); go(0); }}>Sign out and finish</button>}</div>
        </Card>
      </div>
    </section>
  );
}
/** Arriving on campus (the first visit step): the campus from above, visitor parking to the south and the lit path to the Atlas main
 *  entrance, walked by the visitor. From the canonical building footprints; the path and parking are modeled. */
function CampusArrive() {
  const S = 52; const X = (x: number) => 16 + x * S; const Y = (y: number) => 16 + y * S;
  const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;   // reduced motion: the visitor is drawn at the door, not walked there
  const path: Array<[number, number]> = [[3.05, 8.7], [3.05, 5.05], [3.65, 4.4]];
  const d = path.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
  return (
    <svg className="lt-arrive" viewBox={`0 0 ${X(9.6) + 16} ${Y(9.4) + 8}`} role="img" aria-label="The campus from above: visitor parking on the south side and the lit path north to the Atlas HQ main entrance" data-testid="lite-arrive">
      <rect x={X(1.2)} y={Y(8.3)} width={S * 3.6} height={S * 0.9} rx={6} className="lt-arrive__park" /><text x={X(3)} y={Y(8.85)} textAnchor="middle" className="lt-arrive__t">Visitor parking</text>
      {BUILDINGS.map((b) => <g key={b.key}><rect x={X(b.map.x)} y={Y(b.map.y)} width={b.map.w * S} height={b.map.d * S} rx={5} className={`lt-arrive__b${b.key === 'ATL' ? ' on' : ''}`} /><text x={X(b.map.x + b.map.w / 2)} y={Y(b.map.y + b.map.d / 2) + 4} textAnchor="middle" className="lt-arrive__t">{b.short}</text></g>)}
      <path d={d} className="lt-route lt-route--way" />
      <circle cx={X(3.65)} cy={Y(4.32)} r={7} className="lt-arrive__door" />
      {still ? <g className="lt-walker lt-walker--flat" aria-hidden="true" data-testid="lt-walker"><circle cx={X(3.65)} cy={Y(4.4)} r={11} className="lt-walker__ring" /><circle cx={X(3.65)} cy={Y(4.4)} r={6} className="lt-walker__head" /></g>
        : <g className="lt-walker lt-walker--flat" aria-hidden="true" data-testid="lt-walker"><circle r={11} className="lt-walker__ring"><animateMotion dur="3.2s" fill="freeze" path={d} /></circle><circle r={6} className="lt-walker__head"><animateMotion dur="3.2s" fill="freeze" path={d} /></circle></g>}
    </svg>
  );
}

// ------------------------------------------------------------------------------------------------ QR
export function QrSvg({ text, label, size = 140 }: { text: string; label: string; size?: number }) {
  const q = useMemo(() => qrMatrix(text), [text]);
  if (!q) return null; const n = q.size + 8;
  return <svg className="lt-qr" width={size} height={size} viewBox={`0 0 ${n} ${n}`} role="img" aria-label={label} shapeRendering="crispEdges" data-testid="lite-qr"><rect width={n} height={n} fill="#fff" /><path d={qrPath(q)} fill="#000" /></svg>;
}
export function QrPage({ role }: PageProps) {
  return (
    <section className="lt-page" data-testid="lite-qrpage">
      <LiteNav here="qr" role={role} />
      <PageHero product="lite" icon="grid" compact eyebrow="Empathia Lite · QR" title="QR codes on campus" lede={`${QR_TYPES.length} kinds of code, where each is placed and what it opens. The codes encode illustrative example.com addresses: scanning one opens nothing real; the link beside it opens the Lite page here.`} />
      <ul className="lt-qrs">{QR_TYPES.map(([code, label, opens, where, href]) => { const text = `${QR_BASE}${code.replace(/\s+/g, '-')}`; const room = /room\/(R-[A-Z0-9-]+)/.exec(href)?.[1]; const o = room ? roomById(room) : null;
        return <li key={code}><Card title={label} sub={where} icon="grid"><div className="lt-qrrow"><QrSvg text={text} label={`QR code: ${label}`} /><div><p>{opens}{o ? ` (${shortName(o)})` : ''}</p><p className="ui-meta mono">{text}</p><a href={href}>Open it here →</a></div></div></Card></li>; })}</ul>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------ Commons
export function CommonsPage({ role, query }: PageProps) {
  const scene = COMMONS_SCENES.find((s) => s[0] === query.get('scene')) || COMMONS_SCENES[0]!;
  const orbit = useOrbit({ yaw: -24, pitch: 58, zoom: 1 });
  const layout = useMemo(() => commonsLayout(scene[0]), [scene]);
  const ctl = COMMONS_CONTROL[scene[0]];
  const pick = (k: string) => { const n = new URLSearchParams(query); if (k === 'lunch') n.delete('scene'); else n.set('scene', k); setQuery('#/lite/commons', n); };
  return (
    <section className="lt-page" data-testid="lite-commons" data-scene={scene[0]}>
      <LiteNav here="commons" role={role} />
      <PageHero product="lite" icon="users" compact eyebrow="Empathia Lite · Northstar Commons" title="The Commons" lede="One large flexible space: its furniture and technology change with the scenario." />
      <div className="lt-cfgs" role="radiogroup" aria-label="Scenario">{COMMONS_SCENES.map((s) => <button key={s[0]} type="button" role="radio" aria-checked={s[0] === scene[0]} className={`lt-chipbtn${s[0] === scene[0] ? ' on' : ''}`} onClick={() => pick(s[0])} data-testid={`lite-scene-${s[0]}`}>{s[1]}</button>)}</div>
      <div className="lt-roomgrid">
        <div className="lt-stagecol"><figure className="stage lt-stage" data-stage=""><div className="stage__bar"><OrbitBar orbit={orbit} /></div>
          <SpaceScene layout={layout} view={orbit.view} label={`The Commons in 3D: ${scene[1]}`} bind={orbit.bind} />
          <figcaption className="stage__cap"><b>{scene[1]}.</b> {scene[2]} <span className="ui-meta">Modeled layout.</span></figcaption></figure></div>
        <aside className="lt-panel">
          <h2 className="lt-h3">What the drawing shows</h2><ul className="lt-chips">{scene[3].map((x) => <li key={x}><Chip small>{x}</Chip></li>)}</ul>
          <h2 className="lt-h3">Good to know</h2><ul className="lt-bullets">{scene[4].map((x) => <li key={x}>{x}</li>)}</ul>
          {ctl && <><h2 className="lt-h3">Room control: {ctl.mode}</h2><p className="ui-muted">“{ctl.say}”</p><p className="ui-meta">Leads: {ctl.lead.join(' · ')}</p><p className="ui-meta">Support: {ctl.support.join(' · ')}</p></>}
          <p><a href="#/lite/space/SP-ATL-COMMONS">About the Commons →</a> · <a href={liteRoomHref('R-ATL-4-218')}>a meeting room instead</a></p>
        </aside>
      </div>
    </section>
  );
}
