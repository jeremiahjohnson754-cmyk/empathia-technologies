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
interface Item { k: Kind; x: number; y: number }
interface Concept { v: 1; id: string; name: string; from: string; w: number; l: number; h: number; seats: number; items: Item[] }
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

/** The planning rules (campus standards ST-VID-02, ST-AUD-01, ST-VID-01), applied to the concept's own dimensions: modeled. */
export function judge(c: Concept): Array<{ rule: string; ok: boolean | null; why: string }> {
  const disp = c.items.filter((i) => i.k === 'display'); const far = Math.hypot(c.w / 2, c.l - 0.15);
  const needH = far / 6; const area = c.w * c.l; const mics = c.items.filter((i) => i.k === 'micceil').length; const cams = c.items.filter((i) => i.k === 'camera').length; const seatArea = area / Math.max(1, c.seats);
  return [
    { rule: 'Display size for the farthest viewer (ST-VID-02)', ok: disp.length ? null : false, why: disp.length ? `The farthest seat is about ${far.toFixed(1)} m from the wall: an image at least ${needH.toFixed(2)} m tall is needed for detailed content. The display size is chosen at design; the studio does not invent one.` : 'No display is placed.' },
    { rule: 'Microphone coverage (ST-AUD-01, planning rule)', ok: mics * 30 >= area || (area <= 25 && cams > 0), why: `${mics} ceiling microphone${mics === 1 ? '' : 's'} for ${area.toFixed(0)} m²: the planning rule allows about 30 m² per array${area <= 25 ? '; a small room may rely on a video bar' : ''}.` },
    { rule: 'Camera coverage of every seat (ST-VID-01)', ok: cams > 0 ? (c.seats <= 12 * cams) : false, why: cams ? `${cams} camera${cams === 1 ? '' : 's'} for ${c.seats} seats: about twelve seats per camera preset set.` : 'No camera is placed.' },
    { rule: 'Space per seat', ok: seatArea >= 1.8, why: `${seatArea.toFixed(1)} m² per seat; under 1.8 m² is cramped for a meeting room.` },
  ];
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

function Editor({ initial }: { initial: Concept }) {
  const [c, setC] = useState<Concept>(initial); const [said, setSaid] = useState(''); const [dirty, setDirty] = useState(false);
  const set = (patch: Partial<Concept>) => { setC((x) => ({ ...x, ...patch })); setDirty(true); };
  const verdict = useMemo(() => judge(c), [c]);
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); }; addEventListener('beforeunload', h); return () => removeEventListener('beforeunload', h); }, [dirty]);
  const add = (k: Kind) => set({ items: [...c.items, { k, x: c.w / 2, y: c.l / 2 }] });
  const remove = (k: Kind) => { const i = c.items.map((x) => x.k).lastIndexOf(k); if (i >= 0) set({ items: c.items.filter((_, j) => j !== i) }); };
  const save = () => { const list = loadSaved().filter((x) => x.id !== c.id); const id = c.id.startsWith('S-') ? c.id : `S-${Date.now().toString(36)}`; const ok = store([{ ...c, id }, ...list]); setC({ ...c, id }); setDirty(!ok); setSaid(ok ? 'Saved in this browser.' : 'This browser would not keep it (storage is blocked); export it instead.'); };
  const exportJson = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `${c.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); setSaid('Exported as JSON.'); };
  const from = roomById(c.from);
  const sc = 300 / Math.max(c.w, c.l);
  return (
    <>
      <Crumbs items={[['Design a Space', '#/studio/new'], [c.name]]} />
      <PageHero compact eyebrow={from ? `Concept on ${fullName(from)}` : 'Concept from a template'} title={c.name} product="lite" icon="map" lede={`${c.w} × ${c.l} × ${c.h} m · ${c.seats} seats · ${c.items.length} objects`}
        meta={honest(['Saved in this browser only', 'accent'], [dirty ? 'Unsaved changes' : 'Saved', dirty ? 'warn' : 'ok'], ['The plan is an illustration', 'muted'])}
        actions={<><Button kind="primary" onClick={save} testId="studio-save">Save concept</Button><Button onClick={exportJson}>Export JSON</Button><a className="ui-btn ui-btn--quiet" href="#/studio/new">New concept</a></>} />
      <p className="pa-note" aria-live="polite">{said}</p>
      <div className="pa-split">
        <Card title="Plan" icon="map" sub="Top-down, to scale; the front wall is at the top">
          <svg className="pa-map" viewBox={`-10 -10 ${c.w * sc + 20} ${c.l * sc + 20}`} role="img" aria-label={`Plan of ${c.name}: ${c.w} by ${c.l} metres with ${c.items.map((i) => KIND[i.k].toLowerCase()).join(', ') || 'no objects'}`}>
            <rect className="n" x="0" y="0" width={c.w * sc} height={c.l * sc} rx="4" />
            {c.items.map((i, n) => { const x = clamp(i.x, 0, c.w) * sc, y = clamp(i.y, 0, c.l) * sc; return i.k === 'table' ? <rect key={n} className="n n--ok" x={x - c.w * sc * 0.25} y={y - c.l * sc * 0.15} width={c.w * sc * 0.5} height={c.l * sc * 0.3} rx="8" /> : <g key={n}><circle className={`n ${i.k === 'display' ? 'n--warm' : i.k === 'camera' ? 'n--hot' : 'n--ok'}`} cx={x} cy={y} r="9" /><text x={x} y={y + 4} textAnchor="middle" className="s">{KIND[i.k][0]}</text></g>; })}
          </svg>
        </Card>
        <Card title="Size and seats" icon="settings">
          <div className="pa-row-actions">
            {([['w', 'Width (m)', 2, 40], ['l', 'Length (m)', 2, 40], ['h', 'Ceiling (m)', 2.2, 12], ['seats', 'Seats', 1, 400]] as const).map(([k, l, lo, hi]) => (
              <label key={k} className="pa-field">{l}<input className="pa-select" type="number" inputMode="decimal" min={lo} max={hi} step={k === 'seats' ? 1 : 0.1} value={c[k]} onChange={(e) => set({ [k]: clamp(Number(e.target.value), lo, hi) } as Partial<Concept>)} /></label>))}
          </div>
          <h3 className="pa-zone__note">The tray</h3>
          <div className="pa-table-wrap"><table className="pa-table"><tbody>{(Object.keys(KIND) as Kind[]).filter((k) => k !== 'seat').map((k) => <tr key={k}><th scope="row">{KIND[k]}</th><td className="num">{c.items.filter((i) => i.k === k).length}</td><td><div className="pa-row-actions"><Button small onClick={() => add(k)}>Add</Button><Button small kind="quiet" onClick={() => remove(k)} disabled={!c.items.some((i) => i.k === k)}>Remove</Button></div></td></tr>)}</tbody></table></div>
        </Card>
      </div>
      <Card title="What the planning rules say" icon="check" sub="Modeled from the concept’s own dimensions; a room is judged for real only by its design and its tests">
        <FactsTable facts={verdict.map((v) => [v.rule, <><Tag tone={v.ok === null ? 'info' : v.ok ? 'ok' : 'warn'}>{v.ok === null ? 'decided at design' : v.ok ? 'meets the rule' : 'does not meet it'}</Tag> {v.why}</>] as [string, ReactElement])} />
      </Card>
    </>
  );
}
