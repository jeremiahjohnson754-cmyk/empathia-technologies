/**
 * One room view for all thirty rooms: 3D and plan on a dark stage with layers, a device panel (position code, asset code, identity state —
 * the same three fields wherever a device is shown), connections, the engine-judged tests, the history and an honest coverage table.
 */
import { useMemo, useState, useEffect } from 'react';
import { Tag, Notice, Button } from '@empathia/ui';
import { resultLabel } from '@empathia/commissioning-engine';
import { buildingByKey, roomHref, shortName } from '../campus/canon.js';
import { roomRecord, LAYERS, PEOPLE, openIssues, type Layer, type RoomRecord, type Position } from '../campus/design.js';
import { Stage, PlanView, IsoView, LAYER_COLOR } from '../spatial/Spatial.js';
import { LIFE_TONE } from '../campus/CampusPage.js';

const TABS = [['overview', 'Room'], ['devices', 'Devices'], ['tests', 'Tests'], ['history', 'History'], ['coverage', 'Coverage']] as const;
const RESULT_TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { PASS_VERIFIED: 'ok', PASS_UNVERIFIED: 'info', FAIL: 'bad', NOT_TESTED: 'muted', NOT_SUPPORTED: 'warn', INCONCLUSIVE: 'warn' };
const COV_TONE: Record<string, 'ok' | 'info' | 'warn' | 'muted'> = { complete: 'ok', recorded: 'info', modeled: 'info', gap: 'warn' };
const who = (p: string | null | undefined) => (p ? PEOPLE[p] || p : '—');
const date = (s: string) => s.slice(0, 10);

export function RoomView({ id, hash }: { id: string; hash: string }) {
  const r = useMemo(() => roomRecord(id)!, [id]);
  const q = new URLSearchParams(/\?(.*)$/.exec(hash)?.[1] || '');
  const tab = (TABS.find(([k]) => k === q.get('tab'))?.[0]) || 'overview';
  const [sel, setSel] = useState<string | null>(q.get('device'));
  useEffect(() => { setSel(q.get('device')); }, [id]);   // eslint-disable-line react-hooks/exhaustive-deps
  const o = r.outline; const B = buildingByKey(o.building)!;
  const setTab = (k: string) => { const n = new URLSearchParams(q); if (k === 'overview') n.delete('tab'); else n.set('tab', k); history.replaceState(null, '', `${roomHref(o)}${n.toString() ? `?${n}` : ''}`); dispatchEvent(new HashChangeEvent('hashchange')); };
  return (
    <section className="room" data-testid="room-view" data-room={o.id}>
      <nav aria-label="Breadcrumb" className="crumbs"><ol><li><a href="#/campus">Campus</a></li><li><a href={`#/campus/${o.building}`}>{B.name}</a></li><li><a href={`#/campus/${o.building}/${o.floor}`}>Floor {o.floor}</a></li><li><span aria-current="page">{o.number}</span></li></ol></nav>
      <header className="room__head">
        <div><p className="kicker">{shortName(o)} · {r.archetypeName} · {o.capacity} seats</p><h1>{o.name}</h1><p className="ui-muted">{o.intent}</p></div>
        <div className="room__state"><Tag tone={LIFE_TONE[r.lifecycle] || 'muted'}>{r.lifecycle}</Tag>{o.kind === 'reference' && <Tag tone="info">reference room</Tag>}{o.kind === 'earlier' && <Tag tone="muted">earlier record</Tag>}{o.kind === 'designed' && <Tag tone="muted">modelled from archetype</Tag>}<span className="ui-meta mono">{o.id}</span></div>
      </header>
      {r.nextStep && r.nextStep.blockers.length > 0 && <Notice tone={o.kind === 'reference' ? 'warn' : 'info'}><b>{r.lifecycle} → {r.nextStep.to}: held by the engine.</b> {r.nextStep.blockers.join(' · ')}</Notice>}
      <div className="ui-tabs" role="tablist" aria-label="Room">{TABS.map(([k, label]) => <button key={k} id={`room-tab-${k}`} role="tab" type="button" aria-selected={tab === k} aria-controls={`room-panel-${k}`} tabIndex={tab === k ? 0 : -1} className={`ui-tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)} onKeyDown={(e) => { const i = TABS.findIndex(([x]) => x === tab); if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]![0]; setTab(n); setTimeout(() => document.getElementById(`room-tab-${n}`)?.focus(), 0); } }}>{label}</button>)}</div>
      <div role="tabpanel" id={`room-panel-${tab}`} aria-labelledby={`room-tab-${tab}`} className="room__panel">
        {tab === 'overview' && <Overview r={r} sel={sel} setSel={setSel} />}
        {tab === 'devices' && <Devices r={r} setSel={(c) => { setSel(c); setTab('overview'); }} />}
        {tab === 'tests' && <Tests r={r} />}
        {tab === 'history' && <History r={r} />}
        {tab === 'coverage' && <Coverage r={r} />}
      </div>
      <p className="room__links ui-meta">Elsewhere: <a href={`#/search?focus=Room:${o.id}`}>Search Party from this room</a> · <a href={`#/search/scenarios?room=${o.id}`}>who supports this space</a>{o.kind === 'reference' && <> · <a href={`#/replay/${o.id}`}>Core Replay</a> · <a href={`#/v25/fi/scan/${o.id}`}>Field Intelligence scan</a> · <a href={`#/story/${o.id}`}>Room Story</a></>}</p>
    </section>
  );
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
        {p ? <DevicePanel r={r} p={p} onClose={() => setSel(null)} /> : <RoomSummary r={r} />}
      </aside>
    </div>
  );
}

function RoomSummary({ r }: { r: RoomRecord }) {
  const hw = r.positions.filter((p) => !p.furniture);
  return (
    <div className="stack">
      <h2 className="build__h">This room</h2>
      <dl className="facts"><dt>Devices</dt><dd>{hw.length} positions</dd><dt>Connections</dt><dd>{r.connections.length} {r.connections.length ? '(proposed, MODELED)' : ''}</dd><dt>Tests</dt><dd>{r.counts.verified} of {r.counts.applicable} passed and independently verified</dd><dt>Baseline</dt><dd>{r.baselines.length ? r.baselines.map((b) => `v${b.version} ${b.state}`).join(' · ') : 'none'}</dd><dt>Open issues</dt><dd>{openIssues(r).length || 'none'}</dd></dl>
      {openIssues(r).length > 0 && <ul className="plain">{openIssues(r).map((i) => <li key={i.id}><Tag tone={i.severity === 'High' ? 'bad' : 'warn'}>{i.severity}</Tag> {i.title} <span className="ui-meta">· {i.source}</span></li>)}</ul>}
      {r.templateNote && <p className="ui-meta">{r.templateNote}.</p>}
      {!hw.length && <div className="empty"><b>No devices recorded</b><p>The earlier record of this room holds no device positions; none are invented.</p></div>}
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
