/**
 * Re-verification after a substitution while an accepted room is recommissioned (ADR-0003). Ported from the V2.5.3 demonstrator's asset
 * replacement (`v25CxReplace`): a result obtained on the previous device no longer counts towards the re-acceptance. A test is reopened
 * when its plan row names the substituted asset among the devices it covers, when the asset is a camera and the test is a Video test of
 * the room, when the asset is part of the audio chain (the dsp family) and the test is an Audio test, and always for the asset-identity
 * check. Each reopened test carries one reason per substitution that reopens it.
 *
 * One rule, one implementation: the enterprise API (`rooms.reverification`) and the investor demonstration (Build a Room) both call this.
 * Pure: the caller decides which rows (the plan the results were recorded against) and which substitutions apply, and keeps the result
 * bookkeeping (when the earlier result was recorded, whether it has been re-run since).
 */
import { deviceFamily } from './classify.js';

/** A plan row as far as the rule needs it: the test, its domain and the devices it covers. */
export interface SubstitutionRow { testId: string; domain: string; devices?: readonly string[] | null }
/**
 * How the device at a position changed (ADR-0012): SUBSTITUTED = a different model (a design change; the default, and the only kind
 * before installations were recorded); REPLACED = another unit of the same model (a like-for-like physical replacement). Either way
 * the results obtained on the previous unit no longer count.
 */
export type ChangeKind = 'SUBSTITUTED' | 'REPLACED';
/** One substitution of a device of the room: the asset that was substituted, its category, and the change in words (from → to).
 *  For a REPLACED unit, from → to are the two units' asset codes and `model` the model they share. */
export interface DeviceSubstitution { assetId: string; label: string; category: string; from: string; to: string; kind?: ChangeKind; model?: string | null }
export interface ReopenedTest<R extends SubstitutionRow = SubstitutionRow, S extends DeviceSubstitution = DeviceSubstitution> {
  testId: string;
  /** the substituted assets that reopen it, one per substitution, in the order of the substitutions */
  assets: string[];
  /** one reason per substitution, in the same order */
  reasons: string[];
  /** the plan row it was judged on, as given */
  row: R;
  /** the substitutions that reopen it, as given (so the caller can read their own fields, such as when each happened) */
  substitutions: S[];
}

/** The asset-identity check is run again after every substitution. */
export const IDENTITY_TEST = 'identity_asset';

/** Why one substitution reopens one test, or null when it does not. */
export function substitutionReason(row: SubstitutionRow, s: DeviceSubstitution): string | null {
  const fam = deviceFamily(s.category);
  return (row.devices || []).includes(s.assetId) ? 'the plan names it among the devices this test covers'
    : fam === 'camera' && row.domain === 'Video' ? 'it is a camera and this is a Video test of the room'
      : fam === 'dsp' && row.domain === 'Audio' ? 'it is part of the audio chain and this is an Audio test of the room'
        : row.testId === IDENTITY_TEST ? (s.kind === 'REPLACED' ? 'the asset identity is checked again after every change of unit' : 'the asset identity is checked again after every substitution') : null;
}

/** The sentence a reopened test carries for one substitution — or, for a REPLACED unit, for one like-for-like replacement. */
export const substitutionSentence = (s: DeviceSubstitution, why: string) => (s.kind === 'REPLACED'
  ? `${s.label} (${s.assetId}) was replaced by another unit of the same model (${s.from} → ${s.to}${s.model ? `, both ${s.model}` : ''}): ${why}`
  : `${s.label} (${s.assetId}) was substituted after acceptance (${s.from} → ${s.to}): ${why}`);

/**
 * The tests the substitutions reopen, in the order of the rows; a row no substitution touches is left out. With no substitution,
 * nothing is reopened.
 */
export function reopenedBySubstitution<R extends SubstitutionRow, S extends DeviceSubstitution>(rows: readonly R[], subs: readonly S[]): Array<ReopenedTest<R, S>> {
  const out: Array<ReopenedTest<R, S>> = [];
  if (!subs.length) return out;
  for (const row of rows) {
    const assets: string[] = []; const reasons: string[] = []; const matched: S[] = [];
    for (const s of subs) {
      const why = substitutionReason(row, s);
      if (!why) continue;
      reasons.push(substitutionSentence(s, why)); assets.push(s.assetId); matched.push(s);
    }
    if (reasons.length) out.push({ testId: row.testId, assets, reasons, row, substitutions: matched });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ what a reopened test still needs
/** A reopened test as the gates need it: whether its current result predates the change (`rerun`) and its current result label. */
export interface ReverificationState { testId: string; rerun: boolean; result: string }
const words = (kinds: readonly ChangeKind[] = []) => {
  const k = new Set(kinds.length ? kinds : ['SUBSTITUTED']);
  if (k.size === 1 && k.has('REPLACED')) return { before: 'on the previous unit', on: 'the new unit', after: 'on the new unit', task: 're-run on the new unit (a result recorded on the previous unit no longer counts)' };
  if (k.size === 1) return { before: 'before the substitution', on: 'the changed design', after: 'after the substitution', task: 're-run on the substituted design (a result recorded before the substitution no longer counts)' };
  return { before: 'before the change of device', on: 'the changed installation', after: 'after the change of device', task: 're-run on the changed installation (a result recorded before the change of device no longer counts)' };
};
/** The outstanding task for each responsible role while reopened tests wait (the readiness and the demonstration say it the same way). */
export const rerunTask = (kinds?: readonly ChangeKind[]) => words(kinds).task;
/** The tests that must be re-run: their result was recorded before the change, on the previous unit. */
export function rerunSentence(rerun: readonly Pick<ReverificationState, 'testId'>[], kinds?: readonly ChangeKind[]): string {
  return `${rerun.length} test(s) were last recorded ${words(kinds).before} and must be re-run on ${words(kinds).on} and verified independently: ${rerun.map((t) => t.testId).join(', ')}`;
}
/**
 * Why a re-acceptance still waits for the tests a change reopened (one rule for the API and the demonstration): the ones still to re-run,
 * and the ones re-run after the change but not yet passed and verified by a different person. A historical PASS_VERIFIED of the previous
 * unit is never among the satisfied: a test leaves this list only when a result recorded after the change is PASS_VERIFIED.
 */
export function reverificationBlockers(rv: readonly ReverificationState[], kinds?: readonly ChangeKind[]): string[] {
  const why: string[] = [];
  const rerun = rv.filter((t) => t.rerun);
  if (rerun.length) why.push(rerunSentence(rerun, kinds));
  const unverified = rv.filter((t) => !t.rerun && t.result !== 'PASS_VERIFIED');
  if (unverified.length) why.push(`${unverified.length} reopened test(s) were re-run ${words(kinds).after} and are not yet passed and verified by a different person: ${unverified.map((t) => `${t.testId} (${t.result})`).join(', ')}`);
  return why;
}
