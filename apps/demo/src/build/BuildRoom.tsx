import React, { useEffect, useMemo, useState } from 'react';
import { Button, Notice, Tag, Field, Tabs, Facts } from '@empathia/ui';
import { ROOM_LIFECYCLE, type RoomLifecycle } from '@empathia/domain-types';
import { DRAWING_KINDS, LIFECYCLE_AUTHORITY, resultLabel, resultWords } from '@empathia/commissioning-engine';
import * as S from './store.js';
import * as I from './impact.js';
import { ImpactPanel } from './ImpactPanel.js';
import { load as loadWorkspace } from '../workspace/store.js';

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
  const apply = (r: S.Draft | S.Refusal) => { if ('why' in r) { setRefusal(r.why); return false; } setRefusal(null); setDraft(r); return true; };
  // a change to the room (add, remove, swap a device) runs on a copy, so the engines can compare the room before and after it (impact.ts);
  // the impact is attached to the change's ledger event, which the room's story shows. The workspace is only read.
  const [impact, setImpact] = useState<I.Impact | null>(null);
  const change = (fn: (x: S.Draft) => S.Draft | S.Refusal) => {
    if (!draft) return false;
    const before = structuredClone(draft); const r = fn(structuredClone(draft));
    if ('why' in r) { setRefusal(r.why); return false; }
    const im = I.computeImpact(before, r, loadWorkspace()); I.attachImpact(r, im);
    setRefusal(null); setDraft(r); setImpact(im); return true;
  };
  const a = useMemo(() => (draft ? S.analysis(draft) : null), [draft]);
  return (
    <section className="build">
      <header className="build__head">
        <div><p className="kicker">Build a Room · interactive demonstration</p><h1>{draft ? draft.name : 'Design a room and watch it reach drawings, commissioning and acceptance'}</h1>
          <p className="ui-muted">Acting as <b>{S.personaLabel(persona)}</b> (perspective <code>{perspective}</code>). The rules are the product's own engine; a refusal here is the refusal the product gives. Everything is synthetic and stays in this page.</p></div>
        {draft && <div className="build__state"><Tag tone="info">{draft.design.lifecycle}</Tag>{draft.baseline && <Tag tone="ok">baseline v{draft.baseline.version}</Tag>}<a className="ui-btn ui-btn--primary ui-btn--sm story-go" href={`#/story/${draft.code}`} data-testid="story-action">Show this room’s entire story</a><Button kind="secondary" small onClick={() => { setDraft(null); setTab('describe'); setRefusal(null); setImpact(null); }}>Reset demonstration</Button></div>}
      </header>
      {refusal && <div role="alert"><Notice tone="bad"><b>Refused.</b><ul className="build__why">{refusal.map((w) => <li key={w}>{w}</li>)}</ul></Notice></div>}
      {!draft ? <Describe persona={persona} onCreate={(input) => { const r = S.createDraft(input, persona); if (apply(r)) setTab('design'); }} /> : (
        <>
          <Tabs label="Build a Room steps" active={tab} onChange={setTab} tabs={[{ key: 'design', label: 'Design' }, { key: 'checks', label: 'Checks & plan', count: a!.checks.length }, { key: 'lifecycle', label: 'Lifecycle & commissioning' }, { key: 'drawings', label: 'Drawings' }, { key: 'ledger', label: 'Ledger', count: draft.events.length }]} />
          {tab === 'design' && <Design d={draft} persona={persona} a={a!} apply={apply} change={change} impact={impact} />}
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

function Design({ d, persona, a, apply, change, impact }: { d: S.Draft; persona: string; a: ReturnType<typeof S.analysis>; apply: (r: S.Draft | S.Refusal) => boolean; change: (fn: (x: S.Draft) => S.Draft | S.Refusal) => boolean; impact: I.Impact | null }) {
  const [cat, setCat] = useState('micceil'); const [reason, setReason] = useState(''); const [why, setWhy] = useState('');
  const g = d.design.geometry; const prov = g.provenance as Record<string, string>;
  const devs = S.live(d.design.devices) as typeof d.design.devices; const conns = S.live(d.design.connections) as typeof d.design.connections;
  const cls = a.classification; const ap = d.design.classification.approved;
  const changeable = ['PLANNED', 'COMMISSIONING'].includes(d.design.lifecycle);
  // swap: a device for another category of the same group (a camera for a video bar, …); the video device first, so "swap a camera" is one click
  const swappable = devs.filter((x) => !x.furniture);
  const [swapId, setSwapId] = useState('');
  const from = swappable.find((x) => x.id === swapId) || swappable.find((x) => x.cat === 'camera' || x.cat === 'bar') || swappable[0];
  const group = from ? S.C.categories[from.cat]?.group : undefined;
  const targets = CATS.filter(([k, , grp]) => from && k !== from.cat && (grp === group || !CATS.some(([k2, , g2]) => g2 === group && k2 !== from.cat)) && !S.C.categories[k]?.furniture);
  const [swapTo, setSwapTo] = useState('');
  const to = targets.some(([k]) => k === swapTo) ? swapTo : targets[0]?.[0] || '';
  const done = (ok: boolean) => { if (ok) setWhy(''); return ok; };
  return (
    <div className="build__two">
      <div>
        <Plan d={d} onPlace={changeable ? (x, y) => done(change((v) => S.addDevice(v, persona, cat, { x, y }, why))) : undefined} />
        <div className="build__row"><label className="ui-muted" htmlFor="b-cat">Add</label><select id="b-cat" value={cat} onChange={(e) => setCat(e.target.value)}>{CATS.map(([k, l, grp]) => <option key={k} value={k}>{grp} · {l}</option>)}</select><Button small onClick={() => done(change((v) => S.addDevice(v, persona, cat, { x: g.widthM / 2, y: g.lengthM / 2 }, why)))}>Place at the centre</Button></div>
        {from && <div className="build__row build__swap"><label className="ui-muted" htmlFor="b-swap">Swap</label><select id="b-swap" value={from.id} onChange={(e) => { setSwapId(e.target.value); setSwapTo(''); }}>{swappable.map((x) => <option key={x.id} value={x.id}>{x.label} ({x.id})</option>)}</select><label className="ui-muted" htmlFor="b-swap-to">for</label><select id="b-swap-to" value={to} onChange={(e) => setSwapTo(e.target.value)}>{targets.map(([k, l, grp]) => <option key={k} value={k}>{grp} · {l}</option>)}</select><Button small kind="primary" testId="swap" onClick={() => { if (done(change((v) => S.swapDevice(v, persona, from.id, to, why)))) { setSwapId(''); setSwapTo(''); } }}>Swap</Button></div>}
        <div className="build__row"><label className="ui-muted" htmlFor="b-why">Why</label><input id="b-why" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="the reason for the next change (recorded with it)" maxLength={200} /></div>
        <Facts items={[['Dimensions', <>{g.lengthM} × {g.widthM} × {g.ceiling} m · {Object.entries(prov).map(([k, v]) => <Tag key={k} tone={TONE[v] || 'muted'}>{k} {v}</Tag>)}</>], ['Confidence', g.confidence], ['Template', S.C.templates[d.design.template]?.label || d.design.template], ['Occupancy', String(d.design.occupancy)]]} />
        <ImpactPanel im={impact} roomId={d.code} />
      </div>
      <div>
        <h2 className="build__h2">Classification</h2>
        <p>Suggested <b>{cls.archetypeName}</b> ({cls.archetype}) · {cls.sizeCategory} · {cls.complexity} · capacity estimate {cls.capacityEstimate}.</p>
        <p>{ap ? <Tag tone={ap.stale ? 'warn' : 'ok'}>{ap.stale ? 'approval stale — the design changed' : `approved ${ap.archetype} by ${S.personaLabel(ap.by || '')}`}</Tag> : <Tag tone="muted">not approved</Tag>}</p>
        <p className="build__row"><Button small onClick={() => apply(S.approveClassification(d, persona))}>Approve the suggestion as {S.personaLabel(persona)}</Button></p>
        <h2 className="build__h2">Devices ({devs.filter((x) => !x.furniture).length}) and proposed connections ({conns.length})</h2>
        <ul className="build__list">{devs.map((x) => <li key={x.id} data-identity={x.furniture ? undefined : S.identityLabel(d, x.id)}><code>{x.id}</code> {x.label} <span className="ui-muted">{x.cat} · {x.mount} · {x.x.toFixed(1)}, {x.y.toFixed(1)} m{x.furniture ? ' · furniture' : ''}</span> {changeable && <button type="button" className="build__x" aria-label={`Remove ${x.label}`} onClick={() => done(change((v) => S.removeDevice(v, persona, x.id, why)))}>remove</button>}</li>)}</ul>
        <ul className="build__list build__list--conn">{conns.map((c) => <li key={c.id}><code>{c.id}</code> {c.from} → {c.to} <Tag tone="info">{c.kind}</Tag> <span className="ui-muted">{c.why}</span></li>)}</ul>
        <Register d={d} persona={persona} why={why} run={(fn) => done(change(fn))} />
        <h2 className="build__h2">Revisions ({d.revisions.length})</h2>
        <div className="build__row"><input aria-label="Revision reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="why this revision" maxLength={200} /><Button small onClick={() => { if (apply(S.saveRevision(d, persona, reason))) setReason(''); }}>Save revision as {S.personaLabel(persona)}</Button></div>
        <ul className="build__list">{d.revisions.map((r) => <li key={r.n}>rev {r.n} · <code>{r.hash}</code> · {S.personaLabel(r.by)} · {r.reason}{d.approvedRevision === r.n && <> <Tag tone="ok">approved</Tag></>}</li>)}</ul>
      </div>
    </div>
  );
}

/**
 * The device register (ADR-0012): each position (PA-) with the physical unit installed there now (AS-) and its identity state — the same
 * reading as the enterprise API's registry, Assurance and Search Party. Replace a unit like for like (field work) or substitute the model
 * (a design change, while recommissioned); declare a synthetic serial. The position's design history is shown apart from the unit's history.
 */
function Register({ d, persona, why, run }: { d: S.Draft; persona: string; why: string; run: (fn: (x: S.Draft) => S.Draft | S.Refusal) => boolean }) {
  const devs = (S.live(d.design.devices) as Array<{ id: string; label: string; cat: string; model: string; furniture?: boolean }>).filter((x) => !x.furniture);
  const [sel, setSel] = useState(''); const [model, setModel] = useState('');
  const pos = devs.find((x) => x.id === sel) || devs.find((x) => x.cat === 'bar' || x.cat === 'camera') || devs[0];
  if (!pos) return null;
  const id = S.identity(d, pos.id); const ph = S.positionHistory(d, pos.id); const ah = id.asset ? S.assetHistory(d, id.asset) : null;
  return (
    <section data-testid="device-register" aria-labelledby="register-h">
      <h2 id="register-h" className="build__h2">Device register — positions and their units</h2>
      <table className="build__table"><thead><tr><th>Position</th><th>Device</th><th>Model</th><th>Unit</th><th>Identity</th></tr></thead>
        <tbody>{devs.map((x) => { const i = S.identity(d, x.id); return <tr key={x.id} data-position={x.id} data-asset={i.asset || ''} data-identity-state={i.identityState || ''}><td><code>{x.id}</code></td><td>{x.label}</td><td>{x.model}</td><td>{i.asset ? <code>{i.asset}</code> : <span className="ui-muted">no unit installed</span>}</td><td>{i.identityState ? <Tag tone={i.identityState === 'VERIFIED' ? 'ok' : i.identityState === 'UNKNOWN' ? 'muted' : 'info'}>{i.identityState}</Tag> : '—'}</td></tr>; })}</tbody></table>
      <p className="ui-muted">Units are synthetic (Visitor Mode): a serial, when declared, is a synthetic one (SYN-…), and no manufacturer is named. UNKNOWN means nothing about the unit has been recorded.</p>
      <div className="build__row"><label className="ui-muted" htmlFor="b-unit">Position</label><select id="b-unit" value={pos.id} onChange={(e) => setSel(e.target.value)}>{devs.map((x) => <option key={x.id} value={x.id}>{x.label} ({x.id})</option>)}</select>
        <Button small testId="replace-unit" onClick={() => run((v) => S.replaceUnit(v, persona, pos.id, { why }))}>Replace the unit (like for like)</Button></div>
      <div className="build__row"><label className="ui-muted" htmlFor="b-model">Model</label><input id="b-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. SYN-BAR-2 (synthetic)" maxLength={80} />
        <Button small testId="substitute-model" onClick={() => { if (run((v) => S.replaceUnit(v, persona, pos.id, { model, why }))) setModel(''); }}>Substitute the model</Button>
        {id.asset && <Button small testId="declare-serial" onClick={() => run((v) => S.recordIdentity(v, persona, id.asset!, { state: 'DECLARED', serial: `SYN-SN-${id.asset}` }))}>Declare a synthetic serial</Button>}</div>
      <div className="build__two">
        <div data-testid="position-history"><h3 className="build__h">Position {pos.id} — design history</h3>
          <p>{pos.label} · {pos.cat} · designed model <b>{pos.model}</b> · now: {S.identityLabel(d, pos.id)}</p>
          {ph.design.length ? <ul className="build__list">{ph.design.map((h, k) => <li key={k}>{h.kind === 'model' ? `model ${h.from} → ${h.to}` : `${h.from} replaced by ${h.to}`} · {S.personaLabel(h.by)} · <span className="ui-muted">{h.at}</span></li>)}</ul> : <p className="ui-muted">No design change since it was placed.</p>}
          <h3 className="build__h">Installations at {pos.id}</h3>
          {ph.installations.length ? <ul className="build__list">{ph.installations.map((i) => <li key={i.id}>{i.sentence}</li>)}</ul> : <p className="ui-muted">No unit recorded yet (units are recorded when the installation is, at INSTALLED_UNVERIFIED).</p>}</div>
        <div data-testid="asset-history"><h3 className="build__h">Unit history{ah?.asset ? ` — ${ah.asset.code}` : ''}</h3>
          {ah?.asset ? <><p>{ah.asset.category} · model <b>{ah.asset.model}</b> · identity <b>{ah.asset.identityState}</b>{ah.asset.serial ? ` · serial ${ah.asset.serial} (synthetic)` : ' · no serial on record'}</p>
            <ul className="build__list">{ah.installations.map((i) => <li key={i.id}>{i.sentence}</li>)}{ah.identity.map((e, k) => <li key={`id${k}`}>identity {e.from} → {e.to} by {S.personaLabel(e.by)} (synthetic serial {e.serial})</li>)}</ul></> : <p className="ui-muted">No unit at this position.</p>}</div>
      </div>
    </section>
  );
}

function Checks({ d, a }: { d: S.Draft; a: ReturnType<typeof S.analysis> }) {
  const rows = a.applicability.rows; const app = rows.filter((r) => r.applicable); const res = S.results(d);
  const byPhase = app.reduce<Record<string, typeof app>>((m, r) => { (m[r.phase] = m[r.phase] || []).push(r); return m; }, {});
  const rv = S.reverification(d, a); const stale = new Set(rv.filter((t) => t.rerun).map((t) => t.testId)); const counts = S.countsNow(d, a);
  return (
    <div>
      {rv.length > 0 && <Reverify d={d} rv={rv} />}
      <h2 className="build__h2">Design checks ({a.checks.length})</h2>
      {a.checks.length ? <ul className="build__list">{a.checks.map((c) => <li key={c.key}><Tag tone={TONE[c.severity]}>{c.severity}</Tag> <b>{c.title}</b> <span className="ui-muted">{c.rationale}{c.assets.length ? ` · ${c.assets.join(', ')}` : ''}</span></li>)}</ul> : <p className="ui-muted">No design deficiency found by the {a.engineVersion} checks on this design.</p>}
      <h2 className="build__h2">Commissioning plan — {app.length} applicable of {rows.length} in the library · {resultWords(counts)}{counts.reopened ? ` · ${counts.reopened} reopened by a substitution` : ''}</h2>
      <p className="ui-muted">Every row states why it applies (or not), who records it, which evidence is accepted and whether an instrument is required. Nothing passes from a design: results are recorded on the installed room.</p>
      {Object.entries(byPhase).map(([ph, list]) => <details key={ph} open={ph === '1'}><summary>Phase {ph} · {list.length} tests</summary><table className="build__table"><thead><tr><th>Test</th><th>Domain</th><th>Records</th><th>Evidence</th><th>Result</th><th>Why</th></tr></thead><tbody>{list.map((r) => { const lbl = resultLabel(res[r.id]); return <tr key={r.id}><td><code>{r.id}</code><br />{r.label}</td><td>{r.domain}</td><td>{(r.personas || []).join(', ')}{r.instrument ? ' · instrument' : ''}</td><td>{(r.evidence || []).join(', ')}</td><td><Tag tone={TONE[lbl]}>{lbl}</Tag>{stale.has(r.id) && <span className="build__stale">{S.PREVIOUS_DEVICE}</span>}</td><td className="ui-muted">{r.why.join('; ')}{r.prerequisite ? ` · ${r.prerequisite}` : ''}</td></tr>; })}</tbody></table></details>)}
      <details><summary>Not applicable ({rows.length - app.length})</summary><ul className="build__list">{rows.filter((r) => !r.applicable).map((r) => <li key={r.id}><code>{r.id}</code> {r.label} <span className="ui-muted">{r.justification || r.why.join('; ')}</span></li>)}</ul></details>
    </div>
  );
}

/** The tests a substitution reopened while the accepted room is recommissioned, with the engine's reasons (one per substitution). */
function Reverify({ d, rv }: { d: S.Draft; rv: S.Reverification[] }) {
  const b = S.recommissioningBaseline(d); const subs = S.activeSubstitutions(d);
  const out = rv.filter((t) => t.rerun); const unverified = rv.filter((t) => !t.rerun && t.result !== 'PASS_VERIFIED');
  return (
    <section className="build__reverify" aria-labelledby="reverify-h" data-testid="reverification" data-reopened={rv.map((t) => t.testId).join(',')} data-outstanding={out.map((t) => t.testId).join(',')} data-unverified={unverified.map((t) => t.testId).join(',')}>
      <h2 id="reverify-h" className="build__h2">Re-verification required · {rv.length} test{rv.length === 1 ? '' : 's'} reopened</h2>
      <p data-testid="reverification-units">{subs.map((s) => `${s.label} (${s.assetId}, ${s.from}) → ${s.to}${s.fromAsset || s.toAsset ? ` [unit ${s.fromAsset || '—'} → ${s.toAsset || '—'}]` : ''}`).join('; ')} — substituted by {[...new Set(subs.map((s) => S.personaLabel(s.by)))].join(', ')} while baseline v{b?.version} is recommissioned. A result recorded before the substitution was obtained on the previous device: it stays on record and no longer counts towards the re-acceptance. Each reopened test is re-run on the changed design and verified again by a different person.</p>
      <p><b>{out.length ? `${out.length} still to re-run` : 'Every reopened test has been re-run since'}</b>{unverified.length ? ` · ${unverified.length} re-run, awaiting a pass verified by a different person` : ''} · baseline v{b?.version} is unchanged and stays CURRENT until the re-acceptance publishes v{(b?.version || 0) + 1}.</p>
      <ul className="build__list">{rv.map((t) => <li key={t.testId}><code>{t.testId}</code> {t.label} <Tag tone={TONE[t.result]}>{t.result}</Tag> <span className="ui-muted">{t.rerun ? S.PREVIOUS_DEVICE : t.result === 'PASS_VERIFIED' ? 're-run after the substitution and verified by a different person' : 're-run after the substitution'}</span><ul className="build__why">{t.reasons.map((x) => <li key={x} className="ui-muted">{x}</li>)}</ul></li>)}</ul>
    </section>
  );
}

function Lifecycle({ d, persona, a, apply }: { d: S.Draft; persona: string; a: ReturnType<typeof S.analysis>; apply: (r: S.Draft | S.Refusal) => boolean }) {
  const i = ROOM_LIFECYCLE.indexOf(d.design.lifecycle as RoomLifecycle); const next = ROOM_LIFECYCLE[i + 1] as RoomLifecycle | undefined;
  const app = a.applicability.rows.filter((r) => r.applicable); const res = S.results(d);
  // a test a substitution reopened is recorded again (its earlier result stays in its history)
  const rv = S.reverification(d, a); const stale = new Set(rv.filter((t) => t.rerun).map((t) => t.testId)); const counts = S.countsNow(d, a);
  const [sel, setSel] = useState(app[0]?.id || ''); const row = app.find((r) => r.id === sel) || app[0];
  const [state, setState] = useState('PASS'); const [kind, setKind] = useState(''); const [ref, setRef] = useState('synthetic observation 1'); const [inst, setInst] = useState('SYN-METER-01 (synthetic), calibration SYN-CAL-2026-09');
  const k = kind && (row?.evidence || []).includes(kind) ? kind : row?.evidence?.[0] || '';
  const recordAll = () => { let cur: S.Draft = d; let okN = 0; const why: string[] = []; for (const r of app) { if (resultLabel(res[r.id]) !== 'NOT_TESTED' && !stale.has(r.id)) continue; const out = S.record(cur, persona, r.id, { state: 'PASS', kind: r.evidence?.[0] || '', ref: stale.has(r.id) ? `synthetic re-run observation ${r.id} (after the change of unit)` : `synthetic observation ${r.id}`, instrument: r.instrument ? inst : undefined }); if ('why' in out) { why.push(`${r.id}: ${out.why[0]}`); } else { cur = out; okN += 1; } } if (okN) apply(cur); if (why.length) apply(S.refused([`${okN} recorded; ${why.length} refused — first: ${why[0]}`])); };
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
      {rv.length > 0 && (() => { const waiting = rv.filter((t) => !t.rerun && t.result !== 'PASS_VERIFIED').length; return <Notice tone="warn"><b>Re-verification required:</b> {stale.size ? `${stale.size} of ${rv.length} reopened tests still to re-run on the changed design` : `all ${rv.length} reopened tests re-run since the substitution`}{waiting ? `; ${waiting} awaiting a pass verified by a different person` : ''}. {stale.size || waiting ? 'The re-acceptance waits for them.' : 'They no longer block the re-acceptance.'} <a href="#/v25/build?tab=checks">See each test and its reasons in the plan</a>.</Notice>; })()}
      <h2 className="build__h2">Record a result · {resultWords(counts)}{counts.reopened ? ` · ${counts.reopened} reopened by a substitution` : ''}</h2>
      <p className="ui-muted">Recording needs the room in COMMISSIONING and the responsible persona (the commissioning engineer may record any); a PASS stays PASS_UNVERIFIED until a different person verifies it; acceptance needs every applicable test independently verified and no open deficiency.</p>
      <div className="build__grid">
        <Field label="Test" id="b-test">{(fid) => <select id={fid} value={row?.id || ''} onChange={(e) => { setSel(e.target.value); setKind(''); }}>{app.map((r) => <option key={r.id} value={r.id}>{r.id} · {resultLabel(res[r.id])}{stale.has(r.id) ? ' · re-run required' : ''}</option>)}</select>}</Field>
        <Field label="State" id="b-state">{(fid) => <select id={fid} value={state} onChange={(e) => setState(e.target.value)}>{['PASS', 'FAIL', 'NOT_SUPPORTED', 'INCONCLUSIVE'].map((s) => <option key={s}>{s}</option>)}</select>}</Field>
        <Field label="Evidence kind" id="b-kind">{(fid) => <select id={fid} value={k} onChange={(e) => setKind(e.target.value)}>{(row?.evidence || []).map((e) => <option key={e}>{e}</option>)}</select>}</Field>
        <Field label="Evidence reference" id="b-ref">{(fid) => <input id={fid} value={ref} onChange={(e) => setRef(e.target.value)} />}</Field>
        {row?.instrument && <Field label="Instrument and calibration" id="b-inst">{(fid) => <input id={fid} value={inst} onChange={(e) => setInst(e.target.value)} />}</Field>}
      </div>
      <p className="build__row">
        <Button small kind="primary" onClick={() => row && apply(S.record(d, persona, row.id, { state, kind: k, ref, instrument: row.instrument ? inst : undefined }))}>Record as {S.personaLabel(persona)}</Button>
        <Button small onClick={() => row && apply(S.verify(d, persona, row.id))}>Verify as {S.personaLabel(persona)}</Button>
        <Button small onClick={recordAll} title="Demonstration shortcut: records every untested applicable test (and every test a substitution reopened) as PASS with synthetic evidence, one by one, through the same rules">Record all untested as PASS (demonstration)</Button>
        <Button small onClick={verifyAll} title="Demonstration shortcut: verifies every unverified PASS, one by one, through the same rules">Verify all unverified (demonstration)</Button>
      </p>
      <ul className="build__list">{app.filter((r) => res[r.id]).map((r) => { const rr = res[r.id]!; const lbl = resultLabel(rr); return <li key={r.id}><code>{r.id}</code> <Tag tone={TONE[lbl]}>{lbl}</Tag> <span className="ui-muted">recorded by {S.personaLabel(rr.by)} · {rr.evidence.kind}: {rr.evidence.ref}{rr.verified ? ` · verified by ${S.personaLabel(rr.verified.by)}` : ''}</span>{stale.has(r.id) && <span className="build__stale" data-testid="stale-result">{S.PREVIOUS_DEVICE}</span>}</li>; })}</ul>
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
  return (
    <div>
      <p className="ui-muted">Each drawing is generated from a canonical input; when that input changes after approval, the drawing becomes REVIEW_REQUIRED rather than silently staying approved.</p>
      <ul className="build__list">{Object.entries(DRAWING_KINDS).map(([k, label]) => { const dr = d.drawings[k]; return <li key={k}><b>{label}</b> <Tag tone={TONE[dr?.state || 'DRAFT']}>{dr?.state || 'DRAFT'}</Tag> <code>{dr?.input}</code> {dr?.by && <span className="ui-muted">approved by {S.personaLabel(dr.by)}</span>} <Button small onClick={() => apply(S.approveDrawing(d, persona, k))}>Approve as {S.personaLabel(persona)}</Button></li>; })}</ul>
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
