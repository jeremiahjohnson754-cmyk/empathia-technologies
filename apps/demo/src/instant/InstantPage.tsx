/**
 * #/instant, #/instant/<room> — Instant Room on a phone (founder, §11): "Open room → Start guided capture → Confirm scope → Take
 * photos → Verify coverage → Extract details → Review findings → Generate spatial model → Attach evidence."
 *
 * One step to a screen (`?step=`), so the back button works and a link can open any step. The rules are model.ts; this file takes
 * the photographs, shows what the rules say, and saves a proposal. Photographs stay on this device (photos.ts). The page says what
 * it does not do: it does not look at what a photograph shows, read a label or recognise equipment; a person types what they see.
 */
import { useEffect, useMemo, useState } from 'react';
import { PageHero, Card, Chip, Notice, Icon } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { roomById, shortName } from '../campus/canon.js';
import { C, roomRecord } from '../campus/design.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { OPTIONS, compare } from '../optimizer/engine.js';
import { HOW_WORD, PLACE_WORD, SAMPLE_WIDTH, SCOPES, assess, coverage, findings, planOf, readDim, shotsFor, studyInput, type Capture, type Dim, type How, type Place, type Plan, type Quality, type RecordOf, type Scope, type Shot } from './model.js';
import { MAX_IMAGE_CHARS, dropAll, dropPhoto, isDurable, keepPhoto, listPhotos, newKey } from './photos.js';
import { IR_READERS, clearCapture, loadCapture, mayCapture, proposalsFor, saveCapture, savePropose, startCapture, type Proposal } from './store.js';

type StepId = 'scope' | 'photos' | 'measure' | 'details' | 'review';
const STEPS: ReadonlyArray<{ id: StepId; title: string }> = [{ id: 'scope', title: 'Scope' }, { id: 'photos', title: 'Photographs' }, { id: 'measure', title: 'Measurements' }, { id: 'details', title: 'What you saw' }, { id: 'review', title: 'Review and save' }];
const FURNITURE = new Set(['table', 'chairs', 'lectern']);
const CATS = Object.entries(C.categories).filter(([k]) => !FURNITURE.has(k)).map(([k, v]) => [k, v.label] as const);
const isCategory = (c: string) => CATS.some(([k]) => k === c);
const catWord = (c: string) => (C.categories[c]?.label || c).toLowerCase();
const PLACES = Object.keys(PLACE_WORD) as Place[];
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Read a chosen file into what the rules need and what is kept: a brightness sample, the photograph's size, and a scaled-down copy. */
async function readPhoto(file: File, kind: Shot['kind']): Promise<{ quality: Quality; image: string; width: number; height: number } | null> {
  try {
    const bmp = await createImageBitmap(file); const sw = Math.min(SAMPLE_WIDTH, bmp.width); const sh = Math.max(1, Math.round(bmp.height * sw / bmp.width));
    const s = document.createElement('canvas'); s.width = sw; s.height = sh; const sx = s.getContext('2d', { willReadFrequently: true })!; sx.drawImage(bmp, 0, 0, sw, sh);
    const px = sx.getImageData(0, 0, sw, sh).data; const luma = new Uint8ClampedArray(sw * sh); for (let i = 0; i < sw * sh; i++) luma[i] = 0.299 * px[i * 4]! + 0.587 * px[i * 4 + 1]! + 0.114 * px[i * 4 + 2]!;
    const quality = assess(luma, sw, sh, bmp.width, bmp.height, kind);
    for (const [max, q] of [[1280, 0.72], [960, 0.6], [640, 0.5]] as const) {
      const k = Math.min(1, max / Math.max(bmp.width, bmp.height)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height); const image = c.toDataURL('image/jpeg', q); if (image.length <= MAX_IMAGE_CHARS) return { quality, image, width: bmp.width, height: bmp.height };
    }
  } catch { /* not an image the browser can read */ }
  return null;
}
function recordOf(roomId: string | null): RecordOf | null {
  const r = roomId ? roomRecord(roomId) : null; if (!r) return null; const g = r.design.geometry; const equipment: Record<string, number> = {};
  for (const p of r.positions) if (!p.furniture && isCategory(p.cat)) equipment[p.cat] = (equipment[p.cat] || 0) + 1;
  return { name: shortName(r.outline), dims: g && g.widthM > 0 && g.lengthM > 0 ? [g.widthM, g.lengthM, g.ceiling] : null, seats: r.design.occupancy || null, equipment };
}

export default function InstantPage({ role, params, query, can }: PageProps) {
  const { w, apply } = useWorkspace(); const room = params['room'] ? roomById(params['room']) : null; const base = `#/instant${room ? `/${room.id}` : ''}`;
  const [c, setC] = useState<Capture>(() => { const kept = loadCapture(isCategory); return kept && kept.roomId === (room?.id ?? null) ? kept : startCapture(room?.id ?? null, room ? shortName(room) : ''); });
  const [images, setImages] = useState<Record<string, string>>({}); const [durable, setDurable] = useState<boolean | null>(null); const [busy, setBusy] = useState<string | null>(null);
  const [no, setNo] = useState<string | null>(null); const [saved, setSaved] = useState<Proposal | null>(null);
  const step = (STEPS.find((s) => s.id === query.get('step'))?.id || 'scope') as StepId; const at = STEPS.findIndex((s) => s.id === step);
  const edit = (patch: Partial<Capture>) => { const next = { ...c, ...patch }; setC(next); saveCapture(next); setNo(null); };
  useEffect(() => { let live = true; void (async () => { const list = await listPhotos(); const d = await isDurable(); if (live) { setImages(Object.fromEntries(list.map((k) => [k.key, k.image]))); setDurable(d); } })(); return () => { live = false; }; }, []);
  const opens = (href: string) => { const x = resolve(href.split('?')[0]!); return !!x && canOpen(role, x); };
  const cov = coverage(c); const record = useMemo(() => recordOf(c.roomId), [c.roomId]); const plan = planOf(c); const capturing = mayCapture(role) && can('instant.capture');
  const mine = proposalsFor(role, w);

  const take = async (shot: Shot, file: File | undefined) => {
    if (!file) return; setBusy(shot.id); setNo(null);
    const r = await readPhoto(file, shot.kind); setBusy(null);
    if (!r) { setNo(`“${file.name.slice(0, 60)}” could not be read as a photograph. Choose a photograph taken with the camera.`); return; }
    const key = newKey(); const ok = await keepPhoto({ key, shot: shot.id, image: r.image, at: new Date().toISOString(), bytes: file.size, width: r.width, height: r.height });
    if (!ok) { setNo('This device could not keep another photograph. Remove one you no longer need.'); return; }
    const old = c.photos.filter((p) => p.shot === shot.id); for (const p of old) void dropPhoto(p.key);
    setImages((m) => ({ ...Object.fromEntries(Object.entries(m).filter(([k]) => !old.some((p) => p.key === k))), [key]: r.image }));
    edit({ photos: [...c.photos.filter((p) => p.shot !== shot.id), { shot: shot.id, key, at: new Date().toISOString(), quality: r.quality, keptAnyway: false }] });
  };
  const remove = (shotId: string) => { for (const p of c.photos.filter((x) => x.shot === shotId)) void dropPhoto(p.key); edit({ photos: c.photos.filter((p) => p.shot !== shotId) }); };
  const startOver = () => { void dropAll(); clearCapture(); setImages({}); setSaved(null); setC(startCapture(room?.id ?? null, room ? shortName(room) : '')); setNo(null); };

  if (saved) return (
    <div className="pa ir" data-native="" data-testid="instant" data-step="saved">
      <PageHero compact eyebrow="Instant Room" title={`Saved as ${saved.id}`} product="lite" icon="check" lede={`A proposed design for ${saved.name}. It is a proposal: no room’s record, drawing or equipment list was changed.`} meta={[<Chip key="s" small tone="warn">Synthetic data</Chip>]} />
      <Card title="What was saved" icon="info" testId="ir-saved">
        <dl className="ir-facts"><div><dt>Size</dt><dd>{saved.width.m} m by {saved.length.m} m{saved.height ? `, ${saved.height.m} m high` : ''} · {saved.basis === 'MEASURED' ? 'measured' : 'partly estimated'}</dd></div>
          <div><dt>Photographs</dt><dd>{plural(saved.photos.length, 'photograph')}, kept on this device only</dd></div><div><dt>Layout</dt><dd>{saved.option ? `Option ${saved.option}: ${OPTIONS.find((o) => o.key === saved.option)?.name}` : 'None chosen'}</dd></div></dl>
        <p className="ir-note">A designer reads proposals. Accepting one into a room’s record is not built in this demonstration.</p>
        <div className="ir-row"><button type="button" className="ui-btn ui-btn--primary" data-testid="ir-again" onClick={startOver}>Capture another space</button>{room && opens(`#/here/${room.id}`) ? <a className="ui-btn" href={`#/here/${room.id}`}>Back to the room</a> : null}</div>
      </Card>
    </div>
  );

  return (
    <div className="pa ir" data-native="" data-testid="instant" data-step={step} data-room={c.roomId || ''} data-complete={cov.complete ? 'yes' : 'no'}>
      <PageHero compact eyebrow="Instant Room" title={c.name ? `Capture ${c.name}` : 'Capture a space'} product="lite" icon="camera"
        lede="Guided photographs and a few measurements, turned into a plan and a proposed design. On your phone, in the room."
        meta={[<Chip key="s" small tone="warn">Synthetic data</Chip>, <Chip key="p" small tone="muted">Photographs stay on this device</Chip>, <Chip key="n" small tone="muted">Nothing is recognised by a machine</Chip>]} />

      {!capturing ? <p className="ir-msg ir-msg--info" data-testid="ir-readonly"><Icon name="info" size={18} /><span>You read proposals here. Capturing a space is for the people in the room.</span></p> : <>
        <nav className="ir-steps" aria-label="Steps" data-testid="ir-steps"><ol>{STEPS.map((s, i) => <li key={s.id}><a href={`${base}?step=${s.id}`} aria-current={s.id === step ? 'step' : undefined} data-step={s.id}><span aria-hidden="true">{i + 1}</span>{s.title}</a></li>)}</ol></nav>
        {no ? <div role="alert" className="ir-msg ir-msg--no" data-testid="ir-refused"><Icon name="alert" size={18} /><span>{no}</span></div> : null}
        {durable === false ? <p className="ir-msg ir-msg--info" data-testid="ir-volatile"><Icon name="info" size={18} /><span>This browser will not keep photographs after the page is closed. Finish and save in one sitting.</span></p> : null}

        {step === 'scope' ? <section className="ir-step" aria-labelledby="ir-h-scope" data-testid="ir-scope"><h2 id="ir-h-scope">What are you capturing?</h2>
          {room ? <p className="ir-note">{shortName(room)} · {room.name}. {record ? 'It has a record; what you capture is compared with it at the end.' : ''}</p>
            : <div className="ui-field"><label htmlFor="ir-name">Name of the space</label><input id="ir-name" type="text" maxLength={80} value={c.name} onChange={(e) => edit({ name: e.target.value })} data-testid="ir-name" autoComplete="off" /></div>}
          <fieldset className="ir-opts"><legend>How much of it</legend>{(Object.keys(SCOPES) as Scope[]).map((s) => <label key={s} className="ir-opt"><input type="radio" name="ir-scope" checked={c.scope === s} onChange={() => edit({ scope: s })} data-scope={s} /><span><b>{SCOPES[s].title}</b><span>{SCOPES[s].says} {plural(shotsFor(s).filter((x) => x.required.includes(s)).length, 'photograph')} needed.</span></span></label>)}</fieldset>
          <p className="ir-safe"><Icon name="alert" size={16} /><span>Stay where it is safe to stand. Do not open equipment, move it, climb, or go anywhere you would not normally go. A shot you cannot take safely is left out.</span></p>
        </section> : null}

        {step === 'photos' ? <section className="ir-step" aria-labelledby="ir-h-photos" data-testid="ir-photos"><h2 id="ir-h-photos">Take the photographs</h2>
          <div className="ir-cover" data-testid="ir-coverage" data-complete={cov.complete ? 'yes' : 'no'} role="status">{cov.complete ? <p><Icon name="check" size={16} /> Every photograph that is needed has been taken.</p> : <ul>{cov.say.map((x) => <li key={x}>{x}</li>)}</ul>}</div>
          <ol className="ir-shots">{cov.shots.map(({ shot, required, photo, passes }) => (
            <li key={shot.id} data-shot={shot.id} data-state={photo ? (passes ? 'ok' : 'retake') : 'none'} data-required={required ? 'yes' : 'no'}>
              <div className="ir-shot"><b>{shot.title}</b>{required ? null : <Chip small tone="muted">Optional</Chip>}
                <p className="ir-say">{shot.say}</p>{shot.safety ? <p className="ir-safe"><Icon name="alert" size={14} /><span>{shot.safety}</span></p> : null}
                {photo ? <figure className="ir-thumb">{images[photo.key] ? <img src={images[photo.key]} alt={`Your photograph: ${shot.title.toLowerCase()}`} /> : <span className="ir-noimg">The photograph is not on this device any more.</span>}
                  <figcaption data-verdict={photo.quality.verdict}><Icon name={photo.quality.verdict === 'ok' ? 'check' : 'alert'} size={14} /> {photo.quality.say}{photo.keptAnyway ? ' Kept anyway.' : ''} <span className="ui-meta">Taken {when(photo.at)}.</span></figcaption></figure> : null}
                <div className="ir-row">
                  <label className="ui-btn ui-btn--sm ir-file">{busy === shot.id ? 'Reading…' : photo ? 'Retake' : 'Take or choose a photograph'}<input type="file" accept="image/*" capture="environment" className="ui-sr" data-testid={`ir-file-${shot.id}`} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void take(shot, f); }} /></label>
                  {photo && !passes ? <button type="button" className="ui-btn ui-btn--sm" data-testid={`ir-keep-${shot.id}`} onClick={() => edit({ photos: c.photos.map((p) => (p.key === photo.key ? { ...p, keptAnyway: true } : p)) })}>It looks fine to me: keep it</button> : null}
                  {photo ? <button type="button" className="ui-btn ui-btn--sm" data-testid={`ir-remove-${shot.id}`} onClick={() => remove(shot.id)}>Remove</button> : null}
                </div>
              </div>
            </li>))}</ol>
          <p className="ir-note">The check after each photograph is arithmetic on its pixels: how sharp its edges are and how bright it is. It cannot tell what the photograph shows, and a plain, evenly lit wall can look blurred to it. If a photograph looks right to you, keep it.</p>
        </section> : null}

        {step === 'measure' ? <Measure c={c} edit={edit} /> : null}
        {step === 'details' ? <Details c={c} edit={edit} /> : null}
        {step === 'review' ? <Review c={c} plan={plan} record={record} role={role} can={can} onSave={(option, studyAssumed, found) => { const r = apply((n) => savePropose(n, role, c, option, { studyAssumed, findings: found })) as { why?: string[] } | Proposal; if ('why' in r && r.why) { setNo(r.why.join(' ')); return; } clearCapture(); setSaved(r as Proposal); }} /> : null}

        <div className="ir-nav">{at > 0 ? <a className="ui-btn" href={`${base}?step=${STEPS[at - 1]!.id}`} data-testid="ir-back">Back</a> : <span />}{at < STEPS.length - 1 ? <a className="ui-btn ui-btn--primary" href={`${base}?step=${STEPS[at + 1]!.id}`} data-testid="ir-next">Next: {STEPS[at + 1]!.title.toLowerCase()}</a> : null}</div>
        {c.photos.length || c.width || c.details.length ? <p className="ir-note"><button type="button" className="ir-link" data-testid="ir-reset" onClick={startOver}>Start again</button>: removes this capture and its photographs from this device.</p> : null}
      </>}

      {mine.length ? <Card title={IR_READERS.includes(role) ? 'Proposed designs' : 'Your proposed designs'} icon="info" sub="Proposals only. None of them has changed a record." testId="ir-proposals">
        <ul className="ir-props">{mine.map((p) => <li key={p.id} data-proposal={p.id}><b>{p.id} · {p.name}</b><span>{p.width.m} m by {p.length.m} m · {p.basis === 'MEASURED' ? 'measured' : 'partly estimated'} · {plural(p.photos.length, 'photograph')} · {p.option ? `layout ${p.option}` : 'no layout'} · {when(p.at)}</span>
          {p.assumptions.length ? <details><summary>{plural(p.assumptions.length, 'assumption')}{p.findings.length ? ` and ${plural(p.findings.length, 'difference')} from the record` : ''}</summary><ul>{[...p.assumptions, ...p.findings].map((a) => <li key={a}>{a}</li>)}</ul></details> : null}</li>)}</ul>
      </Card> : null}

      <Notice tone="info">
        <b>What Instant Room does, and does not.</b> It guides the photographs, checks each for sharpness and light, compares what you record with the room’s record, draws a rectangle of the measured size and studies layouts for it. It does not look at what a photograph shows, read a label, recognise equipment, or build a 3D model: those are not built. The plan is a working drawing, not a survey, and a proposal changes no record.
      </Notice>
    </div>
  );
}

function Measure({ c, edit }: { c: Capture; edit: (p: Partial<Capture>) => void }) {
  const init = (d: Dim | null) => ({ v: d ? String(d.m) : '', how: (d?.how || 'measured') as How });
  const [f, setF] = useState({ width: init(c.width), length: init(c.length), height: init(c.height) }); const [seats, setSeats] = useState(c.seats ? String(c.seats) : ''); const [why, setWhy] = useState<Record<string, string>>({});
  const commit = (which: 'width' | 'length' | 'height', v: string, how: How) => { setF({ ...f, [which]: { v, how } }); if (!v.trim()) { setWhy({ ...why, [which]: '' }); edit({ [which]: null }); return; } const r = readDim(v, how, which); if ('why' in r) { setWhy({ ...why, [which]: r.why }); edit({ [which]: null }); } else { setWhy({ ...why, [which]: '' }); edit({ [which]: r.ok }); } };
  const LABEL = { width: 'Width: along the front wall', length: 'Length: from the front wall to the rear wall', height: 'Height: floor to ceiling (optional)' } as const;
  return (
    <section className="ir-step" aria-labelledby="ir-h-measure" data-testid="ir-measure"><h2 id="ir-h-measure">Measure the room</h2>
      <p className="ir-note">Confirm the room width using an actual measurement. A tape or a laser measure is best; if you pace it out or estimate, say so, and the plan will carry that.</p>
      {(['width', 'length', 'height'] as const).map((k) => <div key={k} className="ir-dim" data-dim={k} data-ok={c[k] ? 'yes' : 'no'}>
        <div className="ui-field"><label htmlFor={`ir-${k}`}>{LABEL[k]}, in metres</label><input id={`ir-${k}`} type="text" inputMode="decimal" value={f[k].v} onChange={(e) => commit(k, e.target.value, f[k].how)} aria-describedby={why[k] ? `ir-${k}-why` : undefined} aria-invalid={why[k] ? true : undefined} data-testid={`ir-${k}`} autoComplete="off" /></div>
        <div className="ui-field"><label htmlFor={`ir-${k}-how`}>How it was found</label><select id={`ir-${k}-how`} value={f[k].how} onChange={(e) => commit(k, f[k].v, e.target.value as How)} data-testid={`ir-${k}-how`}>{(Object.keys(HOW_WORD) as How[]).map((h) => <option key={h} value={h}>{HOW_WORD[h]}</option>)}</select></div>
        {why[k] ? <p className="ir-why" id={`ir-${k}-why`} role="alert">{why[k]}</p> : null}
      </div>)}
      <div className="ui-field ir-seats"><label htmlFor="ir-seats">How many people should it seat? (optional; needed for a layout)</label><input id="ir-seats" type="text" inputMode="numeric" value={seats} onChange={(e) => { setSeats(e.target.value); const n = Number(e.target.value); edit({ seats: Number.isInteger(n) && n > 0 && n <= 2000 ? n : null }); }} data-testid="ir-seats" autoComplete="off" /></div>
    </section>
  );
}

function Details({ c, edit }: { c: Capture; edit: (p: Partial<Capture>) => void }) {
  const [cat, setCat] = useState(CATS[0]![0]); const [place, setPlace] = useState<Place>('front'); const [label, setLabel] = useState('');
  const add = () => { edit({ details: [...c.details, { id: `d${Date.now().toString(36)}${c.details.length}`, category: cat, place, label: label.trim().slice(0, 80), shot: null }].slice(0, 40) }); setLabel(''); };
  return (
    <section className="ir-step" aria-labelledby="ir-h-details" data-testid="ir-details"><h2 id="ir-h-details">What you saw</h2>
      <p className="ir-note">Add each piece of equipment you can see: what kind it is, where it is, and what its label says if you can read one. This is your statement. Nothing here is read from the photographs.</p>
      <form className="ir-add" noValidate onSubmit={(e) => { e.preventDefault(); add(); }}>
        <div className="ui-field"><label htmlFor="ir-cat">Kind of equipment</label><select id="ir-cat" value={cat} onChange={(e) => setCat(e.target.value)} data-testid="ir-cat">{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="ui-field"><label htmlFor="ir-place">Where it is</label><select id="ir-place" value={place} onChange={(e) => setPlace(e.target.value as Place)} data-testid="ir-place">{PLACES.map((p) => <option key={p} value={p}>{PLACE_WORD[p].charAt(0).toUpperCase()}{PLACE_WORD[p].slice(1)}</option>)}</select></div>
        <div className="ui-field"><label htmlFor="ir-label">What its label says (optional)</label><input id="ir-label" type="text" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} data-testid="ir-label" autoComplete="off" /></div>
        <div className="ir-row"><button type="submit" className="ui-btn" data-testid="ir-add">Add it</button></div>
      </form>
      {c.details.length ? <ul className="ir-list" data-testid="ir-detail-list">{c.details.map((d) => <li key={d.id} data-cat={d.category}><span><b>{C.categories[d.category]?.label || d.category}</b> · {PLACE_WORD[d.place]}{d.label ? ` · label: “${d.label}”` : ''}</span><button type="button" className="ui-btn ui-btn--sm" onClick={() => edit({ details: c.details.filter((x) => x.id !== d.id) })}>Remove</button></li>)}</ul>
        : <p className="ir-note">Nothing added yet. You can save a plan without any, but nothing will be compared with the room’s equipment.</p>}
    </section>
  );
}

function PlanView({ plan, name }: { plan: Plan; name: string }) {
  const k = 480 / Math.max(plan.width, 1); const W = 480 + 80; const H = Math.round(plan.length * k) + 70; const X = (x: number) => 40 + x * k; const Y = (y: number) => 34 + y * k;
  return (
    <figure className="ir-plan" data-testid="ir-plan" data-basis={plan.basis} data-markers={plan.markers.length}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${name} from above: ${plan.width} metres wide, ${plan.length} metres long, with ${plural(plan.markers.length, 'piece')} of equipment where you said`} preserveAspectRatio="xMidYMid meet">
        <rect className="ir-room" x={X(0)} y={Y(0)} width={plan.width * k} height={plan.length * k} rx="2" />
        <text className="ir-lab" x={X(plan.width / 2)} y={20} textAnchor="middle">Front wall · {plan.width} m</text>
        <text className="ir-lab" x={16} y={Y(plan.length / 2)} textAnchor="middle" transform={`rotate(-90 16 ${Y(plan.length / 2)})`}>{plan.length} m</text>
        {plan.markers.map((m, i) => <g key={m.id} className="ir-mark" data-cat={m.category}><circle cx={X(m.x)} cy={Y(m.y)} r="9" /><text x={X(m.x)} y={Y(m.y) + 4} textAnchor="middle">{i + 1}</text></g>)}
      </svg>
      <figcaption>{plan.markers.length ? <ol className="ir-key">{plan.markers.map((m) => <li key={m.id}>{C.categories[m.category]?.label || m.category}, {PLACE_WORD[m.place]}{m.label ? ` (“${m.label}”)` : ''}</li>)}</ol> : null}
        <span className="ui-meta">{plan.basis === 'MEASURED' ? 'Drawn to the measured width and length.' : 'Drawn to a width or length that was not measured.'} A working drawing, not a survey.</span></figcaption>
    </figure>
  );
}

function Review({ c, plan, record, role, can, onSave }: { c: Capture; plan: ReturnType<typeof planOf>; record: RecordOf | null; role: PageProps['role']; can: PageProps['can']; onSave: (option: string | null, studyAssumed: string[], found: string[]) => void }) {
  const found = useMemo(() => findings(c, record, catWord), [c, record]); const input = studyInput(c); const [option, setOption] = useState<string | null>(null);
  const studies = useMemo(() => ('ok' in input && 'ok' in plan ? compare(input.ok) : null), [input, plan]);
  void role;
  return (
    <section className="ir-step" aria-labelledby="ir-h-review" data-testid="ir-review" data-ready={'ok' in plan ? 'yes' : 'no'}><h2 id="ir-h-review">Review and save</h2>
      {'why' in plan ? <div className="ir-cover" data-testid="ir-missing" role="status"><p>A plan cannot be drawn yet:</p><ul>{plan.why.map((x) => <li key={x}>{x}</li>)}</ul></div> : <>
        <PlanView plan={plan.ok} name={c.name || 'The space'} />
        <Card title="What the plan assumes" icon="info" sub="Each of these is a guess the drawing depends on." testId="ir-assumptions"><ul className="ir-plain">{plan.ok.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></Card>
        <Card title={record ? `Against the record of ${record.name}` : 'Against the record'} icon="search" sub="Differences for a person to look at. Neither side is taken as right, and the record is not changed." testId="ir-findings">
          {found.length ? <ul className="ir-plain" data-count={found.length}>{found.map((f) => <li key={f.text} data-kind={f.kind}>{f.text}</li>)}</ul> : <p className="ir-note" data-count="0">What you recorded agrees with the record, as far as the two can be compared.</p>}</Card>
        <Card title="A layout for it" icon="layers" sub="The same study the Space Optimizer runs, on the room you captured. Its scores are modelled from geometry, not measured." testId="ir-study">
          {'why' in input ? <p className="ir-note" data-testid="ir-nostudy">{input.why}</p> : studies ? <>
            <fieldset className="ir-opts"><legend>Choose a layout to propose, or none</legend>
              <label className="ir-opt"><input type="radio" name="ir-option" checked={option === null} onChange={() => setOption(null)} data-option="none" /><span><b>No layout</b><span>Save the plan and what you saw, without proposing where things go.</span></span></label>
              {studies.studies.map((s) => <label key={s.option.key} className="ir-opt"><input type="radio" name="ir-option" checked={option === s.option.key} onChange={() => setOption(s.option.key)} data-option={s.option.key} /><span><b>Option {s.option.key}: {s.option.name}{s.option.key === studies.best.option.key ? ' · scores highest' : ''}</b><span>{s.option.summary} {s.option.tradeoff} Seats {s.layout.seats.length} of the {s.layout.wanted} wanted.</span></span></label>)}
            </fieldset>
            <ul className="ir-plain">{input.assumed.map((a) => <li key={a}>{a}</li>)}</ul></> : null}
        </Card>
        {can('instant.propose') ? <div className="ir-row"><button type="button" className="ui-btn ui-btn--primary" data-testid="ir-save" onClick={() => onSave(option, 'ok' in input ? input.assumed : [], found.map((f) => f.text))}>Save as a proposed design</button><span className="ui-meta">A proposal. It changes no record.</span></div> : null}
      </>}
    </section>
  );
}
