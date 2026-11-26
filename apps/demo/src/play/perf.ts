/**
 * The performance check's arithmetic and its synthetic environment (25 Nov 2026; roadmap A19).
 *
 * Founder, 24 Nov 2026: "I would eventually want representative desktop and mobile performance benchmarks covering rendering,
 * navigation responsiveness, memory consumption and larger spatial environments." And on 25 Nov: no more time chasing 30 frames a
 * second on a test machine without a graphics processor "before obtaining representative measurements on actual customer hardware."
 * So this is the means to take those measurements: a check a person runs on their own desktop or phone, in the page, and exports.
 * Nothing here touches the page or the network; PerformanceCheck.tsx runs it.
 *
 * What a result is: one run, on one device, in one browser, at one moment. It is a measurement of that, and of nothing else.
 */
import { boxVerts, type V3 } from './gl.js';

/** the founder's two figures (24 Nov 2026): 30 frames a second "suggested interactive target", 60 "ideal smooth experience" */
export const TARGET = 30;
export const IDEAL = 60;

export interface Pace { frames: number; seconds: number; fps: number; medianMs: number; p95Ms: number; worstMs: number; over33: number }
const r1 = (n: number) => Math.round(n * 10) / 10;
/** the pace of a run of frames from the length of each in milliseconds; null when there are too few to say anything */
export function paceOf(ms: readonly number[]): Pace | null {
  const v = ms.filter((x) => Number.isFinite(x) && x > 0); if (v.length < 5) return null;
  const total = v.reduce((a, x) => a + x, 0); const s = [...v].sort((a, b) => a - b); const at = (q: number) => s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))]!;
  return { frames: v.length, seconds: r1(total / 1000), fps: r1(v.length * 1000 / total), medianMs: r1(at(0.5)), p95Ms: r1(at(0.95)), worstMs: r1(s[s.length - 1]!), over33: Math.round(100 * v.filter((x) => x > 1000 / TARGET + 0.1).length / v.length) / 100 };
}
/** against a target: held when the pace is at or above it and no more than one frame in twenty ran longer than that target allows */
export function holds(p: Pace | null, target: number): 'held' | 'below' | 'not run' {
  if (!p) return 'not run'; return p.fps >= target && p.p95Ms <= 1000 / target * 1.25 ? 'held' : 'below';
}

/** a step of the ladder against a target: a step that ran and was too slow to measure is below it, not "not run" */
export function standing(s: StepResult, target: number): 'held' | 'below' | 'not run' { return s.pace ? holds(s.pace, target) : s.tooSlow ? 'below' : 'not run'; }
/** the browser and system a user-agent string names, most specific first (Edge, Opera and in-app browsers all also say "Chrome"; Android also says "Linux") */
export function browserOf(ua: string): string {
  const first = (list: Array<[RegExp, string]>) => { for (const [re, name] of list) { const m = re.exec(ua); if (m) return `${name}/${m[1]}`; } return 'browser not recognized'; };
  const b = first([[/Edg(?:e|A|iOS)?\/([\d.]+)/, 'Edge'], [/OPR\/([\d.]+)/, 'Opera'], [/Firefox\/([\d.]+)/, 'Firefox'], [/(?:Chrome|CriOS)\/([\d.]+)/, 'Chrome'], [/Version\/([\d.]+).*Safari/, 'Safari']]);
  const os = /Android/.test(ua) ? 'Android' : /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${b} on ${os}` : b;
}
/** the memory a browser reports for the device: a rounded figure that never exceeds 8, so 8 means "8 or more" */
export const memoryWords = (gb: number | null): string => (gb == null ? 'not reported by this browser' : gb >= 8 ? '8 GB or more (the browser reports no more than 8)' : `about ${gb} GB (a rounded figure the browser gives)`);
/** one block of the synthetic district: about 12,500 triangles of plain towers on a square of ground; the same block every time */
export const BLOCK_SIDE = 204;
export function block(): number[] {
  const v: number[] = []; const rnd = (n: number) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  const tones = ['#5B6B7E', '#6E7F92', '#8496A8', '#4A5868', '#9AA9B8', '#0E8F83', '#C9A227']; let i = 0;
  for (let gx = 0; gx < 34; gx++) for (let gz = 0; gz < 34; gz++) { if (v.length / 27 >= 12500 - 12) break; i += 1; if (rnd(i) < 0.1) continue;
    const x = gx * 6 - BLOCK_SIDE / 2 + 3, z = gz * 6 - BLOCK_SIDE / 2 + 3; const h = 4 + Math.floor(rnd(i + 0.3) * 9) * 4; const w = 3 + rnd(i + 0.6) * 2;
    boxVerts({ min: [x - w / 2, 0, z - w / 2], max: [x + w / 2, h, z + w / 2], color: tones[Math.floor(rnd(i + 0.9) * tones.length)]! }, v); }
  return v;
}
/** the ladder: how many blocks each step draws. With a block of about 12,500 triangles: 12,500 to 400,000 triangles a frame */
export const LADDER = [1, 2, 4, 8, 16, 32];
/** where the blocks of a step stand: a square of them, centred */
export function blockPlaces(count: number): V3[] {
  const side = Math.ceil(Math.sqrt(count)); const out: V3[] = [];
  for (let k = 0; k < count; k++) out.push([((k % side) - (side - 1) / 2) * BLOCK_SIDE, 0, (Math.floor(k / side) - (side - 1) / 2) * BLOCK_SIDE]);
  return out;
}
/** a step is not attempted after one this slow: a larger environment can only be slower, and a visitor should not wait for it */
export const STOP_BELOW = 5;

export interface DeviceFacts { cores: number | null; memoryGb: number | null; screen: string; pixelRatio: number; renderer: string; browser: string; reducedMotion: boolean; touch: boolean }
export interface StepResult { blocks: number; triangles: number; pace: Pace | null; skipped?: string; /** it ran, and drew too few frames to give a figure */ tooSlow?: boolean }
export type SceneKey = 'campus' | 'stadium' | 'expo';
export interface SceneResult { key: SceneKey; title: string; firstFrameMs: number | null; pace: Pace | null; detail: number | null; simple: boolean | null; triangles: number | null; draws: number | null;
  /** the scene's picture as it was measured: its size on the page and the pixels drawn */ picture: { cssWidth: number; cssHeight: number; width: number; height: number } | null; note?: string }
export interface MemoryReading { when: string; usedMb: number | null }
export interface PerfResult {
  schema: 'empathia.device-performance/1'; at: string; short: boolean; interrupted: string | null;
  canvas: { cssWidth: number; cssHeight: number; width: number; height: number } | null;
  device: DeviceFacts; ladder: StepResult[]; scenes: SceneResult[]; memory: MemoryReading[];
}
export const SCENES: Array<{ key: SceneKey; title: string }> = [{ key: 'campus', title: 'Campus Life' }, { key: 'stadium', title: 'Stadium LIVE' }, { key: 'expo', title: 'Expo LIVE' }];

/** the largest step of the ladder that held a target, in triangles a frame; null when none did */
export function largestHeld(ladder: readonly StepResult[], target: number): number | null {
  let best: number | null = null; for (const s of ladder) if (holds(s.pace, target) === 'held') best = Math.max(best ?? 0, s.triangles); return best;
}
/** one plain sentence for the top of a result */
export function headline(r: PerfResult): string {
  if (r.interrupted) return `The check was interrupted (${r.interrupted}); what was measured before that is below and is not a full result.`;
  const t = largestHeld(r.ladder, TARGET), i = largestHeld(r.ladder, IDEAL); const n = (x: number) => x.toLocaleString('en-US');
  const cap = t === null ? `In the synthetic environment this device did not hold ${TARGET} frames a second at any size tried` : `In the synthetic environment this device held ${TARGET} frames a second up to ${n(t)} triangles a frame${i === null ? `, and did not hold ${IDEAL} at any size` : i === t ? `, and ${IDEAL} at the same size` : `, and ${IDEAL} up to ${n(i)}`}`;
  const sc = r.scenes.filter((s) => s.pace).map((s) => `${s.title} ${s.pace!.fps}`).join(', ');
  return `${cap}.${sc ? ` The scenes, as a visitor meets them, ran at: ${sc} frames a second.` : ''}`;
}
/** the lines every result carries, on the page and in every exported file */
export const HONESTY = [
  'One run, on this device, in this browser, at this moment. Other programs, power saving, heat and a different browser all change it.',
  'The district is a synthetic environment made for this check, not a customer site. The three scenes are fictional venues with synthetic data.',
  'Frame times are as this browser reports them. Memory is the JavaScript memory this browser reports, where it reports any; it is not graphics memory.',
  'Nothing was sent anywhere. The result exists only in this page until you export it.',
];
