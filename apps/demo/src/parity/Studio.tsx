/**
 * #/studio, #/studio/new (Design a Space: start from a template or a real room), #/studio/new/<template> and #/studio/room/<room> (a
 * concept: its plan, its objects and what the planning rules say about it). MODELED, NOT MEASURED: the plan is an illustration, not CAD;
 * the rules are the campus standards' planning rules; a concept is saved in this browser only.
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { PageHero, Card, Tag, Button, EmptyState, Icon } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { ROOMS, roomById, shortName, fullName } from '../campus/canon.js';
import { roomRecord } from '../campus/design.js';
import { honest, Crumbs, Zone, FactsTable } from './ui.js';

type Kind = 'display' | 'camera' | 'micceil' | 'speaker' | 'table' | 'seat';
/** an object of the concept; `rot` is a camera's aim in degrees (0 faces into the room, away from the front wall) */
interface Item { k: Kind; x: number; y: number; rot?: number; id?: string }
interface Version { name: string; at: string; w: number; l: number; h: number; seats: number; items: Item[] }
interface Concept { v: 1; id: string; name: string; from: string; w: number; l: number; h: number; seats: number; items: Item[]; versions?: Version[] }
const KIND: Record<Kind, string> = { display: 'Display', camera: 'Camera', micceil: 'Ceiling microphone', speaker: 'Loudspeaker', table: 'Table', seat: 'Seat' };
const TPL: Array<{ key: string; name: string; sub: string; dims: [number, number, number]; seats: number; recipe: Partial<Record<Kind, number>> }> = [
  { key: 'hybrid', name: 'Hybrid conference', sub: 'A table for ten, one display, a camera, a ceiling array and two loudspeakers.', dims: [8, 6, 2.8], seats: 10, recipe: { display: 1, camera: 1, micceil: 1, speaker: 2, table: 1 } },
  { key: 'boardroom', name: 'Executive boardroom', sub: 'Eighteen seats, two displays, two cameras, two ceiling arrays.', dims: [10.5, 7, 3.1], seats: 18, recipe: { display: 2, camera: 2, micceil: 2, speaker: 4, table: 1 } },
  { key: 'classroom', name: 'Classroom', sub: 'Rows for twenty-four with a presenter wall, two displays and two arrays.', dims: [10, 9.5, 3.1], seats: 24, recipe: { display: 2, camera: 2, micceil: 2, speaker: 4 } },
  { key: 'townhall', name: 'Town hall', sub: 'Rows for thirty-six, a wide presenter wall, loudspeaker zones.', dims: [14, 12, 4.2], seats: 36, recipe: { display: 3, camera: 2, micceil: 3, speaker: 6 } },
  { key: 'studio', name: 'Studio', sub: 'A production studio: three cameras, a wireless microphone, monitors.', dims: [8.4, 9.2, 4.2], seats: 8, recipe: { display: 2, camera: 3, speaker: 2 } },
  { key: 'huddle', name: 'Huddle room', sub: 'Five seats, one display with a video bar.', dims: [4.4, 5.2, 2.7], seats: 5, recipe: { display: 1, camera: 1, table: 1 } },
  { key: 'empty', name: 'Empty room', sub: 'Four walls and a door. Everything else comes from the tray.', dims: [8, 6, 3], seats: 8, recipe: {} },
];
const KEY = 'empathia.demo.studio.v1';
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
function place(w: number, l: number, recipe: Partial<Record<Kind, number>>): Item[] {
  const out: Item[] = [];
  (Object.entries(recipe) as Array<[Kind, number]>).forEach(([k, n]) => { for (let i = 0; i < n; i++) { const f = (i + 1) / (n + 1); out.push(k === 'display' || k === 'camera' ? { k, x: w * f, y: k === 'display' ? 0.15 : 0.35 } : k === 'speaker' ? { k, x: w * f, y: l * (i % 2 ? 0.7 : 0.3) } : k === 'micceil' ? { k, x: w * f, y: l * 0.55 } : { k, x: w / 2, y: l * 0.55 }); } });
  return out;
}
function fromRoom(id: string): Concept | null {
  const r = roomRecord(id); if (!r) return null; const [w, l, h] = r.outline.dims; const map: Record<string, Kind> = { display: 'display', ledwall: 'display', projector: 'display', camera: 'camera', bar: 'camera', micceil: 'micceil', speaker: 'speaker', table: 'table' };
  const xs = r.positions.map((p) => p.x), ys = r.positions.map((p) => p.y); const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const items = r.positions.filter((p) => map[p.cat]).map((p) => ({ k: map[p.cat]!, x: maxX > minX ? ((p.x - minX) / (maxX - minX)) * w * 0.9 + w * 0.05 : w / 2, y: maxY > minY ? ((p.y - minY) / (maxY - minY)) * l * 0.9 + l * 0.05 : l / 2 }));
  return { v: 1, id: `C-${id}`, name: `Concept on ${shortName(r.outline)}`, from: id, w, l, h, seats: r.outline.capacity, items };
}
const fromTpl = (key: string): Concept | null => { const t = TPL.find((x) => x.key === key); return t ? { v: 1, id: `C-${t.key}`, name: t.name, from: t.key, w: t.dims[0], l: t.dims[1], h: t.dims[2], seats: t.seats, items: place(t.dims[0], t.dims[1], t.recipe) } : null; };
function loadSaved(): Concept[] { try { const s = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(s) ? s.filter((c) => c && c.v === 1 && typeof c.id === 'string' && Array.isArray(c.items)).slice(0, 20) : []; } catch { return []; } }
function store(list: Concept[]) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20))); return true; } catch { return false; } }


/** The planning rules (campus standards ST-VID-02, ST-AUD-01, ST-VID-01), applied to the concept's own dimensions: modeled. Each rule a
 *  concept fails carries a fix that changes the concept, never the room (V2.5.3 stFindings, restored 12 Nov 2026). */
export interface Verdict { rule: string; ok: boolean | null; why: string; fix?: { label: string; apply: (c: Concept) => Concept } }
export const seatsAt = (c: Concept): [number, number] => { const t = c.items.filter((i) => i.k === 'table'); return t.length ? [t.reduce((a, i) => a + i.x, 0) / t.length, t.reduce((a, i) => a + i.y, 0) / t.length] : [c.w / 2, c.l * 0.55]; };
export function judge(c: Concept): Verdict[] {
  const disp = c.items.filter((i) => i.k === 'display'); const far = Math.hypot(c.w / 2, c.l - 0.15);
  const needH = far / 6; const area = c.w * c.l; const mics = c.items.filter((i) => i.k === 'micceil').length; const cams = c.items.filter((i) => i.k === 'camera').length; const seatArea = area / Math.max(1, c.seats);
  const [sx, sy] = seatsAt(c); const add = (k: Kind, x: number, y: number) => (x0: Concept): Concept => ({ ...x0, items: withIds([...x0.items, { k, x, y }]) });
  return [
    { rule: 'Display size for the farthest viewer (ST-VID-02)', ok: disp.length ? null : false, why: disp.length ? `The farthest seat is about ${far.toFixed(1)} m from the wall: an image at least ${needH.toFixed(2)} m tall is needed for detailed content. The display size is chosen at design; the studio does not invent one.` : 'No display is placed.', fix: disp.length ? undefined : { label: 'Add a display on the front wall', apply: add('display', c.w / 2, 0.15) } },
    { rule: 'Microphone coverage (ST-AUD-01, planning rule)', ok: mics * 30 >= area || (area <= 25 && cams > 0), why: `${mics} ceiling microphone${mics === 1 ? '' : 's'} for ${area.toFixed(0)} m²: the planning rule allows about 30 m² per array${area <= 25 ? '; a small room may rely on a video bar' : ''}.`, fix: mics * 30 >= area || (area <= 25 && cams > 0) ? undefined : { label: 'Add a ceiling array over the seats', apply: add('micceil', sx, sy) } },
    { rule: 'Camera coverage of every seat (ST-VID-01)', ok: cams > 0 ? (c.seats <= 12 * cams) : false, why: cams ? `${cams} camera${cams === 1 ? '' : 's'} for ${c.seats} seats: about twelve seats per camera preset set.` : 'No camera is placed.', fix: cams > 0 && c.seats <= 12 * cams ? undefined : { label: 'Add a camera on the front wall', apply: add('camera', cams ? c.w * (cams % 2 ? 0.25 : 0.75) : c.w / 2, 0.35) } },
    { rule: 'Space per seat', ok: seatArea >= 1.8, why: `${seatArea.toFixed(1)} m² per seat; under 1.8 m² is cramped for a meeting room.`, fix: seatArea >= 1.8 ? undefined : { label: `Seat ${Math.max(1, Math.floor(area / 1.8))} instead`, apply: (x0) => ({ ...x0, seats: Math.max(1, Math.floor((x0.w * x0.l) / 1.8)) }) } },
  ];
}
/** the commissioning rehearsal (V2.5.3 stRehearsal): the tests this design would need. Expected, never evidence. */
export function rehearsal(c: Concept): string[] {
  const n = (k: Kind) => c.items.filter((i) => i.k === k).length; const t: string[] = [];
  if (n('micceil')) t.push(`Speech intelligibility (STIPA) at the ${Math.min(4, c.seats)} farthest seats, read at the far-end send`, 'Echo-canceller convergence with the loudspeakers at reference level');
  if (n('speaker')) t.push('Loudspeaker level map at seat height, ±3 dB across the seats', 'A line check on every loudspeaker circuit');
  if (n('camera')) t.push(`Framing check per preset (${n('camera')} camera${n('camera') === 1 ? '' : 's'}) with people in the seats`);
  if (n('display')) t.push('Display brightness and uniformity against the commissioned value', 'Sightline check from the marginal seats');
  t.push('Reverberation time by octave band, occupied and empty', 'Background noise with the air handling on', 'Network: every endpoint reachable from the room switch, PoE draw within budget');
  return t;
}
const idNum = (id?: string) => Number(/^o(\d+)$/.exec(id || '')?.[1] || 0);
export function withIds(items: Item[]): Item[] { let m = Math.max(0, ...items.map((i) => idNum(i.id))); return items.map((i) => (i.id ? i : { ...i, id: `o${(m += 1)}` })); }
/** what changed between a version and now, by object identity */
export function diffItems(a: Item[], b: Item[]): { moved: number; added: number; removed: number } {
  const A = new Map(a.map((i) => [i.id, i])), B = new Map(b.map((i) => [i.id, i]));
  return { moved: b.filter((i) => { const o = A.get(i.id); return o && (Math.abs(o.x - i.x) > 0.01 || Math.abs(o.y - i.y) > 0.01 || (o.rot || 0) !== (i.rot || 0)); }).length, added: b.filter((i) => !A.has(i.id)).length, removed: a.filter((i) => !B.has(i.id)).length };
}
/** a concept read from an imported file: only known kinds and finite numbers, clamped to the studio's limits; anything else refuses */
export function readConcept(text: string): Concept | null {
  try { const o = JSON.parse(text) as Partial<Concept>; if (!o || o.v !== 1 || !Array.isArray(o.items) || o.items.length > 200) return null;
    const num = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : null);
    const w = num(o.w, 2, 40), l = num(o.l, 2, 40), h = num(o.h, 2.2, 12), seats = num(o.seats, 1, 400); if (w == null || l == null || h == null || seats == null) return null;
    const items: Item[] = []; for (const i of o.items) { if (!i || !(i.k in KIND)) return null; const x = num(i.x, 0, w), y = num(i.y, 0, l); if (x == null || y == null) return null; items.push({ k: i.k, x, y, ...(typeof i.rot === 'number' && Number.isFinite(i.rot) ? { rot: Math.round(i.rot) } : {}) }); }
    return { v: 1, id: `S-${Date.now().toString(36)}`, name: typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 80) : 'Imported concept', from: typeof o.from === 'string' ? o.from.slice(0, 40) : 'import', w, l, h, seats: Math.round(seats), items: withIds(items) };
  } catch { return null; }
}

export default function StudioPage(p: PageProps) {
  const seg = p.hash.replace(/^#\/?/, '').split(/[?~]/)[0]!.split('/').filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch { return s; } });
  const c = seg[1] === 'room' && seg[2] ? fromRoom(seg[2]) : seg[1] === 'new' && seg[2] ? (seg[2].startsWith('saved:') ? loadSaved().find((x) => x.id === seg[2]!.slice(6)) || null : fromTpl(seg[2])) : undefined;
  return <div className="pa" data-native="" data-testid="parity-studio">{c === undefined ? <Start rooms={seg[1] === 'room'} /> : c === null ? <EmptyState title="Nothing to design from this address" icon="map" action={<a className="ui-btn" href="#/studio/new">Start a concept</a>}>There is no template or room called <code>{seg[2]}</code>.</EmptyState> : <Editor key={c.id} initial={c} />}</div>;
}

function Start({ rooms }: { rooms: boolean }) {
  const [saved, setSaved] = useState<Concept[]>(() => loadSaved());
  const real = ROOMS.filter((r) => r.kind === 'reference' || r.kind === 'designed').slice(0, rooms ? 30 : 8);
  return (
    <>
      <PageHero eyebrow="Empathia Lite · design" title="Design a Space" product="lite" icon="map" lede="Start from a room purpose, size and capacity and get a furnished baseline you can change by hand. Every object is judged by the same planning rules the campus standards use."
        meta={honest(['Modeled · not measured', 'muted'], ['The plan is an illustration, not CAD', 'muted'], ['Saved in this browser only', 'accent'])} actions={<a className="ui-btn" href="#/v25/build">Build a Room with the full engine</a>} />
      {!rooms ? <Zone title="Start from a template" note="Pick one, then set the dimensions and seats">
        <div className="kit-grid">{TPL.map((t) => <a key={t.key} className="pa-card-link" href={`#/studio/new/${t.key}`} data-testid={`studio-tpl-${t.key}`}><h3><Icon name="map" size={18} />{t.name}</h3><p>{t.sub}</p><span className="pa-card-link__meta">{t.dims.join(' × ')} m · {t.seats} seats</span></a>)}</div>
      </Zone> : null}
      <Zone title="Or start from a real room" note="Its current layout, with everything that was commissioned, as the base of your concept">
        <div className="pa-chips">{real.map((r) => <a key={r.id} className="kit-chip kit-chip--act" href={`#/studio/room/${r.id}`}><Icon name="room" size={14} /><span>{shortName(r)}</span></a>)}{!rooms ? <a className="kit-chip kit-chip--act" href="#/studio/room"><span>Every room…</span></a> : null}</div>
      </Zone>
      {saved.length ? <Zone title="Your saved concepts" note={`${saved.length} in this browser`}>
        <ul className="pa-queue">{saved.map((c) => <li key={c.id} className="pa-row-actions"><a className="pa-inc" href={`#/studio/new/saved:${c.id}`}><span className="pa-inc__sev kit-s--lite" aria-hidden="true" /><span><span className="pa-inc__t">{c.name}</span><br /><span className="pa-inc__s">{c.w} × {c.l} × {c.h} m · {c.seats} seats · {c.items.length} objects</span></span><span /></a><Button small kind="quiet" onClick={() => { const n = saved.filter((x) => x.id !== c.id); store(n); setSaved(n); }}>Delete</Button></li>)}</ul>
      </Zone> : null}
    </>
  );
}


type Snap = Pick<Concept, 'w' | 'l' | 'h' | 'seats' | 'items'>;
const snapOf = (c: Concept): string => JSON.stringify({ w: c.w, l: c.l, h: c.h, seats: c.seats, items: c.items });
const STEP = 0.25;
function Editor({ initial }: { initial: Concept }) {
  const [c, setC] = useState<Concept>(() => ({ ...initial, items: withIds(initial.items) })); const [said, setSaid] = useState(''); const [dirty, setDirty] = useState(false);
  const [sel, setSel] = useState<string | null>(null); const [undo, setUndo] = useState<string[]>([]); const [redo, setRedo] = useState<string[]>([]);
  const [vname, setVname] = useState(''); const [cmp, setCmp] = useState<number | null>(null); const [brief, setBrief] = useState<string | null>(null);
  /** every change goes through here: one step of undo (at most 60), redo cleared (V2.5.3 stCommit) */
  const commit = (next: (x: Concept) => Concept, note?: string) => { const before = snapOf(c); const n = next(c); if (snapOf(n) === before && JSON.stringify(n.versions) === JSON.stringify(c.versions)) return; if (snapOf(n) !== before) { setUndo([...undo.slice(-59), before]); setRedo([]); } setC(n); setDirty(true); if (note) setSaid(note); };
  const apply = (s: string) => { const v = JSON.parse(s) as Snap; return { ...c, ...v }; };
  const set = (patch: Partial<Concept>) => commit((x) => ({ ...x, ...patch }));
  const verdict = useMemo(() => judge(c), [c]);
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); }; addEventListener('beforeunload', h); return () => removeEventListener('beforeunload', h); }, [dirty]);
  const add = (k: Kind) => commit((x) => ({ ...x, items: withIds([...x.items, { k, x: x.w / 2, y: x.l / 2 }]) }));
  const remove = (k: Kind) => { const i = c.items.map((x) => x.k).lastIndexOf(k); if (i >= 0) commit((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) })); };
  const save = () => { const list = loadSaved().filter((x) => x.id !== c.id); const id = c.id.startsWith('S-') ? c.id : `S-${Date.now().toString(36)}`; const ok = store([{ ...c, id }, ...list]); setC({ ...c, id }); setDirty(!ok); setSaid(ok ? 'Saved in this browser.' : 'This browser would not keep it (storage is blocked); export it instead.'); };
  const exportJson = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `${c.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); setSaid('Exported as JSON.'); };
  const importJson = (f: File | undefined) => { if (!f) return; if (f.size > 200_000) { setSaid('That file is too large to be a concept.'); return; } f.text().then((t) => { const n = readConcept(t); if (!n) { setSaid('That file is not a Design a Space concept; nothing was changed.'); return; } setUndo([...undo.slice(-59), snapOf(c)]); setRedo([]); setC({ ...n, versions: [] }); setSel(null); setDirty(true); setSaid(`Imported “${n.name}”: ${n.items.length} object${n.items.length === 1 ? "" : "s"}. Save it to keep it in this browser.`); }).catch(() => setSaid('That file could not be read.')); };
  const from = roomById(c.from);
  const sc = 300 / Math.max(c.w, c.l);
  const S = c.items.find((i) => i.id === sel) || null; const [sx, sy] = seatsAt(c);
  const upd = (fn: (i: Item) => Item, note: string) => S && commit((x) => ({ ...x, items: x.items.map((i) => (i.id === S.id ? fn(i) : i)) }), note);
  const nudge = (dx: number, dy: number) => upd((i) => ({ ...i, x: Math.round(clamp(i.x + dx, 0, c.w) * 100) / 100, y: Math.round(clamp(i.y + dy, 0, c.l) * 100) / 100 }), '');
  const toward = (tx: number, ty: number, dist: number, label: string) => upd((i) => { const dx = tx - i.x, dy = ty - i.y, d = Math.hypot(dx, dy) || 1, k = Math.min(dist, d) / d; return { ...i, x: Math.round(clamp(i.x + dx * k, 0, c.w) * 100) / 100, y: Math.round(clamp(i.y + dy * k, 0, c.l) * 100) / 100 }; }, label);
  const aimAt = (tx: number, ty: number) => upd((i) => ({ ...i, rot: Math.round((Math.atan2(tx - i.x, ty - i.y) * 180) / Math.PI) }), 'Aimed at the seats.');
  const vs = c.versions || [];
  const kit = (Object.keys(KIND) as Kind[]).filter((k) => k !== 'seat').map((k) => [k, c.items.filter((i) => i.k === k).length] as const).filter(([, n]) => n);
  const makeBrief = () => { const t = [`Design brief (synthetic · from Design a Space)`, c.name, `${c.w} × ${c.l} × ${c.h} m · ${c.seats} seats${from ? ` · based on ${fullName(from)}` : ''}`, '', 'Equipment in the concept:', ...kit.map(([k, n]) => `- ${n} × ${KIND[k].toLowerCase()}`), '', 'What the planning rules say (modeled):', ...verdict.map((v) => `- ${v.rule}: ${v.ok === null ? 'decided at design' : v.ok ? 'meets the rule' : 'does not meet it'}`), '', 'Tests commissioning would need:', ...rehearsal(c).map((x) => `- ${x}`), '', 'A concept, not a design: nothing here is measured or approved.'].join('\n');
    setBrief(t); try { void navigator.clipboard?.writeText(t).then(() => setSaid('Design brief copied.'), () => setSaid('The brief is below; select it to copy.')); } catch { setSaid('The brief is below; select it to copy.'); } };
  const pick = (id: string) => setSel(sel === id ? null : id);
  return (
    <>
      <Crumbs items={[['Design a Space', '#/studio/new'], [c.name]]} />
      <PageHero compact eyebrow={from ? `Concept on ${fullName(from)}` : 'Concept from a template'} title={c.name} product="lite" icon="map" lede={`${c.w} × ${c.l} × ${c.h} m · ${c.seats} seats · ${c.items.length} objects`}
        meta={honest(['Saved in this browser only', 'accent'], [dirty ? 'Unsaved changes' : 'Saved', dirty ? 'warn' : 'ok'], ['The plan is an illustration', 'muted'])}
        actions={<><Button kind="primary" onClick={save} testId="studio-save">Save concept</Button><Button onClick={() => { const b = undo[undo.length - 1]; if (!b) return; setRedo([...redo, snapOf(c)]); setUndo(undo.slice(0, -1)); setC(apply(b)); setDirty(true); setSaid('Undone.'); }} disabled={!undo.length} testId="studio-undo">Undo</Button>
          <Button onClick={() => { const r = redo[redo.length - 1]; if (!r) return; setUndo([...undo, snapOf(c)]); setRedo(redo.slice(0, -1)); setC(apply(r)); setDirty(true); setSaid('Redone.'); }} disabled={!redo.length} testId="studio-redo">Redo</Button>
          <Button onClick={exportJson}>Export JSON</Button><label className="ui-btn ui-btn--quiet">Import JSON<input type="file" accept="application/json,.json" className="ui-sr" onChange={(e) => { importJson(e.target.files?.[0]); e.target.value = ''; }} data-testid="studio-import" /></label><a className="ui-btn ui-btn--quiet" href="#/studio/new">New concept</a></>} />
      <p className="pa-note" aria-live="polite" data-testid="studio-said">{said}</p>
      <div className="pa-split">
        <Card title="Plan" icon="map" sub="Top-down, to scale; the front wall is at the top. Tap an object to select it.">
          <svg className="pa-map" viewBox={`-10 -10 ${c.w * sc + 20} ${c.l * sc + 20}`} role="group" aria-label={`Plan of ${c.name}: ${c.w} by ${c.l} metres with ${c.items.map((i) => KIND[i.k].toLowerCase()).join(', ') || 'no objects'}`} data-testid="studio-plan">
            <rect className="n" x="0" y="0" width={c.w * sc} height={c.l * sc} rx="4" onClick={() => setSel(null)} />
            {c.items.map((i) => { const x = clamp(i.x, 0, c.w) * sc, y = clamp(i.y, 0, c.l) * sc; const on = sel === i.id; const r = ((i.rot || 0) * Math.PI) / 180;
              return <g key={i.id} role="button" tabIndex={0} aria-pressed={on} aria-label={`${KIND[i.k]} at ${i.x.toFixed(2)}, ${i.y.toFixed(2)} m${i.k === 'camera' ? `, aimed ${i.rot || 0}°` : ''}`} data-item={i.id} data-kind={i.k} style={{ cursor: 'pointer' }}
                onClick={() => pick(i.id!)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i.id!); } }}>
                {i.k === 'table' ? <rect className={`n n--ok${on ? ' n--hot' : ''}`} x={x - c.w * sc * 0.25} y={y - c.l * sc * 0.15} width={c.w * sc * 0.5} height={c.l * sc * 0.3} rx="8" strokeWidth={on ? 3 : 1} />
                  : <>{i.k === 'camera' && <line className="l" x1={x} y1={y} x2={x + Math.sin(r) * 40} y2={y + Math.cos(r) * 40} />}<circle className={`n ${i.k === 'display' ? 'n--warm' : i.k === 'camera' ? 'n--hot' : 'n--ok'}`} cx={x} cy={y} r={on ? 12 : 9} strokeWidth={on ? 3 : 1} /><text x={x} y={y + 4} textAnchor="middle" className="s">{KIND[i.k][0]}</text></>}</g>; })}
          </svg>
        </Card>
        <div className="stack">
          {S ? <Card title={`${KIND[S.k]} selected`} icon="settings" testId="studio-insp">
            <p className="ui-meta" data-testid="studio-pos">At {S.x.toFixed(2)} m across, {S.y.toFixed(2)} m from the front wall{S.k === 'camera' ? ` · aimed ${S.rot || 0}° (0 faces into the room)` : ''}.</p>
            <div className="pa-row-actions" role="group" aria-label="Move in steps of 25 centimetres">
              <Button small onClick={() => nudge(0, -STEP)} testId="studio-nudge-up">Toward the front wall</Button><Button small onClick={() => nudge(-STEP, 0)} testId="studio-nudge-left">Left</Button><Button small onClick={() => nudge(STEP, 0)} testId="studio-nudge-right">Right</Button><Button small onClick={() => nudge(0, STEP)} testId="studio-nudge-down">Toward the back</Button></div>
            <div className="pa-row-actions">
              {S.k === 'camera' && <><Button small kind="quiet" onClick={() => upd((i) => ({ ...i, rot: (i.rot || 0) - 15 }), 'Aimed 15° left.')} testId="studio-aim-left">Aim left 15°</Button><Button small kind="quiet" onClick={() => upd((i) => ({ ...i, rot: (i.rot || 0) + 15 }), 'Aimed 15° right.')} testId="studio-aim-right">Aim right 15°</Button><Button small kind="quiet" onClick={() => aimAt(sx, sy)} testId="studio-aim-seats">Aim at the seats</Button></>}
              {S.k !== 'table' && <Button small kind="quiet" onClick={() => toward(sx, sy, 0.5, 'Moved 0.5 m toward the seats.')} testId="studio-toward">Move 0.5 m toward the seats</Button>}
              {S.k !== 'display' && <Button small kind="quiet" onClick={() => toward(S.x, c.l, 0.5, 'Moved 0.5 m away from the front wall.')} testId="studio-away">Move 0.5 m away from the front wall</Button>}</div>
            <div className="pa-row-actions"><Button small onClick={() => commit((x) => ({ ...x, items: withIds([...x.items, { k: S.k, x: clamp(S.x + 0.5, 0, x.w), y: S.y, ...(S.rot ? { rot: S.rot } : {}) }]) }), `Duplicated the ${KIND[S.k].toLowerCase()}.`)} testId="studio-dup">Duplicate</Button>
              <Button small kind="quiet" onClick={() => { commit((x) => ({ ...x, items: x.items.filter((i) => i.id !== S.id) }), `Removed the ${KIND[S.k].toLowerCase()}.`); setSel(null); }} testId="studio-rm">Remove</Button><Button small kind="quiet" onClick={() => setSel(null)} testId="studio-desel">Done</Button></div>
          </Card> : null}
          <Card title="Size and seats" icon="settings">
            <div className="pa-row-actions">
              {([['w', 'Width (m)', 2, 40], ['l', 'Length (m)', 2, 40], ['h', 'Ceiling (m)', 2.2, 12], ['seats', 'Seats', 1, 400]] as const).map(([k, l, lo, hi]) => (
                <label key={k} className="pa-field">{l}<input className="pa-select" type="number" inputMode="decimal" min={lo} max={hi} step={k === 'seats' ? 1 : 0.1} value={c[k]} onChange={(e) => set({ [k]: clamp(Number(e.target.value), lo, hi) } as Partial<Concept>)} /></label>))}
            </div>
            <h3 className="pa-zone__note">The tray</h3>
            <div className="pa-table-wrap"><table className="pa-table"><tbody>{(Object.keys(KIND) as Kind[]).filter((k) => k !== 'seat').map((k) => <tr key={k}><th scope="row">{KIND[k]}</th><td className="num">{c.items.filter((i) => i.k === k).length}</td><td><div className="pa-row-actions"><Button small onClick={() => add(k)}>Add</Button><Button small kind="quiet" onClick={() => remove(k)} disabled={!c.items.some((i) => i.k === k)}>Remove</Button></div></td></tr>)}</tbody></table></div>
          </Card>
        </div>
      </div>
      <Card title="What the planning rules say" icon="check" sub="Modeled from the concept’s own dimensions; a room is judged for real only by its design and its tests" testId="studio-rules">
        <FactsTable facts={verdict.map((v) => [v.rule, <><Tag tone={v.ok === null ? 'info' : v.ok ? 'ok' : 'warn'}>{v.ok === null ? 'decided at design' : v.ok ? 'meets the rule' : 'does not meet it'}</Tag> {v.why}{v.fix && <> <Button small onClick={() => commit(v.fix!.apply, `${v.fix!.label}: done in the concept.`)} testId="studio-fix">{v.fix.label}</Button></>}</>] as [string, ReactElement])} />
      </Card>
      <Card title="Versions" icon="clock" sub="Saved states of this concept: compare one with now, or go back to it" testId="studio-versions">
        <div className="pa-row-actions"><label className="pa-field">Name<input className="pa-select" type="text" value={vname} maxLength={60} placeholder={`Version ${vs.length + 1}`} onChange={(e) => setVname(e.target.value)} data-testid="studio-vname" /></label>
          <Button onClick={() => { const v: Version = { name: vname.trim() || `Version ${vs.length + 1}`, at: new Date().toISOString(), w: c.w, l: c.l, h: c.h, seats: c.seats, items: c.items }; setC({ ...c, versions: [...vs, v].slice(-12) }); setDirty(true); setVname(''); setSaid(`Kept “${v.name}”.`); }} testId="studio-version">Keep this version</Button></div>
        {vs.length ? <ul className="pa-queue">{vs.map((v, i) => { const d = diffItems(v.items, c.items); return <li key={`${v.at}${i}`} className="pa-row-actions" data-version={i}><span><b>{v.name}</b> <span className="ui-meta">{v.at.slice(0, 16).replace('T', ' ')} · {v.items.length} objects</span></span>
          <Button small kind="quiet" onClick={() => setCmp(cmp === i ? null : i)} testId={`studio-cmpv-${i}`}>Compare</Button><Button small kind="quiet" onClick={() => commit((x) => ({ ...x, w: v.w, l: v.l, h: v.h, seats: v.seats, items: v.items }), `Back to “${v.name}”.`)} testId={`studio-restore-${i}`}>Restore</Button>
          {cmp === i && <span className="ui-meta" data-testid="studio-diff">Since “{v.name}”: {d.moved} moved · {d.added} added · {d.removed} removed{v.seats !== c.seats ? ` · seats ${v.seats} → ${c.seats}` : ''}{v.w !== c.w || v.l !== c.l ? ` · size ${v.w} × ${v.l} → ${c.w} × ${c.l} m` : ''}.</span>}</li>; })}</ul>
          : <p className="ui-meta">No version kept yet. A version is a named copy of the concept at this moment; it is saved with the concept.</p>}
      </Card>
      <Card title="Carry it forward" icon="route" sub="The concept keeps its identity on the way: the same objects, the same counts" testId="studio-handoffs">
        <div className="pa-row-actions"><Button kind="primary" onClick={makeBrief} testId="studio-brief">Make a design brief</Button>
          {from && <><a className="ui-btn ui-btn--quiet" href={`#/request/change-room?room=${encodeURIComponent(from.id)}`}>Request the change</a><a className="ui-btn ui-btn--quiet" href={`#/lite/room/${encodeURIComponent(from.id)}?mode=engineer`}>Same room in Lite</a><a className="ui-btn ui-btn--quiet" href={`#/room/${encodeURIComponent(from.id)}`}>Same room in Pro</a><a className="ui-btn ui-btn--quiet" href={`#/commissioning/room/${encodeURIComponent(from.id)}`}>Commissioning record</a></>}</div>
        {brief && <textarea className="pa-select" readOnly rows={10} value={brief} aria-label="The design brief" data-testid="studio-brief-text" style={{ inlineSize: '100%', fontFamily: 'inherit' }} />}
        <details><summary>Commissioning rehearsal <span className="ui-meta">{rehearsal(c).length} tests this design would need</span></summary>
          <ol data-testid="studio-rehearsal">{rehearsal(c).map((t) => <li key={t}>{t}</li>)}</ol>
          <p className="ui-meta">Expected tests, from the objects in the design. Recorded evidence replaces them at commissioning; a rehearsal proves nothing.</p></details>
      </Card>
    </>
  );
}
