import React, { useEffect, useMemo, useState } from 'react';
import { Button, Notice, Tag, Field, Tabs, Facts } from '@empathia/ui';
import { ROOM_LIFECYCLE, type RoomLifecycle } from '@empathia/domain-types';
import { DRAWING_KINDS, LIFECYCLE_AUTHORITY, resultLabel, resultWords } from '@empathia/commissioning-engine';
import * as S from './store.js';
import { buildXlsx } from './xlsx.js';

const TEMPLATES = Object.entries(S.C.templates).map(([k, t]) => [k, t.label] as const);
const CATS = Object.entries(S.C.categories).map(([k, c]) => [k, c.label, c.group] as const);
const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { PASS_VERIFIED: 'ok', PASS_UNVERIFIED: 'warn', FAIL: 'bad', NOT_TESTED: 'muted', NOT_SUPPORTED: 'muted', INCONCLUSIVE: 'warn', High: 'bad', Medium: 'warn', Low: 'muted', APPROVED: 'ok', GENERATED: 'info', DRAFT: 'muted', REVIEW_REQUIRED: 'warn', DECLARED: 'ok', MODELED: 'warn', ALLOWED: 'ok', DENIED: 'bad' };

/** Build a Room — the investor demonstration's interactive room builder, on the real engine (see store.ts). */
export function BuildRoom({ perspective }: { perspective: string }) {
  const persona = S.personaOf(perspective);
  const [draft, setDraftState] = useState<S.Draft | null>(() => S.loadDraft());
  const wanted = /[?&]tab=([a-z]+)/.exec(location.hash)?.[1];
  const [tab, setTab] = useState<string>(() => (S.loadDraft() ? wanted || 'design' : 'describe'));
  useEffect(() => { const h = () => { const t = /[?&]tab=([a-z]+)/.exec(location.hash)?.[1]; if (t) setTab(t); }; addEventListener('hashchange', h); return () => removeEventListener('hashchange', h); }, []);
  const [refusal, setRefusal] = useState<string[] | null>(null);
  const setDraft = (d: S.Draft | null) => { setDraftState(d ? { ...d } : null); S.saveDraft(d); };
  // undo (V2.5.3 Build a Room, restored 12 Nov 2026): the store mutates the draft it is given, so each step keeps a copy taken before it
  const [hist, setHist] = useState<string[]>([]);
  const apply = (r: S.Draft | S.Refusal, before?: string) => { if ('why' in r) { setRefusal(r.why); if (before) setDraftState(JSON.parse(before) as S.Draft); return false; } setRefusal(null); if (before) setHist((h) => [...h.slice(-29), before]); setDraft(r); return true; };
  const undo = () => { const last = hist[hist.length - 1]; if (!last) return; setHist(hist.slice(0, -1)); setRefusal(null); setDraft(JSON.parse(last) as S.Draft); };
  const a = useMemo(() => (draft ? S.analysis(draft) : null), [draft]);
  return (
    <section className="build">
      <header className="build__head">
        <div><p className="kicker">Build a Room · interactive demonstration</p><h1>{draft ? draft.name : 'Design a room and watch it reach drawings, commissioning and acceptance'}</h1>
          <p className="ui-muted">Acting as <b>{S.personaLabel(persona)}</b> (perspective <code>{perspective}</code>). The rules are the product's own engine; a refusal here is the refusal the product gives. Everything is synthetic and stays in this page.</p></div>
        {draft && <div className="build__state"><Tag tone="info">{draft.design.lifecycle}</Tag>{draft.baseline && <Tag tone="ok">baseline v{draft.baseline.version}</Tag>}<Button kind="secondary" small onClick={() => { setDraft(null); setTab('describe'); setRefusal(null); }}>Reset demonstration</Button></div>}
      </header>
      {refusal && <div role="alert"><Notice tone="bad"><b>Refused.</b><ul className="build__why">{refusal.map((w) => <li key={w}>{w}</li>)}</ul></Notice></div>}
      {!draft ? <Describe persona={persona} onCreate={(input) => { const r = S.createDraft(input, persona); if (apply(r)) setTab('design'); }} /> : (
        <>
          <Tabs label="Build a Room steps" active={tab} onChange={setTab} tabs={[{ key: 'design', label: 'Design' }, { key: 'checks', label: 'Checks & plan', count: a!.checks.length }, { key: 'lifecycle', label: 'Lifecycle & commissioning' }, { key: 'drawings', label: 'Drawings' }, { key: 'ledger', label: 'Ledger', count: draft.events.length }]} />
          {tab === 'design' && <Design d={draft} persona={persona} a={a!} apply={apply} undo={hist.length ? undo : null} />}
          {tab === 'checks' && <Checks d={draft} a={a!} />}
          {tab === 'lifecycle' && <Lifecycle d={draft} persona={persona} a={a!} apply={apply} />}
          {tab === 'drawings' && <Drawings d={draft} persona={persona} apply={apply} />}
          {tab === 'ledger' && <Ledger d={draft} />}
        </>
      )}
    </section>
  );
}

function Describe({ persona, onCreate }: { persona: string; onCreate: (i: S.CreateInput) => void }) {
  const [f, setF] = useState<S.CreateInput>({ name: 'Harbour Huddle (synthetic)', template: 'huddle', unit: 'm', length: '', width: '', ceiling: '', occupancy: '', intendedUse: '', shape: 'rect' });
  const T = S.C.templates[f.template]!;
  const set = (k: keyof S.CreateInput) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const can = S.holds(persona, 'room.design');
  return (
    <form className="build__form" onSubmit={(e) => { e.preventDefault(); onCreate(f); }} aria-label="Describe the room">
      {!can && <Notice tone="warn"><b>{S.personaLabel(persona)}</b> does not hold <code>room.design</code>. Switch the perspective to <b>designer</b> or <b>syseng</b> to create a room — the engine refuses otherwise, exactly as the product does.</Notice>}
      <div className="build__grid">
        <Field label="Room name" id="b-name">{(fid) => <input id={fid} value={f.name} onChange={set('name')} required maxLength={80} />}</Field>
        <Field label="Template" id="b-template" hint={T.considerations?.[0]}>{(fid) => <select id={fid} value={f.template} onChange={set('template')}>{TEMPLATES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}</Field>
        <Field label="Unit" id="b-unit">{(fid) => <select id={fid} value={f.unit} onChange={set('unit')}><option value="m">metres</option><option value="ft">feet (24' 6" accepted)</option></select>}</Field>
        <Field label="Shape" id="b-shape">{(fid) => <select id={fid} value={f.shape} onChange={set('shape')}><option value="rect">rectangle</option><option value="lshape">L-shape</option></select>}</Field>
        <Field label={`Length (${f.unit})`} id="b-length" hint={`blank → modeled from the template (${T.dims?.[0]} m) and labelled MODELED`}>{(fid) => <input id={fid} value={f.length} onChange={set('length')} inputMode="decimal" placeholder={String(T.dims?.[0] ?? '')} />}</Field>
        <Field label={`Width (${f.unit})`} id="b-width">{(fid) => <input id={fid} value={f.width} onChange={set('width')} inputMode="decimal" placeholder={String(T.dims?.[1] ?? '')} />}</Field>
        <Field label={`Ceiling (${f.unit})`} id="b-ceiling">{(fid) => <input id={fid} value={f.ceiling} onChange={set('ceiling')} inputMode="decimal" placeholder={String(T.dims?.[2] ?? '')} />}</Field>
        <Field label="Occupancy" id="b-occ">{(fid) => <input id={fid} value={f.occupancy} onChange={set('occupancy')} inputMode="numeric" placeholder={String(T.occ ?? '')} />}</Field>
        <Field label="Intended use" id="b-use">{(fid) => <input id={fid} value={f.intendedUse} onChange={set('intendedUse')} placeholder={T.use || ''} maxLength={200} />}</Field>
      </div>
      <p><Button kind="primary" type="submit">Create the room</Button> <span className="ui-muted">Creates the template's devices, proposes connections, classifies the room and compiles its commissioning plan — the same steps the enterprise API performs.</span></p>
    </form>
  );
}

function Plan({ d, onPlace }: { d: S.Draft; onPlace?: (x: number, y: number) => void }) {
  const pts = d.design.geometry.points; const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX || 1, h = maxY - minY || 1, pad = Math.max(w, h) * 0.08, unit = Math.max(w, h) / 60;
  const devs = S.live(d.design.devices) as typeof d.design.devices;
  const click = (e: { currentTarget: SVGSVGElement; clientX: number; clientY: number; preventDefault(): void }) => { if (!onPlace) return; const svg = e.currentTarget; const r = svg.getBoundingClientRect(); const vb = svg.viewBox.baseVal; const x = vb.x + ((e.clientX - r.left) / r.width) * vb.width; const y = vb.y + ((e.clientY - r.top) / r.height) * vb.height; onPlace(Math.max(minX, Math.min(maxX, x)), Math.max(minY, Math.min(maxY, y))); };
  return (
    <figure className="plan">
      <svg viewBox={`${minX - pad} ${minY - pad} ${w + pad * 2 + unit * 24} ${h + pad * 2.6}`} role="img" aria-label={`${d.name}: outline ${w.toFixed(1)} by ${h.toFixed(1)} metres with ${devs.length} devices`} preserveAspectRatio="xMidYMid meet" onClick={click} className={onPlace ? 'plan--place' : ''}>
        <polygon points={pts.map((p) => p.join(',')).join(' ')} className="plan__room" strokeWidth={unit * 0.4} />
        {devs.map((x, n) => { const near = devs.slice(0, n).filter((o) => Math.abs(o.x - x.x) < unit * 14 && Math.abs(o.y - x.y) < unit * 3).length; return <g key={x.id} transform={`translate(${x.x} ${x.y})`}><title>{`${x.id} ${x.label} (${x.cat}) at ${x.x.toFixed(1)}, ${x.y.toFixed(1)} m`}</title>{x.furniture ? <rect x={-unit * 1.2} y={-unit * 1.2} width={unit * 2.4} height={unit * 2.4} className="plan__furn" /> : <circle r={unit * 1.1} className={`plan__dev plan__dev--${x.mount}`} strokeWidth={unit * 0.25} />}<text x={unit * 1.6} y={unit * 0.8 + near * unit * 2.8} fontSize={unit * 2.4} className="plan__text">{x.label}</text></g>; })}
        <g transform={`translate(${minX} ${maxY + pad * 1.3})`}><line x1={0} y1={0} x2={Math.min(5, w)} y2={0} className="plan__scale" strokeWidth={unit * 0.3} /><text x={Math.min(5, w) + unit} y={unit * 1.2} className="plan__text" fontSize={unit * 3.2}>{Math.min(5, w)} m</text></g>
      </svg>
      <figcaption className="ui-meta">{d.design.geometry.lengthM.toFixed(1)} m long × {d.design.geometry.widthM.toFixed(1)} m wide × {d.design.geometry.ceiling.toFixed(1)} m high · {devs.filter((x) => !x.furniture).length} devices · {onPlace ? 'click the plan to place the selected category' : 'plan view'}</figcaption>
    </figure>
  );
}

function Design({ d, persona, a, apply, undo }: { d: S.Draft; persona: string; a: ReturnType<typeof S.analysis>; apply: (r: S.Draft | S.Refusal, before?: string) => boolean; undo: (() => void) | null }) {
  const [cat, setCat] = useState('micceil'); const [reason, setReason] = useState(''); const [sel, setSel] = useState<string | null>(null); const [swap, setSwap] = useState(''); const [why, setWhy] = useState(''); const [cmp, setCmp] = useState<[number, number] | null>(null);
  const step = (f: (x: S.Draft) => S.Draft | S.Refusal) => { const before = JSON.stringify(d); return apply(f(JSON.parse(before) as S.Draft), before); };
  const editable = ['PLANNED', 'COMMISSIONING'].includes(d.design.lifecycle);
  const g = d.design.geometry; const prov = g.provenance as Record<string, string>;
  const devs = S.live(d.design.devices) as typeof d.design.devices; const conns = S.live(d.design.connections) as typeof d.design.connections;
  const cls = a.classification; const ap = d.design.classification.approved;
  return (
    <div className="build__two">
      <div>
        <Plan d={d} onPlace={['PLANNED', 'COMMISSIONING'].includes(d.design.lifecycle) ? (x, y) => apply(S.addDevice(d, persona, cat, { x, y })) : undefined} />
        <div className="build__row"><label className="ui-muted" htmlFor="b-cat">Add</label><select id="b-cat" value={cat} onChange={(e) => setCat(e.target.value)}>{CATS.map(([k, l, grp]) => <option key={k} value={k}>{grp} · {l}</option>)}</select><Button small onClick={() => apply(S.addDevice(d, persona, cat, { x: g.widthM / 2, y: g.lengthM / 2 }))}>Place at the centre</Button></div>
        <Facts items={[['Dimensions', <>{g.lengthM} × {g.widthM} × {g.ceiling} m · {Object.entries(prov).map(([k, v]) => <Tag key={k} tone={TONE[v] || 'muted'}>{k} {v}</Tag>)}</>], ['Confidence', g.confidence], ['Template', S.C.templates[d.design.template]?.label || d.design.template], ['Occupancy', String(d.design.occupancy)]]} />
      </div>
      <div>
        <h2 className="build__h2">Classification</h2>
        <p>Suggested <b>{cls.archetypeName}</b> ({cls.archetype}) · {cls.sizeCategory} · {cls.complexity} · capacity estimate {cls.capacityEstimate}.</p>
        <p>{ap ? <Tag tone={ap.stale ? 'warn' : 'ok'}>{ap.stale ? 'approval stale — the design changed' : `approved ${ap.archetype} by ${S.personaLabel(ap.by || '')}`}</Tag> : <Tag tone="muted">not approved</Tag>}</p>
        <p className="build__row"><Button small onClick={() => apply(S.approveClassification(d, persona))}>Approve the suggestion as {S.personaLabel(persona)}</Button></p>
        <h2 className="build__h2">Devices ({devs.filter((x) => !x.furniture).length}) and proposed connections ({conns.length})</h2>
        <ul className="build__list">{devs.map((x) => <li key={x.id} data-dev={x.id} aria-current={sel === x.id ? 'true' : undefined}><code>{x.id}</code> <button type="button" className="build__x" aria-pressed={sel === x.id} onClick={() => setSel(sel === x.id ? null : x.id)}>{x.label}</button> <span className="ui-muted">{x.cat} · {x.mount} · {x.x.toFixed(1)}, {x.y.toFixed(1)} m{x.furniture ? ' · furniture' : ''}</span> {['PLANNED', 'COMMISSIONING'].includes(d.design.lifecycle) && <button type="button" className="build__x" aria-label={`Remove ${x.label}`} onClick={() => apply(S.removeDevice(d, persona, x.id))}>remove</button>}</li>)}</ul>
        {(() => { const x = devs.find((v) => v.id === sel); if (!x) return null; const K = S.C.categories[x.cat]; const same = CATS.filter(([k, , grp]) => grp === K?.group && k !== x.cat);
          return <div className="build__sel" data-testid="build-sel" role="group" aria-label={`${x.label}: edit`}><p><b>{x.label}</b> <code>{x.id}</code> <span className="ui-muted">at {x.x.toFixed(2)}, {x.y.toFixed(2)} m</span></p>
            {editable ? <><div className="build__row" aria-label="Move in steps of 25 centimetres" role="group">{([['←', -0.25, 0, 'left'], ['→', 0.25, 0, 'right'], ['↑', 0, -0.25, 'toward the front'], ['↓', 0, 0.25, 'toward the back']] as const).map(([g, dx, dy, w]) => <Button key={w} small onClick={() => step((y) => S.moveDevice(y, persona, x.id, dx, dy))} aria-label={`Move ${x.label} ${w}`} testId={`build-move-${w.split(' ').pop()}`}>{g}</Button>)}
              <Button small onClick={() => step((y) => S.duplicateDevice(y, persona, x.id))} testId="build-dup">Duplicate</Button></div>
              {same.length > 0 && <div className="build__row"><label className="ui-muted" htmlFor="b-swap">Swap for</label><select id="b-swap" value={swap} onChange={(e) => setSwap(e.target.value)}><option value="">choose a class</option>{same.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><Button small disabled={!swap} onClick={() => { if (step((y) => S.swapDevice(y, persona, x.id, swap))) { setSel(null); setSwap(''); } }} testId="build-swap">Swap</Button></div>}</>
              : <p className="ui-muted">Devices change only while the room is PLANNED or being (re)commissioned.</p>}</div>; })()}
        <ul className="build__list build__list--conn">{conns.map((c) => <li key={c.id}><code>{c.id}</code> {c.from} → {c.to} <Tag tone="info">{c.kind}</Tag> <span className="ui-muted">{c.why}</span>{editable && <> <button type="button" className="build__x" aria-label={`Retire connection ${c.id}`} onClick={() => step((y) => S.removeConnection(y, persona, c.id, why))}>retire</button></>}</li>)}</ul>
        {editable && conns.length > 0 && <div className="build__row"><input aria-label="Why a connection is retired" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="why a connection is retired" maxLength={200} /></div>}
        {undo && <p className="build__row"><Button small kind="quiet" onClick={undo} testId="build-undo">Undo the last change</Button></p>}
        <h2 className="build__h2">Revisions ({d.revisions.length})</h2>
        <div className="build__row"><input aria-label="Revision reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="why this revision" maxLength={200} /><Button small onClick={() => { if (apply(S.saveRevision(d, persona, reason))) setReason(''); }}>Save revision as {S.personaLabel(persona)}</Button></div>
        <ul className="build__list">{d.revisions.map((r) => <li key={r.n}>rev {r.n} · <code>{r.hash}</code> · {S.personaLabel(r.by)} · {r.reason}{d.approvedRevision === r.n && <> <Tag tone="ok">approved</Tag></>}{r.n > 1 && <> <button type="button" className="build__x" onClick={() => setCmp(cmp && cmp[1] === r.n ? null : [r.n - 1, r.n])} aria-label={`Compare revision ${r.n} with ${r.n - 1}`}>compare with rev {r.n - 1}</button></>}</li>)}</ul>
        {cmp && (() => { const c = S.compareRevisions(d, cmp[0], cmp[1]); return <p className="ui-muted" aria-live="polite" data-testid="build-compare">{'why' in c ? c.why.join('; ') : `Rev ${cmp[0]} → rev ${cmp[1]}: ${c.added.length} added${c.added.length ? ` (${c.added.join(', ')})` : ''} · ${c.removed.length} removed${c.removed.length ? ` (${c.removed.join(', ')})` : ''} · ${c.moved.length} moved${c.moved.length ? ` (${c.moved.join(', ')})` : ''}.`}</p>; })()}
      </div>
    </div>
  );
}

function Checks({ d, a }: { d: S.Draft; a: ReturnType<typeof S.analysis> }) {
  const rows = a.applicability.rows; const app = rows.filter((r) => r.applicable); const res = S.results(d);
  const byPhase = app.reduce<Record<string, typeof app>>((m, r) => { (m[r.phase] = m[r.phase] || []).push(r); return m; }, {});
  return (
    <div>
      <h2 className="build__h2">Design checks ({a.checks.length})</h2>
      {a.checks.length ? <ul className="build__list">{a.checks.map((c) => <li key={c.key}><Tag tone={TONE[c.severity]}>{c.severity}</Tag> <b>{c.title}</b> <span className="ui-muted">{c.rationale}{c.assets.length ? ` · ${c.assets.join(', ')}` : ''}</span></li>)}</ul> : <p className="ui-muted">No design deficiency found by the {a.engineVersion} checks on this design.</p>}
      <h2 className="build__h2">Commissioning plan — {app.length} applicable of {rows.length} in the library · {resultWords(a.counts)}</h2>
      <p className="ui-muted">Every row states why it applies (or not), who records it, which evidence is accepted and whether an instrument is required. Nothing passes from a design: results are recorded on the installed room.</p>
      {Object.entries(byPhase).map(([ph, list]) => <details key={ph} open={ph === '1'}><summary>Phase {ph} · {list.length} tests</summary><table className="build__table"><thead><tr><th>Test</th><th>Domain</th><th>Records</th><th>Evidence</th><th>Result</th><th>Why</th></tr></thead><tbody>{list.map((r) => { const lbl = resultLabel(res[r.id]); return <tr key={r.id}><td><code>{r.id}</code><br />{r.label}</td><td>{r.domain}</td><td>{(r.personas || []).join(', ')}{r.instrument ? ' · instrument' : ''}</td><td>{(r.evidence || []).join(', ')}</td><td><Tag tone={TONE[lbl]}>{lbl}</Tag></td><td className="ui-muted">{r.why.join('; ')}{r.prerequisite ? ` · ${r.prerequisite}` : ''}</td></tr>; })}</tbody></table></details>)}
      <details><summary>Not applicable ({rows.length - app.length})</summary><ul className="build__list">{rows.filter((r) => !r.applicable).map((r) => <li key={r.id}><code>{r.id}</code> {r.label} <span className="ui-muted">{r.why.join('; ')}</span></li>)}</ul></details>
    </div>
  );
}

function Lifecycle({ d, persona, a, apply }: { d: S.Draft; persona: string; a: ReturnType<typeof S.analysis>; apply: (r: S.Draft | S.Refusal) => boolean }) {
  const i = ROOM_LIFECYCLE.indexOf(d.design.lifecycle as RoomLifecycle); const next = ROOM_LIFECYCLE[i + 1] as RoomLifecycle | undefined;
  const app = a.applicability.rows.filter((r) => r.applicable); const res = S.results(d);
  const [sel, setSel] = useState(app[0]?.id || ''); const row = app.find((r) => r.id === sel) || app[0];
  const [state, setState] = useState('PASS'); const [kind, setKind] = useState(''); const [ref, setRef] = useState('synthetic observation 1'); const [inst, setInst] = useState('SYN-METER-01 (synthetic), calibration SYN-CAL-2026-09');
  const k = kind && (row?.evidence || []).includes(kind) ? kind : row?.evidence?.[0] || '';
  const recordAll = () => { let cur: S.Draft = d; let okN = 0; const why: string[] = []; for (const r of app) { if (resultLabel(res[r.id]) !== 'NOT_TESTED') continue; const out = S.record(cur, persona, r.id, { state: 'PASS', kind: r.evidence?.[0] || '', ref: `synthetic observation ${r.id}`, instrument: r.instrument ? inst : undefined }); if ('why' in out) { why.push(`${r.id}: ${out.why[0]}`); } else { cur = out; okN += 1; } } if (okN) apply(cur); if (why.length) apply(S.refused([`${okN} recorded; ${why.length} refused — first: ${why[0]}`])); };
  const verifyAll = () => { let cur: S.Draft = d; let okN = 0; const why: string[] = []; for (const r of app) { const rr = res[r.id]; if (!rr || rr.state !== 'PASS' || rr.verified) continue; const out = S.verify(cur, persona, r.id); if ('why' in out) why.push(`${r.id}: ${out.why[0]}`); else { cur = out; okN += 1; } } if (okN) apply(cur); if (why.length) apply(S.refused([`${okN} verified; ${why.length} refused — first: ${why[0]}`])); };
  return (
    <div>
      <ol className="build__steps">{ROOM_LIFECYCLE.map((s, n) => <li key={s} className={n < i ? 'done' : n === i ? 'now' : ''}>{s}<span className="ui-muted"> {LIFECYCLE_AUTHORITY[s as RoomLifecycle]}</span></li>)}</ol>
      <p className="build__row">
        {next && <Button kind="primary" small onClick={() => apply(S.transition(d, persona, next))}>Move to {next} as {S.personaLabel(persona)}</Button>}
        {d.design.lifecycle === 'DESIGN_APPROVED' && <Button small onClick={() => apply(S.transition(d, persona, 'PLANNED'))}>Send back to PLANNED</Button>}
        {d.design.lifecycle === 'ACCEPTED' && <Button small onClick={() => apply(S.transition(d, persona, 'COMMISSIONING'))}>Recommission (back to COMMISSIONING)</Button>}
      </p>
      {d.baseline && <Notice tone="ok"><b>Baseline v{d.baseline.version}</b> published at acceptance by {S.personaLabel(d.baseline.by)} against revision {d.baseline.revision}: {Object.keys(d.baseline.results).length} result labels bound. A later re-acceptance publishes v{d.baseline.version + 1}; v{d.baseline.version} is never overwritten.</Notice>}
      {(d.baselines || []).length > 0 && <div className="build__lineage" data-testid="lineage"><h2 className="build__h2">Baseline lineage</h2><ul className="build__list">{d.baselines.map((b) => <li key={b.version}><b>v{b.version}</b> <Tag tone={b.state === 'CURRENT' ? 'ok' : 'muted'}>{b.state}</Tag> <span className="ui-muted">revision {b.revision} · {b.devices.length} devices · {Object.values(b.results).filter((x) => x === 'PASS_VERIFIED').length}/{Object.keys(b.results).length} verified · {S.personaLabel(b.by)} · {b.at.slice(0, 19).replace('T', ' ')}</span></li>)}</ul>{d.baselines.length >= 2 && <BaselineDiff a={d.baselines[d.baselines.length - 2]!} b={d.baselines[d.baselines.length - 1]!} />}</div>}
      <h2 className="build__h2">Record a result · {resultWords(a.counts)}</h2>
      <p className="ui-muted">Recording needs the room in COMMISSIONING and the responsible persona (the commissioning engineer may record any); a PASS stays PASS_UNVERIFIED until a different person verifies it; acceptance needs every applicable test independently verified and no open deficiency.</p>
      <div className="build__grid">
        <Field label="Test" id="b-test">{(fid) => <select id={fid} value={row?.id || ''} onChange={(e) => { setSel(e.target.value); setKind(''); }}>{app.map((r) => <option key={r.id} value={r.id}>{r.id} · {resultLabel(res[r.id])}</option>)}</select>}</Field>
        <Field label="State" id="b-state">{(fid) => <select id={fid} value={state} onChange={(e) => setState(e.target.value)}>{['PASS', 'FAIL', 'NOT_SUPPORTED', 'INCONCLUSIVE'].map((s) => <option key={s}>{s}</option>)}</select>}</Field>
        <Field label="Evidence kind" id="b-kind">{(fid) => <select id={fid} value={k} onChange={(e) => setKind(e.target.value)}>{(row?.evidence || []).map((e) => <option key={e}>{e}</option>)}</select>}</Field>
        <Field label="Evidence reference" id="b-ref">{(fid) => <input id={fid} value={ref} onChange={(e) => setRef(e.target.value)} />}</Field>
        {row?.instrument && <Field label="Instrument and calibration" id="b-inst">{(fid) => <input id={fid} value={inst} onChange={(e) => setInst(e.target.value)} />}</Field>}
      </div>
      <p className="build__row">
        <Button small kind="primary" onClick={() => row && apply(S.record(d, persona, row.id, { state, kind: k, ref, instrument: row.instrument ? inst : undefined }))}>Record as {S.personaLabel(persona)}</Button>
        <Button small onClick={() => row && apply(S.verify(d, persona, row.id))}>Verify as {S.personaLabel(persona)}</Button>
        <Button small onClick={recordAll} title="Demonstration shortcut: records every untested applicable test as PASS with synthetic evidence, one by one, through the same rules">Record all untested as PASS (demonstration)</Button>
        <Button small onClick={verifyAll} title="Demonstration shortcut: verifies every unverified PASS, one by one, through the same rules">Verify all unverified (demonstration)</Button>
      </p>
      <ul className="build__list">{app.filter((r) => res[r.id]).map((r) => { const rr = res[r.id]!; const lbl = resultLabel(rr); return <li key={r.id}><code>{r.id}</code> <Tag tone={TONE[lbl]}>{lbl}</Tag> <span className="ui-muted">recorded by {S.personaLabel(rr.by)} · {rr.evidence.kind}: {rr.evidence.ref}{rr.verified ? ` · verified by ${S.personaLabel(rr.verified.by)}` : ''}</span></li>; })}</ul>
    </div>
  );
}

function BaselineDiff({ a, b }: { a: S.Baseline; b: S.Baseline }) {
  const keys = [...new Set([...Object.keys(a.results), ...Object.keys(b.results)])].sort(); const changed = keys.filter((k) => a.results[k] !== b.results[k]);
  const A = new Set(a.devices.map((x) => x.id)), B = new Set(b.devices.map((x) => x.id)); const added = b.devices.filter((x) => !A.has(x.id)), removed = a.devices.filter((x) => !B.has(x.id));
  return (
    <div className="build__diff" data-testid="baseline-diff">
      <h3 className="build__h2">What changed between v{a.version} and v{b.version}</h3>
      <Facts items={[['Design revision', a.revision === b.revision ? `unchanged (${a.revision})` : `${a.revision} → ${b.revision}`], ['Devices', added.length || removed.length ? `${added.length} added (${added.map((x) => x.label).join(', ') || '—'}), ${removed.length} removed (${removed.map((x) => x.label).join(', ') || '—'})` : 'unchanged'], ['Result labels', changed.length ? `${changed.length} of ${keys.length} changed` : `identical (${keys.length}); the versions bind different result records`]]} />
      {changed.length > 0 && <ul className="build__list">{changed.map((k) => <li key={k}><code>{k}</code> {a.results[k] || '—'} → <b>{b.results[k] || '—'}</b></li>)}</ul>}
    </div>
  );
}

function Drawings({ d, persona, apply }: { d: S.Draft; persona: string; apply: (r: S.Draft | S.Refusal) => boolean }) {
  const [kind, setKind] = useState(Object.keys(DRAWING_KINDS)[0]!); const [text, setText] = useState(''); const [res, setRes] = useState<Record<string, string>>({});
  const rls = d.redlines || [];
  return (
    <div>
      <p className="ui-muted">Each drawing is generated from a canonical input; when that input changes after approval, the drawing becomes REVIEW_REQUIRED rather than silently staying approved.</p>
      <ul className="build__list">{Object.entries(DRAWING_KINDS).map(([k, label]) => { const dr = d.drawings[k]; return <li key={k}><b>{label}</b> <Tag tone={TONE[dr?.state || 'DRAFT']}>{dr?.state || 'DRAFT'}</Tag> <code>{dr?.input}</code> {dr?.by && <span className="ui-muted">approved by {S.personaLabel(dr.by)}</span>} <Button small onClick={() => apply(S.approveDrawing(d, persona, k))}>Approve as {S.personaLabel(persona)}</Button></li>; })}</ul>
      <p className="build__row"><Button small onClick={() => { const bytes = buildXlsx(S.workbookSheets(d), `${d.name} · commissioning workbook`); const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); const el = document.createElement('a'); el.href = url; el.download = `${d.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-workbook.xlsx`; document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }} testId="build-workbook">Download the commissioning workbook (.xlsx)</Button></p>
      <h2 className="build__h2">Redlines ({rls.filter((r) => r.state === 'OPEN').length} open)</h2>
      <div className="build__row"><select aria-label="Drawing to redline" value={kind} onChange={(e) => setKind(e.target.value)}>{Object.entries(DRAWING_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <input aria-label="Redline text" value={text} onChange={(e) => setText(e.target.value)} placeholder="what is wrong on the drawing" maxLength={400} /><Button small onClick={() => { if (apply(S.addRedline(d, persona, kind, text))) setText(''); }} testId="build-redline">Add redline</Button></div>
      {rls.length > 0 && <ul className="build__list" data-testid="build-redlines">{rls.map((r) => <li key={r.id} data-state={r.state}><code>{r.id}</code> <Tag tone={r.state === 'OPEN' ? 'warn' : 'ok'}>{r.state}</Tag> {DRAWING_KINDS[r.drawing]} · rev {r.revision} · {S.personaLabel(r.by)}: {r.text}{r.state === 'RESOLVED' ? <span className="ui-muted"> · resolved by {S.personaLabel(r.resolvedBy || '')}: {r.resolution}</span>
        : <> <input aria-label={`Resolution for ${r.id}`} value={res[r.id] || ''} onChange={(e) => setRes({ ...res, [r.id]: e.target.value })} placeholder="what was done" maxLength={400} /> <Button small onClick={() => apply(S.resolveRedline(d, persona, r.id, res[r.id] || ''))}>Resolve {r.id}</Button></>}</li>)}</ul>}
      <p className="ui-muted">An open redline holds that drawing’s approval; redlining an approved drawing sends it back to review.</p>
    </div>
  );
}

function Ledger({ d }: { d: S.Draft }) {
  return (
    <div>
      <p className="ui-muted">Every state change and every refusal, with its actor. In the product this is the audit trail; refusals are recorded even though the change was rolled back.</p>
      <table className="build__table"><thead><tr><th>When</th><th>Who</th><th>Event</th><th>Outcome</th><th>Detail</th></tr></thead><tbody>{d.events.map((e, i) => <tr key={i}><td className="ui-mono">{e.at.slice(11, 19)}</td><td>{S.personaLabel(e.by)}</td><td><code>{e.type}</code></td><td><Tag tone={TONE[e.outcome]}>{e.outcome}</Tag></td><td>{e.detail}</td></tr>)}</tbody></table>
    </div>
  );
}
