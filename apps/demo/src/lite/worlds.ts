/**
 * The other three worlds made spatial in Lite (13 Nov 2026, founder: every room "connected to … the other 3 experiences"): Kestrel Valley
 * University, Harborlight Stadium and the convention centre, from their estate records (apps/demo/src/estate). World → building or venue
 * → level → room, as on the Enterprise campus. A room whose type V2.5.3 had a layout for is drawn by V2.5.3's own room code from the
 * estate's record (size, seats, equipment classes); every other room (restrooms, plant, storage, kitchens…) is shown as a room on its
 * floor, not furnished with invented things. Floors are laid out by a stated rule, not surveyed.
 */
import { ESTATES, indexOf, type EstateNode, type Index } from '../estate/index.js';
import type { WorldKey } from '../estate/model.js';
import { registerRooms, type ExtRoom } from './v253/v253room.js';
import { fixtureRuleOf } from './fixtures.js';
import { hasProgram, REDESIGN_TYPES } from './rooms/programs.js';

export const LITE_WORLDS = ['university', 'stadium', 'convention'] as const;
export type LiteWorld = (typeof LITE_WORLDS)[number];
export const isLiteWorld = (w: string): w is LiteWorld => (LITE_WORLDS as readonly string[]).includes(w);
export const WORLD_NAME: Record<LiteWorld, string> = { university: 'Kestrel Valley University', stadium: 'Harborlight Stadium', convention: 'The convention centre' };

/** the estate's room types, by the V2.5.3 room type whose layout fits them; a type not listed is not furnished */
const TYPE_ARCH: Record<string, string> = {
  classroom: 'TRN', 'training-room': 'TRN', 'lecture-theatre': 'DIV', auditorium: 'DIV', performance: 'DIV', 'keynote-hall': 'DIV', ballroom: 'DIV', 'press-conference': 'DIV',
  laboratory: 'LAB', 'maker-space': 'LAB', 'computer-lab': 'LAB', workshop: 'LAB',
  'study-room': 'COL', 'team-meeting': 'COL', 'meeting-room': 'COL', 'breakout-room': 'COL', 'exhibitor-meeting': 'COL', 'coaches-room': 'COL', 'media-workroom': 'COL',
  office: 'HUD', administration: 'HUD', 'staff-room': 'HUD', 'speaker-prep': 'HUD', 'green-room': 'HUD', 'quiet-room': 'FOC', 'press-box': 'FOC', 'commentary-booth': 'FOC',
  studio: 'STU', 'media-room': 'STU', 'interview-studio': 'STU', streaming: 'STU',
  'operations-centre': 'OPS', 'broadcast-control': 'OPS', 'production-gallery': 'OPS', 'production-control': 'OPS', replay: 'OPS', 'audio-control': 'OPS', 'display-control': 'OPS', graphics: 'OPS', 'mix-position': 'OPS', security: 'OPS',
  suite: 'EXE', 'executive-suite': 'EXE', 'vip-lounge': 'EXE', club: 'EXE',
};
/** the estate's equipment kinds, by the device category V2.5.3 draws */
const KIND_CAT: Record<string, string> = { display: 'display', signage: 'display', led: 'ledwall', camera: 'camera', microphone: 'micceil', loudspeaker: 'speaker', processor: 'dsp', control: 'touch', compute: 'compute', projector: 'projector', network: 'switch', router: 'switch', capture: 'encoder' };
const CAP: Record<string, number> = { display: 4, ledwall: 1, camera: 3, micceil: 4, speaker: 6, dsp: 1, touch: 1, compute: 1, projector: 2, switch: 1, encoder: 1 };

const IDX = new Map<LiteWorld, Index>();
export function worldIndex(w: LiteWorld): Index { let i = IDX.get(w); if (!i) { i = indexOf(ESTATES[w as WorldKey]!); IDX.set(w, i); registerWorldRooms(w, i); } return i; }
/** the V2.5.3 room type that draws a room, if one does: not for a type Empathia has its own program for (./rooms/programs.ts), nor for one
 *  whose nearest V2.5.3 type was wrong for it and is being redesigned (13 Nov 2026, founder on a suite drawn as a boardroom) */
export const archOf = (n: EstateNode) => (n.kind === 'room' && !hasProgram(n.type) && !REDESIGN_TYPES.has(n.type) ? TYPE_ARCH[n.type] ?? null : null);
/** how a room of the other worlds is furnished: Empathia's program, V2.5.3's layout for its type, Empathia's fixture rule, or not yet */
export function furnishOf(n: EstateNode): 'designed' | 'v253' | 'fixtures' | 'redesign' | 'none' {
  if (hasProgram(n.type) && n.dims) return 'designed'; if (REDESIGN_TYPES.has(n.type)) return 'redesign'; if (archOf(n) && n.dims) return 'v253'; return fixtureRuleOf(n.type) && n.dims ? 'fixtures' : 'none';
}
function registerWorldRooms(w: LiteWorld, ix: Index) {
  const out: ExtRoom[] = [];
  for (const n of ix.estate.nodes) {
    const a = archOf(n); if (!a || !n.dims) continue;
    const by = new Map<string, { label: string; n: number }>();
    for (const as of ix.assetsOf.get(n.id) || []) { const cat = KIND_CAT[as.kind]; if (!cat) continue; const c = by.get(cat) || { label: as.label, n: 0 }; c.n = Math.min(CAP[cat] ?? 2, c.n + as.qty); by.set(cat, c); }
    // the estate gives length × width × height; V2.5.3 draws width across and depth from the front wall
    const [L, W, H] = n.dims; const wide = Math.max(L, W), deep = Math.min(L, W);
    out.push({ id: n.id, name: n.name, short: n.name, archetype: a, capacity: n.capacity || 8, dims: [wide, deep, H], devices: [...by].map(([cat, v]) => ({ cat, label: v.label, n: v.n })) });
  }
  registerRooms(out);
}
export const kids = (ix: Index, id: string) => ix.children.get(id) || [];
/** the places a world opens on: University's buildings; the stadium's and convention centre's levels (their districts are zones, not buildings) */
export function topOf(w: LiteWorld): EstateNode[] {
  const ix = worldIndex(w); const n = ix.estate.nodes;
  return w === 'university' ? n.filter((x) => x.kind === 'building') : n.filter((x) => x.kind === 'level');
}
/** every room under a node, at any depth */
export function roomsUnder(ix: Index, id: string): EstateNode[] { const out: EstateNode[] = []; const walk = (k: string) => { for (const c of kids(ix, k)) { if (c.kind === 'room') out.push(c); walk(c.id); } }; walk(id); return out; }
/** the levels of a building (University) or the level itself (stadium, convention) */
export const levelsOf = (ix: Index, n: EstateNode) => (n.kind === 'level' ? [n] : kids(ix, n.id).filter((x) => x.kind === 'level'));

export interface WPlanItem { id: string; w: number; d: number; x: number; y: number; label: string; furnished: boolean; node: EstateNode }
export interface WPlan { W: number; D: number; items: WPlanItem[]; corridors: Array<{ x: number; y: number; w: number; d: number }> }
const PLANS = new Map<string, WPlan>();
/** A level's rooms laid out along corridors: rooms in name order, alternately on the north and south side of a corridor, a new corridor
 *  once a row is as long as the floor allows. Each room keeps its recorded size (the longer side along the corridor). Illustrative. */
export function levelPlan(w: LiteWorld, levelId: string): WPlan {
  const hit = PLANS.get(levelId); if (hit) return hit;
  const ix = worldIndex(w); const rooms = roomsUnder(ix, levelId).filter((r) => r.dims).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
  const sz = rooms.map((r) => { const [L, Wd] = r.dims!; return { r, w: Math.max(L, Wd), d: Math.min(L, Wd) }; });
  const area = sz.reduce((s, x) => s + x.w * x.d, 0); const maxRow = Math.max(40, Math.min(220, Math.sqrt(area) * 1.6));
  const items: WPlanItem[] = []; const corridors: WPlan['corridors'] = []; const COR = 3; let y0 = 0; let i = 0; let Wmax = 0;
  while (i < sz.length) {
    const rows: Array<typeof sz> = [[], []];
    for (const side of [0, 1]) { let len = 0; while (i < sz.length && (len + sz[i]!.w <= maxRow || !rows[side]!.length)) { rows[side]!.push(sz[i]!); len += sz[i]!.w + 0.4; i += 1; } }
    const dN = Math.max(4, ...rows[0]!.map((x) => x.d)), dS = Math.max(4, ...rows[1]!.map((x) => x.d)); const cy = y0 + dN + 0.2;
    let x = 0; for (const s of rows[0]!) { items.push({ id: s.r.id, w: s.w, d: s.d, x, y: cy - s.d, label: s.r.name, furnished: ['designed', 'v253', 'fixtures'].includes(furnishOf(s.r)), node: s.r }); x += s.w + 0.4; } const endN = x;
    x = 0; for (const s of rows[1]!) { items.push({ id: s.r.id, w: s.w, d: s.d, x, y: cy + COR, label: s.r.name, furnished: ['designed', 'v253', 'fixtures'].includes(furnishOf(s.r)), node: s.r }); x += s.w + 0.4; }
    const rowW = Math.max(endN, x); Wmax = Math.max(Wmax, rowW); corridors.push({ x: 0, y: cy, w: rowW, d: COR }); y0 = cy + COR + dS + 2.5;
  }
  const P: WPlan = { W: Math.max(Wmax, 10), D: Math.max(y0 - 2.5, 10), items, corridors };
  PLANS.set(levelId, P); return P;
}
export const worldRoomHref = (w: LiteWorld, id: string) => `#/lite/w/${w}/r/${encodeURIComponent(id)}`;
export const worldLevelHref = (w: LiteWorld, id: string) => `#/lite/w/${w}/f/${encodeURIComponent(id)}`;
export const worldPlaceHref = (w: LiteWorld, id: string) => `#/lite/w/${w}/b/${encodeURIComponent(id)}`;
/** the level a room is on, and the building above it (University), walking up the records */
export function upOf(ix: Index, id: string): { level: EstateNode | null; building: EstateNode | null } {
  let n = ix.byId.get(id) || null; let level: EstateNode | null = null; let building: EstateNode | null = null;
  while (n && n.parent) { n = ix.byId.get(n.parent) || null; if (!n) break; if (n.kind === 'level' && !level) level = n; if (n.kind === 'building' && !building) building = n; }
  return { level, building };
}
