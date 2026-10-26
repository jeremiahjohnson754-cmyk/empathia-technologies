/**
 * Room geometry helpers. Ported from `v25-60-room.js` (v25RoomArea, v25RoomInside, v25RoomBox, v25RoomParseLen, v25RoomShapes).
 * Units: metres. All functions are pure.
 */
import type { RoomGeometry } from '@empathia/domain-types';

export const UNITS = { m: { label: 'metres', toM: 1 }, ft: { label: 'feet', toM: 0.3048 } } as const;
export type Unit = keyof typeof UNITS;

const r3 = (v: number) => Math.round(v * 1000) / 1000;

export const toMetres = (v: number, u: Unit | string): number => r3(Number(v) * (UNITS[u as Unit] ?? UNITS.m).toM);
export const fromMetres = (m: number, u: Unit | string): number => Math.round((Number(m) / (UNITS[u as Unit] ?? UNITS.m).toM) * 100) / 100;

/**
 * Parse a typed length. Accepts feet-and-inches (`12' 6"`, `12ft 6in`, `12'`) or a bare number in the given unit.
 * Returns metres, or null when the text is not a positive length.
 */
export function parseLength(s: unknown, unit: Unit | string): number | null {
  const t = String(s == null ? '' : s).trim();
  const fi = t.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft)\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in)?)?$/i);
  if (fi) return r3(Number(fi[1]) * 0.3048 + Number(fi[2] || 0) * 0.0254);
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? toMetres(n, unit) : null;
}

/** Shoelace area of the outline, m², rounded to 0.01. */
export function area(g: Pick<RoomGeometry, 'points'>): number {
  const p = g.points;
  let a = 0;
  for (let i = 0; i < p.length; i += 1) {
    const [x1, y1] = p[i]!;
    const [x2, y2] = p[(i + 1) % p.length]!;
    a += x1 * y2 - x2 * y1;
  }
  return Math.round(Math.abs(a / 2) * 100) / 100;
}

/** Axis-aligned bounding box width and length. */
export function box(g: Pick<RoomGeometry, 'points'>): { w: number; l: number } {
  const xs = g.points.map((p) => p[0]);
  const ys = g.points.map((p) => p[1]);
  return { w: Math.max(...xs) - Math.min(...xs), l: Math.max(...ys) - Math.min(...ys) };
}

/** Even-odd point-in-polygon test (the demonstrator's exact arithmetic, including its 1e-12 guard). */
export function inside(g: Pick<RoomGeometry, 'points'>, x: number, y: number): boolean {
  const p = g.points;
  let isIn = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i, i += 1) {
    const [xi, yi] = p[i]!;
    const [xj, yj] = p[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi) isIn = !isIn;
  }
  return isIn;
}

export const shapes = {
  rect: (w: number, l: number): Array<[number, number]> => [[0, 0], [w, 0], [w, l], [0, l]],
  lshape: (w: number, l: number): Array<[number, number]> => [[0, 0], [w, 0], [w, l * 0.55], [w * 0.6, l * 0.55], [w * 0.6, l], [0, l]],
};
