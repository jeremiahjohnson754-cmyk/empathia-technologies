/**
 * #/docs/<report>/capture — field capture, for a phone in the room (directive §12, "Mobile"): take or choose a photograph, see what has
 * to be in the frame, mark it up, add a note and measurements as they were read, attach it to a test or a deliverable, keep it as a
 * draft on the device (it survives a reload and needs no signal), and synchronise it into the record exactly once.
 *
 * What this is not: nothing is uploaded. The photograph stays in this browser. A measurement is never filled in for the person; a field
 * left empty stays empty and the capture says which. Synchronising, in this demonstration, writes to this browser's record.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHero, Card, Chip, EmptyState, Icon } from '@empathia/ui';
import { DOSSIER_4218 as D, type Authority } from '@empathia/proof-registry';
import type { PageProps } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { Crumbs, honest } from '../parity/ui.js';
import { useDossier } from '../proof/store.js';
import { actorOf, bytes } from './model.js';
import { nowIso, useDocs, type Capture, type Measurement } from './store.js';
import { MAX_IMAGE_CHARS, deleteDraft, isDurable, listDrafts, newKey, saveDraft, type Draft, type DraftMeasurement, type Mark } from './drafts.js';
import { Said, docHref, plural, when } from './ui.js';

interface Frame { id: string; name: string; must: string[]; /** x, y, width, height of the guide, as fractions of the picture */ box: [number, number, number, number] }
export const FRAMES: readonly Frame[] = [
  { id: 'label', name: 'Equipment label', must: ['The whole label, square-on', 'Model and serial number readable', 'Enough of the unit to tell which one it is'], box: [0.2, 0.3, 0.6, 0.4] },
  { id: 'position', name: 'Installed position', must: ['The whole unit and how it is fixed', 'Its neighbours on both sides', 'The cables at the unit, not hidden'], box: [0.12, 0.12, 0.76, 0.76] },
  { id: 'reading', name: 'Screen or meter reading', must: ['The display square-on, without glare', 'The value and its unit readable', 'The instrument’s own label or range setting in the frame'], box: [0.15, 0.25, 0.7, 0.5] },
  { id: 'room', name: 'Room view', must: ['Taken from the door', 'Both far corners in the frame', 'The display wall and the table'], box: [0.04, 0.1, 0.92, 0.8] },
];
const blank = (target: string): Draft => ({ key: newKey(), target, frame: 'label', note: '', measurements: [], image: null, marks: [], photo: null, savedAt: nowIso(), syncedAt: null });
const emptyM = (): DraftMeasurement => ({ quantity: '', value: '', unit: '', instrument: '', method: '' });
const VW = 1000; const VH = 750;
type Ptr = { clientX: number; clientY: number; pointerId: number; currentTarget: { setPointerCapture?: (id: number) => void } };
async function sha256(file: File): Promise<string> { const h = await crypto.subtle.digest('SHA-256', await file.arrayBuffer()); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
/** Scale the photograph down to a small image for the draft. The original is not kept. */
async function shrink(file: File): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(file);
    for (const [max, q] of [[1280, 0.72], [960, 0.6], [640, 0.5]] as const) {
      const k = Math.min(1, max / Math.max(bmp.width, bmp.height)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height); const url = c.toDataURL('image/jpeg', q); if (url.length <= MAX_IMAGE_CHARS) return url;
    }
  } catch { /* not an image the browser can read */ }
  return null;
}
/** What is wrong with the measurements as typed, in words; and the measurements as numbers when nothing is. */
export function readMeasurements(rows: DraftMeasurement[]): { ok: Measurement[]; wrong: string[] } {
  const ok: Measurement[] = []; const wrong: string[] = [];
  rows.forEach((m, i) => { const n = i + 1; const any = [m.quantity, m.value, m.unit, m.instrument, m.method].some((x) => x.trim()); if (!any) return;
    const v = Number(m.value.trim().replace(',', '.'));
    if (m.quantity.trim().length < 2) wrong.push(`Measurement ${n}: say what was measured.`);
    if (!m.value.trim() || !Number.isFinite(v)) wrong.push(`Measurement ${n}: the value has to be a number, as it was read.`);
    if (!m.unit.trim()) wrong.push(`Measurement ${n}: give the unit.`);
    if (m.instrument.trim().length < 2) wrong.push(`Measurement ${n}: name the instrument it was read from.`);
    if (m.method.trim().length < 2) wrong.push(`Measurement ${n}: say how it was measured.`);
    if (m.quantity.trim().length >= 2 && m.value.trim() && Number.isFinite(v) && m.unit.trim() && m.instrument.trim().length >= 2 && m.method.trim().length >= 2) ok.push({ quantity: m.quantity.trim(), value: v, unit: m.unit.trim(), instrument: m.instrument.trim(), method: m.method.trim() }); });
  return { ok, wrong };
}

export default function CapturePage({ role, can }: PageProps) {
  const { working: w, captures, sync, refresh } = useDocs(); const dz = useDossier();
  const [drafts, setDrafts] = useState<Draft[]>([]); const [d, setD] = useState<Draft | null>(null); const [durable, setDurable] = useState<boolean | null>(null);
  const [no, setNo] = useState<string | null>(null); const [ok, setOk] = useState<string | null>(null); const [saved, setSaved] = useState<string | null>(null);
  const [tool, setTool] = useState<Mark['kind']>('arrow'); const [labelText, setLabelText] = useState(''); const [drag, setDrag] = useState<Mark | null>(null); const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const svgRef = useRef<SVGSVGElement>(null); const dirty = useRef(false);
  const reload = useCallback(async () => { setDrafts(await listDrafts()); setDurable(await isDurable()); }, []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { const up = () => setOnline(true); const down = () => setOnline(false); window.addEventListener('online', up); window.addEventListener('offline', down); return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); }; }, []);
  // the draft is saved as it is changed: a capture made in a room with no signal must not depend on a button
  useEffect(() => { if (!d || !dirty.current) return; const t = setTimeout(() => { const next = { ...d, savedAt: nowIso() }; void saveDraft(next).then((done) => { if (done) { setSaved(next.savedAt); dirty.current = false; void reload(); } else setNo('This device already holds twenty drafts. Synchronise or delete one first.'); }); }, 400); return () => clearTimeout(t); }, [d, reload]);
  const edit = (patch: Partial<Draft>) => { dirty.current = true; setD((x) => (x ? { ...x, ...patch } : x)); setOk(null); };

  const targets = useMemo(() => { const tests = dz.working.tests.map((t) => ({ id: `test:${t.id}`, label: `${t.id} · ${t.name}`, open: t.result !== 'PASS' || !t.evidence })); const docs = (w?.docs ?? []).filter((x) => x.applies && x.gate !== 'dossier' || (x.applies && !!x.test)).map((x) => ({ id: `doc:${x.type}`, label: x.title, open: !x.met }));
    return { tests: [...tests.filter((t) => t.open), ...tests.filter((t) => !t.open)], docs }; }, [dz.working, w]);
  if (!can('docs.capture')) return (
    <div className="pa d5" data-native="" data-testid="capture-hidden"><Crumbs items={[['Documentation', docHref()], ['Field capture']]} /><h1 className="ui-visually-hidden">Field capture</h1>
      <EmptyState title="Field capture is for the roles that work in the room" icon="lock" action={<a className="ui-btn" href={docHref()}>Back to the checklist</a>}>The {ROLES[role].label} reads what was captured, on the checklist.</EmptyState></div>);

  const frame = FRAMES.find((f) => f.id === d?.frame) ?? FRAMES[0]!; const m = d ? readMeasurements(d.measurements) : { ok: [], wrong: [] };
  const synced = d ? captures.find((c) => c.key === d.key) ?? null : null;
  const point = (e: Ptr): [number, number] => { const r = svgRef.current!.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
  const down = (e: Ptr) => { if (!d?.image || synced) return; const [x, y] = point(e); if (tool === 'label') { if (labelText.trim()) { edit({ marks: [...d.marks, { kind: 'label', x1: x, y1: y, x2: x, y2: y, text: labelText.trim().slice(0, 40) }] }); setLabelText(''); } return; } try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* not capturable */ } setDrag({ kind: tool, x1: x, y1: y, x2: x, y2: y }); };
  const move = (e: Ptr) => { if (!drag) return; const [x, y] = point(e); setDrag({ ...drag, x2: x, y2: y }); };
  const up = () => { if (!drag || !d) return; if (Math.hypot(drag.x2 - drag.x1, drag.y2 - drag.y1) > 0.03) edit({ marks: [...d.marks, drag] }); setDrag(null); };
  const centre = () => { if (!d) return; const mk: Mark = tool === 'arrow' ? { kind: 'arrow', x1: 0.3, y1: 0.3, x2: 0.5, y2: 0.5 } : tool === 'box' ? { kind: 'box', x1: 0.35, y1: 0.35, x2: 0.65, y2: 0.65 } : { kind: 'label', x1: 0.5, y1: 0.5, x2: 0.5, y2: 0.5, text: labelText.trim().slice(0, 40) || 'Here' }; edit({ marks: [...d.marks, mk] }); if (tool === 'label') setLabelText(''); };
  const photo = async (file: File | undefined) => { if (!file || !d) return; setNo(null); const url = await shrink(file); if (!url) { setNo('That file is not a photograph this browser can read.'); return; } edit({ image: url, marks: [], photo: { name: file.name.slice(0, 160), bytes: file.size, sha256: await sha256(file) } }); };
  const start = (target: string) => { const n = blank(target); dirty.current = true; setD(n); setNo(null); setOk(null); setSaved(null); };
  const resume = (x: Draft) => { dirty.current = false; setD(x); setNo(null); setOk(null); setSaved(x.savedAt); };
  const remove = async (key: string) => { await deleteDraft(key); if (d?.key === key) setD(null); await reload(); };

  const synchronise = async () => {
    if (!d) return; setOk(null);
    if (!online) { setNo('This device is offline. The draft is kept here; synchronise when it is back online.'); return; }
    if (m.wrong.length) { setNo(m.wrong.join(' ')); return; }
    if (!d.note.trim() && !m.ok.length && !d.photo) { setNo('There is nothing to synchronise yet: add a photograph, a note or a measurement.'); return; }
    const [kind, id] = d.target.split(':') as ['test' | 'doc', string];
    const c: Capture = { key: d.key, target: { kind, id: id! }, note: d.note.trim(), measurements: m.ok, photo: d.photo ? { ...d.photo, annotated: d.marks.length > 0 } : null, by: actorOf(role), at: nowIso() };
    const r = sync(c);
    if (r === 'refused') { setNo('The capture could not be written to the record.'); return; }
    const next = { ...d, syncedAt: d.syncedAt ?? c.at, savedAt: nowIso() }; await saveDraft(next); dirty.current = false; setD(next); await reload(); refresh(); setNo(null);
    setOk(r === 'added' ? `Synchronised once. ${d.key} is on the record.` : `${d.key} was already synchronised. Nothing was added.`);
  };
  const test = d && d.target.startsWith('test:') ? dz.working.tests.find((t) => t.id === d.target.slice(5)) ?? null : null;
  const mayRecord: Authority = { record: can('docs.record'), verify: false, raise: false, accept: false, countersign: false };
  const attach = () => { if (!test || !synced) return; const r = dz.act({ kind: 'EVIDENCE', test: test.id, evidence: synced.key, by: actorOf(role), at: nowIso() }, mayRecord); setNo(r); setOk(r ? null : `${synced.key} is now the evidence record of ${test.id}. A different role verifies it on the dossier.`); };

  return (
    <div className="pa d5 d5-cap" data-native="" data-testid="capture" data-online={online ? 'yes' : 'no'} data-durable={durable === null ? 'unknown' : durable ? 'yes' : 'no'}>
      <Crumbs items={[['Documentation', docHref()], ['Field capture']]} />
      <PageHero compact eyebrow={`Phase 5 · ${D.room.name}`} title="Field capture" product="commissioning" icon="camera"
        lede="Take the photograph, say what it shows, write down what you read. It is kept on this device as you go, and reaches the record when you synchronise."
        meta={[...honest(['Synthetic data', 'warn'], ['Photographs stay in this browser', 'muted']), <Chip key="n" small tone={online ? 'ok' : 'warn'}>{online ? 'Online' : 'Offline: drafts are kept here'}</Chip>]} />
      {durable === false ? <p className="d5-note" data-testid="capture-volatile">This browser will not keep drafts after the page is closed. Synchronise before leaving.</p> : null}

      {!d ? <>
        <Card title="Start a capture" icon="plus" sub="What is it for?" testId="capture-start">
          <div className="d5-form__row">
            <div className="ui-field"><label htmlFor="cap-test">A test of the dossier</label><select id="cap-test" defaultValue="" onChange={(e) => { if (e.target.value) start(e.target.value); }} data-testid="capture-for-test"><option value="">Choose a test…</option>{targets.tests.map((t) => <option key={t.id} value={t.id}>{t.open ? '● ' : ''}{t.label}</option>)}</select></div>
            <div className="ui-field"><label htmlFor="cap-doc">A deliverable</label><select id="cap-doc" defaultValue="" onChange={(e) => { if (e.target.value) start(e.target.value); }} data-testid="capture-for-doc"><option value="">Choose a deliverable…</option>{targets.docs.map((t) => <option key={t.id} value={t.id}>{t.open ? '● ' : ''}{t.label}</option>)}</select></div>
          </div><p className="d5-note">● still open.</p>
        </Card>
        <Card title="Drafts on this device" icon="inbox" sub={drafts.length ? `${plural(drafts.length, 'draft')}, newest first` : undefined} testId="capture-drafts">
          {drafts.length ? <ul className="d5-drafts">{drafts.map((x) => <li key={x.key} data-draft={x.key} data-synced={x.syncedAt ? 'yes' : 'no'}><div><b><code>{x.key}</code> · {x.target.replace(/^test:|^doc:/, '').replace(/_/g, ' ')}</b><span>Saved {when(x.savedAt)}{x.syncedAt ? ` · synchronised ${when(x.syncedAt)}` : ' · not synchronised'}{x.photo ? ' · photograph' : ''}{x.measurements.length ? ` · ${plural(x.measurements.length, 'measurement')}` : ''}</span></div>
            <div className="d5-actions"><button type="button" className="ui-btn ui-btn--sm" data-act="resume" onClick={() => resume(x)}>Open</button><button type="button" className="ui-btn ui-btn--sm" data-act="delete" onClick={() => { void remove(x.key); }}>Delete</button></div></li>)}</ul>
            : <p className="d5-note">None. A draft appears here as soon as you start a capture.</p>}
        </Card>
      </> : <>
        <p className="d5-capbar" data-testid="capture-bar"><span><b><code>{d.key}</code></b> for {d.target.startsWith('test:') ? `test ${d.target.slice(5)}` : (w?.docs.find((x) => `doc:${x.type}` === d.target)?.title ?? d.target)}</span>
          <span data-testid="capture-saved" data-saved={saved ? 'yes' : 'no'}>{saved ? `Saved on this device ${when(saved)}` : 'Not saved yet'}{synced ? ' · synchronised' : ''}</span>
          <button type="button" className="ui-btn ui-btn--sm" onClick={() => { setD(null); void reload(); }} data-testid="capture-close">All drafts</button></p>
        <Said no={no} ok={ok} id="capture" />

        <div className="d5-grid">
          <Card title="Photograph" icon="camera" testId="capture-photo">
            <div className="ui-field"><label htmlFor="cap-frame">What the photograph is of</label><select id="cap-frame" value={d.frame} disabled={!!synced} onChange={(e) => edit({ frame: e.target.value })} data-testid="capture-frame">{FRAMES.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
            <div className="d5-guide" data-testid="capture-guide"><b>In the frame</b><ul>{frame.must.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <svg ref={svgRef} className="d5-stage" viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={d.image ? `The photograph with ${plural(d.marks.length, 'mark')} on it and the framing guide for ${frame.name.toLowerCase()}` : `Framing guide for ${frame.name.toLowerCase()}: no photograph yet`} data-testid="capture-stage" data-marks={d.marks.length} data-has-image={d.image ? 'yes' : 'no'}
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
              <defs><marker id="d5-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" className="d5-stage__head" /></marker></defs>
              <rect className="d5-stage__bg" x="0" y="0" width={VW} height={VH} />
              {d.image ? <image href={d.image} x="0" y="0" width={VW} height={VH} preserveAspectRatio="xMidYMid meet" /> : <text className="d5-stage__hint" x={VW / 2} y={VH / 2} textAnchor="middle">No photograph yet</text>}
              <rect className="d5-stage__guide" x={frame.box[0] * VW} y={frame.box[1] * VH} width={frame.box[2] * VW} height={frame.box[3] * VH} rx="10" />
              {[...d.marks, ...(drag ? [drag] : [])].map((k, i) => k.kind === 'arrow' ? <line key={i} className="d5-stage__mark" x1={k.x1 * VW} y1={k.y1 * VH} x2={k.x2 * VW} y2={k.y2 * VH} markerEnd="url(#d5-arrow)" />
                : k.kind === 'box' ? <rect key={i} className="d5-stage__mark d5-stage__mark--box" x={Math.min(k.x1, k.x2) * VW} y={Math.min(k.y1, k.y2) * VH} width={Math.abs(k.x2 - k.x1) * VW} height={Math.abs(k.y2 - k.y1) * VH} />
                : <g key={i}><rect className="d5-stage__tagbg" x={k.x1 * VW - 8} y={k.y1 * VH - 34} width={Math.max(60, (k.text || '').length * 19 + 16)} height="44" rx="6" /><text className="d5-stage__tag" x={k.x1 * VW} y={k.y1 * VH - 4}>{k.text}</text></g>)}
            </svg>
            {synced ? null : <>
              <div className="ui-field"><label htmlFor="cap-file">{d.image ? 'Replace the photograph' : 'Take or choose a photograph'}</label><input id="cap-file" type="file" accept="image/*" capture="environment" onChange={(e) => { void photo(e.target.files?.[0]); }} data-testid="capture-file" /></div>
              {d.photo ? <p className="d5-note" data-testid="capture-photo-meta">{d.photo.name} · {bytes(d.photo.bytes)} · SHA-256 {d.photo.sha256.slice(0, 16)}… A reduced copy is kept in the draft; the original is not kept.</p> : null}
              {d.image ? <div className="d5-tools" data-testid="capture-tools">
                <div role="group" aria-label="Mark-up tool" className="d5-tools__set">{(['arrow', 'box', 'label'] as const).map((k) => <button key={k} type="button" className="ui-btn ui-btn--sm" aria-pressed={tool === k} onClick={() => setTool(k)} data-tool={k}>{k === 'arrow' ? 'Arrow' : k === 'box' ? 'Box' : 'Label'}</button>)}</div>
                {tool === 'label' ? <div className="ui-field"><label htmlFor="cap-label">Label text, then tap the photograph</label><input id="cap-label" type="text" maxLength={40} value={labelText} onChange={(e) => setLabelText(e.target.value)} data-testid="capture-label-text" /></div> : <p className="d5-note">Drag on the photograph to draw {tool === 'arrow' ? 'an arrow' : 'a box'}.</p>}
                <div className="d5-actions"><button type="button" className="ui-btn ui-btn--sm" onClick={centre} data-testid="capture-mark-centre">Add at the centre</button><button type="button" className="ui-btn ui-btn--sm" disabled={!d.marks.length} onClick={() => edit({ marks: d.marks.slice(0, -1) })} data-testid="capture-mark-undo">Undo the last mark</button></div>
              </div> : null}
            </>}
          </Card>

          <Card title="What it shows" icon="info" testId="capture-facts">
            <div className="ui-field"><label htmlFor="cap-note">Note</label><textarea id="cap-note" rows={3} maxLength={600} value={d.note} disabled={!!synced} onChange={(e) => edit({ note: e.target.value })} data-testid="capture-note" /></div>
            <h3 className="d5-h">Measurements</h3>
            <p className="d5-note">Write each value as you read it. Nothing is filled in for you.</p>
            {d.measurements.map((row, i) => <fieldset key={i} className="d5-measure" data-measure={i} disabled={!!synced}><legend>Measurement {i + 1}</legend>
              {(['quantity', 'value', 'unit', 'instrument', 'method'] as const).map((k) => <div className="ui-field" key={k}><label htmlFor={`cm-${i}-${k}`}>{k === 'quantity' ? 'What was measured' : k === 'value' ? 'Value' : k === 'unit' ? 'Unit' : k === 'instrument' ? 'Instrument' : 'Method'}</label>
                <input id={`cm-${i}-${k}`} type="text" inputMode={k === 'value' ? 'decimal' : undefined} maxLength={k === 'unit' ? 16 : 120} value={row[k]} onChange={(e) => edit({ measurements: d.measurements.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)) })} data-m={k} /></div>)}
              <button type="button" className="ui-btn ui-btn--sm" onClick={() => edit({ measurements: d.measurements.filter((_, j) => j !== i) })}>Remove measurement {i + 1}</button></fieldset>)}
            {synced ? null : <div className="d5-actions"><button type="button" className="ui-btn" disabled={d.measurements.length >= 12} onClick={() => edit({ measurements: [...d.measurements, emptyM()] })} data-testid="capture-add-measure">Add a measurement</button></div>}
            {m.wrong.length ? <ul className="d5-findings" data-testid="capture-wrong">{m.wrong.map((x) => <li key={x} data-blocking="yes"><Icon name="alert" size={16} /><span>{x}</span></li>)}</ul> : null}
          </Card>
        </div>

        <Card title={synced ? 'Synchronised' : 'Synchronise'} icon="check" sub={synced ? `On the record since ${when(synced.at)}. Synchronising again adds nothing.` : 'Writes the note, the measurements and the photograph’s name, size and checksum to the record, once. The photograph stays here.'} testId="capture-sync">
          <div className="d5-actions"><button type="button" className="ui-btn ui-btn--primary" onClick={() => { void synchronise(); }} data-testid="capture-sync-go">{synced ? 'Synchronise again' : 'Synchronise'}</button>
            {test && synced && !test.evidence && can('docs.record') ? <button type="button" className="ui-btn" onClick={attach} data-testid="capture-attach">Make it the evidence of {test.id}</button> : null}
            <a className="ui-btn" href={docHref()}>Back to the checklist</a></div>
        </Card>
      </>}
    </div>
  );
}
