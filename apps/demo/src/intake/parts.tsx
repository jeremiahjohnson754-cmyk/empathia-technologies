/**
 * Pieces the Intake pages share (founder directive 19 Nov 2026 §03, §04, §07): the Intake navigation, the picture of a request (plan and
 * 3D, as the request portal has drawn it since 10 Nov), the proposed room in Lite's own 3D room view, the summary of what is asked for,
 * and one request as a list item.
 */
import { useMemo, useState } from 'react';
import { Button, Icon, Segmented, Tag } from '@empathia/ui';
import type { RoleKey } from '../registry.types.js';
import { ROLES, canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { fullName, roomById, roomHref } from '../campus/canon.js';
import { LAYERS, type Layer, type RoomRecord } from '../campus/design.js';
import { Stage, PlanView, IsoView, LAYER_GLYPH } from '../spatial/Spatial.js';
import { RoomScene, OrbitBar, useOrbit } from '../lite/Scene.js';
import { coverage, type LiteLayer, type Overlay, type StatePosition } from '../lite/model.js';
import type { Workspace } from '../workspace/store.js';
import type { DecisionState } from '../decisions/store.js';
import { kindOf, type Draft, type KindId, type Proposal } from './model.js';
import { standing, stateOf, type Request } from './store.js';

export const KIND_ICON: Record<KindId, 'plus' | 'device' | 'undo' | 'room' | 'calendar' | 'search' | 'chart' | 'wrench' | 'ticket'> = { 'new-room': 'plus', 'add-devices': 'device', 'replace-device': 'undo', 'change-room': 'room', event: 'calendar', 'evaluate-device': 'search', 'improve-room': 'chart', problem: 'wrench', general: 'ticket' };
export const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
export const opensFor = (role: RoleKey) => (href: string) => { const r = resolve(href.split('?')[0]!); return !!r && canOpen(role, r); };
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export { day };

/** The Intake navigation (§03): five places for everyone who asks; the professional work places for the roles that may open them. */
export function IntakeNav({ role, here }: { role: RoleKey; here: 'home' | 'new' | 'mine' | 'spaces' | 'help' | 'track' }) {
  const opens = opensFor(role);
  const main: Array<[typeof here, string, string]> = [['home', 'Home', '#/request'], ['new', 'New request', '#/request/new'], ['mine', 'My requests', '#/requests'], ['spaces', 'My spaces', '#/request/spaces'], ['help', 'Help', '#/request/help']];
  const work: Array<[string, string]> = ([['Requests to triage and decide', '#/intake'], ['ServiceHands jobs', '#/servicehands'], ['Decisions', '#/decisions'], ['Projects', '#/projects']] as Array<[string, string]>).filter(([, h]) => opens(h));
  const cur = here === 'track' ? 'mine' : here;
  return (
    <nav className="ik-nav" aria-label="Intake" data-testid="ik-nav">
      <ul className="ik-nav__main">{main.map(([k, l, h]) => <li key={k}><a href={h} aria-current={cur === k ? 'page' : undefined} data-testid={`ik-nav-${k}`}>{l}</a></li>)}</ul>
      {work.length > 0 && ['ops', 'syseng', 'designer', 'svcmgr', 'architect', 'bpm', 'exec'].includes(role) && <p className="ik-nav__work" data-testid="ik-nav-work"><span>Your work as the {ROLES[role].label}:</span>{work.map(([l, h]) => <a key={h} href={h}>{l}</a>)}</p>}
    </nav>
  );
}

const ALL_LAYERS = new Set<Layer>(LAYERS.map((l) => l.key));
/** The picture of the request: plan or 3D, with what the request adds or replaces ringed. */
export function Preview({ p, d, onPick }: { p: Proposal; d: Draft; onPick?: (code: string) => void }) {
  const [view, setView] = useState<'plan' | '3d'>('plan'); const [angle, setAngle] = useState(0); const marked = useMemo(() => new Set(p.marked), [p.marked]);
  const word = d.kind === 'replace-device' ? 'to be replaced' : d.kind === 'event' ? 'for the event' : 'asked for';
  return (
    <div className="rq-prev" data-testid="rq-preview" data-marked={p.marked.length} data-positions={p.positions.filter((x) => !x.furniture).length}>
      <Stage label={`Preview: ${p.title}`} testId="rq-stage" toolbar={<>
        <Segmented small label="View" value={view} onChange={setView} options={[{ value: 'plan', label: 'Plan' }, { value: '3d', label: '3D' }]} />
        {view === '3d' && <button type="button" className="ui-btn ui-btn--sm" onClick={() => setAngle((a) => (a + 1) % 4)}><Icon name="undo" size={16} /> Turn</button>}
      </>}>
        {view === 'plan'
          ? <PlanView w={p.w} l={p.l} h={p.h} positions={p.positions} connections={[]} layers={ALL_LAYERS} selected={d.kind === 'replace-device' ? d.position || null : null} onSelect={(c) => onPick?.(c)} showLinks={false} marked={marked} />
          : <IsoView w={p.w} l={p.l} h={p.h} positions={p.positions} connections={[]} layers={ALL_LAYERS} selected={d.kind === 'replace-device' ? d.position || null : null} onSelect={(c) => onPick?.(c)} showLinks={false} angle={angle} marked={marked} />}
      </Stage>
      <p className="rq-prev__key">{p.marked.length > 0 && <span className="rq-key rq-key--mark">{plural(p.marked.length, 'position')} {word}</span>}{LAYERS.filter((l) => l.key !== 'furniture' && p.positions.some((x) => x.layer === l.key)).map((l) => <span key={l.key} className="rq-key"><i data-layer={l.key} aria-hidden="true">{LAYER_GLYPH[l.key]}</i>{l.label}</span>)}</p>
    </div>
  );
}

const LITE_LAYERS = new Set<LiteLayer>(['furniture', 'av', 'network', 'power', 'control']);
/**
 * The proposed room as Lite draws a room (founder, 19 Nov 2026 13:28: "getting that proposed lite room at the end"): Lite's own 3D room
 * view, orbit and zoom, with camera and microphone coverage computed by Lite's model from the proposal's own positions. Lite's fourth
 * state, PROPOSED: not designed, not approved, not built. Positions the request adds are marked as added, a device to replace as needing
 * attention.
 */
export function ProposedRoom({ p, d, people }: { p: Proposal; d: Draft; people: number }) {
  const orbit = useOrbit({ yaw: -32, pitch: 50, zoom: 1 }); const [sel, setSel] = useState<string | null>(null);
  const [ov, setOv] = useState<Set<Overlay>>(() => new Set(['camera', 'mic']));
  const positions: StatePosition[] = useMemo(() => p.positions.map((x) => ({ ...x, mark: p.marked.includes(x.code) ? (d.kind === 'replace-device' ? 'attention' : 'added') : 'same' })), [p, d.kind]);
  const cov = useMemo(() => coverage({ outline: { dims: [p.w, p.l, p.h], capacity: Math.max(1, people), archetype: p.archetype }, positions: p.positions } as unknown as RoomRecord, p.positions), [p, people]);
  const pick = sel ? p.positions.find((x) => x.code === sel) : null;
  const toggle = (k: Overlay) => setOv((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return (
    <figure className="stage lt-stage ik-proposed" data-stage="" data-testid="ik-proposed" data-positions={p.positions.filter((x) => !x.furniture).length} data-marked={p.marked.length}>
      <div className="stage__bar"><span className="ik-proposed__state"><Tag tone="accent">Proposed</Tag> not designed, not approved</span>
        <span className="ik-proposed__ov" role="group" aria-label="Coverage">{([['camera', 'Camera view'], ['mic', 'Microphone pickup']] as const).map(([k, l]) => <button key={k} type="button" className={`lt-chipbtn${ov.has(k) ? ' on' : ''}`} aria-pressed={ov.has(k)} onClick={() => toggle(k)}>{l}</button>)}</span>
        <OrbitBar orbit={orbit} /></div>
      <RoomScene label={`The proposed room in 3D: ${p.title}`} w={p.w} l={p.l} h={p.h} view={orbit.view} positions={positions} connections={[]} layers={LITE_LAYERS} overlays={ov} cov={cov}
        selected={sel} onSelect={(c) => setSel(c === sel ? null : c)} bind={orbit.bind} />
      <figcaption className="stage__cap"><b>{pick ? `${pick.label}${p.marked.includes(pick.code) ? (d.kind === 'replace-device' ? ', to be replaced' : ', asked for') : ''}.` : 'The room as proposed.'}</b> {pick ? `${pick.device}. Position ${pick.code}.` : `${p.w} × ${p.l} m, ceiling ${p.h} m. ${plural(p.positions.filter((x) => !x.furniture).length, 'device position')}${p.marked.length ? `, ${p.marked.length} from your request` : ''}.`} <span className="ui-meta">Drawn by Empathia Lite from the proposal. Coverage is Lite’s model, not a measurement. Drag to orbit.</span></figcaption>
    </figure>
  );
}

export function Summary({ p, d }: { p: Proposal; d: Draft }) {
  const isNew = d.kind === 'new-room'; const k = kindOf(d.kind);
  return (
    <div className="rq-sum" data-testid="rq-summary">
      <h3 className="rq-sum__t" data-testid="rq-title">{p.title}</h3>
      <p className="ui-muted">{p.where} · {p.archetypeName} · {p.w} × {p.l} m, ceiling {p.h} m</p>
      {p.engineReads && <p className="ui-meta">{p.engineReads}</p>}
      <h4 className="rq-h">Equipment ({plural(p.equipment.reduce((s, e) => s + e.count, 0), 'device')})</h4>
      <ul className="rq-eq" data-testid="rq-equipment">{p.equipment.map((e) => <li key={e.cat} data-added={e.added || undefined}><span className="rq-dot" data-layer={e.layer} aria-hidden="true" />{e.count} × {e.label}{e.added ? <Tag tone="accent">{e.added} {d.kind === 'replace-device' ? 'to replace' : d.kind === 'event' ? 'for the event' : 'new'}</Tag> : null}</li>)}</ul>
      <h4 className="rq-h">{isNew ? 'Tests the room would have to pass' : d.kind === 'replace-device' ? 'Tests run again after the swap' : 'Tests this adds to the room’s commissioning'}</h4>
      <p data-testid="rq-tests" data-added={p.tests.added} data-total={p.tests.total}><b>{p.tests.added}</b>{isNew ? '' : ` of the room’s ${p.tests.total}`}{p.tests.fresh && !isNew ? ` (${p.tests.fresh} new to this room)` : ''}{p.tests.byDomain.length ? `: ${p.tests.byDomain.slice(0, 5).map(([dm, n]) => `${dm} ${n}`).join(', ')}${p.tests.byDomain.length > 5 ? ' …' : ''}` : '.'}</p>
      {p.tests.examples.length > 0 && <details className="rq-more"><summary>For example</summary><ul>{p.tests.examples.map((t) => <li key={t}>{t}</li>)}</ul></details>}
      {p.findings.length > 0 && <><h4 className="rq-h">What the design engine already notices</h4><ul className="rq-find">{p.findings.map((f) => <li key={f.title}><Tag tone={f.severity === 'High' ? 'bad' : 'warn'}>{f.severity}</Tag> {f.title}</li>)}</ul></>}
      <details className="rq-more"><summary>How this picture was made</summary><ul>{p.basis.map((b) => <li key={b}>{b}</li>)}</ul></details>
      <p className="rq-then"><Icon name="arrow-right" size={16} /> <span>{k.then}</span></p>
    </div>
  );
}

const WHERE: Record<string, string> = { desk: 'Decision desk', servicehands: 'ServiceHands', triage: 'AV operations' };
/** One request in a list: what it is, where it stands in the asker's words, who acts next, and where to follow it. */
export function RequestItem({ r, w, desk, role, onDiscard }: { r: Request; w: Workspace; desk: DecisionState; role: RoleKey; onDiscard?: (id: string) => void }) {
  const s = standing(r, w, desk); const room = r.roomId ? roomById(r.roomId) : null; const draft = stateOf(r) === 'DRAFT'; const opens = opensFor(role);
  return (
    <li data-testid="rq-item" data-id={r.id} data-state={s.state} data-goes={r.goes} data-record={stateOf(r)} className="ik-item">
      <div className="rq-mine__h"><b><a href={draft ? `#/request/new?draft=${r.id}` : `#/requests/${r.id}`}>{r.title}</a></b><Tag tone={s.tone}>{s.words}</Tag></div>
      <p className="ui-muted">{r.id} · {draft ? `started on ${day(r.at)}${r.updated ? `, last changed ${day(r.updated)}` : ''}` : `asked by the ${ROLES[r.role].label} on ${day(r.submittedAt || r.at)}`}{!draft && WHERE[r.goes] ? ` · ${WHERE[r.goes]}${r.projectId ? ` project ${r.projectId}` : r.incidentId ? ` job ${r.incidentId}` : ''}` : ''}{r.date ? ` · event on ${r.date}` : ''}</p>
      {!draft && s.next && <p className="ik-item__next"><span className="ui-meta">Next · {s.owner}</span> {s.next}</p>}
      {s.reason && <p>Reason given: {s.reason}</p>}
      <p className="rq-mine__a">
        {draft ? <a className="ui-btn ui-btn--sm ui-btn--primary" href={`#/request/new?draft=${r.id}`} data-testid="ik-resume">Carry on</a> : <a href={`#/requests/${r.id}`} data-testid="ik-open">Follow it</a>}
        {room && <a href={roomHref(room)}>Open {fullName(room)}</a>}
        {!draft && s.href && opens(s.href) && <a href={s.href}>Open it in {s.where}</a>}
        {draft && onDiscard && <Button kind="quiet" small onClick={() => onDiscard(r.id)} testId="ik-discard">Discard</Button>}
      </p>
    </li>
  );
}
