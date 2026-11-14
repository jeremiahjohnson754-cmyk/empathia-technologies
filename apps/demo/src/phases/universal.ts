/**
 * The universal phase engine (founder, 14 Nov 2026: "make sure ServiceHands commissioning workflow and phase structure and universal
 * engine is the same as commissioning and assurance"). One shape for every governed workflow: numbered phases, each with a question, a
 * set of items, and a verdict worked out by one rule; a final sign-off that waits for every phase. Commissioning's five phases and its
 * sign-off (campus/cxRecord.ts phaseStats) and the ServiceHands job (service/phases.ts) both run on it, so a phase means the same thing,
 * and passes or fails by the same rule, in both products.
 *
 * An item's result:
 *   pass     done and verified
 *   ran      done, awaiting verification (counts as run, not as verified)
 *   fail     done and failed
 *   pending  not done yet
 *   na       does not apply (left out of the phase)
 * A phase's verdict (commissioning's rule, unchanged): no applicable item → none; any fail → fail; everything run → pass; some run →
 * partial; nothing run → notrun.
 */
export type ItemResult = 'pass' | 'ran' | 'fail' | 'pending' | 'na';
export type Verdict = 'none' | 'fail' | 'partial' | 'notrun' | 'pass';
export interface PhaseItem { id: string; phase: number; label: string; result: ItemResult; why: string; by?: string | null; at?: string | null }
export interface PhaseDef { n: number; name: string; q: string }
export interface PhaseRun extends PhaseDef { items: PhaseItem[]; pass: number; ran: number; fail: number; verdict: Verdict }

export function verdictOf(items: Array<{ result: ItemResult }>): Verdict {
  const ps = items.filter((x) => x.result !== 'na'); if (!ps.length) return 'none';
  const fail = ps.some((x) => x.result === 'fail'); const run = ps.filter((x) => x.result !== 'pending').length;
  return fail ? 'fail' : run < ps.length ? (run ? 'partial' : 'notrun') : 'pass';
}
export function runPhases(defs: PhaseDef[], items: PhaseItem[]): PhaseRun[] {
  return defs.map((d) => { const its = items.filter((x) => x.phase === d.n && x.result !== 'na');
    return { ...d, items: its, pass: its.filter((x) => x.result === 'pass').length, ran: its.filter((x) => x.result === 'ran').length, fail: its.filter((x) => x.result === 'fail').length, verdict: verdictOf(its) }; });
}
export const VERDICT_WORD: Record<Verdict, string> = { none: 'No applicable check', pass: 'Pass', fail: 'Fail', notrun: 'Not run', partial: 'Partial' };
export const VERDICT_TONE: Record<Verdict, 'ok' | 'bad' | 'warn' | 'muted'> = { none: 'muted', pass: 'ok', fail: 'bad', notrun: 'warn', partial: 'warn' };
/** the sign-off: every phase passes with every item verified (ran is not enough), and the signer did none of the items (separation) */
export function signOff(run: PhaseRun[], signer: string | null): { ready: boolean; why: string[] } {
  const why: string[] = [];
  for (const p of run) {
    if (p.verdict === 'fail') why.push(`phase ${p.n} (${p.name}) has ${p.fail} failed item${p.fail === 1 ? '' : 's'}`);
    else if (p.verdict !== 'pass' && p.verdict !== 'none') why.push(`phase ${p.n} (${p.name}) is not complete`);
    else if (p.ran) why.push(`phase ${p.n} (${p.name}) has ${p.ran} item${p.ran === 1 ? '' : 's'} awaiting verification`);
  }
  if (signer && run.some((p) => p.items.some((i) => i.by === signer))) why.push('the signer took part in the work and does not sign it off (separation of duties)');
  return { ready: !why.length, why };
}
