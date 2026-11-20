/**
 * Empathia's own furnishing rules for the room types V2.5.3 never drew (13 Nov 2026, founder: "Let's furnish every environment"):
 * restrooms, kitchens and concessions, counters, dining and lounges, storage and plant, first aid, locker rooms, libraries, halls.
 * Each rule places fixtures from the room's recorded size and places, along the walls and in rows, as a planner would sketch them. They are
 * labelled Empathia's layout, never V2.5.3's, and they are illustrative: no fixture here is a surveyed or verified asset.
 */
export interface Fixture { x: number; y: number; w: number; d: number; h: number; z?: number; kind: string; label: string; col: [number, number, number] }
export interface FixtureLayout { rule: string; items: Fixture[] }

const WOOD: [number, number, number] = [150, 112, 74], STEEL: [number, number, number] = [120, 126, 132], WHITE: [number, number, number] = [214, 214, 206], DARK: [number, number, number] = [70, 72, 78],
  FABRIC: [number, number, number] = [92, 98, 118], GREEN: [number, number, number] = [74, 110, 92], RED: [number, number, number] = [150, 70, 64];
const clampN = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.floor(n)));

/** which rule a room type takes */
const RULE: Record<string, string> = {
  restrooms: 'restroom', 'accessible-restroom': 'restroom-accessible',
  kitchen: 'kitchen', concession: 'kitchen', 'food-service': 'kitchen',
  retail: 'counter', 'ticket-office': 'counter', 'guest-services': 'counter', registration: 'counter', 'visitor-services': 'counter', 'student-services': 'counter', 'exhibitor-support': 'counter', 'student-organization': 'counter', support: 'counter',
  dining: 'dining', cafe: 'dining', 'common-lounge': 'lounge', lounge: 'lounge', 'family-room': 'lounge', 'staff-room': 'lounge',
  storage: 'storage', waste: 'storage', 'equipment-room': 'storage', laundry: 'laundry', 'network-room': 'racks', 'electrical-room': 'racks', 'plant-room': 'plant', technical: 'racks', facilities: 'storage',
  'first-aid': 'clinic', medical: 'clinic', recovery: 'clinic', 'locker-room': 'lockers', library: 'library', 'reading-room': 'library',
  recreation: 'open', 'warm-up': 'open', 'expo-hall': 'expo', 'demo-stage': 'open', 'press-room': 'dining', 'quiet-room': 'lounge',
};
export const fixtureRuleOf = (type: string): string | null => RULE[type] ?? null;

/** The fixtures of a room of `type`, width `w` across and depth `d` from the front wall (where the door is), for `cap` places. */
export function fixturesFor(type: string, w: number, d: number, cap = 0): FixtureLayout | null {
  const rule = fixtureRuleOf(type); if (!rule) return null; const out: Fixture[] = []; const add = (f: Fixture) => out.push(f);
  const along = (n: number, y: number, fw: number, fd: number, h: number, kind: string, label: string, col: Fixture['col'], x0 = 0.6, x1 = w - 0.6) => { const step = (x1 - x0) / Math.max(1, n); for (let i = 0; i < n; i++) add({ x: x0 + step * (i + 0.5), y, w: fw, d: fd, h, kind, label: n > 1 ? `${label} ${i + 1}` : label, col }); };
  switch (rule) {
    case 'restroom': case 'restroom-accessible': {
      const acc = rule === 'restroom-accessible'; const stalls = acc ? 1 : clampN((w - 1.2) / 1.0, 2, 10);
      if (acc) add({ x: w * 0.65, y: d - 1.1, w: 2.0, d: 2.0, h: 2.0, kind: 'stall', label: 'Accessible WC with grab rails', col: WHITE });
      else along(stalls, d - 0.8, 0.9, 1.5, 2.0, 'stall', 'WC cubicle', WHITE);
      const sinks = acc ? 1 : clampN(stalls / 2, 1, 6); add({ x: w / 2, y: 0.45, w: Math.min(w - 1.4, sinks * 0.8), d: 0.55, h: 0.85, kind: 'counter', label: `Vanity with ${sinks} basin${sinks === 1 ? '' : 's'}`, col: STEEL });
      add({ x: w - 0.4, y: d / 2, w: 0.3, d: 0.5, h: 1.2, kind: 'dryer', label: 'Hand dryer', col: STEEL }); break;
    }
    case 'kitchen': {
      add({ x: w / 2, y: d - 0.4, w: w - 0.8, d: 0.7, h: 0.9, kind: 'counter', label: 'Back counter with cooking line', col: STEEL });
      add({ x: 0.4, y: d / 2, w: 0.7, d: d - 1.6, h: 0.9, kind: 'counter', label: 'Prep counter', col: STEEL });
      add({ x: w - 0.45, y: d * 0.35, w: 0.8, d: 1.6, h: 2.0, kind: 'fridge', label: 'Refrigeration', col: WHITE });
      const serve = clampN(w / 2.4, 1, 8); add({ x: w / 2, y: 0.5, w: w - 1.6, d: 0.8, h: 1.05, kind: 'counter', label: `Serving counter, ${serve} points`, col: WOOD });
      if (d > 4.5) add({ x: w / 2, y: d / 2 + 0.3, w: Math.min(3, w * 0.35), d: 1.0, h: 0.9, kind: 'counter', label: 'Island', col: STEEL }); break;
    }
    case 'counter': {
      add({ x: w / 2, y: 1.1, w: Math.min(w - 1.2, Math.max(2, w * 0.6)), d: 0.7, h: 1.05, kind: 'counter', label: 'Service counter', col: WOOD });
      along(clampN(w / 1.6, 1, 5), 0.6, 0.55, 0.5, 1.6, 'kiosk', 'Self-service point', DARK);
      along(clampN(w / 2.2, 1, 8), d - 0.3, 1.8, 0.45, 2.0, 'shelf', 'Shelving', WOOD); break;
    }
    case 'dining': {
      const cols = clampN((w - 1) / 2.2, 1, 12), rows = clampN((d - 1.2) / 2.2, 1, 12); const n = Math.min(cols * rows, Math.max(1, Math.ceil((cap || cols * rows * 4) / 4)));
      let k = 0; for (let r = 0; r < rows && k < n; r++) for (let c = 0; c < cols && k < n; c++, k++) { const x = 0.9 + ((w - 1.8) * (c + 0.5)) / cols, y = 1.2 + ((d - 1.8) * (r + 0.5)) / rows;
        add({ x, y, w: 0.9, d: 0.9, h: 0.74, kind: 'table', label: 'Table for four', col: WOOD }); for (const [dx, dy] of [[-0.62, 0], [0.62, 0], [0, -0.62], [0, 0.62]] as const) add({ x: x + dx, y: y + dy, w: 0.44, d: 0.44, h: 0.45, kind: 'chair', label: 'Chair', col: FABRIC }); }
      break;
    }
    case 'lounge': {
      add({ x: w * 0.3, y: d * 0.55, w: Math.min(2.4, w * 0.35), d: 0.9, h: 0.8, kind: 'sofa', label: 'Sofa', col: FABRIC });
      add({ x: w * 0.3, y: d * 0.55 - 1.0, w: 1.0, d: 0.6, h: 0.42, kind: 'table', label: 'Low table', col: WOOD });
      add({ x: w * 0.72, y: d * 0.5, w: 0.8, d: 0.8, h: 0.8, kind: 'sofa', label: 'Armchair', col: FABRIC }); add({ x: w * 0.72, y: d * 0.5 + 1.1, w: 0.8, d: 0.8, h: 0.8, kind: 'sofa', label: 'Armchair', col: FABRIC });
      add({ x: w / 2, y: d - 0.35, w: Math.min(3, w - 1), d: 0.6, h: 0.9, kind: 'counter', label: 'Counter with sink', col: STEEL }); break;
    }
    case 'storage': case 'laundry': {
      if (rule === 'laundry') { along(clampN(w / 0.75, 2, 10), d - 0.4, 0.65, 0.65, 0.9, 'machine', 'Washer or dryer', WHITE); add({ x: w / 2, y: 0.5, w: Math.min(2.4, w - 1), d: 0.7, h: 0.9, kind: 'counter', label: 'Folding counter', col: WOOD }); break; }
      const rows = clampN((d - 1) / 2.0, 1, 6); for (let r = 0; r < rows; r++) add({ x: w / 2, y: 1.2 + r * 2.0, w: w - 1.6, d: 0.6, h: 2.2, kind: 'shelf', label: `Shelving row ${r + 1}`, col: STEEL }); break;
    }
    case 'racks': case 'plant': {
      if (rule === 'plant') { add({ x: w * 0.35, y: d / 2, w: Math.min(3, w * 0.4), d: Math.min(2, d * 0.4), h: 1.8, kind: 'plant', label: 'Air handling unit', col: STEEL }); add({ x: w * 0.78, y: d * 0.3, w: 1.0, d: 1.0, h: 1.6, kind: 'plant', label: 'Pump set', col: GREEN }); add({ x: w * 0.78, y: d * 0.75, w: 1.2, d: 0.6, h: 2.0, kind: 'cabinet', label: 'Control panel', col: DARK }); break; }
      along(clampN((w - 1) / 0.75, 1, 8), d / 2, 0.6, 1.0, 2.0, 'rack', 'Equipment rack', DARK); add({ x: 0.35, y: 0.6, w: 0.4, d: 0.8, h: 1.8, kind: 'cabinet', label: 'Distribution board', col: RED }); break;
    }
    case 'clinic': {
      along(clampN((w - 1) / 1.4, 1, 4), d - 1.1, 0.9, 1.9, 0.7, 'bed', 'Treatment couch', WHITE);
      add({ x: 0.9, y: 0.8, w: 1.2, d: 0.6, h: 0.75, kind: 'desk', label: 'Desk', col: WOOD }); add({ x: w - 0.4, y: 0.8, w: 0.5, d: 0.9, h: 1.8, kind: 'cabinet', label: 'Supply cabinet', col: WHITE }); break;
    }
    case 'lockers': {
      along(clampN((w - 1) / 1.0, 2, 12), d - 0.3, 0.9, 0.5, 1.9, 'locker', 'Lockers', STEEL); along(clampN((w - 1) / 2.4, 1, 6), d / 2, 2.0, 0.4, 0.45, 'bench', 'Bench', WOOD); break;
    }
    case 'library': {
      const rows = clampN((d - 3) / 1.8, 1, 8); for (let r = 0; r < rows; r++) add({ x: w * 0.38, y: 1.6 + r * 1.8, w: Math.max(2, w * 0.55), d: 0.45, h: 2.0, kind: 'shelf', label: `Book stack ${r + 1}`, col: WOOD });
      const t = clampN(d / 2.6, 1, 6);   // reading tables down the right-hand wall for (let i = 0; i < t; i++) add({ x: w - 1.2, y: 1.2 + ((d - 2.4) * (i + 0.5)) / t, w: 1.6, d: 0.8, h: 0.74, kind: 'table', label: 'Reading table', col: WOOD }); break;
    }
    case 'expo': {
      const bw = 3, gap = 3; const cols = clampN((w - gap) / (bw + gap), 1, 20), rows = clampN((d - gap) / (bw + gap), 1, 14);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) add({ x: gap + c * (bw + gap) + bw / 2, y: gap + r * (bw + gap) + bw / 2, w: bw, d: bw, h: 2.4, kind: 'booth', label: 'Exhibition stand', col: [78 + (c * 13) % 40, 90, 110 - (r * 11) % 30] });
      break;
    }
    case 'open': default: {
      add({ x: w / 2, y: d - 0.4, w: Math.min(4, w - 1), d: 0.5, h: 1.0, kind: 'cabinet', label: 'Equipment store', col: STEEL });
      along(clampN(w / 3, 1, 6), d / 2, 1.2, 1.2, 0.5, 'mat', 'Floor equipment', GREEN); break;
    }
  }
  // keep every fixture inside the walls
  for (const f of out) { f.x = Math.max(f.w / 2 + 0.05, Math.min(w - f.w / 2 - 0.05, f.x)); f.y = Math.max(f.d / 2 + 0.05, Math.min(d - f.d / 2 - 0.05, f.y)); }
  return { rule, items: out };
}
