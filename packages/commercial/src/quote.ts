/**
 * Monthly quote lines from the price list (V18-PILOT-01/02): every amount is a list price times a quantity, in integer cents. The three
 * rules the price list states are applied here and nowhere else:
 *   1. SIGNAL Teams includes the base named-user entitlement: a person with a SIGNAL Teams seat is not also charged the Enterprise
 *      Named User, nor the Learn enterprise curriculum seat — never the same seat twice.
 *   2. Search Party is charged per managed asset OR its monthly minimum, whichever is larger — never both.
 *   3. A bundle discount applies once to each eligible monthly line of the bundle's own SKUs, and never to a pilot fee, a trial, tax,
 *      payment fees, external licences or services. A discounted line is rounded half-up to the cent.
 * Tax is not computed here: every figure is before any applicable tax.
 */
import { SKUS, BUNDLES, PILOTS } from './generated/catalog.js';
import type { PilotSku } from './types.js';

export interface QuoteInput {
  /** quantity per SKU (rooms, users, assets, buildings …) */
  quantities: Readonly<Record<string, number>>;
  /** how many of the SEAT-ENTERPRISE users also hold a SIGNAL-TEAM seat (they are not charged the named-user rate) */
  enterpriseUsersWithSignalTeam?: number;
  /** how many of the LEARN-OPS learners also hold a SIGNAL-TEAM seat */
  learnersWithSignalTeam?: number;
  bundle?: string;
  pilot?: PilotSku;
}
export interface QuoteLine { sku: string; name: string; quantity: number; unitCents: number; listCents: number; discountPct: number; cents: number; note?: string }
export interface Quote { monthly: QuoteLine[]; oneTime: QuoteLine[]; monthlyCents: number; oneTimeCents: number; notes: string[] }

const sku = (id: string) => { const s = SKUS.find((x) => x.sku === id); if (!s) throw new Error(`unknown SKU ${id}`); return s; };
const NEVER_DISCOUNTED = new Set(['SIGNAL-TRIAL', 'SIGNAL-FREE']);

export function quote(input: QuoteInput): Quote {
  const q: Record<string, number> = {};
  for (const [id, n] of Object.entries(input.quantities)) { sku(id); if (!Number.isInteger(n) || n < 0) throw new Error(`quantity of ${id} must be a whole number ≥ 0`); if (n) q[id] = n; }
  if (q['SEARCH-MIN']) throw new Error('SEARCH-MIN is never ordered: it replaces the per-asset charge when that is smaller');
  const notes: string[] = []; const lines: QuoteLine[] = []; const oneTime: QuoteLine[] = [];
  const team = q['SIGNAL-TEAM'] || 0;
  const covered = (n: number | undefined, of: number, what: string) => { const c = n || 0; if (!Number.isInteger(c) || c < 0 || c > of || c > team) throw new Error(`${what} cannot exceed the seats of either kind`); return c; };
  const seatCovered = covered(input.enterpriseUsersWithSignalTeam, q['SEAT-ENTERPRISE'] || 0, 'enterprise users with a SIGNAL Teams seat');
  const learnCovered = covered(input.learnersWithSignalTeam, q['LEARN-OPS'] || 0, 'learners with a SIGNAL Teams seat');
  const bundle = input.bundle ? BUNDLES.find((b) => b.id === input.bundle) : undefined;
  if (input.bundle && !bundle) throw new Error(`unknown bundle ${input.bundle}`);
  for (const s of SKUS) {
    let n = q[s.sku] || 0; if (!n) continue; let note: string | undefined;
    if (s.sku === 'SEAT-ENTERPRISE' && seatCovered) { n -= seatCovered; note = `${seatCovered} user${seatCovered === 1 ? '' : 's'} covered by a SIGNAL Teams seat: not charged twice`; notes.push(note); }
    if (s.sku === 'LEARN-OPS' && learnCovered) { n -= learnCovered; note = `${learnCovered} learner${learnCovered === 1 ? '' : 's'} covered by a SIGNAL Teams seat: not charged twice`; notes.push(note); }
    if (!n) { lines.push({ sku: s.sku, name: s.name, quantity: 0, unitCents: s.cents, listCents: 0, discountPct: 0, cents: 0, note }); continue; }
    let line = { sku: s.sku, name: s.name, quantity: n, unitCents: s.cents, listCents: n * s.cents };
    if (s.sku === 'SEARCH') { const min = sku('SEARCH-MIN'); if (line.listCents < min.cents) { line = { sku: min.sku, name: min.name, quantity: 1, unitCents: min.cents, listCents: min.cents }; note = `${n} assets at the per-asset rate come to less than the monthly minimum: the minimum applies instead, not in addition`; notes.push(note); } }
    const eligible = !!bundle && bundle.skus.includes(s.sku) && !NEVER_DISCOUNTED.has(s.sku);
    const pct = eligible ? bundle!.discountPct : 0;
    const cents = pct ? Math.floor((line.listCents * (100 - pct) + 50) / 100) : line.listCents;
    (s.sku === 'SIGNAL-TRIAL' ? oneTime : lines).push({ ...line, discountPct: pct, cents, note });
  }
  if (bundle) notes.push(`${bundle.name}: ${bundle.discount} off each eligible monthly line. ${bundle.rule}.`);
  if (input.pilot) { const p = PILOTS.find((x) => x.sku === input.pilot)!; oneTime.push({ sku: p.sku, name: p.name, quantity: 1, unitCents: p.cents, listCents: p.cents, discountPct: 0, cents: p.cents, note: 'one-time pilot fee: never discounted' }); }
  const sum = (xs: QuoteLine[]) => xs.reduce((a, l) => a + l.cents, 0);
  notes.push('Before any applicable tax.');
  return { monthly: lines, oneTime, monthlyCents: sum(lines), oneTimeCents: sum(oneTime), notes };
}
