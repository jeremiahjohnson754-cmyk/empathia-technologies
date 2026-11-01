/**
 * The enterprise API's adapter to the shared reverification rules (ADR-0012) — pure, no database: rooms.ts reads the rows and hands them
 * in; the parity test (apps/demo/test/installations.test.mjs) feeds the same room through this adapter and through the demonstration's
 * store and asserts that the two say the same thing. The rules themselves are @empathia/commissioning-engine's: `reopenedBySubstitution`
 * (which tests a change of unit reopens, and why), `replacementsOf` / `substitutionUnits` (the changes the installation records show) and
 * `lifecycleBlockers` (the acceptance gate that never counts a superseded result). Only the bookkeeping is the API's: a result is
 * superseded when it was recorded at or before the latest change that reopens its test (the database's own clock).
 */
import { reopenedBySubstitution, replacementsOf, substitutionUnits, type InstallationFact, type UnitChange, type ChangeKind, type ReverificationState } from '@empathia/commissioning-engine';

export interface PlanRowDb { test_id: string; label: string; domain: string; personas: string[]; evidence: string[]; instrument: boolean; devices: string[] }
export interface CurrentResultDb { test_id: string; result_label: string; recorded_ms: number; recorded_at: string }
export interface PositionDb { code: string; label: string; category: string; model: string; model_history: unknown[] }
export interface Substitution { assetId: string; label: string; category: string; from: string; to: string; at: string; by: string }
export interface Reverification { testId: string; label: string; domain: string; personas: string[]; evidence: string[]; instrument: boolean; assets: string[]; reasons: string[]; substitutedAt: string; result: string; recordedAt: string | null; rerun: boolean }
export type Change = Substitution | UnitChange;

/** Model substitutions since `sinceMs`, from each position's design history (the model it had then → the model now). */
export function substitutionsFrom(positions: readonly PositionDb[], sinceMs: number): Substitution[] {
  const out: Substitution[] = [];
  for (const a of positions) {
    const h = ((a.model_history || []) as Array<{ model: string; until: string; by: string }>).filter((x) => Date.parse(x.until) > sinceMs);
    if (h.length) out.push({ assetId: a.code, label: a.label, category: a.category, from: h[0]!.model, to: a.model, at: h[h.length - 1]!.until, by: h[h.length - 1]!.by });
  }
  return out;
}
/**
 * Every change of unit that reopens tests now, oldest first: while an accepted room is recommissioned (`recommissionedSinceMs` = the current
 * baseline's publication), the model substitutions of the design history — with the units the installation records name — and the like-for-
 * like replacements since then; otherwise (null) the like-for-like replacements recorded at any time.
 */
export function changesFrom(positions: readonly PositionDb[], installations: readonly InstallationFact[], recommissionedSinceMs: number | null): UnitChange[] {
  const since = recommissionedSinceMs ?? -Infinity;
  const subs: UnitChange[] = recommissionedSinceMs != null ? substitutionsFrom(positions, since).map((x) => ({ ...x, kind: 'SUBSTITUTED' as const, ...substitutionUnits(x.assetId, Date.parse(x.at), installations) })) : [];
  const reps = replacementsOf(positions.map((a) => ({ code: a.code, category: a.category, label: a.label, model: a.model })), installations, since);
  return [...subs, ...reps].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
/** The tests the changes reopen on the room's current plan, each with its reasons, its current result and whether it is still to re-run. */
export function reverificationFrom(rows: readonly PlanRowDb[], res: ReadonlyMap<string, CurrentResultDb>, changes: readonly Change[]): Reverification[] {
  return reopenedBySubstitution(rows.map((r) => ({ ...r, testId: r.test_id })), changes).map(({ row: r, assets, reasons, substitutions: by }) => {
    // the latest of the changes that reopen the test: a result recorded at or before it was obtained on the previous unit
    let at = 0; let atIso = '';
    for (const s of by) { const t = Date.parse(s.at); if (t > at) { at = t; atIso = s.at; } }
    const cur = res.get(r.test_id);
    return { testId: r.test_id, label: r.label, domain: r.domain, personas: r.personas, evidence: r.evidence, instrument: r.instrument, assets, reasons, substitutedAt: atIso, result: cur?.result_label || 'NOT_TESTED', recordedAt: cur?.recorded_at ?? null, rerun: !cur || cur.recorded_ms <= at };
  });
}
/** What the shared acceptance gate takes from the reverification (the same two facts the demonstration hands it). */
export const gateFacts = (rv: readonly Reverification[], changes: readonly Change[]): { reverification: ReverificationState[]; changeKinds: ChangeKind[] } =>
  ({ reverification: rv.map((t) => ({ testId: t.testId, rerun: t.rerun, result: t.result })), changeKinds: [...new Set(changes.map((c) => ('kind' in c && c.kind) || 'SUBSTITUTED'))] as ChangeKind[] });
