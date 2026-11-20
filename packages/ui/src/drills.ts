/**
 * SIGNAL practice drills: the rules of the six kinds, without any rendering. Restored 11 November 2026 to the founder's build
 * package (docs/04-engine-specs.md §4 and the reference runtime, app.js drillRoute … drillOrder); where the two disagree the reference
 * wins. Before this, the runner scored a triage plan against all the risk on the table instead of the best plan the budget allows, let
 * an ordering start already in order and re-shuffled it on every render, offered only the drill's own classes, and had no clock.
 *
 * Every function is pure so it can be tested on all 146 drills; the runner in signal.tsx draws what these return.
 */

export interface DrillData { id: string; type: string; domain: string; time?: number; title: string; brief: string; success?: string; timeoutWhy?: string; [k: string]: unknown }
export interface DrillRecord { passed: boolean; tries: number; first: boolean }
export interface Verdict { pass: boolean; head: string; lines: string[] }

/** The eight failure classes a cause belongs to (reference CLASSES). */
export const CLASSES = ['Signal', 'Power', 'Control', 'Network/Data', 'Configuration', 'Dependency', 'Environment', 'Human workflow'] as const;
export const KIND_LABEL: Record<string, string> = { route: 'Route it', firstfail: 'First failure point', clues: 'Clue board', classmatch: 'Class match', triage: 'Triage', order: 'Sequence' };

/** m:ss, rounding up, never negative (reference fmt). */
export function fmt(s: number): string { const t = Math.max(0, Math.ceil(s)); const m = Math.floor(t / 60), r = t % 60; return `${m}:${r < 10 ? '0' : ''}${r}`; }
/** The reference's seeded shuffle, so a drill always opens in the same order for everyone. */
export function shuffle<T>(a: readonly T[], seed: number): T[] { const b = a.slice(); let x = seed || 7; for (let i = b.length - 1; i > 0; i -= 1) { x = (x * 9301 + 49297) % 233280; const j = Math.floor((x / 233280) * (i + 1)); const t = b[i]!; b[i] = b[j]!; b[j] = t; } return b; }
export function hashSeed(s: string): number { let h = 0; for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 100000; return h + 11; }

/** Seconds on the clock: the drill's own time, doubled when relaxed; none when untimed or the clock is off (factor 0). */
export const clockFor = (d: DrillData, factor: number): number | null => (d.time && factor ? d.time * factor : null);
export function timeoutVerdict(d: DrillData): Verdict { return { pass: false, head: '✕ Failed · the clock ran out', lines: ['The clock ran out. In a live room, not deciding is still a decision — and it has a cost.', d.timeoutWhy || 'Work the method in order: what is the system trying to do, where does the path start, what changed?'] }; }
/** A try is recorded: passed once stays passed; the first result never changes (reference recordDrill). */
export function recordDrill(prev: DrillRecord | undefined, pass: boolean): DrillRecord { return { passed: !!(prev?.passed || pass), tries: (prev?.tries || 0) + 1, first: prev ? prev.first : !!pass }; }
export function readDrill(x: unknown): DrillRecord | null { const r = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>; return typeof r['passed'] === 'boolean' && typeof r['first'] === 'boolean' && Number.isInteger(r['tries']) && (r['tries'] as number) >= 1 && (r['tries'] as number) <= 9999 ? { passed: r['passed'], tries: r['tries'] as number, first: r['first'] } : null; }

// ------------------------------------------------------------------------------------------------------------------------- route
export interface Slot { label: string; answer: string }
export const routePool = (d: DrillData): string[] => shuffle(d['pool'] as string[], hashSeed(d.id));
export function gradeRoute(d: DrillData, placed: Record<number, string>): Verdict {
  const slots = d['slots'] as Slot[]; const why = (d['why'] || {}) as Record<string, string>; const bad: string[] = [];
  slots.forEach((s, i) => { const p = placed[i]; if (p !== s.answer) bad.push(`${s.label}: ${p ? `${p} — ${why[p] || 'That part doesn’t belong here.'}` : 'left empty — the path is broken at this point.'} It should be ${s.answer}.`); });
  return bad.length ? { pass: false, head: `✕ Failed · ${bad.length} of ${slots.length} wrong`, lines: bad } : { pass: true, head: '✓ Passed · path complete', lines: [String(d.success || '')] };
}

// --------------------------------------------------------------------------------------------------------------------- firstfail
export interface Stage { name: string; reading: string; why: string }
export function gradeFirstfail(d: DrillData, picked: number): Verdict {
  const st = d['stages'] as Stage[]; const ans = d['answer'] as number; const ok = picked === ans;
  return { pass: ok, head: ok ? '✓ Passed · first failure found' : '✕ Failed · wrong stage', lines: [st[picked]?.why || '', ok ? String(d.success || '') : `The first failure is at ${st[ans]!.name}: ${st[ans]!.why}`] };
}

// ------------------------------------------------------------------------------------------------------------------------- clues
export interface Clue { t: string; k: 'key' | 'weak' | 'herring' | 'destroys' | string; why: string }
export const clueOrder = (d: DrillData): number[] => shuffle((d['clues'] as Clue[]).map((_, i) => i), hashSeed(d.id));
export function gradeClues(d: DrillData, chosen: readonly number[]): Verdict {
  const cl = d['clues'] as Clue[]; const pick = d['pick'] as number; const need = (d['need'] as number) || pick;
  let keys = 0, destroyed = false; const lines: string[] = [];
  for (const i of clueOrder(d)) { if (!chosen.includes(i)) continue; const c = cl[i]!; if (c.k === 'key') keys += 1; if (c.k === 'destroys') destroyed = true; lines.push(`${c.k === 'key' ? '✓' : c.k === 'weak' ? '~' : '✕'} ${c.t} — ${c.why}`); }
  if (destroyed) lines.unshift('You picked an action that destroys evidence. The clue it might have given you is gone for good.');
  const pass = keys >= need && !destroyed;
  return { pass, head: pass ? `✓ Passed · ${keys} discriminating clues` : `✕ Failed · ${keys} of ${need} discriminating clues`, lines: lines.concat(pass ? [String(d.success || '')] : ['The clues marked key are the ones that separate the explanations.']) };
}

// -------------------------------------------------------------------------------------------------------------------- classmatch
export interface ClassItem { s: string; c: string; why: string }
/** The drill's own groups when it has them (declared, or any item outside the eight classes); otherwise the eight failure classes. */
export function classesFor(d: DrillData): { list: string[]; custom: boolean } {
  const items = d['items'] as ClassItem[]; if (Array.isArray(d['classes'])) return { list: d['classes'] as string[], custom: true };
  if (items.every((it) => (CLASSES as readonly string[]).includes(it.c))) return { list: [...CLASSES], custom: false };
  return { list: [...new Set(items.map((it) => it.c))].sort(), custom: true };
}
export function gradeClassmatch(d: DrillData, pick: Record<number, string>): Verdict {
  const items = d['items'] as ClassItem[]; const bad: string[] = [];
  items.forEach((it, i) => { if (pick[i] !== it.c) bad.push(`${it.s} → ${it.c} (you chose ${pick[i] || 'nothing'}). ${it.why}`); });
  const pass = bad.length <= ((d['allow'] as number) || 0);
  return { pass, head: pass ? `✓ Passed · ${items.length - bad.length} of ${items.length}` : `✕ Failed · ${bad.length} misclassified`, lines: pass ? [String(d.success || ''), ...bad] : bad };
}

// ------------------------------------------------------------------------------------------------------------------------ triage
export interface TriageItem { id: string; name: string; cost: number; L: number; I: number; must?: boolean; why: string }
export const risk = (it: Pick<TriageItem, 'L' | 'I'>) => it.L * it.I;
/** The most risk any plan can retire: every subset that keeps all commitments and stays within budget (reference: exhaustive). */
export function triageBest(d: DrillData): number {
  const items = d['items'] as TriageItem[]; const budget = d['budget'] as number; let best = 0;
  for (let m = 0; m < 1 << items.length; m += 1) { let c = 0, r = 0, ok = true; items.forEach((it, i) => { if (m & (1 << i)) { c += it.cost; r += risk(it); } else if (it.must) ok = false; }); if (ok && c <= budget && r > best) best = r; }
  return best;
}
export const money = (d: DrillData, n: number) => `${(d['unit'] as string) || '$'}${n.toLocaleString('en-US')}`;
export function triageTotals(d: DrillData, on: readonly number[]): { cost: number; risk: number } { const items = d['items'] as TriageItem[]; return on.reduce((t, i) => ({ cost: t.cost + items[i]!.cost, risk: t.risk + risk(items[i]!) }), { cost: 0, risk: 0 }); }
export function gradeTriage(d: DrillData, on: readonly number[]): Verdict {
  const items = d['items'] as TriageItem[]; const budget = d['budget'] as number; const target = d['target'] as number; const best = triageBest(d); const t = triageTotals(d, on);
  const lines: string[] = [], fail: string[] = [];
  items.forEach((it, i) => {
    if (on.includes(i)) lines.push(`✓ Funded: ${it.name} (${money(d, it.cost)}, risk ${risk(it)}) — ${it.why}`);
    else if (it.must) fail.push(`You skipped a commitment: ${it.name}. ${it.why}`);
    else if (risk(it) >= 9) lines.push(`○ Not funded: ${it.name} (risk ${risk(it)}). Say it out loud to the board: this is the cost of doing nothing. ${it.why}`);
  });
  if (t.cost > budget) fail.unshift(`Over budget by ${money(d, t.cost - budget)}. A plan the board can’t pay for isn’t a plan.`);
  const share = best ? t.risk / best : 0;
  if (!fail.length && share < target) fail.push(`Your plan retires ${t.risk} of a best possible ${best} (${Math.round(share * 100)}%). Compare risk per dollar: cheap, high-risk items first.`);
  const pass = !fail.length;
  return { pass, head: pass ? `✓ Passed · risk retired ${t.risk} of ${best} possible` : '✕ Failed · the plan doesn’t hold', lines: (pass ? [String(d.success || '')] : fail).concat(lines) };
}

// ------------------------------------------------------------------------------------------------------------------------- order
/** The opening order: seeded, and never already correct (reversed if the shuffle happens to land in order). */
export function orderStart(d: DrillData): number[] { const o = shuffle((d['items'] as string[]).map((_, i) => i), hashSeed(d.id)); return o.every((v, i) => v === i) ? o.reverse() : o; }
export function move(order: readonly number[], pos: number, dir: -1 | 1): number[] { const j = pos + dir; if (j < 0 || j >= order.length) return order.slice(); const n = order.slice(); [n[pos], n[j]] = [n[j]!, n[pos]!]; return n; }
export function gradeOrder(d: DrillData, order: readonly number[]): Verdict {
  const items = d['items'] as string[]; const why = (d['why'] || []) as string[]; const bad: string[] = [];
  order.forEach((idx, pos) => { if (idx !== pos) bad.push(`Step ${pos + 1} should be “${items[pos]}”. ${why[pos] || ''}`.trim()); });
  return bad.length ? { pass: false, head: `✕ Failed · ${bad.length} steps out of order`, lines: bad } : { pass: true, head: '✓ Passed · clean sequence', lines: [String(d.success || '')] };
}
