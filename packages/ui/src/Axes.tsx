/**
 * The five user-facing axes of the Empathia Experience Language (60/10 P1, first slice, 12 Nov 2026), kept apart so that one is never read
 * as another: a measured reading may be critical, and simulated data may describe a nominal system — neither makes the other true.
 *   Condition   what state the thing is in now        nominal · warning · critical · escalated · unknown
 *   Provenance  where the value came from              measured · modeled · simulated · assumed · unavailable
 *   Confidence  how good the method is                 a method and its bounds in words; never an invented percentage
 *   Workflow    where a record is in its review        draft · submitted · reviewed · accepted · rejected · blocked · superseded
 *   Maturity    how far a capability has come          implemented · tested · simulated · proposed · not run
 * Each axis has its own shape (condition a filled pill with a glyph; provenance a square-cornered outline with a source mark; confidence a
 * dashed outline; workflow a step marker; maturity a bracketed label), says its axis in words for screen readers, and carries its value
 * as text, so nothing depends on colour alone.
 */
import type { ReactNode } from 'react';

export type Condition = 'nominal' | 'warning' | 'critical' | 'escalated' | 'unknown';
export type Provenance = 'measured' | 'modeled' | 'simulated' | 'assumed' | 'unavailable';
export type Workflow = 'draft' | 'submitted' | 'reviewed' | 'accepted' | 'rejected' | 'blocked' | 'superseded';
export type Maturity = 'implemented' | 'tested' | 'simulated' | 'proposed' | 'not run';

const COND: Record<Condition, { glyph: string; word: string }> = { nominal: { glyph: '●', word: 'Nominal' }, warning: { glyph: '▲', word: 'Warning' }, critical: { glyph: '■', word: 'Critical' }, escalated: { glyph: '◆', word: 'Escalated' }, unknown: { glyph: '?', word: 'Unknown' } };
const PROV: Record<Provenance, { mark: string; word: string }> = { measured: { mark: 'M', word: 'Measured' }, modeled: { mark: 'Md', word: 'Modeled' }, simulated: { mark: 'S', word: 'Simulated' }, assumed: { mark: 'A', word: 'Assumed' }, unavailable: { mark: '–', word: 'Unavailable' } };
const FLOW: Workflow[] = ['draft', 'submitted', 'reviewed', 'accepted']; const FLOW_WORD: Record<Workflow, string> = { draft: 'Draft', submitted: 'Submitted', reviewed: 'Reviewed', accepted: 'Accepted', rejected: 'Rejected', blocked: 'Blocked', superseded: 'Superseded' };
const MAT_WORD: Record<Maturity, string> = { implemented: 'Implemented', tested: 'Tested', simulated: 'Simulated', proposed: 'Proposed', 'not run': 'Not run' };

const Axis = ({ axis, value, className, children, title }: { axis: string; value: string; className: string; children: ReactNode; title?: string }) =>
  <span className={`ax ${className}`} data-axis={axis} data-value={value} title={title}><span className="ui-sr">{axis}: </span>{children}</span>;

/** Operational condition: the state now. Not where the value came from. */
export function ConditionChip({ value, children }: { value: Condition; children?: ReactNode }) {
  const c = COND[value]; return <Axis axis="Condition" value={value} className={`ax--cond ax--cond-${value}`}><span className="ax__glyph" aria-hidden="true">{c.glyph}</span><span>{children ?? c.word}</span></Axis>;
}
/** Provenance: where the value came from. Not whether it is good or bad. */
export function ProvenanceChip({ value, source }: { value: Provenance; source?: string }) {
  const p = PROV[value]; return <Axis axis="Provenance" value={value} className={`ax--prov ax--prov-${value}`} title={source}><span className="ax__mark" aria-hidden="true">{p.mark}</span><span>{p.word}{source ? <span className="ax__src"> · {source}</span> : null}</span></Axis>;
}
/** Confidence: the method and its bounds, in words. A number appears only when the method gives one (an uncertainty, a calibration date). */
export function ConfidenceChip({ method, bounds }: { method: string; bounds?: string }) {
  return <Axis axis="Confidence" value={method} className="ax--conf"><span>{method}{bounds ? <span className="ax__src"> · {bounds}</span> : null}</span></Axis>;
}
/** Workflow: where a record is in its review. Distinct from a verified device or a passed test. */
export function WorkflowChip({ value }: { value: Workflow }) {
  const at = FLOW.indexOf(value); const off = at < 0;
  return <Axis axis="Workflow" value={value} className={`ax--flow ax--flow-${value}`}><span className="ax__steps" aria-hidden="true">{FLOW.map((s, i) => <i key={s} data-on={!off && i <= at} />)}</span><span>{FLOW_WORD[value]}</span></Axis>;
}
/** Maturity: how far a capability has come. "Simulated" here describes the capability, not a reading. */
export function MaturityChip({ value }: { value: Maturity }) {
  return <Axis axis="Maturity" value={value} className={`ax--mat ax--mat-${value.replace(' ', '-')}`}><span aria-hidden="true">[</span><span>{MAT_WORD[value]}</span><span aria-hidden="true">]</span></Axis>;
}
export const AXES = { conditions: Object.keys(COND) as Condition[], provenances: Object.keys(PROV) as Provenance[], workflows: Object.keys(FLOW_WORD) as Workflow[], maturities: Object.keys(MAT_WORD) as Maturity[] };
