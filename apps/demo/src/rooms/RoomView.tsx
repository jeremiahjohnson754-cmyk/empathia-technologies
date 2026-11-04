/**
 * The technical room page — one page for all thirty rooms, at #/room (the reference room), #/room/<id>, #/room~<id> (V2.5.3) and the
 * campus address #/campus/<B>/<floor>/<id>. As V2.5.3's Atlas 4.218 page, then further: room tabs, status chips, actions, the health /
 * devices / issues / lifecycle tiles, the delivery spine Intake → Service read from the records, "where the room has moved", the open
 * issues — and, below, the 3D and plan stage with layers, a device panel (position code, asset code, identity state), the engine-judged
 * tests, the history and an honest coverage table. Every number is computed from the records (campus/metrics.ts).
 */
import { useMemo, useState, useEffect } from 'react';
import { Tag, Notice, Button } from '@empathia/ui';
import { resultLabel } from '@empathia/commissioning-engine';
import { buildingByKey, roomHref, shortName, ROOMS } from '../campus/canon.js';
import { roomRecord, LAYERS, PEOPLE, type Layer, type RoomRecord, type Position } from '../campus/design.js';
import { roomHealth, roomIssues, spine, moves, featuredRooms, BAND_LABEL, type Stage as SpineStage } from '../campus/metrics.js';
import { load as loadWorkspace, type Workspace } from '../workspace/store.js';
import { Stage, PlanView, IsoView, LAYER_COLOR } from '../spatial/Spatial.js';
import { StatusDot, Chip, ScoreRing, StatTile, Icon, Section } from '../spatial/parts.js';

export const LIFE_TONE: Record<string, 'ok' | 'warn' | 'info' | 'muted' | 'bad'> = { OPERATIONAL: 'ok', ACCEPTED: 'ok', COMMISSIONING: 'warn', INSTALLED_UNVERIFIED: 'info', PLANNED: 'muted', DESIGN_APPROVED: 'info', INSTALLATION_PENDING: 'info' };
const ALL_TABS = [['overview', 'Room'], ['devices', 'Devices'], ['tests', 'Tests'], ['history', 'History'], ['coverage', 'Coverage']] as const;
const RESULT_TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { PASS_VERIFIED: 'ok', PASS_UNVERIFIED: 'info', FAIL: 'bad', NOT_TESTED: 'muted', NOT_SUPPORTED: 'warn', INCONCLUSIVE: 'warn' };
const COV_TONE: Record<string, 'ok' | 'info' | 'warn' | 'muted'> = { complete: 'ok', recorded: 'info', modeled: 'info', gap: 'warn' };
const STAGE_TONE: Record<SpineStage['state'], string> = { DONE: 'ok', IN_PROGRESS: 'accent', BLOCKED: 'bad', NOT_STARTED: 'muted', NO_RECORD: 'muted' };
const who = (p: string | null | undefined) => (p ? PEOPLE[p] || p : '—');
const date = (s: string) => s.slice(0, 10);
const ago = (s: string) => { const d = Math.round((Date.now() - Date.parse(s)) / 864e5); return d <= 0 ? 'today' : d === 1 ? '1 day ago' : d < 60 ? `${d} days ago` : date(s); };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The workspace (service requests and work orders) as stored by ServiceHands; re-read when another page changes it. */
function useLiveWorkspace(): Workspace | null {
  const [w, setW] = useState<Workspace | null>(() => { try { return loadWorkspace(); } catch { return null; } });
  useEffect(() => { const f = () => { try { setW(loadWorkspace()); } catch { /* keep the last */ } }; addEventListener('storage', f); addEventListener('hashchange', f); return () => { removeEventListener('storage', f); removeEventListener('hashchange', f); }; }, []);
  return w;
}

/**
 * `sees` comes from the shell's policy (D44): a tab the role may not see is not rendered at all. `opens` says whether the role may open
 * an address, so an action that leads to a refusal is not offered. `base` is the address the page lives at (tabs keep it).
 */
export function RoomView({ id, hash, sees = () => true, opens = () => true, base }: { id: string; hash: string; sees?: (id: string) => boolean; opens?: (href: string) => boolean; base?: string }) {
  const SECTION: Record<string, string> = { devices: 'room.devices', tests: 'room.tests', history: 'room.history' };
  const TABS = ALL_TABS.filter(([k]) => !SECTION[k] || sees(SECTION[k]!));
  const r = useMemo(() => roomRecord(id)!, [id]);
  const w = useLiveWorkspace();
  const q = new URLSearchParams(/\?(.*)$/.exec(hash)?.[1] || '');
  const tab = (TABS.find(([k]) => k === q.get('tab'))?.[0]) || 'overview';
  const dev = q.get('device');
  const [sel, setSel] = useState<string | null>(dev);
  useEffect(() => { setSel(dev); }, [id, dev]);   // a deep link (?device=) selects that position
  const o = r.outline; const B = buildingByKey(o.building)!;
  const here = base || roomHref(o);
  const setTab = (k: string) => { const n = new URLSearchParams(q); if (k === 'overview') n.delete('tab'); else n.set('tab', k); n.delete('device'); history.replaceState(null, '', `${here}${n.toString() ? `?${n}` : ''}`); dispatchEvent(new HashChangeEvent('hashchange')); };
  const h = roomHealth(r, w); const iss = roomIssues(r, w); const hw = r.positions.filter((p) => !p.furniture);
  const featured = featuredRooms(8); if (!featured.some((x) => x.id === o.id)) featured.splice(1, 0, o);
  const roomAt = (x: typeof o) => (base && base.startsWith('#/room') ? `#/room/${x.id}` : roomHref(x));
  const acts: Array<{ href: string; label: string; icon: string; primary?: boolean }> = [
    { href: `#/replay/${o.id}`, label: 'Open passport', icon: 'passport', primary: true },
    { href: `#/search?focus=Room:${o.id}`, label: 'Relationships', icon: 'graph' },
    { href: `#/campus/${o.building}/${o.floor}`, label: 'On campus', icon: 'map' },
    { href: `${roomHref(o)}?view=3d`, label: 'Open in Lite', icon: 'cube' },
    { href: `#/servicehands/new?room=${o.id}`, label: 'Report a problem', icon: 'plus' },
  ].filter((a) => opens(a.href.split('?')[0]!));
  const stages = spine(r, w);
  const doneN = stages.filter((s) => s.state === 'DONE').length;
  return (
    <section className="room" data-native="" data-testid="room-view" data-room={o.id}>
      <nav aria-label="Breadcrumb" className="crumbs"><ol><li><a href="#/campus">Campus</a></li><li><a href={`#/campus/${o.building}`}>{B.name}</a></li><li><a href={`#/campus/${o.building}/${o.floor}`}>Floor {o.floor}</a></li><li><span aria-current="page">{o.number}</span></li></ol></nav>
      <nav className="roomtabs" aria-label="Rooms" data-testid="room-tabs">
        {featured.map((x) => <a key={x.id} href={roomAt(x)} className="roomtabs__t" aria-current={x.id === o.id ? 'page' : undefined}>{shortName(x)}</a>)}
        <a href="#/rooms" className="roomtabs__t roomtabs__all">All {ROOMS.length} rooms <Icon name="chevron" size={14} /></a>
      </nav>
      <header className="room__hero">
        <p className="kicker">{B.name} · floor {o.floor} · {r.archetypeName} · {o.capacity} seats</p>
        <h1>{shortName(o)} — {o.name}</h1>
        <p className="room__intent">{o.intent}</p>
        <div className="room__chips" data-testid="room-chips">
          <StatusDot band={h.band} />
          <Chip tone={r.counts.failed ? 'bad' : r.counts.verified === r.counts.applicable && r.counts.applicable ? 'ok' : 'warn'}>Commissioning: {r.counts.applicable ? `${r.counts.verified} of ${r.counts.applicable} verified` : 'no applicable test'}</Chip>
          <Chip tone={LIFE_TONE[r.lifecycle] === 'ok' ? 'ok' : LIFE_TONE[r.lifecycle] === 'warn' ? 'warn' : 'info'}>{r.lifecycle.replace(/_/g, ' ')}</Chip>
          {iss.some((i) => i.severity === 'High') && <Chip tone="bad">High-severity issue open</Chip>}
          <Chip tone={o.kind === 'reference' ? 'accent' : 'muted'}>Record: {o.kind === 'reference' ? 'reference room' : o.kind === 'earlier' ? 'earlier record' : 'modelled from archetype'}</Chip>
          <span className="ui-meta mono">{o.id}</span>
        </div>
        {acts.length > 0 && <div className="room__acts" data-testid="room-actions">{acts.map((a) => <a key={a.label} href={a.href} className={`ui-btn${a.primary ? ' ui-btn--primary' : ''}`}><Icon name={a.icon} /> {a.label}</a>)}</div>}
      </header>
      <div className="tiles" data-testid="room-tiles">
        <StatTile label="Health" value={h.score ?? '—'} unit={h.score == null ? undefined : '/100'} sub={h.score == null ? 'not scored: no test result on record' : `${BAND_LABEL[h.band]} · ${plural(iss.length, 'open issue')}`} tone={h.band} icon={<ScoreRing score={h.score} band={h.band} size={44} label="Room health" />} testId="tile-health" />
        <StatTile label="Devices" value={hw.length} sub={`${plural(r.connections.length, 'connection')} · identity ${hw.length ? 'UNKNOWN until verified' : '—'}`} icon={<Icon name="device" />} testId="tile-devices" />
        <StatTile label="Open issues" value={iss.length} sub={`${iss.filter((i) => i.severity === 'High').length} High · ${iss.filter((i) => i.live).length} live service request${iss.filter((i) => i.live).length === 1 ? '' : 's'}`} tone={iss.some((i) => i.severity === 'High') ? 'action' : iss.length ? 'monitor' : undefined} icon={<Icon name="alert" />} testId="tile-issues" />
        <StatTile label="Lifecycle" value={r.lifecycle.replace(/_/g, ' ').toLowerCase()} sub={r.nextStep?.blockers.length ? `→ ${r.nextStep.to.toLowerCase()} held: ${plural(r.nextStep.blockers.length, 'reason')}` : r.baselines.find((b) => b.state === 'CURRENT') ? `baseline v${r.baselines.find((b) => b.state === 'CURRENT')!.version} current` : 'no accepted baseline'} icon={<Icon name="cycle" />} tone="text" testId="tile-lifecycle" />
      </div>
      <details className="howto"><summary><Chip tone="muted">MODELED · NOT MEASURED</Chip> How the health score is computed</summary><p>100, less 15 for each open High issue, 8 for each Medium and 4 for each Low, less up to 30 for failed tests and up to 20 for tests not yet run. {h.why} Bands: 88 or more Healthy, 75–87 Monitor, below 75 Action required.</p></details>
      {r.nextStep && r.nextStep.blockers.length > 0 && <Notice tone={o.kind === 'reference' ? 'warn' : 'info'}><b>{r.lifecycle} → {r.nextStep.to}: held by the engine.</b> {r.nextStep.blockers.join(' · ')}</Notice>}
      <div className="ui-tabs" role="tablist" aria-label="Room">{TABS.map(([k, label]) => <button key={k} id={`room-tab-${k}`} role="tab" type="button" aria-selected={tab === k} aria-controls={`room-panel-${k}`} tabIndex={tab === k ? 0 : -1} className={`ui-tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)} onKeyDown={(e) => { const i = TABS.findIndex(([x]) => x === tab); if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]![0]; setTab(n); setTimeout(() => document.getElementById(`room-tab-${n}`)?.focus(), 0); } }}>{label}{k === 'devices' && hw.length ? <span className="ui-tab__n">{hw.length}</span> : null}</button>)}</div>
      <div role="tabpanel" id={`room-panel-${tab}`} aria-labelledby={`room-tab-${tab}`} className="room__panel">
        {tab === 'overview' && <>
          <Section title="Delivery spine" aside={`One thread from the request to service, read from the records · ${doneN} of ${stages.length} done`} id="spine-h" testId="spine">
            <ol className="spine">{stages.map((s, i) => {
              const body = <><span className="spine__n">{i + 1} · {s.state.replace('_', ' ')}{s.state === 'DONE' && <Icon name="check" size={14} />}</span><b>{s.label}</b><span className="spine__d">{s.detail}</span></>;
              return <li key={s.key} className={`spine__s spine__s--${STAGE_TONE[s.state]}`} data-state={s.state} title={`source: ${s.source}`}>{s.href && opens(s.href.split('?')[0]!) ? <a href={s.href}>{body}</a> : <div>{body}</div>}</li>;
            })}</ol>
            <p className="ui-meta">A stage is done only when its record says so: a request fulfilled, a phase that passed, a baseline accepted. Blocked means a record is holding it — not that someone is late. “No record” is never filled in.</p>
          </Section>
          <Overview r={r} sel={sel} setSel={setSel} />
          <div className="room__two">
            <Section title="Where the room has moved" aside="Since handover" id="moved-h" testId="moved"><MovedList r={r} /></Section>
            <Section title="Open issues" aside={plural(iss.length, 'open')} id="issues-h" testId="open-issues">
              {iss.length ? <ul className="rows">{iss.map((i) => <li key={i.id} className="row"><span className={`row__ic row__ic--${i.severity === 'High' ? 'bad' : i.severity === 'Medium' ? 'warn' : 'muted'}`}><Icon name="alert" /></span><span className="row__main"><b>{i.href && opens(i.href.split('?')[0]!) ? <a href={i.href}>{i.title}</a> : i.title}</b><span className="ui-meta">{i.id} · {i.source}{i.openedAt ? ` · opened ${ago(i.openedAt)}` : ''}{i.positions.length ? ` · ${i.positions.join(', ')}` : ''}</span></span><span className="row__end"><Chip tone={i.severity === 'High' ? 'bad' : i.severity === 'Medium' ? 'warn' : 'muted'}>{i.severity} · {i.state.toLowerCase().replace('_', ' ')}</Chip></span></li>)}</ul>
                : <div className="empty"><b>No open issue</b><p>Nothing is open on this room’s record or in the service workspace.</p></div>}
            </Section>
          </div>
        </>}
        {tab === 'devices' && <Devices r={r} setSel={(c) => { setSel(c); const n = new URLSearchParams(q); n.delete('tab'); n.set('device', c); history.replaceState(null, '', `${here}?${n}`); dispatchEvent(new HashChangeEvent('hashchange')); }} />}
        {tab === 'tests' && <Tests r={r} />}
        {tab === 'history' && <History r={r} />}
        {tab === 'coverage' && <Coverage r={r} />}
      </div>
      <p className="room__links ui-meta">Elsewhere: <a href={`#/search?focus=Room:${o.id}`}>Search Party from this room</a> · <a href={`#/search/scenarios?room=${o.id}`}>who supports this space</a>{o.kind === 'reference' && <> · <a href={`#/replay/${o.id}`}>Core Replay</a> · <a href={`#/v25/fi/scan/${o.id}`}>Field Intelligence scan</a></>}</p>
    </section>
  );
}

function MovedList({ r }: { r: RoomRecord }) {
  const mv = moves(r);
  if (!mv.length) return <div className="empty"><b>{r.baselines.some((b) => b.state === 'CURRENT') ? 'Nothing has moved since handover' : 'Not handed over yet'}</b><p>{r.baselines.some((b) => b.state === 'CURRENT') ? 'No unit, baseline or issue has changed since the room was accepted.' : 'Changes are tracked from the first accepted baseline; this room has none yet.'}</p></div>;
  return <ul className="rows">{mv.map((m, i) => <li key={i} className="row"><span className="row__ic"><Icon name={m.kind === 'unit' ? 'device' : m.kind === 'baseline' ? 'cycle' : m.kind === 'issue' ? 'alert' : 'clock'} /></span><span className="row__main"><b>{m.title}</b><span className="ui-meta">{m.from} → {m.to} · {m.by}</span></span><span className="row__end ui-meta">{ago(m.at)}</span></li>)}</ul>;
}

function Overview({ r, sel, setSel }: { r: RoomRecord; sel: string | null; setSel: (c: string | null) => void }) {
  const [view, setView] = useState<'3d' | 'plan'>('3d'); const [angle, setAngle] = useState(0); const [links, setLinks] = useState(true);
  const [layers, setLayers] = useState<Set<Layer>>(() => new Set(LAYERS.map((l) => l.key)));
  const [w, l, h] = r.outline.dims; const p = r.positions.find((x) => x.code === sel) || null;
  const toggle = (k: Layer) => setLayers((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const props = { w, l, h, positions: r.positions, connections: r.connections, layers, selected: sel, onSelect: (c: string) => setSel(c === sel ? null : c), showLinks: links };
  return (
    <div className="room__grid">
      <div className="room__stagecol">
        <Stage label={`${view === '3d' ? '3D view' : 'Plan'} of ${r.outline.name}`} testId="room-stage" toolbar={<>
          <div className="seg" role="group" aria-label="View"><button type="button" aria-pressed={view === '3d'} onClick={() => setView('3d')}>3D</button><button type="button" aria-pressed={view === 'plan'} onClick={() => setView('plan')}>Plan</button></div>
          {view === '3d' && <button type="button" className="stage__btn" onClick={() => setAngle((a) => (a + 1) % 4)} aria-label={`Rotate the view (now ${angle * 90}°)`}>Rotate ↻</button>}
          {view === 'plan' && <label className="stage__check"><input type="checkbox" checked={links} onChange={(e) => setLinks(e.target.checked)} /> Connections</label>}
        </>}>
          {view === '3d' ? <IsoView {...props} angle={angle} /> : <PlanView {...props} />}
          <figcaption className="stage__cap">{r.geometryProvenance === 'DECLARED' ? 'Dimensions from the design record.' : 'Modelled layout from the archetype template — not surveyed.'} {w} × {l} m, ceiling {h} m. Select a device to inspect it.</figcaption>
        </Stage>
        <fieldset className="layers"><legend>Layers</legend>{LAYERS.map((x) => { const n = r.positions.filter((p) => p.layer === x.key).length; return <label key={x.key} className={n ? '' : 'off'}><input type="checkbox" checked={layers.has(x.key)} onChange={() => toggle(x.key)} disabled={!n} /><span className="layers__sw" style={{ background: LAYER_COLOR[x.key] }} aria-hidden="true" />{x.label} <span className="ui-meta">({n})</span></label>; })}</fieldset>
      </div>
      <aside className="room__side" aria-label="Device panel" aria-live="polite" data-testid="device-panel">
        {p ? <DevicePanel r={r} p={p} onClose={() => setSel(null)} /> : <RoomSummary r={r} setSel={(c) => setSel(c)} />}
      </aside>
    </div>
  );
}

function RoomSummary({ r, setSel }: { r: RoomRecord; setSel: (c: string) => void }) {
  const hw = r.positions.filter((p) => !p.furniture);
  const [all, setAll] = useState(false);
  const shown = all ? hw : hw.slice(0, 6);
  return (
    <div className="stack">
      <div className="room__devhead"><h2 className="build__h">Devices</h2><span className="ui-meta">{hw.length} in the room</span></div>
      {hw.length ? <ul className="rows rows--tight" data-testid="device-preview">{shown.map((p) => <li key={p.code} className="row"><span className="layers__sw" style={{ background: LAYER_COLOR[p.layer] }} aria-hidden="true" /><span className="row__main"><button type="button" className="linkish" onClick={() => setSel(p.code)}>{p.label}</button><span className="ui-meta mono">{p.code} · {p.asset || '—'}</span></span><span className="row__end ui-meta">{p.identity.toLowerCase()}</span></li>)}</ul>
        : <div className="empty"><b>No devices recorded</b><p>The earlier record of this room holds no device positions; none are invented.</p></div>}
      {hw.length > 6 && <button type="button" className="sp__more" onClick={() => setAll(!all)} aria-expanded={all}>{all ? 'Show fewer' : `Show ${hw.length - 6} more of ${hw.length}`}</button>}
      <dl className="facts"><dt>Connections</dt><dd>{r.connections.length} {r.connections.length ? '(proposed, MODELED)' : ''}</dd><dt>Tests</dt><dd>{r.counts.verified} of {r.counts.applicable} passed and independently verified</dd><dt>Baseline</dt><dd>{r.baselines.length ? r.baselines.map((b) => `v${b.version} ${b.state}`).join(' · ') : 'none'}</dd></dl>
      {r.templateNote && <p className="ui-meta">{r.templateNote}.</p>}
    </div>
  );
}

function DevicePanel({ r, p, onClose }: { r: RoomRecord; p: Position; onClose: () => void }) {
  const inst = r.installations.filter((x) => x.position === p.code);
  const conns = r.connections.filter((c) => c.from === p.code || c.to === p.code);
  const name = (c: string) => r.positions.find((x) => x.code === c)?.label || c;
  return (
    <div className="stack" data-testid="device-detail">
      <div className="room__devhead"><h2 className="build__h">{p.label}</h2><Button small kind="quiet" onClick={onClose}>Close</Button></div>
      <Identity p={p} />
      <dl className="facts"><dt>Device</dt><dd>{p.device}</dd><dt>Mount</dt><dd>{p.mount} · {p.z} m</dd><dt>Source</dt><dd>{p.provenance}</dd></dl>
      <h3 className="build__h3">Position history</h3>
      <p className="ui-meta">The position code stays; units come and go.</p>
      {inst.length ? <ul className="plain">{inst.map((x, i) => <li key={i}><b className="mono">{x.asset}</b> installed {date(x.installedAt)}{x.removedAt ? <> · removed {date(x.removedAt)} ({x.removalReason})</> : ' · current'} <span className="ui-meta">· {x.basis}</span></li>)}</ul> : <p className="ui-muted">No installation recorded.</p>}
      <h3 className="build__h3">Connections ({conns.length})</h3>
      {conns.length ? <ul className="plain">{conns.map((c) => <li key={c.id}>{c.from === p.code ? '→' : '←'} {name(c.from === p.code ? c.to : c.from)} <span className="ui-meta">· {c.kind} · {c.why} · {c.state || 'PROPOSED'}</span></li>)}</ul> : <p className="ui-muted">None recorded.</p>}
      {p.asset && <p><a href={`#/search?focus=PlannedAsset:${encodeURIComponent(p.code)}`}>This device in Search Party</a></p>}
    </div>
  );
}

export function Identity({ p }: { p: Position }) {
  return <p className="ident" data-testid="identity"><span>position <b className="mono">{p.code}</b></span><span>asset <b className="mono">{p.asset || '—'}</b></span><span>identity <Tag tone={p.identity === 'VERIFIED' ? 'ok' : 'muted'}>{p.identity}</Tag></span></p>;
}

function Devices({ r, setSel }: { r: RoomRecord; setSel: (c: string) => void }) {
  const hw = r.positions.filter((p) => !p.furniture);
  if (!hw.length) return <div className="empty"><b>No devices recorded</b><p>The earlier record of this room holds no device positions; none are invented.</p></div>;
  return (
    <div className="table-wrap"><table className="build__table" data-testid="device-table"><caption className="ui-visually-hidden">Devices of the room</caption>
      <thead><tr><th scope="col">Device</th><th scope="col">Position</th><th scope="col">Asset</th><th scope="col">Identity</th><th scope="col">Layer</th><th scope="col">Unit</th></tr></thead>
      <tbody>{hw.map((p) => <tr key={p.code}><th scope="row"><button type="button" className="linkish" onClick={() => setSel(p.code)}>{p.label}</button></th><td className="mono">{p.code}</td><td className="mono">{p.asset || '—'}</td><td>{p.identity}</td><td>{p.layer}</td><td>{p.device}</td></tr>)}</tbody>
    </table></div>
  );
}

function Tests({ r }: { r: RoomRecord }) {
  const [all, setAll] = useState(false);
  const rows = r.analysis.applicability.rows.filter((x) => all || x.applicable);
  const re = new Map(r.reopened.map((x) => [x.testId, x.reasons]));
  return (
    <div className="stack">
      <p>{r.counts.applicable} of {r.analysis.applicability.library} tests in the library apply to this room, judged by the commissioning engine from its devices and archetype. <b>{r.counts.verified}</b> passed and independently verified, {r.counts.failed} failed, {r.counts.notTested} not tested.</p>
      {r.reopened.length > 0 && <Notice tone="info"><b>{r.reopened.length} tests reopened by the camera replacement.</b> Their earlier results stay in history and never count towards re-acceptance; each was re-run and verified by a different person.</Notice>}
      <label className="stage__check"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Show the tests that do not apply, with the reason</label>
      <div className="table-wrap"><table className="build__table" data-testid="test-table"><caption className="ui-visually-hidden">Commissioning tests</caption>
        <thead><tr><th scope="col">Test</th><th scope="col">Domain</th><th scope="col">Result</th><th scope="col">Why</th></tr></thead>
        <tbody>{rows.map((x) => { const res = r.design.results?.[x.id]; const lab = x.applicable ? resultLabel(res) : 'NOT_APPLICABLE'; return (
          <tr key={x.id}><th scope="row">{x.label}<div className="ui-meta mono">{x.id}</div></th><td>{x.domain}</td><td><Tag tone={RESULT_TONE[lab] || 'muted'}>{lab}</Tag>{res && <div className="ui-meta">{who(res.by)}{res.verified ? ` · verified by ${who(res.verified.by)}` : ''}</div>}{re.has(x.id) && <div className="ui-meta">reopened: {re.get(x.id)!.join('; ')}{res?.history?.length ? ' · earlier result kept in history' : ''}</div>}</td><td className="ui-meta">{(x.why || []).slice(0, 2).join('; ')}</td></tr>); })}</tbody>
      </table></div>
    </div>
  );
}

function History({ r }: { r: RoomRecord }) {
  return (
    <div className="stack">
      <h2 className="build__h">Baselines</h2>
      {r.baselines.length ? <ul className="plain" data-testid="baselines">{r.baselines.map((b) => <li key={b.version}><Tag tone={b.state === 'CURRENT' ? 'ok' : b.state === 'PENDING_ACCEPTANCE' ? 'warn' : 'muted'}>v{b.version} {b.state}</Tag> revision {b.revision} · {date(b.at)}{b.by ? ` · ${who(b.by)}` : ''} <span className="ui-meta">· {b.note}</span></li>)}</ul> : <p className="ui-muted">No baseline: the room has not been accepted.</p>}
      {r.exception && <div className="card stack" data-testid="exception"><h3 className="build__h3">{r.exception.id} <Tag tone="warn">PENDING APPROVAL</Tag></h3><dl className="facts"><dt>Finding</dt><dd>{r.exception.finding}</dd><dt>Requirement</dt><dd>{r.exception.requirement}</dd><dt>Waivability</dt><dd>{r.exception.waivability}</dd><dt>Rationale</dt><dd>{r.exception.rationale}</dd><dt>Scope</dt><dd>{r.exception.scope}</dd><dt>Revision</dt><dd>{r.exception.revision}</dd><dt>Proposed expiry</dt><dd>{r.exception.expiry}</dd><dt>Requested by</dt><dd>{who(r.exception.requester)}</dd><dt>Reviewer</dt><dd>none yet — an independent reviewer must approve before the exception counts</dd></dl></div>}
      <h2 className="build__h">Issues</h2>
      {r.issues.length ? <ul className="plain">{r.issues.map((i) => <li key={i.id}><Tag tone={i.state === 'RESOLVED' ? 'ok' : i.severity === 'High' ? 'bad' : 'warn'}>{i.state}</Tag> <b>{i.title}</b> <span className="ui-meta">· {i.severity} · {i.source}{i.positions.length ? ` · ${i.positions.join(', ')}` : ''}</span></li>)}</ul> : <p className="ui-muted">No issue recorded.</p>}
      <h2 className="build__h">Events ({r.events.length})</h2>
      <ol className="events" data-testid="events">{r.events.map((e, i) => <li key={i} className={e.outcome === 'DENIED' ? 'denied' : ''}><span className="ui-meta">{date(e.at)} · {who(e.by)}</span> <code>{e.type}</code> {e.detail}</li>)}</ol>
    </div>
  );
}

function Coverage({ r }: { r: RoomRecord }) {
  return (
    <div className="table-wrap"><table className="build__table" data-testid="coverage"><caption>What this room’s record covers</caption>
      <thead><tr><th scope="col">Area</th><th scope="col">State</th><th scope="col">Note</th></tr></thead>
      <tbody>{r.coverage.map((c) => <tr key={c.area}><th scope="row">{c.area}</th><td><Tag tone={COV_TONE[c.state] || 'muted'}>{c.state}</Tag></td><td>{c.note}</td></tr>)}</tbody>
    </table></div>
  );
}
