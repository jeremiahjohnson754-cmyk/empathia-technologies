/**
 * Lite's places: the fourteen V2.5.3 spaces (lobby and its parts, services, amenities, the Commons), the three guides and their
 * twenty-five chapters, wayfinding to any room or place, the ten-step visit, the QR codes and the Commons scenes.
 * Records come from data/v253.ts (extracted statically from V2.5.3); routes and layouts are modeled. Nothing leaves the page:
 * the visit's "host notified" is simulated and says so.
 */
import { useMemo, useState } from 'react';
import { PageHero, Card, Chip, Icon, EmptyState } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { allows } from '../access/policy.js';
import { SPACES, GUIDES, SPACE_LAYOUTS, PODS_X, COMMONS_SCENES, COMMONS_CONTROL, VISIT_STEPS, QR_TYPES, QR_BASE } from './data/v253.js';
import type { SpaceLayout, SpaceObj } from './data/types.js';
import { DESTINATIONS, routeTo, chapterById, chapterCount, liteRoomHref } from './model.js';
import { SpaceScene, OrbitBar, useOrbit } from './Scene.js';
import { LiteNav, LiteMissing, setQuery } from './LiteApp.js';
import { qrMatrix, qrPath } from './qr.js';
import { roomById, shortName } from '../campus/canon.js';
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
      {route && <Card title={route.label} sub={route.minutes ? `About ${route.minutes} minute${route.minutes === 1 ? '' : 's'} on foot · modeled` : 'A regional site: travel there first'} icon="route" testId="lite-route">
        <ol className="lt-steps lt-steps--route">{route.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        <p><a className="ui-btn ui-btn--primary" href={route.href}>Open the destination</a></p></Card>}
    </section>
  );
}

// ------------------------------------------------------------------------------------------------ visit
const HOSTS = ['opslead', 'svcmgr', 'syseng', 'designer', 'architect'].map((k) => ({ key: k, label: PEOPLE[k]! }));
export function VisitPage({ role, query }: PageProps) {
  const at = Math.max(0, VISIT_STEPS.findIndex((s) => s[0] === query.get('step')));
  const [name, setName] = useState(''); const [host, setHost] = useState(''); const [err, setErr] = useState('');
  const step = VISIT_STEPS[at]!; const go = (i: number) => { const n = new URLSearchParams(query); n.set('step', VISIT_STEPS[Math.max(0, Math.min(VISIT_STEPS.length - 1, i))]![0]); setQuery('#/lite/visit', n); };
  const clean = name.replace(/[\u0000-\u001f<>]/g, '').trim();
  const needsForm = step[0] === 'checkin'; const needsDetails = ['confirm', 'notified', 'badge'].includes(step[0]);
  const next = () => {
    if (needsForm) { if (clean.length < 2) { setErr('Enter your name (at least two letters).'); return; } if (!host) { setErr('Choose your host.'); return; } }
    if (needsDetails && (clean.length < 2 || !host)) { go(VISIT_STEPS.findIndex((s) => s[0] === 'checkin')); return; }
    setErr(''); go(at + 1);
  };
  const code = useMemo(() => `${QR_BASE}VISIT-${(clean.length * 7919 + (host.charCodeAt(0) || 0) * 31).toString(36).toUpperCase()}`, [clean, host]);
  return (
    <section className="lt-page" data-testid="lite-visit" data-step={step[0]}>
      <LiteNav here="visit" role={role} />
      <PageHero product="lite" icon="user" compact eyebrow="Empathia Lite · Visit" title="Visiting Northstar" lede="Arrive, check in, meet your host, sign out. A simulation: no message is sent and nothing is stored." />
      <ol className="lt-stepper" aria-label="Visit steps">{VISIT_STEPS.map((s, i) => <li key={s[0]} className={i < at ? 'done' : i === at ? 'on' : ''} aria-current={i === at ? 'step' : undefined}><span>{i + 1}</span><b>{s[1]}</b></li>)}</ol>
      <Card title={`${at + 1}. ${step[1]}`} icon="route" testId="lite-visit-step">
        <p>{step[2]}</p>
        {needsForm && <form className="lt-form" onSubmit={(e) => { e.preventDefault(); next(); }} noValidate>
          <label htmlFor="lt-vn">Your name</label><input id="lt-vn" value={name} maxLength={60} autoComplete="off" onChange={(e) => { setName(String(e.target.value).slice(0, 60)); setErr(''); }} aria-invalid={!!err && clean.length < 2} aria-describedby="lt-verr" />
          <label htmlFor="lt-vh">Your host</label><select id="lt-vh" value={host} onChange={(e) => { setHost(String(e.target.value)); setErr(''); }}><option value="">Choose your host</option>{HOSTS.map((h) => <option key={h.key} value={h.key}>{h.label}</option>)}</select>
          <p id="lt-verr" className="lt-err" role="alert">{err}</p></form>}
        {needsDetails && clean.length >= 2 && host && <dl className="lt-dl"><dt>Visitor</dt><dd data-testid="lite-visit-name">{clean}</dd><dt>Host</dt><dd>{HOSTS.find((h) => h.key === host)?.label}</dd></dl>}
        {step[0] === 'notified' && <p className="ui-meta"><Chip small tone="muted" icon="info">Simulated · no message was sent</Chip></p>}
        {step[0] === 'badge' && clean.length >= 2 && <div className="lt-badge" data-testid="lite-badge"><b>VISITOR</b><span>{clean}</span><QrSvg text={code} label="Visitor badge code (simulated)" size={96} /></div>}
        {step[3] === 'route' && <p><a href="#/lite/way?to=R-ATL-4-218">Route to Atlas 4.218 →</a></p>}
        <div className="lt-pager">{at > 0 ? <button type="button" className="ui-btn" onClick={() => go(at - 1)}>Back</button> : <span />}
          {at < VISIT_STEPS.length - 1 ? <button type="button" className="ui-btn ui-btn--primary" onClick={next} data-testid="lite-visit-next">{needsForm ? 'Check in' : step[0] === 'confirm' ? 'Confirm the visit' : 'Next'}</button>
            : <button type="button" className="ui-btn ui-btn--primary" onClick={() => { setName(''); setHost(''); go(0); }}>Sign out and finish</button>}</div>
      </Card>
    </section>
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
