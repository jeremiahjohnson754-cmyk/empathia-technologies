/**
 * #/drawings — Drawing Intelligence (founder, §10). A package of documents is read (read.ts), reviewed against itself and against
 * a room type's standard by the commissioning engine's own rules (review.ts), and saved for an engineer to decide and approve
 * (store.ts). The page draws its own plan from the numbers that were read: an imported file is never displayed or run.
 * It says what it is: rule-checking on documents it can read as text. It does not see a drawing, and it approves nothing.
 */
import { useMemo, useState } from 'react';
import { PageHero, Card, Chip, Notice, Icon } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { ROLES, allows } from '../access/policy.js';
import { C } from '../campus/design.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { CLS_WORD, calibrate, kindOf, readBom, readPlan, readSchedule, type Cls, type Doc, type PlanRead } from './read.js';
import { combine, diff, standardsReview, toDesign, type Extraction, type Finding } from './review.js';
import { SAMPLE, SAMPLE_NAME } from './sample.js';
import { viewing } from './viewing.js';
import { ProvenanceChip } from '@empathia/ui';
import * as LS from '../lite/studio.js';
import { MAY_DECIDE, approve, classOf, decide, openBlockers, reviewsOf, saveReview, stateOf, type SavedReview } from './store.js';

const KIND_WORD: Record<Doc['kind'], string> = { plan: 'Room plan', schedule: 'Device schedule', bom: 'Bill of materials' };
const CLS_TONE: Record<Cls, 'ok' | 'muted' | 'warn' | 'info'> = { OBSERVED: 'info', EXTRACTED: 'muted', MODELED: 'muted', INFERRED: 'warn', VERIFIED: 'ok', APPROVED: 'ok' };
const clsShort = (c: Cls) => CLS_WORD[c].split(':')[0]!;
const TEMPLATE_OF: Record<string, string> = { HUD: 'huddle', COL: 'collab', BRD: 'boardroom', EXE: 'executive', TRN: 'training', TWN: 'townhall' };
const TYPES = Object.entries(C.archetypes).filter(([k]) => C.required[k]).map(([k, v]) => [k, v.name] as const);
const day = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const STATE_WORD = { NEEDS_DECISIONS: 'Needs an engineer’s decisions', READY_FOR_APPROVAL: 'Ready for approval', APPROVED: 'Approved' } as const;

function extract(docs: readonly Doc[], cal: { edge: 'width' | 'length'; metres: number } | null): { ex: Extraction; plan: PlanRead | null; calWhy: string | null } {
  const pd = docs.find((d) => d.kind === 'plan'); let plan = pd ? readPlan(pd) : null; let calWhy: string | null = null;
  if (plan && cal && plan.boundary) { const b = plan.boundary; const r = calibrate(plan, cal.edge === 'width' ? { x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y, metres: cal.metres } : { x1: b.x, y1: b.y, x2: b.x, y2: b.y + b.h, metres: cal.metres }); if ('why' in r) calWhy = r.why; else plan = r; }
  const sd = docs.find((d) => d.kind === 'schedule'); const bd = docs.find((d) => d.kind === 'bom');
  return { ex: combine(plan, sd ? readSchedule(sd) : null, bd ? readBom(bd) : null), plan, calWhy };
}

export default function DrawingPage({ role, can }: PageProps) {
  const { w, apply } = useWorkspace(); const [src, setSrc] = useState<'A' | 'B' | 'own'>('A'); const [own, setOwn] = useState<Doc[]>([]); const [refused, setRefused] = useState<string[]>([]);
  const [cal, setCal] = useState<{ edge: 'width' | 'length'; metres: number } | null>(null); const [calText, setCalText] = useState(''); const [calEdge, setCalEdge] = useState<'width' | 'length'>('width');
  const [type, setType] = useState('BRD'); const [occ, setOcc] = useState('14'); const [no, setNo] = useState<string | null>(null); const [said, setSaid] = useState<string | null>(null);
  const docs = src === 'own' ? own : SAMPLE[src]; const name = src === 'own' ? (own[0]?.name.replace(/\.[a-z]+$/i, '') || '') : SAMPLE_NAME; const revision = docs.find((d) => d.kind === 'plan')?.revision || docs[0]?.revision || '';
  const { ex, plan, calWhy } = useMemo(() => extract(docs, cal), [docs, cal]);
  const occupancy = Number.isInteger(Number(occ)) && Number(occ) > 0 && Number(occ) <= 2000 ? Number(occ) : null;
  const design = useMemo(() => (occupancy ? toDesign(ex, { template: TEMPLATE_OF[type] || 'custom', occupancy, use: C.archetypes[type]?.name || 'Meetings' }) : { why: 'Say how many people the room is for.' }), [ex, type, occupancy]);
  const std = useMemo(() => ('ok' in design ? standardsReview(ex, design.ok, type) : null), [ex, design, type]);
  const changes = useMemo(() => (src === 'B' ? diff(extract(SAMPLE.A, null).ex, ex) : null), [src, ex]);
  const all: Finding[] = [...ex.findings, ...(std?.findings || [])]; const blockers = all.filter((f) => f.blocker).length; const reviews = reviewsOf(w); const mayDecide = allows(MAY_DECIDE, role);
  const act = (fn: Parameters<typeof apply>[0], ok: string) => { const r = apply(fn) as unknown; const why = r && typeof r === 'object' && 'why' in (r as object) ? (r as { why: string[] }).why : null; setNo(why ? why.join(' ') : null); setSaid(why ? null : ok); return !why; };
  const choose = (which: 'A' | 'B' | 'own') => { setSrc(which); setCal(null); setCalText(''); setNo(null); setSaid(null); };
  const upload = async (files: FileList | null) => {
    const next: Doc[] = []; const bad: string[] = [];
    for (const f of [...(files || [])].slice(0, 6)) { let text = ''; try { text = await f.text(); } catch { bad.push(`“${f.name.slice(0, 60)}” could not be read.`); continue; } const k = kindOf(f.name, text); if ('why' in k) { bad.push(k.why); continue; }
      if (next.some((d) => d.kind === k.kind)) { bad.push(`“${f.name.slice(0, 60)}” is a second ${KIND_WORD[k.kind].toLowerCase()}; one of each is read.`); continue; }
      next.push({ id: f.name.replace(/\.[a-z]+$/i, '').replace(/[^\w.-]+/g, '-').slice(0, 30) || k.kind, name: f.name.slice(0, 80), kind: k.kind, revision: (/rev(?:ision)?[ ._-]*([A-Z0-9]{1,3})\b/i.exec(f.name)?.[1] || '').toUpperCase(), text }); }
    setRefused(bad); if (next.length) { setOwn(next); choose('own'); }
  };
  const b = plan?.boundary; const u = plan?.unitsPerMetre; const k = b ? 460 / Math.max(b.w, 1) : 1; const X = (px: number) => 50 + (px - (b?.x || 0)) * k; const Y = (py: number) => 40 + (py - (b?.y || 0)) * k;

  return (
    <div className="pa dr" data-native="" data-testid="drawings" data-source={src} data-findings={all.length} data-blockers={blockers}>
      <PageHero compact eyebrow="Drawing Intelligence" title="Review a drawing package" product="commissioning" icon="layers"
        lede="A plan, a device schedule and a bill of materials are read, checked against each other and against a room type’s standard, and saved for an engineer to decide and approve."
        meta={[<Chip key="s" small tone="warn">Synthetic data</Chip>, <Chip key="r" small tone="muted">Reads SVG plans and CSV tables as text</Chip>, <Chip key="n" small tone="muted">Not an engineer, and approves nothing</Chip>]} />

      {no ? <div role="alert" className="dr-msg dr-msg--no" data-testid="dr-refused"><Icon name="alert" size={18} /><span>{no}</span></div> : null}
      {said && !no ? <p role="status" className="dr-msg dr-msg--ok" data-testid="dr-said"><Icon name="check" size={18} /><span>{said}</span></p> : null}

      <Card title="The package" icon="book" sub="The demonstration’s own synthetic package in two revisions, or your own files." testId="dr-package">
        <div className="dr-row" role="group" aria-label="Which package">
          {(['A', 'B'] as const).map((r) => <button key={r} type="button" className="ui-btn ui-btn--sm" aria-pressed={src === r} data-testid={`dr-src-${r}`} onClick={() => choose(r)}>Sample, revision {r}</button>)}
          {can('drawing.review') ? <label className="ui-btn ui-btn--sm dr-file">Read your own files<input type="file" multiple accept=".svg,.csv,image/svg+xml,text/csv" className="ui-sr" data-testid="dr-files" onChange={(e) => { void upload(e.target.files); e.target.value = ''; }} /></label> : null}
        </div>
        {refused.length ? <ul className="dr-plain dr-bad" data-testid="dr-not-read" role="alert">{refused.map((x) => <li key={x}>{x}</li>)}</ul> : null}
        <ul className="dr-docs" data-testid="dr-docs">{docs.map((d) => <li key={d.id} data-kind={d.kind}><b>{KIND_WORD[d.kind]}</b><span>{d.name} · revision {d.revision || 'not stated'} · {d.kind === 'plan' ? `${plural(plan?.devices.length || 0, 'device tag')}, ${plural(plan?.ports.length || 0, 'network port')}, ${plural(plan?.annotations.length || 0, 'dimension')}` : d.kind === 'schedule' ? plural(ex.schedule?.rows.length || 0, 'row') : plural(ex.bom?.rows.length || 0, 'row')}</span></li>)}</ul>
        {!docs.length ? <p className="dr-note">No document is loaded.</p> : null}
        <p className="dr-note">PDF, Visio, CAD and image files are not read: that is not built. A file is read as text; it is never displayed or run.</p>
      </Card>

      {plan ? <Card title="What was read from the plan" icon="search" sub={u ? `Scale: ${Math.round(u * 100) / 100} drawing units to a metre (${clsShort(plan.scaleCls!).toLowerCase()}).` : 'Not to scale: the scale is unknown, so nothing is given in metres.'} testId="dr-plan-card">
        {b ? <figure className="dr-plan" data-testid="dr-plan" data-scale={plan.scaleCls || 'none'} data-devices={ex.devices.length}>
          <svg viewBox={`0 0 ${460 + 100} ${Math.round(b.h * k) + 80}`} role="img" aria-label={`The room as read: ${ex.room ? `${ex.room.width} metres by ${ex.room.length} metres` : 'size unknown'}, with ${plural(ex.devices.length, 'device')}`} preserveAspectRatio="xMidYMid meet">
            <rect className="dr-room" x={X(b.x)} y={Y(b.y)} width={b.w * k} height={b.h * k} />
            <text className="dr-lab" x={X(b.x + b.w / 2)} y={24} textAnchor="middle">{ex.room ? `${ex.room.width} m` : `${Math.round(b.w)} units`}</text>
            {plan.ports.map((p) => <rect key={p.tag} className="dr-port" x={X(p.px) - 4} y={Y(p.py) - 4} width="8" height="8" />)}
            {plan.devices.map((d, i) => <g key={`${d.tag}${i}`} className="dr-mark" data-cat={d.cat || 'unknown'}><circle cx={X(d.px)} cy={Y(d.py)} r="14" /><text x={X(d.px)} y={Y(d.py) + 5} textAnchor="middle">{i + 1}</text></g>)}
          </svg><figcaption className="ui-meta">Drawn by this page from the numbers it read. Squares are network ports. {u ? 'Positions are computed from the scale; they are not a survey.' : 'Without a scale this shows arrangement only.'}</figcaption></figure> : null}
        {plan.notes.length || plan.doubts.length ? <ul className="dr-plain" data-testid="dr-reading">{plan.doubts.map((x) => <li key={x} data-doubt="yes"><Icon name="alert" size={14} /> {x}</li>)}{plan.notes.map((x) => <li key={x}>{x}</li>)}</ul> : null}
        {b && can('drawing.review') ? <form className="dr-cal" noValidate data-testid="dr-calibrate" onSubmit={(e) => { e.preventDefault(); const m = Number(calText.trim().replace(',', '.')); setCal({ edge: calEdge, metres: m }); }}>
          <div className="ui-field"><label htmlFor="dr-cal-edge">A line you know the real length of</label><select id="dr-cal-edge" value={calEdge} onChange={(e) => setCalEdge(e.target.value as 'width' | 'length')} data-testid="dr-cal-edge"><option value="width">The room’s top edge ({Math.round(b.w)} units)</option><option value="length">The room’s left edge ({Math.round(b.h)} units)</option></select></div>
          <div className="ui-field"><label htmlFor="dr-cal-m">Its real length, in metres</label><input id="dr-cal-m" type="text" inputMode="decimal" value={calText} onChange={(e) => setCalText(e.target.value)} data-testid="dr-cal-m" autoComplete="off" /></div>
          <div className="dr-row"><button type="submit" className="ui-btn ui-btn--sm" data-testid="dr-cal-go">{u ? 'Set the scale myself' : 'Calibrate'}</button>{calWhy ? <span role="alert" className="dr-why">{calWhy}</span> : null}</div>
        </form> : null}
      </Card> : null}

      <ViewingCard ex={ex} role={role} name={name} revision={revision} type={type} />
      {ex.devices.length ? <Card title="Devices" icon="layers" sub="Each with how it is known. A tag’s prefix is a convention; a schedule’s own words are stronger." testId="dr-devices-card">
        <div className="dr-scroll"><table className="dr-table" data-testid="dr-devices"><caption className="ui-sr">Devices read from the package</caption><thead><tr><th scope="col">Tag</th><th scope="col">What it is</th><th scope="col">Model</th><th scope="col">Position</th></tr></thead>
          <tbody>{ex.devices.map((d, i) => <tr key={`${d.tag}${i}`} data-tag={d.tag} data-cls={d.catCls}><th scope="row">{i + 1}. {d.tag}</th><td>{d.cat ? C.categories[d.cat]?.label || d.cat : 'Unknown'} <Chip small tone={CLS_TONE[d.catCls]} title={CLS_WORD[d.catCls]}>{clsShort(d.catCls)}</Chip><span className="dr-sub">{d.catWhy}</span></td><td>{d.model || 'Not given'}</td>
            <td>{d.x !== null && d.y !== null ? <>{d.x} m across, {d.y} m from the top wall <Chip small tone="muted" title={CLS_WORD.MODELED}>Modelled</Chip></> : 'Unknown without a scale'}{d.inRoom === false ? <span className="dr-sub">Outside the outline</span> : null}</td></tr>)}</tbody></table></div>
      </Card> : null}

      <Card title={`Findings (${all.length})`} icon="alert" sub={blockers ? `${plural(blockers, 'finding')} for an engineer to decide before the review can be approved.` : 'Nothing here needs an engineer’s decision before approval.'} testId="dr-findings-card">
        <div className="dr-std">
          <div className="ui-field"><label htmlFor="dr-type">Review against the standard for</label><select id="dr-type" value={type} onChange={(e) => setType(e.target.value)} data-testid="dr-type">{TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
          <div className="ui-field"><label htmlFor="dr-occ">People it is for</label><input id="dr-occ" type="text" inputMode="numeric" value={occ} onChange={(e) => setOcc(e.target.value)} data-testid="dr-occ" autoComplete="off" /></div>
        </div>
        {'why' in design ? <p className="dr-note" data-testid="dr-no-standard">The standards review was not run: {design.why}</p> : null}
        {all.length ? <ul className="dr-findings" data-testid="dr-findings">{all.map((f) => <li key={f.id} data-finding={f.id} data-kind={f.kind} data-blocker={f.blocker ? 'yes' : 'no'}>
          <p><b>{f.text}</b></p><span className="dr-tags">{f.blocker ? <Chip small tone="bad">An engineer decides</Chip> : <Chip small tone="muted">To check</Chip>}<Chip small tone={CLS_TONE[f.cls]} title={CLS_WORD[f.cls]}>{clsShort(f.cls)}</Chip></span>
          <span className="dr-sub">From: {f.sources.join('; ') || 'the package as a whole'}. {f.ask}</span></li>)}</ul> : <p className="dr-note">Nothing was found.</p>}
        {std ? <div className="dr-assume" data-testid="dr-assumptions"><span>What the standards review assumed</span><ul className="dr-plain">{std.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></div> : null}
        <p className="dr-note">The reasons behind a room type’s standard are in the <a href="#/manual" data-testid="dr-manual">engineering standards manual</a>.</p>
        <div className="dr-assume" data-testid="dr-not-reviewed"><span>Not reviewed</span><ul className="dr-plain">{ex.notReviewed.map((a) => <li key={a}>{a}</li>)}</ul></div>
      </Card>

      {std?.checklist.length ? <Card title={`Draft commissioning checklist (${std.checklist.length})`} icon="check" sub={`The tests the commissioning engine applies to ${std.archetypeName ? `a ${std.archetypeName.toLowerCase()}` : 'this room'} with this equipment. A draft: an engineer confirms it.`} testId="dr-checklist"><ol className="dr-check">{std.checklist.map((t) => <li key={t.id}>{t.label}</li>)}</ol></Card> : null}
      {changes ? <Card title="What changed since revision A" icon="info" sub="By tag." testId="dr-changes">{changes.length ? <ul className="dr-plain" data-count={changes.length}>{changes.map((c) => <li key={c.text} data-change={c.kind}>{c.text}</li>)}</ul> : <p className="dr-note">Nothing changed.</p>}</Card> : null}

      {can('drawing.review') && docs.length ? <div className="dr-row"><button type="button" className="ui-btn ui-btn--primary" data-testid="dr-save" onClick={() => act((n) => saveReview(n, role, { name, revision, docs, roomType: std?.archetype ?? null, room: ex.room ? { width: ex.room.width, length: ex.room.length } : null, scale: plan?.scaleCls === 'EXTRACTED' || plan?.scaleCls === 'OBSERVED' ? plan.scaleCls : null, devices: ex.devices.length, findings: all, notReviewed: ex.notReviewed, assumptions: std?.assumptions || [], checklist: std?.checklist || [] }), 'The review is saved. Nothing was approved.')}>Save this review</button><span className="ui-meta">Saving approves nothing.</span></div> : null}

      {reviews.length ? <section className="dr-saved" aria-labelledby="dr-saved-h" data-testid="dr-reviews"><h2 id="dr-saved-h">Saved reviews</h2>
        {reviews.map((r) => <ReviewCard key={r.id} r={r} role={role} mayDecide={mayDecide && can('drawing.decide')} act={act} />)}</section> : null}

      <Notice tone="info">
        <b>What Drawing Intelligence is here.</b> Rule-checking on documents it can read as text: an SVG plan and two CSV tables. It does not see a drawing, read a PDF or a CAD file, follow a signal flow diagram, or judge coverage. Each fact says how it is known. A contradiction between documents keeps both and waits for an engineer. Approval is of the review as read; it is not a design release, and it does not hold or claim any engineering credential.
      </Notice>
    </div>
  );
}

function ReviewCard({ r, role, mayDecide, act }: { r: SavedReview; role: PageProps['role']; mayDecide: boolean; act: (fn: (n: Parameters<typeof decide>[0]) => unknown, ok: string) => boolean }) {
  const [notes, setNotes] = useState<Record<string, string>>({}); const state = stateOf(r); const open = openBlockers(r); const need = r.findings.filter((f) => f.blocker);
  return (
    <article className="dr-review" data-testid={`dr-review-${r.id}`} data-state={state} aria-labelledby={`dr-rv-${r.id}`}>
      <header><h3 id={`dr-rv-${r.id}`}>{r.id} · {r.name}{r.revision ? `, revision ${r.revision}` : ''}</h3><Chip small tone={state === 'APPROVED' ? 'ok' : state === 'READY_FOR_APPROVAL' ? 'info' : 'warn'}>{STATE_WORD[state]}</Chip></header>
      <p className="dr-sub">Saved {day(r.at)} by the {ROLES[r.by].label} · {plural(r.docs.length, 'document')} · {plural(r.devices, 'device')} · {plural(r.findings.length, 'finding')}{r.room ? ` · ${r.room.width} m by ${r.room.length} m` : ' · no scale'}{r.approval ? ` · approved ${day(r.approval.at)} by the ${ROLES[r.approval.by].label}` : ''}</p>
      {need.length ? <ul className="dr-findings">{need.map((f) => { const d = r.decisions.find((x) => x.finding === f.id); return (
        <li key={f.id} data-finding={f.id} data-decided={d ? 'yes' : 'no'}><p><b>{f.text}</b></p><span className="dr-tags"><Chip small tone={CLS_TONE[classOf(r, f)]} title={CLS_WORD[classOf(r, f)]}>{clsShort(classOf(r, f))}</Chip></span>
          {d ? <span className="dr-sub"><Icon name="check" size={14} /> Decided by the {ROLES[d.by].label}, {day(d.at)}: “{d.note}”</span>
            : mayDecide && !r.approval ? <div className="dr-decide"><div className="ui-field"><label htmlFor={`dr-d-${r.id}-${f.id}`}>Your decision, and why</label><input id={`dr-d-${r.id}-${f.id}`} type="text" maxLength={400} value={notes[f.id] || ''} onChange={(e) => setNotes({ ...notes, [f.id]: e.target.value })} data-testid={`dr-note-${f.id}`} /></div>
              <button type="button" className="ui-btn ui-btn--sm" data-testid={`dr-decide-${f.id}`} onClick={() => { if (act((n) => decide(n, role, r.id, f.id, notes[f.id] || ''), 'The decision is recorded beside the finding. The finding itself is unchanged.')) setNotes({ ...notes, [f.id]: '' }); }}>Record the decision</button></div>
            : <span className="dr-sub">{f.ask}</span>}</li>); })}</ul> : <p className="dr-note">No finding needed an engineer’s decision.</p>}
      {!r.approval && mayDecide ? <div className="dr-row"><button type="button" className="ui-btn ui-btn--primary" data-testid={`dr-approve-${r.id}`} onClick={() => act((n) => approve(n, role, r.id), `${r.id} is approved, as read from its documents. It is not a design release.`)}>Approve this review</button>
        <span className="ui-meta">{open.length ? `${plural(open.length, 'decision')} still needed.` : r.by === role ? `Saved by the ${ROLES[role].label}: another engineering role approves it.` : 'Every finding that needed a decision has one.'}</span></div> : null}
    </article>
  );
}

/** Display viewing analysis (70/10 task 70-2): the drawing's room, the farthest viewer, candidate display sizes against ST-VID-02 with the
 *  arithmetic shown; then the room carried into the Lite studio as a conceptual model whose dimensions say they came from this drawing. */
function ViewingCard({ ex, role, name, revision, type }: { ex: Extraction; role: PageProps['role']; name: string; revision: string; type: string }) {
  const disp = ex.devices.find((d) => (d.cat === 'display' || d.cat === 'ledwall' || d.cat === 'projector') && d.x !== null && d.y !== null);
  const v = useMemo(() => (ex.room ? viewing(ex.room, disp ? { x: disp.x!, y: disp.y! } : null) : null), [ex.room, disp?.x, disp?.y]);
  const [said, setSaid] = useState<string | null>(null);
  if (!ex.room) return <Card title="Display viewing analysis" icon="display" testId="dr-viewing"><p className="ui-meta" data-testid="dr-viewing-none">The room’s size is unknown until the plan has a scale. Calibrate one edge above, and the analysis appears here.</p></Card>;
  if (!v) return null;
  const toLite = () => { const KEY = 'empathia.demo.liteStudio.v1'; let list: LS.LiteModel[] = []; try { const x = JSON.parse(localStorage.getItem(KEY) || '[]'); list = Array.isArray(x) ? x : []; } catch { /* */ }
    const id = `LM-${String(list.reduce((n, x) => Math.max(n, Number(String(x.id).slice(3)) || 0), 0) + 1).padStart(3, '0')}`; let m = LS.createModel(id, { archetype: type, roomName: name || 'Drawing room' });
    const why = `Drawing Intelligence: ${name || 'drawing'} rev ${revision}, ${ex.room!.cls === 'OBSERVED' ? 'scale calibrated by a person' : 'scale from the drawing'}`;
    for (const [dim, val] of [['width', ex.room!.width], ['length', ex.room!.length]] as Array<[LS.Dim, number]>) { const r = LS.correct(m, dim, val, why, '±0.1 m'); if (r.ok) m = r.model; }
    try { localStorage.setItem(KEY, JSON.stringify([m, ...list])); location.hash = `#/v25/lite?m=${m.id}`; } catch { setSaid('This browser would not keep the model (storage is blocked).'); } };
  return <Card title="Display viewing analysis" icon="display" sub="How large a display must be for the farthest viewer, across candidate sizes. Modeled from the drawing; a proposal for an engineer" testId="dr-viewing">
    <ul className="plain stack" data-testid="dr-viewing-facts">{v.facts.map((f) => <li key={f.label}><b>{f.label}:</b> {f.value} <ProvenanceChip value={f.prov} source={f.basis} /></li>)}</ul>
    <div className="dr-scroll"><table className="dr-table" data-testid="dr-viewing-sizes"><caption className="ui-sr">Candidate display sizes against ST-VID-02</caption>
      <thead><tr><th scope="col">Proposed size</th><th scope="col">Image height × width</th><th scope="col">Farthest ÷ height</th><th scope="col">Verdict</th></tr></thead>
      <tbody>{v.rows.map((r) => <tr key={r.inches} data-size={r.inches} data-meets={r.meets && r.fits} aria-current={v.recommend === r.inches ? 'true' : undefined}><th scope="row">{r.inches}″{v.recommend === r.inches ? ' · smallest that works' : ''}</th><td>{r.h} × {r.w} m</td><td>{r.ratio}</td><td>{r.verdict}</td></tr>)}</tbody></table></div>
    <p data-testid="dr-viewing-rec"><b>Recommendation.</b> {v.recommendation}</p>
    <details><summary className="ui-meta">The method, so anyone can repeat it</summary><ul className="ui-meta">{v.method.map((m) => <li key={m}>{m}</li>)}</ul></details>
    {allows({ area: 'studio' }, role) && <p><button type="button" className="ui-btn" onClick={toLite} data-testid="dr-to-lite">Carry this room into the Lite studio</button> <span className="ui-meta">A conceptual model; its width and length marked as from this drawing, manually proposed, never verified.</span></p>}
    {said && <p className="ui-meta" role="status">{said}</p>}
  </Card>;
}
