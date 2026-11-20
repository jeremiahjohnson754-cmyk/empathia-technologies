/**
 * Scouter (part of Lite, D41): "does this device suit this room, before anyone buys it?" — evaluated ONLY from this build's own data
 * (packages/domain-data, extracted unchanged from the demonstrator): the nine audio-visual device classes of the catalogue
 * (V25_ROOM_CATS: display, LED wall, projector, camera, video bar, ceiling, table and wireless microphones, loudspeaker) against a room
 * template's recorded dimensions, seats and devices (V25_ROOM_TEMPLATES) and its archetype's required systems (V25_ROOM_REQUIRED).
 * Each candidate is checked against the room's requirement, not against the others (V2.5.3); every check names its source and says
 * whether it is PUBLISHED (read from the catalogue or the template) or MODELED (computed here from them). No brand, model, price, lead time
 * or market fact is invented: what V2.5.3 Scouter had that this build cannot back is listed as not rebuilt (NOT_REBUILT).
 */

export type Basis = 'PUBLISHED' | 'MODELED';
export type Verdict = 'SUITS' | 'SUITS_WITH_CONDITION' | 'DOES_NOT_SUIT' | 'NOT_REQUIRED';
export const VERDICT: Readonly<Record<Verdict, { label: string; tone: 'ok' | 'warn' | 'bad' | 'muted' }>> = {
  SUITS: { label: 'Suits this room', tone: 'ok' },
  SUITS_WITH_CONDITION: { label: 'Suits, with a condition', tone: 'warn' },
  DOES_NOT_SUIT: { label: 'Does not suit', tone: 'bad' },
  NOT_REQUIRED: { label: 'Not required here', tone: 'muted' },
};
export interface Cat { label: string; group: string; cat: string; net: boolean; poe: number; props: Record<string, number | string> }
export interface Template { label: string; arch: string | null; use: string; dims: [number, number, number]; occ: number; items: [string, number, number, number][] }
export interface Check { id: string; label: string; pass: boolean; basis: Basis; source: string; detail: string }
export interface Evaluation { key: string; label: string; group: string; verdict: Verdict; checks: Check[]; condition: string | null }

/** The nine device classes Scouter evaluates (the catalogue's display, video, audio-capture and playback classes). */
export const CANDIDATES = ['display', 'ledwall', 'projector', 'camera', 'bar', 'micceil', 'mictable', 'micwireless', 'speaker'] as const;
/** The room templates that are meeting or presentation rooms (the others hold no audio-visual requirement to evaluate). */
export const ROOM_KEYS = ['huddle', 'small_conf', 'medium_conf', 'boardroom', 'executive', 'training', 'collab', 'private_office', 'studio', 'townhall'] as const;
/** What the requirement table calls each class (V25_ROOM_REQUIRED speaks of "mic", not of the three microphone classes). */
const REQ_KEY: Record<string, string> = { display: 'display', ledwall: 'display', projector: 'display', camera: 'camera', bar: 'camera', micceil: 'mic', mictable: 'mic', micwireless: 'mic', speaker: 'speaker' };
const SRC = { cats: 'V25_ROOM_CATS', tpl: 'V25_ROOM_TEMPLATES', req: 'V25_ROOM_REQUIRED' } as const;

/** What V2.5.3 Scouter had that this build's data cannot back, with the parity rows that track it. */
export const NOT_REBUILT: readonly { what: string; rows: string }[] = [
  { what: 'Named makes and models, prices, lead times and five-year cost', rows: 'LP-031, LP-091 · CR-16' },
  { what: 'The nine Scouter lifecycle states (Watch … Blocked) and market watch', rows: 'LP-072, LP-119' },
  { what: 'Architectural competition and operational evidence from the estate', rows: 'LP-179 · CR-16' },
];

/** Evaluate every candidate class for one room template. Pure and deterministic. */
export function evaluate(roomKey: string, tpl: Template, cats: Readonly<Record<string, Cat>>, required: Readonly<Record<string, readonly string[]>>): Evaluation[] {
  const [L, W] = tpl.dims; const area = L * W; const far = L;
  const req = new Set(tpl.arch ? required[tpl.arch] || [] : []);
  const sw = cats['switch']; const poeBudget = Number(sw?.props['poe_budget_w'] ?? 0);
  const roomPoe = tpl.items.reduce((s, [k]) => s + (cats[k]?.poe || 0), 0);
  return CANDIDATES.filter((k) => cats[k]).map((key) => {
    const c = cats[key]!; const checks: Check[] = []; let condition: string | null = null;
    const isReq = req.has(REQ_KEY[key]!);
    checks.push({ id: 'required', label: 'Required for this kind of room', pass: isReq, basis: 'PUBLISHED', source: SRC.req, detail: tpl.arch ? `${tpl.arch} requires ${[...req].join(', ') || 'nothing'}.` : 'This template has no archetype, so nothing is required.' });
    const p = c.props;
    if (key === 'display' || key === 'projector') {
      const diag = key === 'display' ? Number(p['diagonal_in']) : null;
      if (diag) {
        const h = diag * 0.0254 * 9 / Math.hypot(16, 9); const ratio = far / h;
        checks.push({ id: 'spatial', label: 'Readable from the farthest seat', pass: ratio <= 8, basis: 'MODELED', source: `${SRC.cats} (diagonal) · ${SRC.tpl} (length)`, detail: `A ${diag} in image is ${h.toFixed(2)} m high; the farthest seat, ${far} m away, is ${ratio.toFixed(1)} image heights (≤ 6 for detail, ≤ 8 for general viewing).` });
        if (ratio > 6 && ratio <= 8) condition = 'Fine for general viewing; detailed content needs a second display or a larger image.';
      } else checks.push({ id: 'spatial', label: 'Readable from the farthest seat', pass: true, basis: 'PUBLISHED', source: SRC.cats, detail: `${p['lumens']} lumens; image size is set at design time, so readability is decided by the design.` });
    }
    if (key === 'ledwall') {
      const wm = Number(p['width_m']); checks.push({ id: 'spatial', label: 'Fits the front wall', pass: wm <= W, basis: 'MODELED', source: `${SRC.cats} (width) · ${SRC.tpl} (width)`, detail: `${wm} m wide against a ${W} m wall.` });
    }
    if (key === 'camera' || key === 'bar') {
      const fov = Number(p['fov_deg']); const width = 2 * far * Math.tan((fov / 2) * Math.PI / 180);
      checks.push({ id: 'spatial', label: 'Frames the whole room', pass: width >= W, basis: 'MODELED', source: `${SRC.cats} (field of view) · ${SRC.tpl} (dimensions)`, detail: `A ${fov}° view is ${width.toFixed(1)} m wide at the far wall; the room is ${W} m wide.` });
      if (key === 'bar') {
        const pick = Number(p['pickup_m']); checks.push({ id: 'pickup', label: 'Hears the farthest seat', pass: pick >= far, basis: 'MODELED', source: `${SRC.cats} (pickup) · ${SRC.tpl} (length)`, detail: `Pickup ${pick} m; the farthest seat is ${far} m away.` });
      }
    }
    if (key === 'micceil' || key === 'mictable') {
      const r = Number(p['pickup_m']); const units = Math.max(1, Math.ceil(area / (Math.PI * r * r)));
      const max = key === 'micceil' ? 4 : Math.max(2, Math.ceil(tpl.occ / 2));
      checks.push({ id: 'pickup', label: 'Covers the seating area', pass: units <= max, basis: 'MODELED', source: `${SRC.cats} (pickup radius) · ${SRC.tpl} (dimensions)`, detail: `A ${r} m pickup radius covers ${(Math.PI * r * r).toFixed(0)} m²; the room is ${area.toFixed(0)} m², so ${units} unit${units === 1 ? '' : 's'}.` });
      if (units > 1 && units <= max) condition = `Needs ${units} units to cover the room.`;
    }
    if (key === 'micwireless') {
      const ch = Number(p['channels']); checks.push({ id: 'pickup', label: 'Enough channels for the presenters', pass: true, basis: 'PUBLISHED', source: SRC.cats, detail: `${ch} channels; the number of presenters is not recorded for this room, so it is a design question.` });
      if (!tpl.items.some(([k]) => k === 'lectern')) condition = 'This room has no presenter position recorded; useful only if it gains one.';
    }
    if (key === 'speaker') {
      const cov = Number(p['coverage_m']); const units = Math.max(1, Math.ceil(L / (cov * 2)) * Math.max(1, Math.ceil(W / (cov * 2))));
      checks.push({ id: 'coverage', label: 'Covers the listening area', pass: units <= 8, basis: 'MODELED', source: `${SRC.cats} (coverage) · ${SRC.tpl} (dimensions)`, detail: `${cov} m coverage each: ${units} needed for ${L} × ${W} m.` });
      if (units > 1 && units <= 8) condition = `Needs ${units} loudspeakers.`;
    }
    if (c.net) {
      const after = roomPoe + c.poe;
      checks.push({ id: 'network', label: c.poe ? 'Power over the network cable fits the switch' : 'Has a network port to use', pass: !c.poe || after <= poeBudget, basis: c.poe ? 'MODELED' : 'PUBLISHED', source: c.poe ? `${SRC.cats} (PoE draw, switch budget) · ${SRC.tpl} (devices)` : SRC.cats, detail: c.poe ? `Draws ${c.poe} W; the room's devices already draw ${roomPoe.toFixed(1)} W of the switch's ${poeBudget} W.` : 'Needs one port on the room network; mains powered.' });
    }
    const physical = checks.filter((x) => x.id !== 'required');
    const verdict: Verdict = !isReq ? 'NOT_REQUIRED' : physical.every((x) => x.pass) ? (condition ? 'SUITS_WITH_CONDITION' : 'SUITS') : 'DOES_NOT_SUIT';
    return { key, label: c.label, group: c.group, verdict, checks, condition: verdict === 'SUITS_WITH_CONDITION' ? condition : null };
  });
}
const ORDER: Verdict[] = ['SUITS', 'SUITS_WITH_CONDITION', 'DOES_NOT_SUIT', 'NOT_REQUIRED'];
export const ranked = (e: Evaluation[]) => [...e].sort((a, b) => ORDER.indexOf(a.verdict) - ORDER.indexOf(b.verdict) || CANDIDATES.indexOf(a.key as typeof CANDIDATES[number]) - CANDIDATES.indexOf(b.key as typeof CANDIDATES[number]));
