/**
 * Light the Stage: SIGNAL's lighting flagship lab (founder, 12 Nov 2026). Hang fixtures on the trusses, patch them in one DMX universe,
 * aim them, set level and colour, and light a sermon and a worship set for the room and the camera. A teaching model: illuminance from
 * the inverse-square and cosine laws, beam size from the beam angle, colour temperature compared in mireds, addresses from the
 * footprint. Not a measurement and not any maker's fixture. Pure.
 */
export type FxKind = 'profile' | 'fresnel' | 'par' | 'mover' | 'batten';
export interface FixtureType { kind: FxKind; label: string; footprint: number; lumens: number; beam: number; zoom?: [number, number]; color: 'white' | 'rgb' | 'both'; says: string }
export const FIXTURES: Record<FxKind, FixtureType> = {
  profile: { kind: 'profile', label: 'Profile (ellipsoidal)', footprint: 2, lumens: 14000, beam: 26, color: 'white', says: 'A hard-edged, controllable beam: the key light on a face. Two channels: intensity and colour temperature.' },
  fresnel: { kind: 'fresnel', label: 'LED Fresnel', footprint: 3, lumens: 7000, beam: 40, zoom: [15, 60], color: 'white', says: 'A soft-edged beam that zooms: fill light and back light. Intensity, colour temperature, zoom.' },
  par: { kind: 'par', label: 'LED PAR (RGBW)', footprint: 8, lumens: 4000, beam: 25, color: 'rgb', says: 'A colour wash: eight channels (intensity, red, green, blue, white, strobe, mode, speed).' },
  mover: { kind: 'mover', label: 'Moving head spot', footprint: 16, lumens: 12000, beam: 15, zoom: [8, 30], color: 'both', says: 'Pan, tilt, colour, gobo, zoom: sixteen channels in this mode.' },
  batten: { kind: 'batten', label: 'LED batten', footprint: 12, lumens: 5000, beam: 60, color: 'rgb', says: 'A strip of cells for washing a wall or the floor of the stage: twelve channels.' },
};
/** Hanging positions: x across the stage (m, 0 = stage left edge), y forward of the stage front (negative = upstage), z height. */
export interface Position { key: string; label: string; x: number; y: number; z: number }
export const POSITIONS: Position[] = [
  ...[2, 4.5, 7.5, 10].map((x, i) => ({ key: `FOH${i + 1}`, label: `Front truss ${i + 1}`, x, y: 7, z: 7 })),
  ...[1.5, 4, 6, 8, 10.5].map((x, i) => ({ key: `BK${i + 1}`, label: `Back truss ${i + 1}`, x, y: -4.5, z: 6 })),
  ...[1, 11].map((x, i) => ({ key: `SD${i + 1}`, label: `Side boom ${i ? 'right' : 'left'}`, x: x === 1 ? -1 : 13, y: -1, z: 2.5 })),
  { key: 'FL1', label: 'Floor, upstage', x: 6, y: -5.5, z: 0.2 },
];
export interface Subject { key: string; label: string; x: number; y: number; z: number }
export const SUBJECTS: Subject[] = [{ key: 'pastor', label: 'Pastor at the lectern', x: 6, y: 0, z: 1.6 }, { key: 'leader', label: 'Worship leader', x: 4, y: -1.5, z: 1.6 }, { key: 'band', label: 'Band (upstage)', x: 8, y: -3.5, z: 1.4 }];
export const SCREEN = { x0: 3, x1: 9, y: -6, z0: 1.5, z1: 5.5 };
export interface Hung { id: number; kind: FxKind; pos: string; addr: number; target: string; level: number; cct: number; hue: number; zoom: number }
export interface Rig { hung: Hung[] }
export type Look = 'sermon' | 'worship';
export const LOOKS: Array<{ key: Look; label: string; says: string }> = [
  { key: 'sermon', label: 'Sermon', says: 'One face for the room and the camera: a key from the front, a softer fill from the other side, a back light to lift the pastor off the background, and nothing on the screen.' },
  { key: 'worship', label: 'Worship', says: 'A lit leader the camera can see, colour on the band, and still nothing washing the screen.' },
];
const pos = (k: string) => POSITIONS.find((p) => p.key === k)!; const subj = (k: string) => SUBJECTS.find((s) => s.key === k)!;
export const beamOf = (h: Hung) => (FIXTURES[h.kind].zoom ? h.zoom : FIXTURES[h.kind].beam);
/** Candela on axis: the lumens spread over the beam's solid angle, Ω = 2π(1 − cos(θ/2)). */
export const candela = (lumens: number, beamDeg: number) => lumens / (2 * Math.PI * (1 - Math.cos(((beamDeg / 2) * Math.PI) / 180)));
/** Illuminance at the subject from one fixture: E = I cos(α) / d², zero outside the beam (with a soft edge for wide beams). */
export function lux(h: Hung, s: Subject) {
  const p = pos(h.pos); const t = subj(h.target); const d = Math.hypot(p.x - s.x, p.y - s.y, p.z - s.z); const b = beamOf(h);
  const ax = [t.x - p.x, t.y - p.y, t.z - p.z], to = [s.x - p.x, s.y - p.y, s.z - p.z]; const dot = ax[0]! * to[0]! + ax[1]! * to[1]! + ax[2]! * to[2]!;
  const off = (Math.acos(Math.max(-1, Math.min(1, dot / (Math.hypot(...ax) * Math.hypot(...to))))) * 180) / Math.PI; if (off > b / 2) return 0;
  const edge = off > b / 4 ? 1 - (off - b / 4) / (b / 4) * 0.5 : 1; const inc = Math.abs(to[1]!) / d * 0.3 + 0.7;
  return (candela(FIXTURES[h.kind].lumens, b) * (h.level / 100) * edge * inc) / (d * d);
}
export const beamDiameter = (d: number, beamDeg: number) => 2 * d * Math.tan(((beamDeg / 2) * Math.PI) / 180);
export const mired = (k: number) => 1e6 / k;
export const lastAddr = (h: Hung) => h.addr + FIXTURES[h.kind].footprint - 1;
export function collisions(r: Rig) { const out: Array<[number, number]> = [];
  r.hung.forEach((a, i) => r.hung.forEach((b, j) => { if (j > i && a.addr <= lastAddr(b) && b.addr <= lastAddr(a)) out.push([a.id, b.id]); })); return out; }
/** Does a beam land on the projection screen? Its axis is traced to the screen plane, and the beam's radius there is compared. */
export function spill(h: Hung) { const p = pos(h.pos), t = subj(h.target); if (h.level < 5 || p.y <= SCREEN.y) return false;
  const k = (SCREEN.y - p.y) / (t.y - p.y); if (k <= 0) return false; const x = p.x + (t.x - p.x) * k, z = p.z + (t.z - p.z) * k; const r = beamDiameter(Math.hypot(t.x - p.x, t.y - p.y, t.z - p.z) * k, beamOf(h)) / 2;
  return x + r > SCREEN.x0 && x - r < SCREEN.x1 && z + r > SCREEN.z0 && z - r < SCREEN.z1 && (h.kind !== 'batten'); }
const sideOf = (h: Hung) => Math.sign(pos(h.pos).x - subj(h.target).x);
export interface LightAnalysis { at: Record<string, number>; key: Hung | null; fill: number; back: number; ratio: number; cctGap: number; spill: number[]; coll: Array<[number, number]>; over: boolean; colorOnBand: boolean }
export function analyseRig(r: Rig): LightAnalysis {
  const at = Object.fromEntries(SUBJECTS.map((s) => [s.key, Math.round(r.hung.reduce((a, h) => a + lux(h, s), 0))]));
  const P = subj('pastor'); const front = r.hung.filter((h) => h.target === 'pastor' && pos(h.pos).y > 0 && h.level > 0).sort((a, b) => lux(b, P) - lux(a, P));
  const key = front[0] || null; const fill = key ? Math.round(front.filter((h) => h !== key && sideOf(h) !== sideOf(key)).reduce((a, h) => a + lux(h, P), 0)) : 0;
  const back = Math.round(r.hung.filter((h) => h.target === 'pastor' && pos(h.pos).y < 0).reduce((a, h) => a + lux(h, P), 0));
  const whites = front.filter((h) => FIXTURES[h.kind].color !== 'rgb'); const cctGap = whites.length > 1 ? Math.round(Math.max(...whites.map((h) => h.cct)) - Math.min(...whites.map((h) => h.cct))) : 0;
  return { at, key, fill, back, ratio: fill ? Math.round((key ? lux(key, P) : 0) / fill * 10) / 10 : 99, cctGap, spill: r.hung.filter(spill).map((h) => h.id), coll: collisions(r), over: r.hung.some((h) => lastAddr(h) > 512), colorOnBand: r.hung.some((h) => h.target === 'band' && FIXTURES[h.kind].color !== 'white' && h.level > 20) };
}
export interface LGoal { key: string; label: string; ok: boolean; value: string; why: string }
export function lightGoals(r: Rig, a: LightAnalysis, look: Look): LGoal[] {
  const P = a.at['pastor']!; const kl = a.key ? Math.round(lux(a.key, subj('pastor'))) : 0;
  const g: LGoal[] = [
    { key: 'patch', label: 'Patch: no overlaps', ok: !a.coll.length && !a.over && r.hung.length > 0, value: a.coll.length ? a.coll.map(([x, y]) => `#${x} overlaps #${y}`).join(', ') : a.over ? 'past address 512' : 'clean', why: 'Each fixture uses its start address and the next (footprint − 1) channels: the next fixture must start after that, and all within 512.' },
    { key: 'spill', label: 'Nothing on the screen', ok: !a.spill.length, value: a.spill.length ? `#${a.spill.join(', #')} land on it` : 'clear', why: 'Light on a projection or LED screen washes it out for the room and the camera. Aim, zoom or move the fixture.' },
  ];
  if (look === 'sermon') g.push(
    { key: 'key', label: 'Key on the pastor', ok: P >= 800 && P <= 1600, value: `${P} lux (800–1600)`, why: 'Enough light on the face for the camera to expose cleanly without crushing the room’s eyes.' },
    { key: 'ratio', label: 'Key-to-fill ratio', ok: a.ratio >= 1.5 && a.ratio <= 3, value: a.fill ? `${a.ratio}:1 (${kl} key, ${a.fill} fill)` : 'no fill from the other side', why: 'A fill from the other side, softer than the key (1.5:1 to 3:1), keeps the shadows on the face open without flattening it.' },
    { key: 'back', label: 'Back light', ok: a.back >= Math.max(200, P * 0.25), value: `${a.back} lux from behind`, why: 'Light from behind and above draws a rim that lifts the pastor off the background, on camera most of all.' },
    { key: 'cct', label: 'One colour of white', ok: a.cctGap <= 300, value: `${a.cctGap} K apart`, why: 'Two whites more than about 300 K apart look like two colours on camera; match the key and fill.' });
  else g.push(
    { key: 'leader', label: 'Leader lit for camera', ok: a.at['leader']! >= 600, value: `${a.at['leader']} lux (600+)`, why: 'In a worship look the stage gets darker and more colourful, but the camera still needs the face.' },
    { key: 'colour', label: 'Colour on the band', ok: a.colorOnBand, value: a.colorOnBand ? 'a colour wash is on them' : 'only white on the band', why: 'Colour behind and on the band gives the room depth and mood while the faces stay in white.' },
    { key: 'pastorOff', label: 'Lectern dark', ok: P < 300, value: `${P} lux on the lectern`, why: 'Whatever is not part of the moment goes down, so the eye goes where the music is.' });
  return g;
}
export const lightScore = (gs: LGoal[]) => Math.round((100 * gs.filter((g) => g.ok).length) / gs.length);
export function freshRig(): Rig { return { hung: [
  { id: 1, kind: 'profile', pos: 'FOH2', addr: 1, target: 'pastor', level: 80, cct: 3200, hue: 0, zoom: 26 },
  { id: 2, kind: 'par', pos: 'BK3', addr: 2, target: 'band', level: 70, cct: 5600, hue: 220, zoom: 25 },
  { id: 3, kind: 'fresnel', pos: 'FOH4', addr: 9, target: 'pastor', level: 30, cct: 5600, hue: 0, zoom: 40 },
] }; }
