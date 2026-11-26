/**
 * Campus Life's rules, pure and testable (no DOM): the player's movement and collision, the third-person camera and how it avoids
 * walls, the door, what is in reach, the quest's stages, experience and levels, and what is saved. ./CampusLife.tsx runs it each frame.
 *
 * Collision: the player is a circle of 0.35 m against every solid's footprint whose height overlaps the player's; movement is resolved
 * along each axis in small steps so the player slides along a wall and never passes through one, however fast. The world's bounds are
 * a hard limit besides the hedge. The camera is pulled in front of anything between it and the player's head.
 */
import { boxes, CARDS, DOOR, HALL, NPC, BENCH, SCREEN, SPAWN, WORLD, inHall, inTheatre, solids, type Solid } from './world.js';
/** things overhead that a person walks under but the camera must not pass through (the room's camera, loudspeakers, light strips) */
const OVERHEAD: Solid[] = boxes.filter((b) => b.min[1] >= 1.8 && b.tag !== 'roof' && b.min[0] > HALL.x0 && b.max[0] < HALL.x1 && b.min[2] > HALL.z0 && b.max[2] < HALL.z1).map((b, i) => ({ min: b.min, max: b.max, id: `overhead-${i}` }));
import type { V3 } from './gl.js';

export const R = 0.35; const WALK = 3.2; const RUN = 6.4;
export type Stage = 'start' | 'met' | 'inside' | 'bench' | 'solved' | 'done';
export const STAGES: Record<Stage, string> = { start: 'Find Professor Calder outside Science Hall', met: 'Go into Science Hall', inside: 'Find the circuit bench in SCI-110', bench: 'Solve the three circuits at the bench', solved: 'Tell Professor Calder the LED board is lit', done: 'Done: the lecture theater is ready for 09:00' };
export interface Save { v: 1; x: number; z: number; yaw: number; camYaw: number; xp: number; stage: Stage; cards: string[]; door: boolean; at: string }
export interface State { x: number; z: number; yaw: number; speed: number; camYaw: number; camPitch: number; camDist: number; xp: number; stage: Stage; cards: string[]; door: boolean; doorT: number; walkT: number; t: number; log: string[] }
export interface Input { fwd: number; right: number; run: boolean; turn: number; tilt: number }

export const fresh = (): State => ({ x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw, speed: 0, camYaw: SPAWN.yaw, camPitch: 0.36, camDist: 6, xp: 0, stage: 'start', cards: [], door: false, doorT: 0, walkT: 0, t: 0, log: [] });
export const level = (xp: number) => Math.floor(xp / 200) + 1;
export const toSave = (s: State): Save => ({ v: 1, x: s.x, z: s.z, yaw: s.yaw, camYaw: s.camYaw, xp: s.xp, stage: s.stage, cards: [...s.cards], door: s.door, at: new Date().toISOString() });
export function fromSave(v: unknown): State | null {
  const s = v as Partial<Save>; if (!s || s.v !== 1 || !Number.isFinite(s.x) || !Number.isFinite(s.z) || !(s.stage! in STAGES)) return null;
  const st = { ...fresh(), x: s.x!, z: s.z!, yaw: Number(s.yaw) || 0, camYaw: Number(s.camYaw) || 0, xp: Math.max(0, Number(s.xp) || 0), stage: s.stage!, cards: (s.cards || []).filter((c) => CARDS.some((k) => k.id === c)), door: !!s.door, doorT: s.door ? 1 : 0 };
  return blocked(st.x, st.z, st) ? { ...st, x: SPAWN.x, z: SPAWN.z } : st;   // a save that would put the player in a wall starts them at the gate
}

/** the solids that stop a person: every wall and piece of furniture, and the door while it is not open */
export function activeSolids(s: Pick<State, 'doorT'>): Solid[] {
  return s.doorT > 0.9 ? solids : [...solids, { min: [DOOR.x0, 0, DOOR.z - 0.2], max: [DOOR.x1, DOOR.h, DOOR.z + 0.2], id: 'door' }];
}
const hitsBox = (x: number, z: number, b: Solid) => { if (b.min[1] > 1.7 || b.max[1] < 0.15) return false; const cx = Math.max(b.min[0], Math.min(x, b.max[0])), cz = Math.max(b.min[2], Math.min(z, b.max[2])); return (x - cx) ** 2 + (z - cz) ** 2 < R * R; };
export const blocked = (x: number, z: number, s: Pick<State, 'doorT'>) => x < WORLD.minX + R || x > WORLD.maxX - R || z < WORLD.minZ + R || z > WORLD.maxZ - R || activeSolids(s).some((b) => hitsBox(x, z, b));

/** one frame: move, collide, turn, place the camera */
export function step(s: State, inp: Input, dt: number): State {
  const n = { ...s, t: s.t + dt };
  n.camYaw += inp.turn * 2.2 * dt; n.camPitch = Math.max(0.08, Math.min(1.15, n.camPitch + inp.tilt * 1.4 * dt));
  const mag = Math.min(1, Math.hypot(inp.fwd, inp.right));
  const target = mag > 0.05 ? (inp.run ? RUN : WALK) * mag : 0; n.speed += (target - n.speed) * Math.min(1, dt * 10);
  if (mag > 0.05) {
    const fx = Math.sin(n.camYaw), fz = Math.cos(n.camYaw); const rx = -fz, rz = fx;   // forward is where the camera looks; right is its right
    let dx = fx * inp.fwd + rx * inp.right, dz = fz * inp.fwd + rz * inp.right; const l = Math.hypot(dx, dz); dx /= l; dz /= l;
    const want = Math.atan2(dx, dz); let d = want - n.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; n.yaw += d * Math.min(1, dt * 12);
    const dist = n.speed * dt; const steps = Math.max(1, Math.ceil(dist / 0.08));
    for (let i = 0; i < steps; i++) { const sx = dx * dist / steps, sz = dz * dist / steps;
      if (!blocked(n.x + sx, n.z, n)) n.x += sx; if (!blocked(n.x, n.z + sz, n)) n.z += sz; }
    n.walkT += dt * (n.speed / WALK) * 7;
  }
  n.doorT = Math.max(0, Math.min(1, n.doorT + (n.door ? 1 : -1) * dt * 1.6));
  if (!n.door && n.doorT > 0 && blocked(n.x, n.z, { doorT: 0 })) n.doorT = Math.max(n.doorT, 0.95);   // never close the door on the player
  if (n.stage === 'met' && inHall(n.x, n.z)) { n.stage = 'inside'; n.xp += 15; n.log = [...n.log, 'Entered Science Hall · +15 XP']; }
  n.camDist = camera(n).dist;
  return n;
}

/** where the camera wants to be, and how far it may be before something stands between it and the player's head; when a wall is
 *  close behind, the camera rises over the player's shoulder (a higher pitch) before it comes closer, so the player stays in view */
export function camera(s: Pick<State, 'x' | 'z' | 'camYaw' | 'camPitch' | 'doorT'>, want = 6): { eye: V3; at: V3; dist: number; pitch: number } {
  const at: V3 = [s.x, 1.55, s.z]; const inside = inHall(s.x, s.z); const solidsNow = inside ? [...activeSolids(s), ...OVERHEAD] : activeSolids(s);
  const reachAt = (pitch: number) => { const dir: V3 = [-Math.sin(s.camYaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(s.camYaw) * Math.cos(pitch)]; let dist = want;
    for (const b of solidsNow) { const h = ray(at, dir, b.min, b.max); if (h !== null && h < dist) dist = h; }
    if (!inside) { const h = ray(at, dir, [HALL.x0 - 0.3, HALL.h, HALL.z0 - 0.3], [HALL.x1 + 0.3, HALL.h + 0.7, HALL.z1 + 0.3]); if (h !== null && h < dist) dist = h; }
    else { const h = ray(at, dir, [HALL.x0, HALL.h - 0.3, HALL.z0], [HALL.x1, HALL.h + 1, HALL.z1]); if (h !== null && h < dist) dist = h; }
    return { dir, dist: Math.max(0.6, dist - 0.3) }; };
  let pitch = s.camPitch; let best = reachAt(pitch);
  for (const extra of [0.3, 0.6, 0.9]) { if (best.dist >= 2.6) break; const p = Math.min(1.35, s.camPitch + extra); const c = reachAt(p); if (c.dist > best.dist + 0.2) { best = c; pitch = p; } }
  const { dir, dist } = best;
  return { eye: [at[0] + dir[0] * dist, at[1] + dir[1] * dist, at[2] + dir[2] * dist], at, dist, pitch };
}
/** the distance along a ray to a box, or null (slab method); a ray that starts inside a box is not stopped by it */
export function ray(o: V3, d: V3, mn: V3, mx: V3): number | null {
  let t0 = 0, t1 = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]!) < 1e-9) { if (o[i]! < mn[i]! || o[i]! > mx[i]!) return null; continue; }
    let a = (mn[i]! - o[i]!) / d[i]!, b = (mx[i]! - o[i]!) / d[i]!; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null;
  }
  return t0 > 0 ? t0 : null;
}

export interface Reach { id: string; label: string; prompt: string }
/** what the player can act on from where they stand */
export function reach(s: State): Reach | null {
  const d = (x: number, z: number) => Math.hypot(s.x - x, s.z - z);
  if (d(NPC.x, NPC.z) < 2.2) return { id: 'npc', label: NPC.name, prompt: 'Talk' };
  const card = CARDS.find((c) => !s.cards.includes(c.id) && d(c.at[0], c.at[1]) < 1.6); if (card) return { id: `card:${card.id}`, label: card.title, prompt: 'Pick up the fact card' };
  if (Math.abs(s.x) < 2.6 && Math.abs(s.z - DOOR.z) < 2.4) return { id: 'door', label: 'Science Hall door', prompt: s.door ? 'Close the door' : 'Open the door' };
  if (inTheatre(s.x, s.z) && d(BENCH.x, BENCH.z) < 2.2) return { id: 'bench', label: BENCH.label, prompt: s.stage === 'inside' || s.stage === 'bench' ? 'Work at the bench' : 'Look at the bench' };
  if (inTheatre(s.x, s.z) && d(SCREEN.x, SCREEN.z) < 2.6) return { id: 'screen', label: SCREEN.label, prompt: 'Read the screen' };
  return null;
}
/** acting on what is in reach: returns the new state and what the page should open (dialogue, card, circuits) */
export function act(s: State, r: Reach): { s: State; open?: 'talk' | 'circuits' | 'screen'; card?: string } {
  const n = { ...s };
  if (r.id === 'npc') { if (n.stage === 'start') { n.stage = 'met'; n.xp += 10; n.log = [...n.log, 'Quest received: Light the lecture theater · +10 XP']; } else if (n.stage === 'solved') { n.stage = 'done'; n.xp += 50; n.log = [...n.log, 'Quest complete · +50 XP']; } return { s: n, open: 'talk' }; }
  if (r.id.startsWith('card:')) { const id = r.id.slice(5); if (!n.cards.includes(id)) { n.cards = [...n.cards, id]; n.xp += 25; n.log = [...n.log, `Fact card found · +25 XP`]; if (n.cards.length === CARDS.length) { n.xp += 40; n.log = [...n.log, 'Campus Discovery: all three cards · +40 XP']; } } return { s: n, card: id }; }
  if (r.id === 'door') { n.door = !n.door; return { s: n }; }
  if (r.id === 'bench') { if (n.stage === 'inside') n.stage = 'bench'; return { s: n, open: 'circuits' }; }
  if (r.id === 'screen') return { s: n, open: 'screen' };
  return { s: n };
}
/** the bench's three circuits solved: the board lights, the quest moves on */
export function solved(s: State, correctFirstTry: number): State {
  if (s.stage !== 'bench') return s; const bonus = correctFirstTry * 20;
  return { ...s, stage: 'solved', xp: s.xp + 150 + bonus, log: [...s.log, `Circuits solved (${correctFirstTry} of 3 first time) · +${150 + bonus} XP`] };
}
