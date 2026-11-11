/**
 * The registry's synthetic fixtures: the claims both public sites show, and the one commissioning dossier they point to.
 * Everything here is invented for the demonstration. SIM-AV-0042 is a fixture, not equipment; Atlas 4.218 is a synthetic room.
 * The dossier is the v1.6 reference snapshot; its totals are the v1.8 reference (27 PASS, 3 PENDING, 2 FAIL, 29 of 32 evidence records, final acceptance HELD) and are
 * computed from the rows below, never typed twice.
 */
import type { ProofClaim } from './index.js';

export type TestResult = 'PASS' | 'PENDING' | 'FAIL';
/** `control` marks a test that protects access, the record itself, or accessibility: such a test is corrected, never waived. */
export type ControlClass = 'security' | 'integrity' | 'accessibility';
export interface DossierTest { id: string; discipline: string; name: string; result: TestResult; evidence: string | null; note?: string; control?: ControlClass }
export interface Deficiency { id: string; severity: 'P1' | 'P2'; test: string; statement: string; owner: string; action: string; state: 'OPEN' | 'CORRECTED_AWAITING_RETEST' }
export interface Dossier {
  id: string; generatedAt: string; tenant: string; project: string; room: { id: string; name: string; site: string };
  asset: { id: string; kind: string; model: string; serial: string; position: string; lifecycle: [string, string] };
  scope: string; tests: DossierTest[]; deficiencies: Deficiency[];
  totals: { tests: number; pass: number; pending: number; fail: number; evidence: number };
  acceptance: 'HELD' | 'ACCEPTED'; acceptanceReason: string; gaps: string[]; dataKind: 'SYNTHETIC';
}

/** The QR payload of the fixture label (v1.6 example). It is not a URL and resolves nowhere outside the demonstration. */
export const QR_PAYLOAD_4218 = 'EMPATHIA-DEMO|v=1|tenant=corporate_demo|entity=asset|id=SIM-AV-0042|NOT-LIVE';

// The rows are the v1.6 reference snapshot SIM-REPORT-2026-11-08-001 (test id, discipline, result, evidence present) with a plain name
// added to each test. Results and evidence presence are the reference's; nothing is rounded towards green.
const ROWS: [string, string, TestResult, boolean, string?][] = [
  ['Audio Capture', 'Every microphone channel reaches the processor', 'PASS', true], ['Audio Capture', 'Input gain structure within the design window', 'PASS', true],
  ['Audio Capture', 'Echo cancellation converges on each microphone', 'PASS', true], ['Audio Capture', 'Noise floor with ventilation running', 'PASS', true],
  ['Audio Reproduction', 'Program audio level at the reference seat', 'PASS', true], ['Audio Reproduction', 'Output limiters set per the loudspeaker schedule', 'PASS', true],
  ['Audio Reproduction', 'No audible hum or buzz on any output', 'PASS', true], ['Audio Reproduction', 'Far-end speech intelligibility at the project target', 'FAIL', true, 'Below the project target at the far seats'],
  ['Video/Display', 'Source reaches both displays at native resolution', 'PASS', true], ['Video/Display', 'Display input switching follows the room mode', 'PASS', true],
  ['Video/Display', 'Content sharing from a guest laptop', 'PASS', true], ['Video/Display', 'Displays sleep and wake with the room', 'PASS', true],
  ['Camera Coverage', 'Every seat framed by a camera', 'PASS', true], ['Camera Coverage', 'Presenter position framed', 'PASS', true],
  ['Camera Coverage', 'Camera switching follows the active talker', 'PASS', true], ['Camera Coverage', 'Final camera preset verification', 'PENDING', true, 'Presets recorded; the verification is missing from the submitted packet'],
  ['Network/Compute', 'Control VLAN and addressing as designed', 'PASS', true], ['Network/Compute', 'Audio network clock locked to the room leader', 'PASS', true],
  ['Network/Compute', 'Management access restricted to the service group', 'PASS', true], ['Network/Compute', 'Fault status reaches the monitoring adapter', 'PASS', true],
  ['Control/UI', 'Touch panel volume tracks the processor level', 'PASS', true], ['Control/UI', 'Mute state agrees between table, panel and platform', 'PASS', true],
  ['Control/UI', 'Presets recall and match the room modes', 'PASS', true], ['Control/UI', 'Room-off returns the processor to its default preset', 'PASS', true],
  ['Documentation', 'As-built signal flow drawing issued', 'PASS', true], ['Documentation', 'Configuration backup stored with its checksum', 'PASS', true],
  ['Documentation', 'Asset label matches the register entry', 'PASS', true], ['Documentation', 'Operator guide issued and acknowledged', 'PENDING', true, 'Guide issued; acknowledgement outstanding'],
  ['Accessibility', 'Controls reachable from a seated position', 'PASS', true], ['Accessibility', 'Captioning available on the room platform', 'PASS', false, 'Recorded as a pass with no evidence record'],
  ['Accessibility', 'Assistive listening coverage walk test', 'PENDING', false, 'Not yet carried out'], ['Accessibility', 'Assistive listening feed at the specified level', 'FAIL', false, 'Feed level below the specified level; no evidence record attached'],
];
const n3 = (i: number) => String(i + 1).padStart(3, '0');
/** which tests are controls (default policy, 11 Nov 2026): network segregation and management access (security); the configuration backup
 *  with its checksum and the asset's identity against the register (integrity of the record); everything under Accessibility. */
const CONTROLS: Record<string, ControlClass> = { 'Control VLAN and addressing as designed': 'security', 'Management access restricted to the service group': 'security', 'Configuration backup stored with its checksum': 'integrity', 'Asset label matches the register entry': 'integrity' };
const controlOf = (discipline: string, name: string): ControlClass | undefined => CONTROLS[name] ?? (discipline === 'Accessibility' ? 'accessibility' : undefined);
const TESTS: DossierTest[] = ROWS.map(([discipline, name, result, ev, note], i) => { const control = controlOf(discipline, name); return { id: `T-SIM-${n3(i)}`, discipline, name, result, evidence: ev ? `EV-SIM-${n3(i)}` : null, ...(note ? { note } : {}), ...(control ? { control } : {}) }; });
const count = (r: TestResult) => TESTS.filter((t) => t.result === r).length;

export const DOSSIER_4218: Dossier = {
  id: 'SIM-REPORT-2026-11-08-001', generatedAt: '2026-11-08T17:00:00Z', tenant: 'corporate_demo', project: 'ATLAS-4.218',
  room: { id: 'R-ATL-4-218', name: 'Atlas 4.218 Boardroom', site: 'Atlas Tower, floor 4' },
  asset: { id: 'SIM-AV-0042', kind: 'Digital signal processor', model: 'Synthetic DSP-X', serial: 'DEMO-NOT-REAL', position: 'Atlas 4.218 · credenza rack', lifecycle: ['Proposed', 'Commissioning'] },
  scope: 'Commissioning of the room’s audio processor and the systems that depend on it',
  tests: TESTS,
  deficiencies: [
    { id: 'DEF-SIM-001', severity: 'P1', test: 'T-SIM-008', statement: 'Far-end speech intelligibility fails the defined project target.', owner: 'Commissioning engineer', action: 'Retune the processor, then retest T-SIM-008.', state: 'OPEN' },
    { id: 'DEF-SIM-002', severity: 'P2', test: 'T-SIM-016', statement: 'The commissioning record is missing the final camera preset verification in the submitted packet.', owner: 'Commissioning engineer', action: 'Carry out and record the preset verification, then resubmit the packet.', state: 'OPEN' },
  ],
  totals: { tests: TESTS.length, pass: count('PASS'), pending: count('PENDING'), fail: count('FAIL'), evidence: TESTS.filter((t) => t.evidence).length },
  acceptance: 'HELD', acceptanceReason: 'Do not approve final system acceptance until the P1 remediation and the retest evidence are complete. Assign an owner and a due date.',
  gaps: ['T-SIM-032 fails and has no deficiency raised against it yet.', 'T-SIM-030 is recorded as a pass with no evidence record, so it cannot be verified.'],
  dataKind: 'SYNTHETIC',
};

const REV = 'registry-2026-11-09.1';
const AT = '2026-11-09T00:00:00Z';
const base = { schema_version: '1.8' as const, tenant_id: null, scope: 'PUBLIC_SANITIZED' as const, verifier_identity: null, expires_at: null, source_freshness_at: null, owner: 'Empathia engineering' };
const D = DOSSIER_4218.totals;

export const SEED_CLAIMS: ProofClaim[] = [
  { ...base, claim_id: 'DEMO-COMMISSION-001', capability_id: 'commissioning.asset-evidence-summary', product: 'Commissioning & Assurance', world: 'Enterprise',
    environment: 'synthetic_demo', data_kind: 'SYNTHETIC', verification_state: 'SYNTHETIC_DEMO', implementation_revision: REV,
    verification_method: 'Automated browser tests against the demonstration build; no device was tested', verified_at: AT, source_type: `Synthetic fixture (report snapshot ${DOSSIER_4218.id})`,
    evidence_ids: [DOSSIER_4218.id], approved_derivative_ids: [DOSSIER_4218.id],
    limitations: ['Synthetic room, asset and results; no customer equipment is connected', 'Shows the workflow, not a measured outcome', 'Final acceptance in the example is held, on purpose'],
    claim_text_public: `In the demonstration, the passport of processor ${DOSSIER_4218.asset.id} in Atlas 4.218 opens its commissioning record: ${D.pass} of ${D.tests} acceptance tests pass, ${D.pending} are pending and ${D.fail} fail, ${D.evidence} have an evidence record, and final acceptance is held.`,
    public_approval: 'APPROVED' },
  { ...base, claim_id: 'DEMO-QR-001', capability_id: 'qr.asset-passport-resolution', product: 'Lite', world: 'Enterprise',
    environment: 'synthetic_demo', data_kind: 'SYNTHETIC', verification_state: 'SYNTHETIC_DEMO', implementation_revision: REV,
    verification_method: 'Automated browser tests against the demonstration build', verified_at: AT, source_type: 'Synthetic fixture',
    evidence_ids: [], approved_derivative_ids: [],
    limitations: ['Identifiers are typed or chosen; the demonstration does not use a camera', 'Synthetic assets only'],
    claim_text_public: 'In the demonstration, an asset identifier resolves to one passport, shows only the actions the current role may take, and refuses an identifier that is unknown or malformed.',
    public_approval: 'APPROVED' },
  { ...base, claim_id: 'DEMO-SEARCH-001', capability_id: 'search-party.relationship-lookup', product: 'Search Party', world: 'Enterprise',
    environment: 'synthetic_demo', data_kind: 'SYNTHETIC', verification_state: 'SYNTHETIC_DEMO', implementation_revision: REV,
    verification_method: 'Automated browser tests against the demonstration build', verified_at: AT, source_type: 'Synthetic estate records',
    evidence_ids: [], approved_derivative_ids: [],
    limitations: ['Synthetic people, rooms and devices', 'Results are filtered by the demonstration role, which is not production security'],
    claim_text_public: 'In the demonstration, one search returns the rooms, devices, people, issues and documents related to a record, each with the source of the relationship.',
    public_approval: 'APPROVED' },
  { ...base, claim_id: 'IMPL-TENANT-ISOLATION-001', capability_id: 'platform.tenant-isolation', product: 'Platform', world: null,
    environment: 'test', data_kind: 'SYNTHETIC', verification_state: 'IMPLEMENTED_NOT_VERIFIED', implementation_revision: REV,
    verification_method: 'The repository’s own automated security tests; no independent review', verified_at: AT, source_type: 'Automated test results on synthetic tenants',
    evidence_ids: [], approved_derivative_ids: [],
    limitations: ['Tested by the authors only; no external assessment', 'Runs locally; no hosted environment exists yet'],
    claim_text_public: 'The application server scopes every read and write to one tenant and denies by default. This is implemented and covered by our own automated tests; it has not been independently verified.',
    public_approval: 'APPROVED' },
  { ...base, claim_id: 'SPEC-PILOT-CHECKOUT-001', capability_id: 'pilot.hosted-checkout', product: 'Pilot programme', world: null,
    environment: 'dev', data_kind: 'SYNTHETIC', verification_state: 'SPECIFIED', implementation_revision: REV,
    verification_method: null, verified_at: AT, source_type: 'Specification (v1.8, ADR-023)',
    evidence_ids: [], approved_derivative_ids: [],
    limitations: ['No payment provider is connected', 'Pilots are arranged through an enquiry today'],
    claim_text_public: 'Self-service pilot purchase through a hosted checkout is specified. It is not available yet: no payment provider is connected, and pilots are arranged by enquiry.',
    public_approval: 'APPROVED' },
  { ...base, claim_id: 'SPEC-LIVE-CONNECTOR-001', capability_id: 'field-intelligence.live-source-observation', product: 'Field Intelligence', world: null,
    environment: 'dev', data_kind: 'SYNTHETIC', verification_state: 'SPECIFIED', implementation_revision: REV,
    verification_method: null, verified_at: AT, source_type: 'Specification and simulated adapters',
    evidence_ids: [], approved_derivative_ids: [],
    limitations: ['No customer source has been connected', 'Adapters in the demonstration are simulated', 'Read-only observation is the default; nothing controls equipment'],
    claim_text_public: 'Reading a customer-authorized source is specified, with simulated adapters in the demonstration. No customer source has been connected, so nothing here is live.',
    public_approval: 'APPROVED' },
];
