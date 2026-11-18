/**
 * Campus Life's first playable place (task #186): the Quad of Kestrel Valley University (the canon of worlds/university), Science
 * Hall with its lecture theatre SCI-110 (the same room the connected demonstration commissions on the server), and the buildings around
 * the Quad seen from outside. Metres; x east, z south, y up. Modelled, never surveyed; every name is fictional.
 *
 * Solids are what a person cannot walk through (walls, furniture, trees, the closed door); `roof` boxes are hidden while the player is
 * inside, so the camera sees in. The world's edge is a hedge and a hard boundary.
 */
import type { Box, V3 } from './gl.js';

export interface Solid { min: V3; max: V3; id: string }
export interface Thing { id: string; kind: 'npc' | 'card' | 'bench' | 'door' | 'screen' | 'sign'; at: [number, number]; r: number; label: string; prompt: string }
export interface Sign { at: V3; text: string; sub?: string }

const C = { grass: '#7DAA67', grass2: '#86B270', path: '#D8CCB2', stone: '#C9C2B4', brick: '#A65E46', brick2: '#94523D', glass: '#5E7F99', roof: '#55606B', trim: '#E9E3D6',
  sci: '#3E7F8F', sciDark: '#2F6573', lib: '#8C6B4F', union: '#B0753F', eng: '#5A6C8C', trunk: '#6B4A33', leaf: '#4F8A45', leaf2: '#5E9B4F', bench: '#7A5A3C', metal: '#3B4148',
  floor: '#CBBFA8', carpet: '#5B6E8C', desk: '#D9C7A3', seat: '#2F4A6B', wall: '#EDE7DC', screen: '#1D2B36', hedge: '#3F7140' };

export const WORLD = { minX: -58, maxX: 58, minZ: -50, maxZ: 46 };
/** Science Hall: outer walls, the lobby, and SCI-110 behind it */
export const HALL = { x0: -14, x1: 14, z0: -42, z1: -24, h: 7, door: [-1.4, 1.4] as [number, number], inner: -29 };
export const SPAWN = { x: 0, z: 20, yaw: Math.PI };

export const boxes: Box[] = []; export const solids: Solid[] = []; export const signs: Sign[] = [];
const add = (min: V3, max: V3, color: string, o: { solid?: string; tag?: string } = {}) => { boxes.push({ min, max, color, tag: o.tag }); if (o.solid) solids.push({ min, max, id: o.solid }); };

// ground, paths and the Quad
add([WORLD.minX - 20, -0.2, WORLD.minZ - 20], [WORLD.maxX + 20, 0, WORLD.maxZ + 20], C.grass);
add([-22, 0, -14], [22, 0.02, 14], C.grass2);
add([-1.6, 0.01, -24], [1.6, 0.03, 44], C.path); add([-56, 0.01, -1.6], [56, 0.03, 1.6], C.path);
add([-22, 0.015, -16], [22, 0.035, -14], C.path); add([-22, 0.015, 14], [22, 0.035, 16], C.path); add([-24, 0.015, -16], [-22, 0.035, 16], C.path); add([22, 0.015, -16], [24, 0.035, 16], C.path);
add([-4, 0.02, -24], [4, 0.04, -20], C.stone);   // the Science Hall forecourt
// the fountain at the Quad's centre: a ring of stone and still water
add([-3, 0, -3], [3, 0.6, -2.4], C.stone, { solid: 'fountain' }); add([-3, 0, 2.4], [3, 0.6, 3], C.stone, { solid: 'fountain' }); add([-3, 0, -2.4], [-2.4, 0.6, 2.4], C.stone, { solid: 'fountain' }); add([2.4, 0, -2.4], [3, 0.6, 2.4], C.stone, { solid: 'fountain' });
add([-2.4, 0, -2.4], [2.4, 0.4, 2.4], '#4E8FB0', { solid: 'fountain' }); add([-0.4, 0, -0.4], [0.4, 1.8, 0.4], C.stone, { solid: 'fountain' });

// Science Hall: walls with a doorway in the front, a lobby, an inner wall with an open way into SCI-110
const H = HALL; const t = 0.4;
add([H.x0, 0, H.z1 - t], [H.door[0], H.h, H.z1], C.sci, { solid: 'hall-front' }); add([H.door[1], 0, H.z1 - t], [H.x1, H.h, H.z1], C.sci, { solid: 'hall-front' });
add([H.door[0], 3.2, H.z1 - t], [H.door[1], H.h, H.z1], C.sciDark, { solid: 'hall-lintel' });
add([H.x0, 0, H.z0], [H.x1, H.h, H.z0 + t], C.sci, { solid: 'hall-back' }); add([H.x0, 0, H.z0], [H.x0 + t, H.h, H.z1], C.sci, { solid: 'hall-west' }); add([H.x1 - t, 0, H.z0], [H.x1, H.h, H.z1], C.sci, { solid: 'hall-east' });
for (const x of [-11, -7, 6.5, 10.5]) add([x, 3.6, H.z1 + 0.01], [x + 2.4, 6.2, H.z1 + 0.06], C.glass);   // upper windows (outside)
add([-14.3, H.h, -42.3], [14.3, H.h + 0.5, -23.7], C.roof, { tag: 'roof' }); add([-14.6, H.h + 0.5, -42.6], [14.6, H.h + 0.7, -23.4], C.trim, { tag: 'roof' });
add([H.x0 + t, 0, H.z0 + t], [H.x1 - t, 0.05, H.z1 - t], C.floor);
// the inside faces of the walls: a warm plaster lining (drawn just inside the walls; the walls themselves are what stop a person)
const li = 0.03; add([H.x0 + t, 0, H.z0 + t], [H.x1 - t, H.h - 0.01, H.z0 + t + li], C.wall); add([H.x0 + t, 0, H.z0 + t], [H.x0 + t + li, H.h - 0.01, H.z1 - t], C.wall); add([H.x1 - t - li, 0, H.z0 + t], [H.x1 - t, H.h - 0.01, H.z1 - t], C.wall);
add([H.x0 + t, 0, H.z1 - t - li], [H.door[0], H.h - 0.01, H.z1 - t], C.wall); add([H.door[1], 0, H.z1 - t - li], [H.x1 - t, H.h - 0.01, H.z1 - t], C.wall); add([H.door[0], 3.2, H.z1 - t - li], [H.door[1], H.h - 0.01, H.z1 - t], C.wall);
add([H.x0 + t, 0, H.z0 + t + li], [H.x1 - t, 1.0, H.z0 + t + li + 0.02], '#B9AE98');   // a dado rail of oak at the front
for (const z of [-40, -36, -32, -27]) add([-10, H.h - 0.4, z - 0.3], [10, H.h - 0.35, z + 0.3], '#FFF6DE');   // light strips under the roof
add([H.x0 + t, 0, H.inner - 0.2], [2.5, 4.2, H.inner + 0.2], C.wall, { solid: 'inner-wall' }); add([5.5, 0, H.inner - 0.2], [H.x1 - t, 4.2, H.inner + 0.2], C.wall, { solid: 'inner-wall' });
add([2.5, 3.0, H.inner - 0.2], [5.5, 4.2, H.inner + 0.2], C.wall, { solid: 'inner-lintel' });
// SCI-110, the lecture theatre: carpet, rows of desks and seats, the lectern, the projection screen, loudspeakers and a camera, the circuit bench
add([H.x0 + t, 0.05, H.z0 + t], [H.x1 - t, 0.07, H.inner - 0.2], C.carpet);
for (let row = 0; row < 4; row++) { const z = -32.5 - row * 1.7 + 0; for (const [a, b] of [[-11, -2.5], [1.5, 8]] as Array<[number, number]>) {
  add([a, 0, z - 0.35], [b, 0.75, z + 0.1], C.desk, { solid: 'desk' }); for (let x = a + 0.6; x < b; x += 1.1) add([x - 0.25, 0, z + 0.25], [x + 0.25, 0.48, z + 0.7], C.seat);
} }
add([-1.2, 0, -39.4], [0.4, 1.1, -38.6], C.bench, { solid: 'lectern' });
add([-5, 1.4, -41.5], [5, 4.4, -41.45], C.screen); add([-4.6, 1.7, -41.45], [4.6, 4.1, -41.42], '#E9F1F4'); add([-4.2, 3.4, -41.42], [1.2, 3.7, -41.4], '#0A7268'); add([-4.2, 2.0, -41.42], [-0.6, 3.1, -41.4], '#C7D7DE'); add([0.0, 2.0, -41.42], [3.8, 3.1, -41.4], '#F2D58A'); add([-5.2, 1.3, -41.55], [5.2, 4.5, -41.5], C.metal);
add([-7.6, 3.6, -41.6], [-6.8, 4.6, -41.2], C.metal); add([6.8, 3.6, -41.6], [7.6, 4.6, -41.2], C.metal);   // loudspeakers
add([-0.25, 5.2, -29.6], [0.25, 5.6, -29.1], C.metal);   // the PTZ camera at the back of the room
add([9.5, 0, -38.2], [12.8, 0.95, -36.6], C.metal, { solid: 'bench' }); add([9.7, 0.95, -38], [12.6, 1.0, -36.8], '#2E5E4E'); add([10.4, 1.0, -37.6], [11.0, 1.4, -37.2], '#C8A23A');
// the lobby: a reception counter and a notice board
add([-9, 0, -27.6], [-5, 1.1, -26.6], C.desk, { solid: 'counter' }); add([7, 1.2, H.inner + 0.21], [11, 2.6, H.inner + 0.26], '#E3D9B8');

// the buildings around the Quad, seen from outside (their doors are not open in this first release)
const block = (id: string, x0: number, z0: number, x1: number, z1: number, h: number, col: string, doorFace: 'n' | 's' | 'e' | 'w') => {
  add([x0, 0, z0], [x1, h, z1], col, { solid: id }); add([x0 - 0.3, h, z0 - 0.3], [x1 + 0.3, h + 0.4, z1 + 0.3], C.trim);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  if (doorFace === 's') add([cx - 1.3, 0, z1], [cx + 1.3, 3, z1 + 0.08], C.metal); else if (doorFace === 'n') add([cx - 1.3, 0, z0 - 0.08], [cx + 1.3, 3, z0], C.metal);
  else if (doorFace === 'e') add([x1, 0, cz - 1.3], [x1 + 0.08, 3, cz + 1.3], C.metal); else add([x0 - 0.08, 0, cz - 1.3], [x0, 3, cz + 1.3], C.metal);
  for (let y = 3.8; y < h - 1; y += 3.2) for (let k = 0; k < 4; k++) {
    if (doorFace === 's' || doorFace === 'n') { const x = x0 + (k + 0.5) * (x1 - x0) / 4 - 1; const z = doorFace === 's' ? z1 : z0 - 0.06; add([x, y, z], [x + 2, y + 1.8, z + 0.06], C.glass); }
    else { const z = z0 + (k + 0.5) * (z1 - z0) / 4 - 1; const x = doorFace === 'e' ? x1 : x0 - 0.06; add([x, y, z], [x + 0.06, y + 1.8, z + 2], C.glass); }
  }
};
block('library', -48, -20, -30, 4, 10, C.lib, 'e'); block('engineering', 30, -18, 48, 6, 9, C.eng, 'w'); block('union', -12, 28, 12, 42, 8, C.union, 'n');
block('arts', -48, 14, -32, 30, 8, C.brick, 'e'); block('residence', 32, 16, 48, 34, 12, C.brick2, 'w');
signs.push({ at: [0, 7.9, -23.6], text: 'Science Hall', sub: 'SCI-110 lecture theatre · labs' }, { at: [-29.6, 6, -8], text: 'Hollis Library', sub: 'opens in a later release' }, { at: [29.6, 6, -6], text: 'Engineering Centre', sub: 'opens in a later release' },
  { at: [0, 8.6, 27.6], text: 'Student Union', sub: 'dining · societies · shuttle' }, { at: [-31.6, 6, 22], text: 'Arts Hall', sub: 'opens in a later release' }, { at: [31.6, 8, 25], text: 'Residence Court', sub: 'opens in a later release' });

// trees, benches and lamps around the Quad; the hedge at the edge
const tree = (x: number, z: number, s = 1) => { add([x - 0.25, 0, z - 0.25], [x + 0.25, 2.2 * s, z + 0.25], C.trunk, { solid: 'tree' }); add([x - 1.6 * s, 2 * s, z - 1.6 * s], [x + 1.6 * s, 3.6 * s, z + 1.6 * s], C.leaf); add([x - 1.1 * s, 3.5 * s, z - 1.1 * s], [x + 1.1 * s, 4.6 * s, z + 1.1 * s], C.leaf2); };
for (const [x, z] of [[-18, -10], [-18, 10], [18, -10], [18, 10], [-8, -11], [8, 11], [-26, 20], [26, -22], [-26, -24], [24, 22], [-40, 40], [40, 40], [-52, -40], [52, -40], [14, -30], [-20, -30]] as Array<[number, number]>) tree(x, z, 0.9 + ((x * 7 + z * 13) % 5 + 5) % 5 * 0.06);
const benchAt = (x: number, z: number, along: 'x' | 'z') => along === 'x' ? add([x - 1, 0, z - 0.3], [x + 1, 0.5, z + 0.3], C.bench, { solid: 'bench-seat' }) : add([x - 0.3, 0, z - 1], [x + 0.3, 0.5, z + 1], C.bench, { solid: 'bench-seat' });
benchAt(-8, -5, 'x'); benchAt(8, 5, 'x'); benchAt(-12, 6, 'z'); benchAt(12, -6, 'z');
for (const [x, z] of [[-3, -18], [3, -18], [-3, 10], [3, 10], [-14, 3], [14, -3]] as Array<[number, number]>) { add([x - 0.08, 0, z - 0.08], [x + 0.08, 3.6, z + 0.08], C.metal, { solid: 'lamp' }); add([x - 0.25, 3.6, z - 0.25], [x + 0.25, 3.9, z + 0.25], '#F2E7C4'); }
add([WORLD.minX, 0, WORLD.minZ - 1], [WORLD.maxX, 1.1, WORLD.minZ], C.hedge, { solid: 'edge' }); add([WORLD.minX, 0, WORLD.maxZ], [WORLD.maxX, 1.1, WORLD.maxZ + 1], C.hedge, { solid: 'edge' });
add([WORLD.minX - 1, 0, WORLD.minZ], [WORLD.minX, 1.1, WORLD.maxZ], C.hedge, { solid: 'edge' }); add([WORLD.maxX, 0, WORLD.minZ], [WORLD.maxX + 1, 1.1, WORLD.maxZ], C.hedge, { solid: 'edge' });

/** the Science Hall door: two leaves that slide apart; solid while closed */
export const DOOR = { x0: H.door[0], x1: H.door[1], z: H.z1 - t / 2, h: 3.2, color: '#2C4E57' };
export const NPC = { x: 3.2, z: -18.5, yaw: Math.PI * 0.85, name: 'Professor Ines Calder', role: 'Circuits and Signals, Science Hall', colors: { body: '#7A3E5C', legs: '#2E3440', skin: '#B98A6B', hair: '#2B2321' } };
export const CARDS: Array<{ id: string; at: [number, number]; title: string; fact: string }> = [
  { id: 'fountain', at: [0, 5.5], title: 'The Quad fountain', fact: 'Kestrel Valley’s fountain is fed by rainwater from the Science Hall roof. (A fictional campus fact.)' },
  { id: 'oak', at: [-19.5, -7.5], title: 'The founders’ trees', fact: 'Each tree on the Quad was planted by a graduating class. The oldest stands by the library path. (Fictional.)' },
  { id: 'union', at: [6, 24], title: 'The Union steps', fact: 'The Student Union runs the campus shuttle from its north steps every fifteen minutes. (Fictional; no real timetable.)' },
];
export const BENCH = { x: 11.1, z: -35.6, label: 'Circuit bench' };
export const SCREEN = { x: 0, z: -38.6, label: 'Lecture screen' };
export const inHall = (x: number, z: number) => x > H.x0 && x < H.x1 && z > H.z0 && z < H.z1;
export const inTheatre = (x: number, z: number) => inHall(x, z) && z < H.inner;
