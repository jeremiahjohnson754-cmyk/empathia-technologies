/**
 * #/request — ask for a room or equipment (founder, 10 Nov). One page, three things: what you need, a few plain answers, and a picture
 * of what you are asking for, drawn as you answer. Everything the records hold about the room is filled in. Sending creates a project
 * on the decision desk or a job in ServiceHands and says which; nothing is ordered, approved or changed by asking. Below: the
 * requests sent from this browser and where each stands, in the asker's words.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PageHero, Button, Notice, Tag, Field, Icon, Segmented } from '@empathia/ui';
import type { PageProps, RoleKey } from '../registry.types.js';
import { ROLES, canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { CAMPUS_ROOMS, fullName, roomById, roomHref } from '../campus/canon.js';
import { roomRecord, LAYERS, type Layer } from '../campus/design.js';
import { Stage, PlanView, IsoView, LAYER_GLYPH } from '../spatial/Spatial.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { load as loadDesk } from '../decisions/store.js';
import { KINDS, USES, WHEN, MATTERS, SITES, ADDABLE, blank, catName, kindOf, propose, known, problems, handoff, type Draft, type KindId, type Proposal } from './model.js';
import { send, loadRequests, standing, type Request } from './store.js';

const DRAFT_KEY = 'empathia.demo.request.draft.v1';
const ALL_LAYERS = new Set<Layer>(LAYERS.map((l) => l.key));
const KIND_ICON: Record<KindId, 'plus' | 'device' | 'undo' | 'room' | 'calendar' | 'search' | 'chart'> = { 'new-room': 'plus', 'add-devices': 'device', 'replace-device': 'undo', 'change-room': 'room', event: 'calendar', 'evaluate-device': 'search', 'improve-room': 'chart' };
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
const fromQuery = (q: URLSearchParams, kind?: string): Draft | null => {
  const k = KINDS.find((x) => x.id === (kind || q.get('kind'))); const room = q.get('room'); if (!k && !room) return null;
  const d = blank(k?.id || 'add-devices'); if (room && roomById(room)) { d.roomId = room; d.building = roomById(room)!.building; } const pos = q.get('position'); if (pos) d.position = pos; const need = q.get('need'); if (need) d.need = need.replace(/[\u0000-\u001f]/g, ' ').slice(0, 600); return d;
};
const restore = (): Draft | null => { try { const s = sessionStorage.getItem(DRAFT_KEY); const d = s ? (JSON.parse(s) as Draft) : null; return d && KINDS.some((k) => k.id === d.kind) && Array.isArray(d.adds) ? { ...blank(d.kind), ...d } : null; } catch { return null; } };

/** The picture of the request: plan or 3D, with what the request adds or replaces ringed. */
function Preview({ p, d, onPick }: { p: Proposal; d: Draft; onPick?: (code: string) => void }) {
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

function Summary({ p, d }: { p: Proposal; d: Draft }) {
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

/** Optional extras stay folded until wanted, so a new room is four answers long; equipment requests show them at once. */
function Extras({ optional, count, children }: { optional: boolean; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(count > 0);
  if (!optional) return <>{children}</>;
  return <details className="rq-extras" open={open} onToggle={(e: { currentTarget: HTMLDetailsElement }) => setOpen(e.currentTarget.open)} data-testid="rq-extras"><summary>Anything extra? <span className="ui-meta">{count ? `${count} added` : 'optional'}</span></summary>{children}</details>;
}

const WORD: Record<string, string> = { desk: 'Decision desk', servicehands: 'ServiceHands' };
function Mine({ list, opens, w }: { list: Request[]; opens: (href: string) => boolean; w: ReturnType<typeof useWorkspace>['w'] }) {
  const desk = useMemo(() => loadDesk(), [list]);
  if (!list.length) return <p className="ui-muted" data-testid="rq-none">Nothing has been asked for from this browser yet.</p>;
  return (
    <ul className="rq-mine" data-testid="rq-mine">{list.map((r) => { const s = standing(r, w, desk); const room = r.roomId ? roomById(r.roomId) : null; return (
      <li key={r.id} data-testid="rq-item" data-id={r.id} data-state={s.state} data-goes={r.goes}>
        <div className="rq-mine__h"><b>{r.title}</b><Tag tone={s.tone}>{s.words}</Tag></div>
        <p className="ui-muted">{r.id} · asked by the {ROLES[r.role].label} on {r.at.slice(0, 10)} · {WORD[r.goes]}{r.projectId ? ` project ${r.projectId}` : r.incidentId ? ` job ${r.incidentId}` : ''}{r.date ? ` · event on ${r.date}` : ''}</p>
        {s.reason && <p>Reason given: {s.reason}</p>}
        <p className="rq-mine__a">{room && <a href={roomHref(room)}>Open {fullName(room)}</a>}{s.href && opens(s.href) && <a href={s.href}>Open it in {s.where}</a>}</p>
      </li>); })}</ul>
  );
}

export default function RequestPage({ role, query, params, can }: PageProps) {
  void can; const { w, apply } = useWorkspace();
  const [d, setD] = useState<Draft>(() => fromQuery(query, params['kind']) || restore() || blank());
  const [tried, setTried] = useState(false); const [sent, setSent] = useState<Request | null>(null); const [refused, setRefused] = useState<string[] | null>(null); const [list, setList] = useState<Request[]>(() => loadRequests());
  const sentRef = useRef<HTMLHeadingElement>(null); const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* the draft lasts the page */ } }, [d]);
  // a shortcut that names a kind or a room (from a room page, a start page) replaces the draft
  useEffect(() => { const q = fromQuery(query, params['kind']); if (q) { setD(q); setSent(null); setTried(false); } }, [query.toString(), params['kind']]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (sent) sentRef.current?.focus(); }, [sent]);
  // a refused send moves focus to the first answer that needs attention, once the page has marked it
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { if (attempt) formRef.current?.querySelector<HTMLElement>('[aria-invalid=true]')?.focus(); }, [attempt]);
  const k = kindOf(d.kind); const p = useMemo(() => propose(d), [d]); const errs = useMemo(() => problems(d), [d]); const err = (f: string) => (tried ? errs[f] || null : null);
  const set = (patch: Partial<Draft>) => { setD((x) => ({ ...x, ...patch })); setSent(null); setRefused(null); };
  const opens = (href: string) => { const r = resolve(href.split('?')[0]!); return !!r && canOpen(role, r); };
  const room = roomById(d.roomId); const rec = room ? roomRecord(room.id) : null; const site = SITES.find((b) => b.key === d.building) || SITES[0]!;
  const roomsHere = CAMPUS_ROOMS.filter((r) => r.building === d.building); const facts = known(d); const go = handoff(d);
  const qty = (cat: string) => d.adds.find((a) => a.cat === cat)?.qty || 0;
  const setQty = (cat: string, n: number) => set({ adds: [...d.adds.filter((a) => a.cat !== cat), ...(n > 0 ? [{ cat, qty: Math.min(12, n) }] : [])] });
  const submit = () => {
    setTried(true); if (Object.keys(errs).length) { setRefused(Object.values(errs)); setAttempt((n) => n + 1); return; }
    const out = apply((next) => send(next, role as RoleKey, d));
    if ('why' in out) { setRefused(out.why); return; }
    setRefused(null); setSent(out); setList(loadRequests()); setTried(false); setD(blank(d.kind, { roomId: d.roomId, building: d.building })); try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* nothing to clear */ }
  };
  const needsAdds = d.kind === 'add-devices' || d.kind === 'event' || d.kind === 'new-room';
  return (
    <section className="rq" data-native="" data-testid="request-page" data-kind={d.kind}>
      <PageHero eyebrow="Request" icon="plus" title="Ask for a room or equipment" lede="Say what you need in your own words. You will see what you are asking for before you send it, and where it goes after." meta={[<Tag key="s" tone="warn">Synthetic data</Tag>, <span key="r">Asking as the {ROLES[role].label}</span>]} />
      <fieldset className="rq-kinds"><legend className="build__h">1 · What do you need?</legend>
        <div className="rq-kinds__grid" role="radiogroup" aria-label="Kind of request">{KINDS.map((x) => (
          <label key={x.id} className={`rq-kind${d.kind === x.id ? ' on' : ''}`} data-testid={`rq-kind-${x.id}`}>
            <input type="radio" name="rq-kind" value={x.id} checked={d.kind === x.id} onChange={() => { setD({ ...blank(x.id), need: d.need, roomId: d.roomId, building: d.building }); setTried(false); setSent(null); setRefused(null); }} />
            <Icon name={KIND_ICON[x.id]} size={22} /><b>{x.label}</b><span>{x.blurb}</span>
          </label>))}</div>
      </fieldset>

      <div className="rq-cols" ref={formRef}>
        <div className="rq-form rq-a">
          <h2 className="build__h">2 · A few answers</h2>
          {k.needs === 'place' && <>
            <fieldset className="rq-chips"><legend>What is the room for?</legend>{USES.map((u) => <label key={u.id} className={d.use === u.id ? 'on' : ''}><input type="radio" name="rq-use" checked={d.use === u.id} onChange={() => set({ use: u.id })} />{u.label}</label>)}</fieldset>
            <div className="rq-row">
              <Field label="How many people at once?" error={err('people')}>{(id, by) => <input id={id} aria-describedby={by} aria-invalid={!!err('people')} type="number" inputMode="numeric" min={1} max={600} value={Number.isFinite(d.people) ? d.people : ''} onChange={(e) => set({ people: Number(e.target.value) })} data-testid="rq-people" />}</Field>
              <Field label="Building" error={err('building')}>{(id, by) => <select id={id} aria-describedby={by} value={d.building} onChange={(e) => set({ building: e.target.value, floor: 1 })} data-testid="rq-building">{SITES.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}</select>}</Field>
              <Field label="Floor" error={err('floor')}>{(id, by) => <select id={id} aria-describedby={by} value={d.floor} onChange={(e) => set({ floor: Number(e.target.value) })}>{Array.from({ length: site.floors }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select>}</Field>
            </div></>}
          {(k.needs === 'room' || k.needs === 'device') && <div className="rq-row">
            <Field label="Building">{(id) => <select id={id} value={d.building} onChange={(e) => set({ building: e.target.value, roomId: '', position: '' })} data-testid="rq-building">{SITES.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}</select>}</Field>
            <Field label="Room" error={err('roomId')}>{(id, by) => <select id={id} aria-describedby={by} aria-invalid={!!err('roomId')} value={d.roomId} onChange={(e) => set({ roomId: e.target.value, position: '' })} data-testid="rq-room"><option value="">Choose a room</option>{roomsHere.map((r) => <option key={r.id} value={r.id}>{fullName(r)}</option>)}</select>}</Field>
          </div>}
          {facts.length > 0 && <div className="rq-known" data-testid="rq-known"><h3 className="rq-h">Already on record, so you are not asked</h3><dl>{facts.map(([l, v, src]) => <div key={l}><dt>{l}</dt><dd>{v} <span className="ui-meta">{src}</span></dd></div>)}</dl></div>}
          {k.needs === 'device' && rec && <Field label="Which device?" hint="Choose it here, or press it in the picture." error={err('position')}>{(id, by) => <select id={id} aria-describedby={by} aria-invalid={!!err('position')} value={d.position} onChange={(e) => set({ position: e.target.value })} data-testid="rq-position"><option value="">Choose a device</option>{rec.positions.filter((x) => !x.furniture).map((x) => <option key={x.code} value={x.code}>{x.label} ({x.code})</option>)}</select>}</Field>}
          {k.needs === 'category' && <Field label="What kind of device?" error={err('category')}>{(id, by) => <select id={id} aria-describedby={by} value={d.category} onChange={(e) => set({ category: e.target.value })} data-testid="rq-category">{ADDABLE.map((c) => <option key={c} value={c}>{catName(c)}</option>)}</select>}</Field>}
          {needsAdds && (k.needs === 'place' || rec) && <Extras optional={d.kind === 'new-room'} count={d.adds.reduce((n, a) => n + a.qty, 0)}><fieldset className="rq-adds" aria-describedby={err('adds') ? 'rq-adds-e' : undefined}><legend>{d.kind === 'new-room' ? 'Extra equipment (the room already comes with what a room of this kind needs)' : d.kind === 'event' ? 'Extra equipment for the event' : 'What should be added?'}</legend>
            <ul>{ADDABLE.map((c) => <li key={c} data-on={qty(c) > 0 || undefined}><span>{catName(c)}</span><span className="rq-step"><button type="button" aria-label={`One fewer ${catName(c)}`} disabled={qty(c) === 0} onClick={() => setQty(c, qty(c) - 1)}>−</button><output aria-live="polite" data-testid={`rq-qty-${c}`}>{qty(c)}</output><button type="button" aria-label={`One more ${catName(c)}`} disabled={qty(c) >= 12} onClick={() => setQty(c, qty(c) + 1)} data-testid={`rq-more-${c}`}>+</button></span></li>)}</ul>
            {err('adds') && <p id="rq-adds-e" className="ui-field__error">{err('adds')}</p>}</fieldset></Extras>}
          {d.kind === 'event' && <Field label="Day of the event" error={err('date')}>{(id, by) => <input id={id} aria-describedby={by} aria-invalid={!!err('date')} type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} data-testid="rq-date" />}</Field>}
        </div>
        <div className="rq-form rq-b">
          {k.goes !== 'scouter' && k.goes !== 'optimizer' && <>
            <Field label="What do you need, in a sentence?" hint="For example: “The finance team needs a room where six people can meet suppliers on video.”" error={err('need')}>{(id, by) => <textarea id={id} aria-describedby={by} aria-invalid={!!err('need')} rows={3} maxLength={600} value={d.need} onChange={(e) => set({ need: e.target.value })} data-testid="rq-need" />}</Field>
            <div className="rq-row">
              {d.kind !== 'event' && <Field label="When is it wanted?">{(id) => <select id={id} value={d.when} onChange={(e) => set({ when: e.target.value })}>{WHEN.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}</Field>}
              <Field label="If it has to wait">{(id) => <select id={id} value={d.matters} onChange={(e) => set({ matters: e.target.value })}>{MATTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}</Field>
            </div></>}
          {go !== null || k.goes === 'scouter' || k.goes === 'optimizer' ? <div className="rq-send">
            <p className="rq-then"><Icon name="arrow-right" size={16} /> <span>{k.then}</span></p>
            {go ? <a className="ui-btn ui-btn--primary" href={go} data-testid="rq-handoff">{k.goes === 'scouter' ? `Open Scouter for ${catName(d.category).toLowerCase()}s` : 'Open Space Optimizer for this room'}</a> : <p className="ui-muted">Choose the room first.</p>}
          </div> : <div className="rq-send">
            {refused && <div role="alert" className="ui-notice ui-tone--bad" data-testid="rq-refused"><b>Not sent yet.</b><ul>{refused.map((x) => <li key={x}>{x}</li>)}</ul></div>}
            <Button kind="primary" onClick={submit} testId="rq-send">Send the request</Button>
            <p className="ui-meta">Sending creates {k.goes === 'desk' ? 'a project on the decision desk' : 'a job in ServiceHands'}. Nothing is ordered, approved or changed by asking.</p>
          </div>}
          {sent && <div className="rq-sent" data-testid="rq-sent" data-id={sent.id} data-goes={sent.goes}><h3 ref={sentRef} tabIndex={-1}>Sent: {sent.id}</h3><p>{sent.title}</p>
            <p>{sent.goes === 'desk' ? `It is on the decision desk as project ${sent.projectId}, waiting for an engineer to review it.` : `It is in the ServiceHands queue as job ${sent.incidentId}.`} You can follow it below.</p></div>}
        </div>

        <div className="rq-side" aria-live="polite">
          <h2 className="build__h">3 · What you are asking for</h2>
          {p ? <><Preview p={p} d={d} onPick={d.kind === 'replace-device' ? (c) => { if (p.positions.some((x) => x.code === c && !x.furniture)) set({ position: c }); } : undefined} /><Summary p={p} d={d} /></>
            : <Notice tone="info">{k.needs === 'category' ? 'Scouter shows how this kind of device fits the estate before anyone asks for one.' : 'Choose the room and the picture appears here.'}</Notice>}
        </div>
      </div>

      <section className="rq-list" aria-labelledby="rq-list-h" id="requests"><h2 id="rq-list-h" className="build__h">Your requests ({list.length})</h2><Mine list={list} opens={opens} w={w} /></section>
    </section>
  );
}
