/**
 * Rules for recording and verifying a field result. Ported from `v25RoomRecord` and `v25RoomVerify` (src/v25-60-room.js).
 * Pure validation: the server applies the result only when these return no reasons, and only after its own authority check.
 */
import { RECORDABLE_STATES, type ApplicabilityRow, type RecordableState, type RecordedResult } from '@empathia/domain-types';

export interface RecordInput {
  state: string;
  evidence?: { kind?: string; ref?: string; instrument?: string | null };
}

/** Personas that may record any applicable test besides the test's own responsible personas. */
export const RECORD_OVERRIDE_PERSONAS = ['cxeng', 'architect'];

export function recordBlockers(lifecycle: string, row: ApplicabilityRow | undefined, persona: string, input: RecordInput): string[] {
  if (lifecycle !== 'COMMISSIONING') return [`results are recorded on an installed room in COMMISSIONING (this one is ${lifecycle}): nothing passes from a design`];
  if (!row || !row.applicable) return [`${row ? row.id : 'this test'} does not apply to this room`];
  if (!(row.personas || []).includes(persona) && !RECORD_OVERRIDE_PERSONAS.includes(persona)) return [`${persona} is not the responsible role for ${row.id} (${(row.personas || []).join(', ')})`];
  if (!(RECORDABLE_STATES as readonly string[]).includes(input.state)) return ['state is PASS, FAIL, NOT_SUPPORTED or INCONCLUSIVE'];
  const ev = input.evidence || {};
  if (!(row.evidence || []).includes(ev.kind || '')) return [`evidence kind ${ev.kind || '(none)'} is not accepted for ${row.id}; accepted: ${(row.evidence || []).join(', ')}`];
  if (!ev.ref || String(ev.ref).trim().length < 4) return ['a result needs an evidence reference'];
  if (row.instrument && !ev.instrument) return [`${row.id} is instrument-measured: name the instrument and its calibration`];
  return [];
}

export function buildResult(prev: RecordedResult | undefined, persona: string, input: RecordInput, at: string): RecordedResult {
  const ev = input.evidence || {};
  return {
    state: input.state as RecordableState,
    evidence: { kind: String(ev.kind), ref: String(ev.ref).slice(0, 200), instrument: ev.instrument || null },
    by: persona,
    at,
    verified: null,
    history: prev ? (prev.history || []).concat([{ state: prev.state, by: prev.by, at: prev.at, verified: prev.verified }]) : [],
  };
}

/** Independent verification: only a recorded PASS, never by the person who recorded it, never twice. */
export function verifyBlockers(r: RecordedResult | undefined, persona: string): string[] {
  if (!r || r.state !== 'PASS') return ['only a recorded PASS can be verified'];
  if (r.by === persona) return ['verification must be independent of the person who recorded the result'];
  if (r.verified) return ['already verified'];
  return [];
}
