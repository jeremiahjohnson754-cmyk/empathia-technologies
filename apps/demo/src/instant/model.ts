/**
 * Instant Room (founder's directive of 11 Nov 2026, §11): "Open room → Start guided capture → Confirm scope → Take photos → Verify
 * coverage → Extract details → Review findings → Generate spatial model → Attach evidence." This file is the journey's rules, pure:
 * the guided shots, the check of a photograph's sharpness and light, coverage, the measurements, what a person read off a label,
 * the comparison with the room's record, and the plan that is drawn. No storage, no camera, no rendering.
 *
 * What it does NOT do, and the page says so:
 *  - Nothing here looks at what a photograph shows. Sharpness and light are arithmetic on its pixels; a sharp, well-lit photograph
 *    of the wrong wall passes. Coverage is which guided shots have a photograph that passed, not what is in them.
 *  - No label is read by a machine and no equipment is recognised. What a label says, and what kind of equipment it is, is typed
 *    by the person who is looking at it, and is recorded as their statement.
 *  - The plan is a rectangle of the measured width and length. A room that is not a rectangle is drawn wrongly, and the plan says
 *    which of its numbers were measured and which were estimated. It is a working drawing, not a survey.
 *  - Nothing tells anyone to open equipment, get past a lock or go anywhere unsafe. The one shot of the back of a rack is optional
 *    and says when to leave it.
 */
export type Scope = 'room' | 'front' | 'equipment';
export const SCOPES: Readonly<Record<Scope, { title: string; says: string }>> = {
  room: { title: 'The whole room', says: 'Every wall, the ceiling, the table and the equipment. Enough to draw the room and propose a layout.' },
  front: { title: 'The front of the room', says: 'The display wall and the table. Enough to check what people look at and where the camera is.' },
  equipment: { title: 'The equipment only', says: 'Model labels and network labels. Enough to check the equipment against the room’s record.' },
};
export type Wall = 'front' | 'rear' | 'left' | 'right' | 'ceiling';
export const WALL_WORD: Record<Wall, string> = { front: 'front wall', rear: 'rear wall', left: 'left wall', right: 'right wall', ceiling: 'ceiling' };
export interface Shot {
  id: string; title: string; /** what the phone says before the photograph is taken */ say: string; covers: readonly Wall[]; kind: 'wide' | 'detail';
  /** the scopes in which this shot is asked for, and those in which it is required */ scopes: readonly Scope[]; required: readonly Scope[]; /** said with the shot when it could tempt someone into a risk */ safety?: string;
}
/** The guided shots, in the order they are asked for. The founder's own wording is used where he gave it. */
export const SHOTS: readonly Shot[] = [
  { id: 'front', title: 'The front wall', say: 'Stand near the entrance and capture the full front wall.', covers: ['front'], kind: 'wide', scopes: ['room', 'front'], required: ['room', 'front'] },
  { id: 'table', title: 'The table and the display wall', say: 'Capture the conference table and display wall.', covers: ['front'], kind: 'wide', scopes: ['room', 'front'], required: ['front'] },
  { id: 'corner', title: 'From the opposite corner', say: 'Move to the opposite corner. Capture the room looking back towards the entrance.', covers: ['rear'], kind: 'wide', scopes: ['room'], required: ['room'] },
  { id: 'left', title: 'The left wall', say: 'Stand by the right wall and capture the whole left wall.', covers: ['left'], kind: 'wide', scopes: ['room'], required: ['room'] },
  { id: 'right', title: 'The right wall', say: 'Stand by the left wall and capture the whole right wall.', covers: ['right'], kind: 'wide', scopes: ['room'], required: ['room'] },
  { id: 'ceiling', title: 'The ceiling over the table', say: 'Stand at the end of the table and capture the ceiling above it: microphones, loudspeakers, anything hanging.', covers: ['ceiling'], kind: 'wide', scopes: ['room'], required: ['room'] },
  { id: 'camera-label', title: 'The camera’s model label', say: 'Take a close-up of the camera model label.', covers: [], kind: 'detail', scopes: ['room', 'front', 'equipment'], required: ['equipment'], safety: 'Only if you can read it from the floor. Do not climb or move the camera.' },
  { id: 'network-label', title: 'The network label', say: 'Move closer to the network label.', covers: [], kind: 'detail', scopes: ['room', 'equipment'], required: ['equipment'] },
  { id: 'rack-rear', title: 'The back of the equipment rack', say: 'Capture the rear of the equipment rack if safely accessible.', covers: [], kind: 'detail', scopes: ['room', 'equipment'], required: [],
    safety: 'Only if you can see it without opening anything, moving equipment or reaching over cables. If the rack is locked, enclosed or behind a panel, leave this shot out.' },
];
export const shotById = (id: string): Shot | null => SHOTS.find((s) => s.id === id) || null;
export const shotsFor = (scope: Scope): Shot[] => SHOTS.filter((s) => s.scopes.includes(scope));

// ------------------------------------------------------------------------------------------------------------ one photograph
export type Verdict = 'ok' | 'blurry' | 'dark' | 'washed-out' | 'small' | 'upright';
export interface Quality { verdict: Verdict; /** the variance of the picture's edges; higher is sharper */ sharpness: number; /** mean brightness, 0 to 255 */ light: number; say: string }
/** Below this edge variance a photograph, reduced to SAMPLE_WIDTH pixels across, is treated as blurred. A threshold chosen on generated test pictures, not a measurement standard: a plain, evenly lit wall has few edges and can read as blurred, which is why a person may keep a photograph the check did not pass. */
export const SHARP_MIN = 60; export const SAMPLE_WIDTH = 640; export const MIN_SIDE = 640;
const SAY: Record<Verdict, string> = {
  ok: 'This photo is sharp and well lit.', blurry: 'This photo is blurry. Please retake it.', dark: 'This photo is too dark to make out. Turn on the room lights, or move so the windows are behind you, and retake it.',
  'washed-out': 'This photo is washed out. Move so no window or lamp is in the frame, and retake it.', small: 'This photo is too small to show detail. Retake it with the camera, not a thumbnail.',
  upright: 'Turn the phone on its side for this one: a wall needs the wide frame.',
};
/**
 * Judge a photograph from its pixels alone. `luma` is the picture reduced to `w` by `h` brightness values (0 to 255), row by row;
 * `fullW` and `fullH` are the size it was taken at. It says nothing about what the photograph shows.
 */
export function assess(luma: ArrayLike<number>, w: number, h: number, fullW: number, fullH: number, kind: Shot['kind']): Quality {
  const n = w * h; const bad = (verdict: Verdict, sharpness = 0, light = 0): Quality => ({ verdict, sharpness, light, say: SAY[verdict] });
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 8 || h < 8 || luma.length < n) return bad('small');
  let sum = 0; for (let i = 0; i < n; i++) sum += luma[i]!; const light = sum / n;
  let s = 0; let s2 = 0; let k = 0;   // the variance of a 4-neighbour Laplacian: the usual cheap measure of focus
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; const v = 4 * luma[i]! - luma[i - 1]! - luma[i + 1]! - luma[i - w]! - luma[i + w]!; s += v; s2 += v * v; k++; }
  const sharpness = k ? Math.round((s2 / k - (s / k) ** 2) * 10) / 10 : 0; const q = (verdict: Verdict) => bad(verdict, sharpness, Math.round(light));
  if (Math.min(fullW, fullH) < MIN_SIDE) return q('small');
  if (light < 35) return q('dark'); if (light > 235) return q('washed-out');
  if (sharpness < SHARP_MIN) return q('blurry');
  if (kind === 'wide' && fullH > fullW) return q('upright');
  return q('ok');
}

// ------------------------------------------------------------------------------------------------------------ the capture
export type How = 'measured' | 'paced' | 'estimated';
export const HOW_WORD: Record<How, string> = { measured: 'Measured with a tape or a laser measure', paced: 'Paced out', estimated: 'Estimated by eye' };
export interface Dim { m: number; how: How }
export type Place = Wall | 'table' | 'rack';
export const PLACE_WORD: Record<Place, string> = { ...WALL_WORD, table: 'table', rack: 'rack' };
/** Something a person read or saw: the kind of equipment, where it is, and what its label says. Their statement, never a detection. */
export interface Detail { id: string; category: string; place: Place; label: string; /** the guided shot it was read from, when there is one */ shot: string | null }
export interface Photo { shot: string; key: string; at: string; quality: Quality; /** the person kept a photograph the check did not pass */ keptAnyway: boolean }
export interface Capture {
  roomId: string | null; /** the name of a space that has no record yet */ name: string; scope: Scope; photos: Photo[];
  width: Dim | null; length: Dim | null; height: Dim | null; seats: number | null; details: Detail[];
}
export const emptyCapture = (roomId: string | null, name: string): Capture => ({ roomId, name, scope: 'room', photos: [], width: null, length: null, height: null, seats: null, details: [] });

export function readDim(value: string, how: unknown, which: 'width' | 'length' | 'height'): { ok: Dim } | { why: string } {
  const m = Number(String(value).trim().replace(',', '.')); const [lo, hi] = which === 'height' ? [2, 15] : [1.5, 80];
  if (!String(value).trim() || !Number.isFinite(m)) return { why: `Give the ${which} in metres, as a number.` };
  if (m < lo || m > hi) return { why: `A ${which} of ${m} m is outside what a room can be (${lo} to ${hi} m). Check the unit: metres, not feet or centimetres.` };
  if (how !== 'measured' && how !== 'paced' && how !== 'estimated') return { why: `Say how the ${which} was found: measured, paced or estimated.` };
  return { ok: { m: Math.round(m * 100) / 100, how } };
}

export interface Coverage { shots: Array<{ shot: Shot; required: boolean; photo: Photo | null; passes: boolean }>; missing: Shot[]; walls: Array<{ wall: Wall; seen: boolean }>; complete: boolean; say: string[] }
/** Which guided shots have a photograph that passed (or was knowingly kept), and what is still to take. */
export function coverage(c: Capture): Coverage {
  const latest = (id: string) => [...c.photos].reverse().find((p) => p.shot === id) || null;
  const shots = shotsFor(c.scope).map((shot) => { const photo = latest(shot.id); return { shot, required: shot.required.includes(c.scope), photo, passes: !!photo && (photo.quality.verdict === 'ok' || photo.keptAnyway) }; });
  const missing = shots.filter((s) => s.required && !s.passes).map((s) => s.shot);
  const need = [...new Set(shots.filter((s) => s.required).flatMap((s) => s.shot.covers))]; const have = new Set(shots.filter((s) => s.passes).flatMap((s) => s.shot.covers));
  const walls = need.map((wall) => ({ wall, seen: have.has(wall) }));
  const say = [...walls.filter((x) => !x.seen).map((x) => `The ${WALL_WORD[x.wall]} is not clearly visible yet.`), ...shots.filter((s) => s.photo && !s.passes).map((s) => `${s.shot.title}: ${s.photo!.quality.say}`),
    ...missing.filter((s) => !s.covers.length && !latest(s.id)).map((s) => `Still to take: ${s.title.charAt(0).toLowerCase()}${s.title.slice(1)}.`)];
  return { shots, missing, walls, complete: missing.length === 0, say };
}

// ------------------------------------------------------------------------------------------------------------ against the record
export interface RecordOf { name: string; dims: readonly [number, number, number] | null; seats: number | null; /** kinds of equipment the record lists, with how many */ equipment: Readonly<Record<string, number>> }
export interface Finding { kind: 'dimension' | 'seats' | 'not-in-record' | 'not-seen' | 'no-record'; text: string }
const pct = (a: number, b: number) => Math.abs(a - b) / Math.max(a, b);
const count = (n: number, word: string) => (n === 1 ? `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}` : `${n} ${word}s`);
/**
 * Where what was captured differs from the room's record. Every line is something for a person to look at: nothing here changes
 * the record, and a difference is not a verdict on which of the two is right.
 */
export function findings(c: Capture, record: RecordOf | null, categoryWord: (cat: string) => string): Finding[] {
  if (!record) return [{ kind: 'no-record', text: 'This space has no record to compare with. What you captured would be its first.' }];
  const out: Finding[] = [];
  if (record.dims && c.width && c.length) { const [a, b] = [...record.dims.slice(0, 2)].sort((x, y) => x - y) as [number, number]; const [w, l] = [c.width.m, c.length.m].sort((x, y) => x - y) as [number, number];
    if (pct(a, w) > 0.1 || pct(b, l) > 0.1) out.push({ kind: 'dimension', text: `You recorded ${w} m by ${l} m; the record says ${a} m by ${b} m. One of them needs checking${c.width.how !== 'measured' || c.length.how !== 'measured' ? ', and yours was not measured' : ''}.` }); }
  if (record.dims && c.height && pct(record.dims[2], c.height.m) > 0.1) out.push({ kind: 'dimension', text: `You recorded a height of ${c.height.m} m; the record says ${record.dims[2]} m.` });
  if (record.seats && c.seats && record.seats !== c.seats) out.push({ kind: 'seats', text: `You counted ${c.seats} seats; the record says ${record.seats}.` });
  const seen = new Map<string, number>(); for (const d of c.details) seen.set(d.category, (seen.get(d.category) || 0) + 1);
  for (const [cat, n] of seen) if (!record.equipment[cat]) out.push({ kind: 'not-in-record', text: `You recorded ${count(n, categoryWord(cat))}; the record lists none.` });
  if (c.scope !== 'front') for (const [cat, n] of Object.entries(record.equipment)) if (n > 0 && !seen.has(cat)) out.push({ kind: 'not-seen', text: `The record lists ${count(n, categoryWord(cat))}; you recorded none. It may simply not have been in a photograph.` });
  return out;
}

// ------------------------------------------------------------------------------------------------------------ the plan
export interface Marker { id: string; category: string; label: string; place: Place; /** metres from the left wall and from the front wall */ x: number; y: number }
export interface Plan { width: number; length: number; height: number | null; markers: Marker[]; assumptions: string[]; /** enough was captured to draw it */ basis: 'MEASURED' | 'PART-ESTIMATED' }
export type PlanResult = { ok: Plan } | { why: string[] };
/**
 * The plan that can be drawn from a capture: a rectangle, with what the person recorded placed on the wall they said. Things on the
 * same wall are spread evenly along it, because nobody measured where along the wall they are; every such guess is an assumption
 * the plan lists.
 */
export function planOf(c: Capture): PlanResult {
  const why: string[] = []; const cov = coverage(c);
  if (c.scope === 'equipment') return { why: ['A plan needs the room, not only its equipment. Capture the whole room or the front of it.'] };
  if (!c.width) why.push('Confirm the room width using an actual measurement.'); if (!c.length) why.push('Give the room’s length, from the front wall to the rear wall.');
  if (!cov.complete) why.push(...cov.say.slice(0, 4));
  if (why.length || !c.width || !c.length) return { why };
  const W = c.width.m; const L = c.length.m; const assumptions: string[] = ['The room is drawn as a rectangle. If it is not one, the plan is wrong where the walls are not square.'];
  for (const [name, d] of [['width', c.width], ['length', c.length], ['height', c.height]] as const) if (d && d.how !== 'measured') assumptions.push(`The ${name} (${d.m} m) was ${d.how === 'paced' ? 'paced out' : 'estimated by eye'}, not measured.`);
  if (!c.height) assumptions.push('No height was recorded, so nothing here depends on it.');
  if (c.photos.some((p) => p.keptAnyway)) assumptions.push('At least one photograph was kept although the sharpness and light check did not pass it.');
  const by = new Map<Place, Detail[]>(); for (const d of c.details) by.set(d.place, [...(by.get(d.place) || []), d]);
  const markers: Marker[] = []; const r2 = (n: number) => Math.round(n * 100) / 100;
  for (const [place, list] of by) list.forEach((d, i) => { const t = (i + 1) / (list.length + 1);
    const [x, y] = place === 'front' ? [W * t, 0] : place === 'rear' ? [W * t, L] : place === 'left' ? [0, L * t] : place === 'right' ? [W, L * t] : place === 'rack' ? [W - 0.4, L - 0.4 - i * 0.3] : [W / 2 + (t - 0.5) * Math.min(W, 2), L / 2];
    markers.push({ id: d.id, category: d.category, label: d.label, place, x: r2(Math.max(0, Math.min(W, x))), y: r2(Math.max(0, Math.min(L, y))) }); });
  if (markers.length) assumptions.push('Equipment is drawn on the wall you said, spread evenly along it. Nobody measured where along the wall it is.');
  if (by.has('rack')) assumptions.push('The rack is drawn in the rear right corner as a placeholder; say where it really is before anyone relies on the plan.');
  return { ok: { width: W, length: L, height: c.height?.m ?? null, markers, assumptions, basis: c.width.how === 'measured' && c.length.how === 'measured' ? 'MEASURED' : 'PART-ESTIMATED' } };
}
/** What the layout study needs from a capture, or why it cannot be run. Seats are the person's count; nothing is inferred from the photographs. What had to be assumed is listed. */
export function studyInput(c: Capture): { ok: { id: string; dims: [number, number, number]; capacity: number; type: string; stepFree: boolean }; assumed: string[] } | { why: string } {
  if (!c.width || !c.length) return { why: 'A layout needs the room’s width and length.' };
  if (!c.seats || !Number.isInteger(c.seats) || c.seats < 6 || c.seats > 400) return { why: 'Say how many people the room should seat (6 to 400). The layout study does not cover smaller rooms.' };
  const assumed = [...(c.height ? [] : ['No height was recorded: the study assumes a 3 m ceiling.']), 'Step-free access is assumed. Say if the room has steps.', 'The room is studied as a meeting room with seats at tables.'];
  return { ok: { id: c.roomId || 'instant', dims: [c.width.m, c.length.m, c.height?.m ?? 3], capacity: c.seats, type: 'meeting-room', stepFree: true }, assumed };
}
