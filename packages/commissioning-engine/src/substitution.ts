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
/** One substitution of a device of the room: the asset that was substituted, its category, and the change in words (from → to). */
export interface DeviceSubstitution { assetId: string; label: string; category: string; from: string; to: string }
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
        : row.testId === IDENTITY_TEST ? 'the asset identity is checked again after every substitution' : null;
}

/** The sentence a reopened test carries for one substitution. */
export const substitutionSentence = (s: DeviceSubstitution, why: string) => `${s.label} (${s.assetId}) was substituted after acceptance (${s.from} → ${s.to}): ${why}`;

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
