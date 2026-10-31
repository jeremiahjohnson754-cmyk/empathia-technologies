/**
 * The seven guided investor scenarios — the canonical V2.5.3 tour (17 steps, `V25_TOUR_STEPS` in the demonstrator's v25-30-investor.js),
 * carried over unchanged in title, narration, persona and evidence label. Each step opens a page of this demonstration: a native page
 * where one exists today (Build a Room, Search Party), otherwise the boundary page that states the area's migration status — a step is
 * never faked. The runner is a persistent panel; the perspective follows the step's persona so that governance is shown, not told.
 * The complete journey (scenario 4 → 5: create → design → approve → tests → commission → verify → accept → baseline → change →
 * recommission → compare) is Build a Room, step by step; "Reset" clears the draft so the demonstration replays identically.
 */
import { useEffect, useState } from 'react';
import { Tag, Button } from '@empathia/ui';
import { NATIVE, areaKey, AREAS } from '../registry.js';
import { saveDraft } from '../build/store.js';

export interface Step { n: number; title: string; text: string; href: string; persona: string; evidence: string; native: boolean }
const S = (n: number, title: string, text: string, href: string, persona: string, evidence: string): Step => ({ n, title, text, href, persona, evidence, native: NATIVE.has(areaKey(href)) });
/** Verbatim from the 2.5.3 investor tour; the hrefs are the legacy addresses this shell resolves. */
export const STEPS: Step[] = [
  S(1, '1 · If this switch fails, what is affected?', 'Search Party starts from a room and walks its dependencies: the access switch, its uplink, the other rooms on the same switch, the power panel. Evidence freshness and the synthetic mark sit on every relationship.', '#/search?focus=NetworkNode:SW-ATL-4A', 'service', 'VERIFIED_DEMO'),
  S(1, '1 · The same dependencies in a service packet', 'The ServiceHands context packet lists the switch, the uplink, the rooms that share it and the power — read from the model, not polled. A technician sees devices minimised: no cost, no finance.', '#/v25/service', 'service', 'VERIFIED_DEMO'),
  S(2, '2 · Field Intelligence v1.3: what the collector declares', 'The released collector\'s facts as integrated: version, modes, exit codes, the fifteen-minute passive schedule, its limitations. Capabilities are DECLARED until a run observes them; a plan is PLAN_ONLY with HardwareTested false.', '#/v25/fi', 'syseng', 'DECLARED'),
  S(2, '2 · Plan vs executed; declared, observed, verified, modeled, unknown, unavailable', 'The plan page keeps every device pair NOT_TESTED with null measurements until evidence arrives. Passive monitoring is NOT_RUN in a browser. Nothing is promoted by wishful labelling.', '#/v25/fi', 'syseng', 'DECLARED'),
  S(2, '2 · Optional v1.4 Physical Validation: licensed, gated, simulated here', 'A licence opens requests, never proofs. Preflight has blocked branches (occupied, out of calibration, no operator, unsupported adapter); arming needs two confirmations and a present operator; every run here is a labelled simulation with an E-stop. There is no "Scan Now".', '#/v25/fipv', 'syseng', 'SIMULATED'),
  S(3, '3 · Room optimisation in Lite — a scenario, not a measurement', 'The Lite studio draws the room from the best available geometry source, with uncertainty per dimension, and predicts coverage as MODELED values with denominators. A variant is a scenario. A measured overlay only appears from an independently reviewed instrument export.', '#/v25/build', 'designer', 'MODELED'),
  S(4, '4 · An adaptive commissioning plan with WHY on every test', 'Compiled from the rule pack: union, dedupe, why each test applies and why others do not; the verifier role, the method, the expected value and the evidence it accepts. Nonwaivable tests cannot be waived by anyone.', '#/v25/build?tab=checks', 'cxeng', 'VERIFIED_DEMO'),
  S(4, '4 · A blocked approval, visibly', 'Press the next lifecycle step before its conditions are met to see the machine refuse with every unresolved item named. Nothing is recorded by a refusal — except the refusal itself, in the ledger.', '#/v25/build?tab=lifecycle', 'syseng', 'VERIFIED_DEMO'),
  S(5, '5 · Incident to service: hard gates before ranking', 'The service manager\'s queue carries every job\'s context packet; people are hard-gated (certifications valid, experience, licences, site access, availability, capacity, vendor coverage) before any ranking, and the ranking explains itself.', '#/v25/service', 'svcmgr', 'VERIFIED_DEMO'),
  S(5, '5 · Corrective action, retest, closure — no missing evidence accepted', 'A job in progress: dispatch preflight on the record, evidence as it is recorded, then independent verification with a targeted retest. Closure follows the customer policy. The verifier is never the technician.', '#/v25/build?tab=lifecycle', 'cxeng', 'VERIFIED_DEMO'),
  S(5, '5 · The golden baseline and drift', 'A room carried through every gate to an accepted baseline; recommissioning keeps the version current until the re-acceptance publishes the next one, and the lineage shows what changed. Missing telemetry is unknown, never health.', '#/v25/build?tab=lifecycle', 'syseng', 'VERIFIED_DEMO'),
  S(5, '5 · APEX: cited hypotheses, bounded actions, blocked outcomes', 'Seven layers of evidence, ranked hypotheses that say why they are not proven, and action tiers A0–A5. A4 needs a signed runbook, owner approval, a window, an occupancy check and a dry run — and the real adapter state blocks it here. Every outcome, including the blocked ones, is in the log.', '#/v25/apex', 'cxeng', 'SIMULATED'),
  S(6, '6 · Learn: reviewed cases from what actually happened', 'A case needs customer permission, de-identification, an SME review and the steward\'s approval; it links lessons, labs, competency and the Lite model. Training performance never grants work authorisation.', '#/v25/learn', 'cxeng', 'VERIFIED_DEMO'),
  S(6, '6 · SIGNAL lessons, labs and drills (V1.4.1)', 'The original Learn surfaces are unchanged: lessons, labs and drills with their own evidence.', '#/learn', 'cxeng', 'VERIFIED_DEMO'),
  S(7, '7 · One connected lifecycle', 'Mission Control: intake, decision, funding, design, commissioning, field, documents, handoff, assurance, service — every station counts live records, and every record carries its history and its events.', '#/v25', 'architect', 'VERIFIED_DEMO'),
  S(7, '7 · Executive intelligence that shows its work', 'Twenty-seven KPI passports computed from the records and the ledger: numerator, denominator, window, coverage, freshness and confidence. Usage is aggregate-only; "not measurable" is never 0%.', '#/v25/exec', 'exec', 'VERIFIED_DEMO'),
  S(7, '7 · The ledger behind every state', 'Every transition emitted a validated event with its actor, time and local time. The policy page shows the role × area matrix the dispatcher uses. This is a demonstration of authorisation, not security.', '#/v25/ledger', 'steward', 'VERIFIED_DEMO'),
];
export const SCENARIOS = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ n, first: STEPS.findIndex((s) => s.n === n), steps: STEPS.filter((s) => s.n === n).length, native: STEPS.filter((s) => s.n === n).filter((s) => s.native).length }));
const KEY = 'empathia.demo.tour.v1';
const EVIDENCE_TONE: Record<string, 'ok' | 'warn' | 'info' | 'muted'> = { VERIFIED_DEMO: 'ok', DECLARED: 'muted', MODELED: 'info', SIMULATED: 'warn' };

/** The persistent tour panel. `onPerspective` switches the demonstration's perspective to the step's persona. */
export function TourPanel({ hash, onPerspective }: { hash: string; onPerspective: (p: string) => void }) {
  const [i, setI] = useState<number | null>(() => { try { const v = sessionStorage.getItem(KEY); return v === null ? null : Number(v); } catch { return null; } });
  // #/tours/investor?scenario=n starts (or restarts) at the first step of a scenario
  useEffect(() => { const m = /^#\/tours\/investor(?:\?scenario=(\d))?/.exec(hash); if (m) { const n = m[1] ? Number(m[1]) : 1; const first = STEPS.findIndex((s) => s.n === n); start(first < 0 ? 0 : first); } }, [hash]);   // eslint-disable-line react-hooks/exhaustive-deps
  const start = (idx: number) => { setI(idx); try { sessionStorage.setItem(KEY, String(idx)); } catch { /* storage unavailable */ } const s = STEPS[idx]!; onPerspective(s.persona); location.hash = s.href; };
  const stop = () => { setI(null); try { sessionStorage.removeItem(KEY); } catch { /* */ } };
  if (i === null) return null;
  const s = STEPS[i]!; const area = AREAS.find((a) => a.key === areaKey(s.href));
  return (
    <aside className="tour" aria-label="Guided scenario" data-testid="tour">
      <div className="tour__head"><span className="tour__k">Scenario {s.n} of 7 · step {i + 1} of {STEPS.length}</span><Tag tone={EVIDENCE_TONE[s.evidence] || 'muted'}>{s.evidence}</Tag><span className="tour__persona">as <b>{s.persona}</b></span>{!s.native && <Tag tone="warn">not migrated yet · {area?.status || 'status page'}</Tag>}</div>
      <h2 className="tour__title">{s.title}</h2>
      <p className="tour__text">{s.text}</p>
      {!s.native && <p className="ui-meta">This step's page is still the original V2.5.3 demonstration's; this shell shows its migration status instead of pretending. Native today: every step of the seven scenarios.</p>}
      <div className="tour__acts">
        <Button small onClick={() => start(Math.max(0, i - 1))} disabled={i === 0}>Previous</Button>
        <Button small kind="primary" onClick={() => start(Math.min(STEPS.length - 1, i + 1))} disabled={i === STEPS.length - 1}>Next</Button>
        <span className="tour__jump">{SCENARIOS.map((sc) => <button key={sc.n} type="button" className={`tour__dot${sc.n === s.n ? ' on' : ''}`} onClick={() => start(sc.first)} aria-label={`Scenario ${sc.n}`} title={`Scenario ${sc.n}: ${sc.native}/${sc.steps} steps native`}>{sc.n}</button>)}</span>
        <Button small kind="quiet" onClick={() => { saveDraft(null); start(STEPS.findIndex((x) => x.n === s.n)); }} title="Clears the Build a Room draft of this browser and restarts the scenario">Reset &amp; replay scenario</Button>
        <Button small kind="quiet" onClick={stop}>Close</Button>
      </div>
    </aside>
  );
}
