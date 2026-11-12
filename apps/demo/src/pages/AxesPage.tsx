/**
 * #/design/axes — the five axes of the Empathia Experience Language (60/10 P1, first slice): every value of each axis, and the example
 * the language is built on: a measured reading that is critical next to a simulated one that is nominal. A reference page; no record.
 */
import { PageHero, Card, ConditionChip, ProvenanceChip, ConfidenceChip, WorkflowChip, MaturityChip, AXES } from '@empathia/ui';

export default function AxesPage() {
  return <section className="stack" data-native="" data-testid="axes-page">
    <PageHero compact eyebrow="Design language" title="Five axes, never one colour" lede="A screen can say five different things about a value. Each has its own shape and always says its value in words, so one is never read as another." />
    <Card title="Condition" sub="What state the thing is in now. Not where the value came from." testId="axes-condition"><p className="ax-row">{AXES.conditions.map((v) => <ConditionChip key={v} value={v} />)}</p></Card>
    <Card title="Provenance" sub="Where the value came from. Not whether it is good or bad." testId="axes-provenance"><p className="ax-row">{AXES.provenances.map((v) => <ProvenanceChip key={v} value={v} />)}</p></Card>
    <Card title="Confidence" sub="How good the method is, in words, with its bounds. Never an invented percentage." testId="axes-confidence"><p className="ax-row"><ConfidenceChip method="Calibrated class 1 meter" bounds="±0.7 dB, calibrated 2026-06" /><ConfidenceChip method="Class template radius" bounds="spec to verify" /><ConfidenceChip method="Sabine estimate" bounds="assumed finishes" /></p></Card>
    <Card title="Workflow" sub="Where a record is in its review. A reviewed record is not a verified device." testId="axes-workflow"><p className="ax-row">{AXES.workflows.map((v) => <WorkflowChip key={v} value={v} />)}</p></Card>
    <Card title="Maturity" sub="How far a capability has come. “Simulated” here describes the capability, not a reading." testId="axes-maturity"><p className="ax-row">{AXES.maturities.map((v) => <MaturityChip key={v} value={v} />)}</p></Card>
    <Card title="Why they stay apart" sub="The example the language is built on" testId="axes-example">
      <ul className="plain stack">
        <li><b>Rear-row speech intelligibility</b> 0.48 STI <ConditionChip value="critical" /> <ProvenanceChip value="measured" source="commissioning visit" /> <ConfidenceChip method="STIPA, calibrated analyser" bounds="±0.03" /> <WorkflowChip value="reviewed" /></li>
        <li><b>Camera framing in the twin</b> 12 of 12 seats <ConditionChip value="nominal" /> <ProvenanceChip value="simulated" source="coverage model" /> <ConfidenceChip method="Class template field of view" bounds="spec to verify" /> <WorkflowChip value="draft" /></li>
      </ul>
      <p className="ui-meta">The first is bad and true; the second is good and only a model. Neither makes the other so. (Both are illustrations on this reference page, not records.)</p>
    </Card>
  </section>;
}
