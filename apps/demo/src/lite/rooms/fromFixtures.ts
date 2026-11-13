/**
 * The rooms V2.5.3 never drew (restrooms, kitchens, counters, dining, lounges, storage, plant, clinics, locker rooms, libraries, halls), in
 * Empathia's look (13 Nov 2026). Their fixtures come from Empathia's own rules (../fixtures.ts), unchanged in place and size; this turns them
 * into a program for Empathia's renderer, so every environment is drawn the same way — materials, light, furniture people recognise — and
 * can be seen from the doorway, the middle of the room and a wheelchair user's place. Illustrative: no fixture is a surveyed asset.
 */
import type { FixtureLayout } from '../fixtures.js';
import type { Piece, Program } from './programs.js';

const FLOOR: Record<string, Program['floor']> = { restroom: 'vinyl', 'restroom-accessible': 'vinyl', kitchen: 'vinyl', storage: 'concrete', laundry: 'vinyl', racks: 'concrete', plant: 'concrete', clinic: 'vinyl', lockers: 'vinyl', expo: 'concrete', open: 'vinyl', dining: 'oak', lounge: 'carpet', library: 'carpet', counter: 'oak' };
const KIND: Record<string, string> = { stall: 'fx-stall', counter: 'fx-counter', dryer: 'fx-small', fridge: 'fx-fridge', shelf: 'fx-shelf', kiosk: 'fx-kiosk', table: 'fx-table', chair: 'fx-chair', sofa: 'fx-sofa', machine: 'fx-machine', rack: 'fx-rack', cabinet: 'fx-cabinet', plant: 'fx-plant', bed: 'fx-bed', desk: 'fx-table', locker: 'fx-locker', bench: 'fx-bench', booth: 'fx-booth', mat: 'fx-mat' };

export function programFromFixtures(name: string, type: string, dims: [number, number, number], F: FixtureLayout): Program {
  const [L, Wd, H0] = dims; const w = Math.max(L, Wd), d = Math.min(L, Wd), H = Math.min(H0 || 3, 6); const doorX = Math.min(w - 0.7, Math.max(0.7, w / 2));
  // which way a fixture faces: a chair or a sofa towards the nearest table; a unit on a wall into the room; the rest towards the way in
  const tables = F.items.filter((f) => f.kind === 'table' || f.kind === 'desk');
  const rotOf = (f: FixtureLayout['items'][number]): number => {
    if (f.kind === 'chair' || f.kind === 'sofa') { let best = null as null | { x: number; y: number }, bd = Infinity; for (const t of tables) { const dd = Math.hypot(t.x - f.x, t.y - f.y); if (dd < bd) { bd = dd; best = t; } }
      if (best && bd < 2.5) return Math.round((Math.atan2(best.x - f.x, -(best.y - f.y)) * 180) / Math.PI); }
    if (f.d > f.w * 1.6) return f.x < w / 2 ? 90 : -90;   // a long unit down a side wall faces into the room
    return f.y > d / 2 ? 0 : 180;   // against the back wall it faces the front; near the front it faces back into the room
  };
  const pieces: Piece[] = F.items.map((f, i) => ({ id: `fx${i}`, kind: KIND[f.kind] || 'fx-cabinet', label: f.label, x: f.x, y: f.y, w: f.w, d: f.d, h: f.h, z: f.z || 0, rot: rotOf(f) }));
  const lights: Array<[number, number]> = []; const s = Math.max(1.8, Math.min(w, d) / 3); for (let y = s / 2; y < d && lights.length < 60; y += s) for (let x = s / 2; x < w && lights.length < 60; x += s) lights.push([x, y]);
  const yawTo = (x: number, y: number, tx: number, ty: number) => Math.round((Math.atan2(-(tx - x), -(ty - y)) * 180) / Math.PI);
  return { key: `fixtures-${F.rule}`, title: name, summary: `Furnished by Empathia’s own layout for a ${type.replace(/-/g, ' ')}.`, w, d, H, floor: FLOOR[F.rule] || 'vinyl',
    walls: { N: { door: { at: doorX, w: w > 12 ? 1.8 : 0.95, hinge: 'hi' } }, E: {}, S: {}, W: {} }, pieces, lights, speakers: [], outside: null, hero: { yaw: 208, pitch: w > 30 ? 46 : 40, zoom: w > 30 ? 1 : 1.1 },   // the rules put the way in on the front wall (y = 0); the camera looks in from there
    eyes: [
      { key: 'door', label: 'Doorway', says: 'just inside the door, standing, eyes at 1.6 m', x: doorX - 0.25, y: Math.min(1.2, d * 0.3), z: 1.6, yaw: yawTo(doorX - 0.25, Math.min(1.2, d * 0.3), w / 2, d), pitch: 42 },
      { key: 'middle', label: 'Middle of the room', says: 'standing in the middle, eyes at 1.6 m', x: w / 2, y: d / 2, z: 1.6, yaw: 180, pitch: 42 },
      { key: 'wheel', label: 'Wheelchair place', says: 'just inside the door, seated, eyes at 1.1 m', x: Math.max(0.6, doorX - 0.6), y: 0.6, z: 1.1, yaw: yawTo(Math.max(0.6, doorX - 0.6), 0.6, w / 2, d), pitch: 40 },
    ] };
}
