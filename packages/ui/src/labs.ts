/**
 * SIGNAL Fix-It Labs: the shell's rules and the simulators' models, without rendering. Restored 11 November 2026 to the founder's
 * build package (docs/04-engine-specs.md §5 and the reference runtime, labs.js mathBox, mountLab, recordLab and lab<Kind>); where the
 * two disagree the reference wins.
 *
 * The shell: "Open the lab" starts the clock (doubled relaxed, none off); each math step is checked on its own (within its tolerance,
 * or 2% of the answer), and after two wrong tries or a right one its equation shows; "Test the fix" passes only when the simulator's
 * check passes and every step is right, before the clock ends; a failed test lists why and counts a miss, and after three misses
 * "Show me the fix" ends the lab as not passed; the clock running out ends it as failed. Record {passed, done, tries, passTry}.
 *
 * Simulators here so far: signal flow (26 labs). Each exposes check() → {ok, why}. The demonstrator's earlier signal-flow model
 * (apps/demo/src/learn/signalflow.ts) could not remove a wire the lab starts with, knew only `must`/`min`/`max` targets (not `mustNot`,
 * `via`, `notVia`), allowed patches by block kind instead of by column, and did not fail a clipping stage; this one follows the reference.
 */

// ------------------------------------------------------------------------------------------------------------------------- shell
export interface MathStep { q: string; answer: number; unit?: string; tol?: number; hint?: string; why?: string; wrong?: string; f?: string }
export interface LabRecord { passed: boolean; done: boolean; tries: number; passTry: number }
export interface Check { ok: boolean; why: string[]; notes?: string[] }

export const num = (v: string | number): number | null => { if (typeof v === 'number') return Number.isFinite(v) ? v : null; const x = parseFloat(String(v).replace(',', '.')); return Number.isNaN(x) ? null : x; };
export const mathRight = (m: MathStep, v: number) => Math.abs(v - m.answer) <= (m.tol != null ? m.tol : Math.abs(m.answer) * 0.02 + 1e-9);
export const clockFor = (time: number | undefined, factor: number): number | null => (time && factor ? time * factor : null);
export function recordLab(prev: LabRecord | undefined, pass: boolean, fin = false): LabRecord {
  const tries = (prev?.tries || 0) + 1; return { passed: !!(prev?.passed || pass), done: !!(prev?.done || fin || pass), tries, passTry: prev?.passTry || (pass ? tries : 0) };
}
export function readLab(x: unknown): LabRecord | null { const r = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>; const n = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 9999;
  return typeof r['passed'] === 'boolean' && typeof r['done'] === 'boolean' && n(r['tries']) && (r['tries'] as number) >= 1 && n(r['passTry']) ? { passed: r['passed'], done: r['done'], tries: r['tries'] as number, passTry: r['passTry'] as number } : null; }

export interface Verdict { pass: boolean; final: boolean; head: string; lines: string[]; offerFix: boolean }
/** "Test the fix": pass, or a miss that keeps the lab open (with "Show me the fix" from the third miss). */
export function testFix(L: { success: string; timeoutWhy?: string }, check: Check, missingMath: string[], misses: number): Verdict {
  const mathOk = missingMath.length === 0;
  if (check.ok && mathOk) return { pass: true, final: true, head: '✓ Fixed · proven on the simulator', lines: [L.success, ...(check.notes || [])], offerFix: false };
  const lines = check.why.slice(); if (!mathOk) lines.unshift(`Math not finished: ${missingMath.join(' · ')}`);
  return { pass: false, final: false, head: '✕ Not fixed yet · keep working', lines, offerFix: misses + 1 >= 3 };
}
export function showFix(L: { timeoutWhy?: string }, check: Check): Verdict { return { pass: false, final: true, head: '✕ Not passed · here is the fix', lines: [L.timeoutWhy || 'Do the math first, then make one change at a time and watch the meters.', ...check.why], offerFix: false }; }
export function clockOut(L: { timeoutWhy?: string }, check: Check): Verdict { return { pass: false, final: true, head: '✕ Failed · the clock ran out', lines: [`The clock ran out with the system still broken. ${L.timeoutWhy || 'Do the math first, then make one change at a time and watch the meters.'}`, ...check.why], offerFix: false }; }

// --------------------------------------------------------------------------------------------------------------- signal flow
export interface SfNode { id: string; label: string; kind: 'src' | 'proc' | 'bus' | 'out'; col: number; row: number; level?: number; short?: string; gain?: { value: number; edit: boolean; min: number; max: number; step?: number }; mute?: { value: boolean; edit: boolean } }
export interface SfTarget { node: string; must?: string[]; mustNot?: string[]; via?: string[]; notVia?: string[]; min?: number; max?: number; whyNot?: string; whyNotVia?: string }
export interface SfLab { id: string; type: 'signalflow'; nodes: SfNode[]; wires: Array<[string, string]>; targets: SfTarget[] }
export interface SfState { gains: Record<string, number>; mutes: Record<string, boolean>; wires: string[] }
export interface SfLevel { lvl: number; srcs: Record<string, 1>; thru: Record<string, 1> }

const key = (a: string, b: string) => `${a}>${b}`;
export function sfInit(L: SfLab): SfState { return { gains: Object.fromEntries(L.nodes.map((n) => [n.id, n.gain ? n.gain.value : 0])), mutes: Object.fromEntries(L.nodes.map((n) => [n.id, !!n.mute?.value])), wires: L.wires.map(([a, b]) => key(a, b)) }; }
export const sfNode = (L: SfLab, id: string) => L.nodes.find((n) => n.id === id)!;
/** Connect or disconnect two blocks: only toward a later column, never out of an output or into a source (reference tap()). */
export const sfCanWire = (L: SfLab, from: string, to: string) => { const a = sfNode(L, from), b = sfNode(L, to); return !!a && !!b && b.col > a.col && a.kind !== 'out' && b.kind !== 'src'; };
export function sfToggle(L: SfLab, s: SfState, from: string, to: string): SfState { if (!sfCanWire(L, from, to)) return s; const k = key(from, to); return { ...s, wires: s.wires.includes(k) ? s.wires.filter((w) => w !== k) : [...s.wires, k] }; }
export function sfGain(L: SfLab, s: SfState, id: string, v: number): SfState { const g = sfNode(L, id).gain; if (!g || !g.edit || !Number.isFinite(v)) return s; return { ...s, gains: { ...s.gains, [id]: Math.max(g.min, Math.min(g.max, v)) } }; }
export function sfMute(L: SfLab, s: SfState, id: string): SfState { const m = sfNode(L, id).mute; if (!m || !m.edit) return s; return { ...s, mutes: { ...s.mutes, [id]: !s.mutes[id] } }; }
export const dbsum = (levels: number[]) => { let t = 0; for (const l of levels) if (Number.isFinite(l)) t += 10 ** (l / 10); return t > 0 ? 10 * Math.log10(t) : -Infinity; };
/** Levels, the sources heard and the blocks passed, column by column (uncorrelated sources sum as powers). */
export function sfCompute(L: SfLab, s: SfState): Record<string, SfLevel> {
  const out: Record<string, SfLevel> = {};
  for (const n of [...L.nodes].sort((a, b) => a.col - b.col)) {
    const ins = s.wires.filter((k) => k.split('>')[1] === n.id).map((k) => out[k.split('>')[0]!]).filter((x): x is SfLevel => !!x);
    let lvl: number; let srcs: Record<string, 1> = {}; let thru: Record<string, 1> = {};
    if (n.kind === 'src') { lvl = n.level ?? -Infinity; srcs[n.id] = 1; }
    else { lvl = dbsum(ins.map((i) => i.lvl)); for (const i of ins) { Object.assign(srcs, i.srcs); if (Number.isFinite(i.lvl)) Object.assign(thru, i.thru); } }
    if (s.mutes[n.id]) { lvl = -Infinity; srcs = {}; thru = {}; } else if (Number.isFinite(lvl)) { lvl += s.gains[n.id] || 0; thru[n.id] = 1; }
    out[n.id] = { lvl, srcs, thru };
  }
  return out;
}
const r1 = (x: number) => Math.round(x * 10) / 10;
export function sfCheck(L: SfLab, s: SfState): Check {
  const R = sfCompute(L, s); const why: string[] = []; const lab = (id: string) => sfNode(L, id).label;
  for (const t of L.targets) { const r = R[t.node]!; const l = lab(t.node);
    for (const x of t.must || []) if (!r.srcs[x]) why.push(`${l} is missing ${lab(x)}.`);
    for (const x of t.mustNot || []) if (r.srcs[x]) why.push(`${l} must NOT carry ${lab(x)}. ${t.whyNot || ''}`.trim());
    for (const x of t.via || []) if (!r.thru[x]) why.push(`${l} must pass through ${lab(x)}.`);
    for (const x of t.notVia || []) if (r.thru[x]) why.push(`${l} must NOT pass through ${lab(x)}. ${t.whyNotVia || ''}`.trim());
    if (t.min != null && (!Number.isFinite(r.lvl) || r.lvl < t.min)) why.push(`${l} is too low (${Number.isFinite(r.lvl) ? `${r1(r.lvl)} dB` : 'no signal'}; needs ≥ ${t.min} dB).`);
    if (t.max != null && Number.isFinite(r.lvl) && r.lvl > t.max) why.push(`${l} is too hot (${r1(r.lvl)} dB; needs ≤ ${t.max} dB).`);
  }
  for (const n of L.nodes) if (n.kind !== 'src' && Number.isFinite(R[n.id]!.lvl) && R[n.id]!.lvl > 0) why.push(`${n.label} is clipping (above 0 dB). Fix gain at the earliest stage.`);
  return { ok: why.length === 0, why };
}

// ------------------------------------------------------------------------------------------------------------------- network
// VLAN membership, fixed addresses (inside the subnet, outside the automatic range, not shared), pairs that must reach each other,
// pairs that must be kept apart, and multicast flooding a sensitive device when its VLAN has no snooping (reference labNetwork).
export interface NetVlan { id: number; name: string; subnet: string; dhcp: [number, number] | null; igmp?: boolean; igmpEdit?: boolean }
export interface NetDevice { id: string; label: string; port: number; vlan: number; ip?: string; dhcp?: boolean; lock?: string[]; mbps?: number; multicast?: boolean; sensitive?: boolean; note?: string }
export interface NetLab { id: string; type: 'network'; vlans: NetVlan[]; devices: NetDevice[]; pairs?: Array<[string, string]>; forbid?: Array<[string, string, string?]>; uplink?: boolean; showIgmp?: boolean; switchLabel?: string }
export interface NetState { vlan: Record<string, number>; ip: Record<string, string>; igmp: Record<number, boolean> }
export function ip2n(s: string): number | null { const p = String(s || '').trim().split('.'); if (p.length !== 4) return null; let n = 0; for (const q of p) { if (!/^\d+$/.test(q) || +q > 255) return null; n = n * 256 + +q; } return n; }
export const n2ip = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
export function cidr(s: string) { const [a, b] = s.split('/'); const bits = +b!; const size = 2 ** (32 - bits); let base = ip2n(a!)!; base -= base % size; return { base, bits, size, first: base + 1, last: base + size - 2 }; }
export function netInit(L: NetLab): NetState { return { vlan: Object.fromEntries(L.devices.map((d) => [d.id, d.vlan])), ip: Object.fromEntries(L.devices.map((d) => [d.id, d.ip || ''])), igmp: Object.fromEntries(L.vlans.map((v) => [v.id, !!v.igmp])) }; }
const locked = (d: NetDevice, what: string) => !!d.lock?.includes(what);
export function netSetVlan(L: NetLab, s: NetState, id: string, vlan: number): NetState { const d = L.devices.find((x) => x.id === id); if (!d || locked(d, 'vlan') || !L.vlans.some((v) => v.id === vlan)) return s; return { ...s, vlan: { ...s.vlan, [id]: vlan } }; }
export function netSetIp(L: NetLab, s: NetState, id: string, ip: string): NetState { const d = L.devices.find((x) => x.id === id); if (!d || d.dhcp || locked(d, 'ip')) return s; return { ...s, ip: { ...s.ip, [id]: ip } }; }
export function netSetIgmp(L: NetLab, s: NetState, vlan: number, on: boolean): NetState { const v = L.vlans.find((x) => x.id === vlan); if (!v || v.igmpEdit === false || !L.showIgmp) return s; return { ...s, igmp: { ...s.igmp, [vlan]: on } }; }
export function netDevice(L: NetLab, s: NetState, id: string): { ok: boolean; issues: string[] } {
  const d = L.devices.find((x) => x.id === id)!; const v = L.vlans.find((x) => x.id === s.vlan[id])!; const issues: string[] = [];
  if (d.dhcp) return { ok: true, issues }; const ip = s.ip[id] || ''; const n = ip2n(ip);
  if (n === null) return { ok: false, issues: [`${d.label}: "${ip}" is not a valid address.`] };
  const net = cidr(v.subnet);
  if (n < net.first || n > net.last) issues.push(`${d.label}: ${ip} is outside VLAN ${v.id} (${v.subnet}, usable ${n2ip(net.first)}–${n2ip(net.last)}).`);
  if (v.dhcp && n >= net.base + v.dhcp[0] && n <= net.base + v.dhcp[1]) issues.push(`${d.label}: ${ip} sits inside the automatic range — another device can be handed the same address.`);
  for (const o of L.devices) if (o.id !== id && !o.dhcp && s.vlan[o.id] === s.vlan[id] && ip2n(s.ip[o.id] || '') === n) issues.push(`${d.label} and ${o.label} share ${ip}.`);
  return { ok: !issues.length, issues };
}
export const netReach = (L: NetLab, s: NetState, a: string, b: string) => netDevice(L, s, a).ok && netDevice(L, s, b).ok && s.vlan[a] === s.vlan[b];
export function netCheck(L: NetLab, s: NetState): Check {
  const why: string[] = []; const seen = new Set<string>(); const lab = (id: string) => L.devices.find((d) => d.id === id)!.label;
  for (const d of L.devices) for (const i of netDevice(L, s, d.id).issues) if (!seen.has(i)) { seen.add(i); why.push(i); }
  for (const [a, b] of L.pairs || []) if (!netReach(L, s, a, b)) why.push(`${lab(a)} can’t reach ${lab(b)}.`);
  for (const [a, b, w] of L.forbid || []) if (s.vlan[a] === s.vlan[b]) why.push(`${lab(a)} and ${lab(b)} must be on separate VLANs. ${w || ''}`.trim());
  if (L.uplink) for (const v of L.vlans) { const mc = L.devices.filter((d) => s.vlan[d.id] === v.id && d.multicast).reduce((t, d) => t + (d.mbps || 0), 0);
    if (mc && !s.igmp[v.id]) for (const d of L.devices) if (s.vlan[d.id] === v.id && d.sensitive) why.push(`${d.label} is being flooded with ${mc} Mb/s of multicast it never asked for (VLAN ${v.id} has no snooping).`); }
  return { ok: !why.length, why };
}

// ---------------------------------------------------------------------------------------------------------- power and fill
// Loads assigned to circuits (or switches, or conduits): unit 'A' divides watts by the circuit's volts; any other unit ('W' for a PoE
// budget, '%' for conduit fill) adds the load directly. A circuit is over when it draws more than `limit` (80% by default) of its
// breaker or budget; a load may have to sit on particular circuits (`only`). Planning for the electrician, never a procedure
// (reference labPower, used by the `power` and `fill` labs).
export interface PwrCircuit { id: string; label: string; breaker: number; volts?: number }
export interface PwrLoad { id?: string; label: string; watts: number; circuit?: string; lock?: boolean; only?: string[]; onlyWhy?: string }
export interface PwrLab { id: string; type: 'power' | 'fill'; circuits: PwrCircuit[]; loads: PwrLoad[]; limit?: number; unit?: string; capWord?: string; noneText?: string; noneWhy?: string; header?: string; okText?: string }
export type PwrState = string[];
export const pwrInit = (L: PwrLab): PwrState => L.loads.map((l) => l.circuit || '');
export function pwrAssign(L: PwrLab, s: PwrState, i: number, circuit: string): PwrState { const l = L.loads[i]; if (!l || l.lock || (circuit && !L.circuits.some((c) => c.id === circuit))) return s; const n = s.slice(); n[i] = circuit; return n; }
export const pwrUnit = (L: PwrLab) => L.unit || 'A';
export function pwrDraw(L: PwrLab, s: PwrState, c: PwrCircuit): number { const direct = pwrUnit(L) !== 'A'; return L.loads.reduce((t, l, i) => t + (s[i] === c.id ? l.watts / (direct ? 1 : c.volts || 1) : 0), 0); }
export function pwrCheck(L: PwrLab, s: PwrState): Check {
  const U = pwrUnit(L), limit = L.limit || 0.8, cap = L.capWord || (U === 'W' ? 'budget' : 'breaker'); const why: string[] = [];
  L.loads.forEach((l, i) => { if (!s[i]) why.push(l.label + (L.noneWhy || (U === 'W' ? ' has no power.' : ' isn’t plugged in.')));
    if (l.only && s[i] && !l.only.includes(s[i]!)) why.push(`${l.label} has to be on ${l.only.map((id) => L.circuits.find((c) => c.id === id)?.label || id).join(' or ')} (${l.onlyWhy || 'cable length'}).`); });
  for (const c of L.circuits) { const a = pwrDraw(L, s, c); if (a > c.breaker * limit) why.push(`${c.label}: ${r1(a)} ${U} — over ${Math.round(limit * 100)}% of its ${c.breaker} ${U} ${cap} (${r1(c.breaker * limit)} ${U}).`); }
  return { ok: !why.length, why };
}

// ------------------------------------------------------------------------------------------------------------- EQ and time
// notch: a ringing peak (and gentle ripple) measured through a 48 kHz peaking filter; your band must sit within `octTol` octaves of the
// ring, bring it to at most `maxRing` dB, and cut no more than `maxCollateral` dB an octave either side. align: two arrivals `dt` ms
// apart comb-filter until the delay matches within `tol`. avsync: sound against picture, inside the window (`early` ms early …
// `late` ms late) and matched within `tol` (reference peakingMag, labEQ, labAVSync).
export interface EqLab { id: string; type: 'eq'; mode: 'notch' | 'align' | 'avsync'; start?: { f?: number; g?: number; q?: number; delay?: number }; ring?: { f: number; gain: number; q: number }; ripple?: Array<[number, number, number]>; dt?: number; ratio?: number; tol?: number; maxRing?: number; maxCollateral?: number; octTol?: number; eqToo?: boolean; maxDelay?: number; early?: number; late?: number; fps?: number; delayOn?: string }
export interface EqState { f: number; g: number; q: number; delay: number }
export function peakingMag(f: number, f0: number, g: number, q: number): number {
  if (Math.abs(g) < 0.01) return 0; const fs = 48000, A = 10 ** (g / 40), w0 = (2 * Math.PI * f0) / fs, al = Math.sin(w0) / (2 * q), c = Math.cos(w0);
  const b0 = 1 + al * A, b1 = -2 * c, b2 = 1 - al * A, a0 = 1 + al / A, a1 = -2 * c, a2 = 1 - al / A, w = (2 * Math.PI * f) / fs;
  const mag = (x0: number, x1: number, x2: number) => { const re = x0 + x1 * Math.cos(w) + x2 * Math.cos(2 * w), im = -x1 * Math.sin(w) - x2 * Math.sin(2 * w); return Math.sqrt(re * re + im * im); };
  return 20 * Math.log10(mag(b0, b1, b2) / mag(a0, a1, a2));
}
export const eqInit = (L: EqLab): EqState => ({ f: L.start?.f ?? 1000, g: L.start?.g ?? 0, q: L.start?.q ?? 2, delay: L.start?.delay ?? 0 });
export const EQ_RANGE = { f: [20, 20000], g: [-18, 6], q: [0.3, 16] } as const;
export const eqMaxDelay = (L: EqLab) => (L.mode === 'avsync' ? L.maxDelay || 300 : L.maxDelay || 20);
export function eqSet(L: EqLab, s: EqState, k: keyof EqState, v: number): EqState { if (!Number.isFinite(v)) return s;
  if (k === 'delay') return L.mode === 'notch' ? s : { ...s, delay: Math.max(0, Math.min(eqMaxDelay(L), v)) };
  if (L.mode !== 'notch' && !L.eqToo) return s; const [lo, hi] = EQ_RANGE[k]; return { ...s, [k]: Math.max(lo, Math.min(hi, v)) }; }
const eqAt = (L: EqLab, s: EqState, f: number) => (L.mode === 'notch' || L.eqToo ? peakingMag(f, s.f, s.g, s.q) : 0);
/** What the listener hears at frequency f: the room's own response plus your band (for drawing and for the check). */
export function eqMeasured(L: EqLab, s: EqState, f: number): number {
  if (L.mode === 'notch') { let v = peakingMag(f, L.ring!.f, L.ring!.gain, L.ring!.q); for (const r of L.ripple || []) v += peakingMag(f, r[0], r[1], r[2]); return v; }
  const dt = ((L.dt || 0) - s.delay) / 1000, a = L.ratio || 0.9, re = 1 + a * Math.cos(2 * Math.PI * f * dt), im = -a * Math.sin(2 * Math.PI * f * dt);
  return 20 * Math.log10(Math.max(1e-6, Math.sqrt(re * re + im * im)));
}
export const eqHeard = (L: EqLab, s: EqState, f: number) => eqMeasured(L, s, f) + eqAt(L, s, f);
const r2 = (x: number) => Math.round(x * 100) / 100;
export function eqCheck(L: EqLab, s: EqState): Check {
  const why: string[] = [], notes: string[] = [];
  if (L.mode === 'avsync') { const early = L.early ?? 15, late = L.late ?? 45, off = s.delay - (L.dt || 0);
    if (off < -early) why.push(`Sound arrives ${r1(-off)} ms before the picture — viewers notice early sound first (window: ≤ ${early} ms early).`);
    if (off > late) why.push(`Sound arrives ${r1(off)} ms after the picture (window: ≤ ${late} ms late).`);
    if (!why.length && Math.abs(off) > (L.tol || 1)) why.push(`Inside the window, but not matched: ${r1(off)} ms off. Set the delay the measurement calls for.`);
    return { ok: !why.length, why, notes: [`Offset (sound − picture): ${r1(off)} ms = ${r2(off / (1000 / (L.fps || 29.97)))} frames.`] }; }
  if (L.mode === 'notch') { const ring = L.ring!; const at = eqHeard(L, s, ring.f); const maxRing = L.maxRing ?? 3;
    if (at > maxRing) why.push(`Still ringing: ${r1(at)} dB at the problem frequency (needs ≤ +${maxRing} dB).`);
    const collateral = Math.min(eqAt(L, s, ring.f / 2), eqAt(L, s, ring.f * 2));
    if (collateral < -(L.maxCollateral || 3)) why.push(`Too wide: you are cutting ${r1(-collateral)} dB an octave away. Narrow the band (raise Q) so you only remove the ring.`);
    if (Math.abs(Math.log2(s.f / ring.f)) > (L.octTol || 0.08)) why.push(`The band is off the ring: centered at ${Math.round(s.f)} Hz.`);
    notes.push(`Your band: ${Math.round(s.f)} Hz, ${s.g} dB, Q ${s.q}.`); return { ok: !why.length, why, notes }; }
  const res = Math.abs((L.dt || 0) - s.delay);
  if (res > (L.tol || 0.1)) why.push(`Arrivals still ${r2(res)} ms apart: the comb notches are still there (first notch near ${res > 0.001 ? `${Math.round(1 / ((2 * res) / 1000))} Hz` : '—'}).`);
  notes.push(`Delay set: ${s.delay} ms; residual ${Math.round(res * 1000) / 1000} ms. Aligned for this listening position — elsewhere the path difference, and the comb, return.`);
  return { ok: !why.length, why, notes };
}

// ------------------------------------------------------------------------------------------------------------------ camera
// A presenter in front of an LED wall: the presenter soft when focus is off (diopter error over the f-number); moiré when the wall is
// too sharp; bands when the exposure does not hold a whole number of the wall's refresh cycles or the wall is in another frame-rate
// family; stutter when the camera's rate is not the system's (reference labCamera; the picture itself is drawn by the runner).
export interface CamLab { id: string; type: 'camera'; subject: number; wall: number; system: number; mult?: number; kBlur?: number; kMoire?: number; tolBlur?: number; tolMoire?: number; wallEditable?: boolean; wallText?: string; start: CamState }
export interface CamState { focus: number; iris: number; shutter: number; fps: number; wallIn: number }
export const CAM_OPTS = { iris: [1.8, 2.8, 4, 5.6, 8, 11], shutter: [50, 60, 100, 120, 250, 500, 1000], fps: [23.976, 25, 29.97, 50, 59.94], wallIn: [50, 59.94, 60], focus: [0.5, 30] } as const;
export const camInit = (L: CamLab): CamState => ({ ...L.start });
export function camSet(L: CamLab, s: CamState, k: keyof CamState, v: number): CamState { if (!Number.isFinite(v)) return s;
  if (k === 'focus') return { ...s, focus: Math.max(0.5, Math.min(30, Math.round(v * 10) / 10)) };
  if (k === 'wallIn' && L.wallEditable === false) return s; if (!(CAM_OPTS[k] as readonly number[]).includes(v)) return s; return { ...s, [k]: v }; }
export function camModel(L: CamLab, s: CamState) {
  const blurSubj = (Math.abs(1 / s.focus - 1 / L.subject) * (L.kBlur || 60)) / s.iris;
  const moire = Math.exp((-Math.abs(1 / s.focus - 1 / L.wall) * (L.kMoire || 120)) / s.iris);
  const cycles = (s.wallIn * (L.mult || 8)) / s.shutter, frac = Math.abs(cycles - Math.round(cycles));
  const familyOK = Math.abs(s.wallIn - (s.fps > 30 ? s.fps : s.fps * 2)) < 0.05 || Math.abs(s.wallIn - s.fps) < 0.05;
  return { blurSubj, moire, banding: Math.min(1, Math.min(1, frac * 2.2) + (familyOK ? 0 : 0.6)), beat: familyOK ? 0 : Math.abs(s.wallIn - s.fps), stutter: Math.abs(s.fps - L.system) > 0.01, cycles };
}
export function camCheck(L: CamLab, s: CamState): Check {
  const m = camModel(L, s); const why: string[] = [];
  if (m.blurSubj > (L.tolBlur || 0.8)) why.push(`The presenter is soft: focus is at ${s.focus} m, the presenter is not.`);
  if (m.moire > (L.tolMoire || 0.45)) why.push('Moiré on the wall: the wall is too sharp. Focus on the person and open the iris to soften the wall.');
  if (m.banding > 0.15) why.push(`Bands on the wall: ${r2(m.cycles)} refresh cycles per exposure${m.beat ? `, and the wall is in a different frame-rate family (${r2(m.beat)} Hz beat)` : ''}. Aim for a whole number in the same family.`);
  if (m.stutter) why.push(`Stutter: the camera runs ${s.fps}p but the switcher runs ${L.system}p. Every source must match the system.`);
  return { ok: !why.length, why, notes: [`Final: focus ${s.focus} m, f/${s.iris}, 1/${s.shutter}, ${s.fps}p, wall ${s.wallIn} Hz.`] };
}

// ---------------------------------------------------------------------------------------------------------------------- DMX
// Start addresses and footprints in one 512-channel universe; every link rated data cable (not microphone cable, not a Y-split);
// a terminator at the end of the line (reference labDMX).
export interface DmxLab { id: string; type: 'dmx'; fixtures: Array<{ label: string; foot: number; addr: number }>; links: Array<{ label: string; type: 'data' | 'mic' | 'y' }>; term?: boolean }
export interface DmxState { addr: number[]; links: Array<'data' | 'mic' | 'y'>; term: boolean }
export const dmxInit = (L: DmxLab): DmxState => ({ addr: L.fixtures.map((f) => f.addr), links: L.links.map((k) => k.type), term: !!L.term });
export const dmxSetAddr = (L: DmxLab, s: DmxState, i: number, v: number): DmxState => (Number.isFinite(v) && L.fixtures[i] ? { ...s, addr: s.addr.map((a, j) => (j === i ? Math.round(v) : a)) } : s);
export const dmxSetLink = (L: DmxLab, s: DmxState, i: number, t: 'data' | 'mic' | 'y'): DmxState => (L.links[i] && ['data', 'mic', 'y'].includes(t) ? { ...s, links: s.links.map((x, j) => (j === i ? t : x)) } : s);
export const dmxTerm = (s: DmxState): DmxState => ({ ...s, term: !s.term });
export function dmxCheck(L: DmxLab, s: DmxState): Check {
  const why: string[] = []; const F = L.fixtures.map((f, i) => ({ f, a: s.addr[i]! })); const end = (x: { f: { foot: number }; a: number }) => x.a + x.f.foot - 1;
  for (let i = 0; i < F.length; i += 1) for (let j = i + 1; j < F.length; j += 1) { const a = F[i]!, b = F[j]!; if (a.a <= end(b) && b.a <= end(a)) why.push(`${a.f.label} (${a.a}–${end(a)}) overlaps ${b.f.label} (${b.a}–${end(b)}).`); }
  for (const x of F) if (x.a < 1 || end(x) > 512) why.push(`${x.f.label} runs outside the 512-channel universe.`);
  L.links.forEach((k, i) => { if (s.links[i] === 'mic') why.push(`Link ${k.label} is microphone cable: it fits, but it isn’t built for data.`); if (s.links[i] === 'y') why.push(`Link ${k.label} is a Y-split: DMX is a line, not a tree.`); });
  if (!s.term) why.push('No terminator at the end of the line.');
  return { ok: !why.length, why };
}

// ----------------------------------------------------------------------------------------------------------------------- RF
// Wireless carriers inside the allowed band, clear of occupied ranges (with a guard), spaced apart, and off every third-order
// intermodulation product: 2a − b for every pair, and a + b − c for every three when the lab asks for it (reference labRF).
export interface RfLab { id: string; type: 'rf'; tx: Array<{ label: string; f: number; lock?: boolean }>; band: [number, number]; blocked?: Array<[number, number, string]>; spacing?: number; guard?: number; threeTx?: boolean }
export const rfInit = (L: RfLab): number[] => L.tx.map((t) => t.f);
export const rfSet = (L: RfLab, s: number[], i: number, f: number): number[] => (Number.isFinite(f) && L.tx[i] && !L.tx[i]!.lock ? s.map((x, j) => (j === i ? f : x)) : s);
export function rfProducts(L: RfLab, fr: number[]): Array<{ f: number; k: string }> {
  const out: Array<{ f: number; k: string }> = [];
  for (let a = 0; a < fr.length; a += 1) for (let b = 0; b < fr.length; b += 1) if (a !== b) out.push({ f: 2 * fr[a]! - fr[b]!, k: `2×${L.tx[a]!.label}−${L.tx[b]!.label}` });
  if (L.threeTx) for (let x = 0; x < fr.length; x += 1) for (let y = x + 1; y < fr.length; y += 1) for (let z = 0; z < fr.length; z += 1) if (z !== x && z !== y) out.push({ f: fr[x]! + fr[y]! - fr[z]!, k: `${L.tx[x]!.label}+${L.tx[y]!.label}−${L.tx[z]!.label}` });
  return out;
}
const r3 = (x: number) => Math.round(x * 1000) / 1000;
export function rfCheck(L: RfLab, fr: number[]): Check {
  const why: string[] = [], im = rfProducts(L, fr), sp = L.spacing || 0.4, guard = L.guard || 0.1;
  fr.forEach((f, i) => { const lab = L.tx[i]!.label;
    if (f < L.band[0] || f > L.band[1]) why.push(`${lab} at ${f} MHz is outside the band you’re allowed to use here.`);
    for (const b of L.blocked || []) if (f >= b[0] - guard && f <= b[1] + guard) why.push(`${lab} at ${f} MHz sits on an occupied range (${b[2]}).`);
    fr.forEach((g, j) => { if (j > i && Math.abs(f - g) < sp) why.push(`${lab} and ${L.tx[j]!.label} are only ${r3(Math.abs(f - g))} MHz apart (need ≥ ${sp}).`); });
    for (const p of im) if (Math.abs(p.f - f) < guard + 1e-9) why.push(`${lab} at ${f} MHz lands on an intermod product (${p.k} = ${r3(p.f)} MHz).`); });
  return { ok: !why.length, why };
}
