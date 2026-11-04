/**
 * The SIGNAL signal-flow simulator (the V2.5.3 `signalflow` lab type, 26 labs in SIGNAL_LIB.json): sources, processors and buses with
 * gains and mutes, the lab's fixed wiring plus the patches the learner adds, levels in dB propagated through the graph (uncorrelated
 * sources sum as powers), and the lab's own targets. Pure, for the unit tests and the page.
 */
export interface SfNode { id: string; label: string; kind: 'src' | 'proc' | 'bus' | 'out'; col: number; row: number; level?: number; gain?: { value: number; edit: boolean; min: number; max: number; step: number }; mute?: { value: boolean; edit: boolean }; short?: string }
export interface SfLab { id: string; type: string; title: string; brief: string; domain: string; time?: number; nodes: SfNode[]; wires: Array<[string, string]>; targets: Array<{ node: string; must?: string[]; min?: number; max?: number }>; math: Array<{ q: string; answer: number; unit: string; hint: string; tol: number }>; success: string; timeoutWhy?: string }
export interface SfState { gains: Record<string, number>; mutes: Record<string, boolean>; patches: Array<[string, string]> }

export const dbsum = (l: number[]) => { const v = l.filter(Number.isFinite); return v.length ? 10 * Math.log10(v.reduce((a, x) => a + 10 ** (x / 10), 0)) : -Infinity; };
export const initState = (L: SfLab): SfState => ({ gains: Object.fromEntries(L.nodes.filter((n) => n.gain).map((n) => [n.id, n.gain!.value])), mutes: Object.fromEntries(L.nodes.filter((n) => n.mute).map((n) => [n.id, n.mute!.value])), patches: [] });
const ORDER: Record<SfNode['kind'], number> = { src: 0, proc: 1, bus: 2, out: 3 };
/** A patch may run forward only: source → processor or bus, processor → bus, bus → output; never twice, never to itself. */
export function patchError(L: SfLab, s: SfState, from: string, to: string): string | null {
  const a = L.nodes.find((n) => n.id === from), b = L.nodes.find((n) => n.id === to);
  if (!a || !b) return 'choose both ends of the patch';
  if (ORDER[b.kind] <= ORDER[a.kind] || a.kind === 'out') return `${a.label} cannot feed ${b.label}: signal runs from sources to processors to buses to outputs`;
  if (a.kind === 'src' && b.kind === 'out') return 'a source reaches an output through a bus';
  if ([...L.wires, ...s.patches].some(([x, y]) => x === from && y === to)) return `${a.label} already feeds ${b.label}`;
  return null;
}
export function evaluate(L: SfLab, s: SfState) {
  const edges = [...L.wires, ...s.patches]; const memo = new Map<string, { level: number; from: Set<string> }>();
  const at = (id: string, depth = 0): { level: number; from: Set<string> } => {
    if (memo.has(id)) return memo.get(id)!; const n = L.nodes.find((x) => x.id === id)!;
    if (depth > 20) return { level: -Infinity, from: new Set() };
    let r: { level: number; from: Set<string> };
    if (n.kind === 'src') r = { level: n.level ?? -Infinity, from: new Set([n.id]) };
    else { const ins = edges.filter(([, t]) => t === id).map(([f]) => at(f, depth + 1)); const muted = !!s.mutes[id]; const g = s.gains[id] ?? 0;
      r = { level: muted ? -Infinity : dbsum(ins.map((x) => x.level)) + (n.kind === 'out' ? 0 : g), from: muted ? new Set() : new Set(ins.flatMap((x) => [...x.from])) }; }
    memo.set(id, r); return r;
  };
  const results = L.targets.map((t) => { const v = at(t.node); const node = L.nodes.find((n) => n.id === t.node)!; const missing = (t.must || []).filter((m) => !v.from.has(m));
    const inRange = (t.min === undefined || v.level >= t.min - 1e-9) && (t.max === undefined || v.level <= t.max + 1e-9);
    return { node: t.node, label: node.label, level: v.level, missing: missing.map((m) => L.nodes.find((n) => n.id === m)?.label || m), ok: !missing.length && inRange && Number.isFinite(v.level), range: t.min !== undefined ? `${t.min} … ${t.max} dB` : 'any level' }; });
  return { levels: Object.fromEntries(L.nodes.map((n) => [n.id, at(n.id).level])), results, ok: results.every((r) => r.ok) };
}
export const mathOk = (m: SfLab['math'][number], v: string) => v.trim() !== '' && Number.isFinite(Number(v)) && Math.abs(Number(v) - m.answer) <= m.tol + 1e-9;
