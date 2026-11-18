/**
 * Assembling and scoring practice sessions. A practice exam draws from each duty in the proportion the published content outline gives
 * it, from the written bank first and the calculation drills where the bank runs short; it gives the same time per question as the real
 * exam. A percentage here is practice evidence only: AVIXA reports a scaled score (350 of 500 to pass) set by a criterion-referenced
 * standard, and no percentage here converts to it.
 */
import { CERTS, type CertId } from './facts.js';
import type { Q } from './types.js';
import { CTS_BANK } from './bank-cts.js';
import { CTSD_BANK } from './bank-ctsd.js';
import { CTSI_BANK } from './bank-ctsi.js';
import { CTS_MORE, CTSD_MORE, CTSI_MORE } from './bank-more.js';
import { drills, drillById, rng, TEMPLATES } from './gen.js';

export const BANKS: Record<CertId, Q[]> = { CTS: [...CTS_BANK, ...CTS_MORE], 'CTS-D': [...CTSD_BANK, ...CTSD_MORE], 'CTS-I': [...CTSI_BANK, ...CTSI_MORE] };

/** the largest practice exam this bank can fill in the outline's proportions (drills fill only the duties they practise) */
export function capacity(cert: CertId): number {
  const drilled = new Set(TEMPLATES.filter((t) => t.certs.includes(cert)).map((t) => t.domain[cert]![0]));
  for (let n = 100; n > 0; n--) { const a = allocation(cert, n); if (CERTS[cert].domains.every((d) => drilled.has(d.code) || BANKS[cert].filter((q) => q.domain === d.code).length >= (a[d.code] || 0))) return n; }
  return 0;
}
export const findQ = (cert: CertId, id: string): Q | null => BANKS[cert].find((q) => q.id === id) || drillById(cert, id);

function shuffle<T>(xs: T[], r: () => number): T[] { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; } return a; }

/** how many questions each duty gets in a session of `size`, by largest remainder so they sum to `size` */
export function allocation(cert: CertId, size: number): Record<string, number> {
  const ds = CERTS[cert].domains; const raw = ds.map((d) => ({ code: d.code, x: size * d.weight / 100 }));
  const out: Record<string, number> = Object.fromEntries(raw.map((d) => [d.code, Math.floor(d.x)])); let left = size - Object.values(out).reduce((a, b) => a + b, 0);
  for (const d of [...raw].sort((a, b) => (b.x % 1) - (a.x % 1))) { if (left <= 0) break; out[d.code]! += 1; left -= 1; }
  return out;
}

export type Mode = 'exam' | 'study' | 'drill' | 'missed' | 'domain';
export interface Session { cert: CertId; mode: Mode; seed: number; questions: Q[]; seconds: number | null }

export function assemble(cert: CertId, opts: { mode: Mode; size: number; seed: number; domain?: string; missed?: string[] }): Session {
  const r = rng(opts.seed); const bank = BANKS[cert]; const c = CERTS[cert];
  const secPerQ = c.minutes * 60 / c.questions.total;
  if (opts.mode === 'drill') return { cert, mode: 'drill', seed: opts.seed, questions: drills(cert, opts.size, opts.seed), seconds: null };
  if (opts.mode === 'missed') { const qs = (opts.missed || []).map((id) => findQ(cert, id)).filter((q): q is Q => !!q); return { cert, mode: 'missed', seed: opts.seed, questions: shuffle(qs, r).slice(0, opts.size), seconds: null }; }
  if (opts.mode === 'domain') { const pool = bank.filter((q) => q.domain === opts.domain); const extra = drills(cert, 40, opts.seed).filter((q) => q.domain === opts.domain);
    return { cert, mode: 'domain', seed: opts.seed, questions: shuffle([...pool, ...extra], r).slice(0, opts.size), seconds: null }; }
  const alloc = allocation(cert, opts.size); const gen = drills(cert, opts.size * 2, opts.seed ^ 0x5bd1e995); const out: Q[] = [];
  for (const d of c.domains) {
    const want = alloc[d.code] || 0; const mine = shuffle(bank.filter((q) => q.domain === d.code), r).slice(0, want);
    const more = gen.filter((q) => q.domain === d.code && !out.includes(q)).slice(0, want - mine.length);
    out.push(...mine, ...more);
  }
  // a duty the drills do not reach and the bank has run out of is filled from the rest of the bank, so the session keeps its length
  if (out.length < opts.size) out.push(...shuffle(bank.filter((q) => !out.includes(q)), r).slice(0, opts.size - out.length));
  const qs = shuffle(out, r);
  return { cert, mode: opts.mode, seed: opts.seed, questions: qs, seconds: opts.mode === 'exam' ? Math.round(secPerQ * qs.length) : null };
}

export interface Score { correct: number; total: number; pct: number; byDomain: Record<string, { correct: number; total: number }>; missed: string[]; unanswered: number }
export function score(s: Session, answers: Record<string, number>): Score {
  const byDomain: Score['byDomain'] = {}; let correct = 0; const missed: string[] = []; let unanswered = 0;
  for (const q of s.questions) { const d = (byDomain[q.domain] ||= { correct: 0, total: 0 }); d.total += 1; const a = answers[q.id];
    if (a === undefined) unanswered += 1; if (a === q.answer) { correct += 1; d.correct += 1; } else missed.push(q.id); }
  return { correct, total: s.questions.length, pct: s.questions.length ? Math.round(correct / s.questions.length * 100) : 0, byDomain, missed, unanswered };
}

// ------------------------------------------------------------------------------------------------ progress on this device
export interface Progress { best: Partial<Record<CertId, { pct: number; total: number; at: string }>>; missed: Partial<Record<CertId, string[]>>; seen: Partial<Record<CertId, number>> }
export const PROGRESS_KEY = 'empathia.certs.progress.v1';
export interface Store { getItem(k: string): string | null; setItem(k: string, v: string): void }
export function loadProgress(st: Store | null): Progress { try { const j = JSON.parse(st?.getItem(PROGRESS_KEY) || '{}'); return { best: j.best || {}, missed: j.missed || {}, seen: j.seen || {} }; } catch { return { best: {}, missed: {}, seen: {} }; } }
export function record(p: Progress, s: Session, sc: Score, now = new Date()): Progress {
  const cert = s.cert; const prev = new Set(p.missed[cert] || []);
  for (const q of s.questions) { if (sc.missed.includes(q.id)) prev.add(q.id); else prev.delete(q.id); }
  const best = { ...p.best }; if (s.mode === 'exam' && sc.total >= 20 && (!best[cert] || sc.pct > best[cert]!.pct)) best[cert] = { pct: sc.pct, total: sc.total, at: now.toISOString() };
  return { best, missed: { ...p.missed, [cert]: [...prev].slice(-300) }, seen: { ...p.seen, [cert]: (p.seen[cert] || 0) + s.questions.length } };
}
export function saveProgress(st: Store | null, p: Progress) { try { st?.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* storage refused: progress lasts this visit */ } }
