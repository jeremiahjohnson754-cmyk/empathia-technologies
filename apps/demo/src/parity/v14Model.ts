/**
 * The V1.4 engineering foundation (V2.5.3 #/v14/*): the fourteen phases, the evidence vocabulary every V1.4 figure wears, the typed
 * contract kinds, the capability register with its honest status, the diagnostic templates, the Operations Ready states and the
 * deployment policy. Every V1.4 record here is a deterministic fixture built from the demonstration's Core (the thirty rooms): it holds
 * no credential, calls no vendor API and reaches no device. Mode is fixed at build time: DEMONSTRATOR.
 */
import { ROOMS, BUILDINGS, seeded, shortName, type RoomOutline } from '../campus/canon.js';
import { allRecords, DEMO_NOW, openIssues, type RoomRecord } from '../campus/design.js';

export const V14_DEPLOY = { mode: 'DEMONSTRATOR', buildId: 'demo-fixture', policy: 'one policy function asked at every module boundary: fixture seeding, Instant Connect, ITSM poll, every simulator' } as const;
export type Ev = 'LIVE_VERIFIED' | 'MEASURED' | 'OBSERVED' | 'MODELED' | 'INFERRED' | 'MANUFACTURER_SPEC' | 'SIMULATED' | 'DEMO' | 'PROPOSED' | 'NOT_AUTHORIZED' | 'NOT_MEASURED' | 'NOT_SUPPORTED' | 'BLOCKED' | 'UNVERIFIED' | 'UNKNOWN' | 'PARTIAL';
export const EV: Record<Ev, [string, string]> = {
  LIVE_VERIFIED: ['Live · verified', 'ok'], MEASURED: ['Measured', 'ok'], OBSERVED: ['Observed', 'accent'], MODELED: ['Modeled', 'info'], INFERRED: ['Inferred', 'info'], MANUFACTURER_SPEC: ['Manufacturer spec', 'muted'],
  SIMULATED: ['Simulated', 'warn'], DEMO: ['Demo fixture', 'violet'], PROPOSED: ['Proposed', 'indigo'], NOT_AUTHORIZED: ['Not authorized', 'bad'], NOT_MEASURED: ['Not measured', 'muted'], NOT_SUPPORTED: ['Not supported', 'bad'],
  BLOCKED: ['Blocked', 'bad'], UNVERIFIED: ['Unverified', 'muted'], UNKNOWN: ['Unknown', 'muted'], PARTIAL: ['Partial', 'warn'],
};
export const PHASES: Array<[number, string, string, string]> = [
  [1, 'Audit, preservation, foundation', 'Fixtures, schema, badges, regression gates', ''], [2, 'Instant Connect', 'Scoped request → approval → preflight → discovery with real timings', 'connect'],
  [3, 'Integrations Hub', 'Candidate connectors, truthful status, scopes', 'hub'], [4, 'Asset identity', 'Matcher, USB parentage, ambiguity review, replacement', 'identity'],
  [5, 'Telemetry and Assurance', 'Decoders, raw vs normalized, no false PASS', 'telemetry'], [6, 'ITSM ingest', 'Read-only issues and CIs, idempotent, no email', 'itsm'],
  [7, 'Monitoring and schedules', '900 s policy, room-local midnight biweekly proposals, DST', 'schedule'], [8, 'Geometry and consent-based AI', 'Revisions, approval, propagation, tenant boundary', 'geometry'],
  [9, 'Remote diagnostics', 'Scope-limited verified evidence', 'diagnostics'], [10, 'Robotic audio', 'Multi-zone safe measurement plans, E-stop logic', 'robot'],
  [11, 'Camera and spatial survey', 'PTZ limits, no phantom dimensions', 'camera'], [12, 'Optimize', 'Scenario comparison with units and uncertainty', 'optimize'],
  [13, 'Operations Ready', 'Criterion-driven handoff; ServiceHands and SIGNAL', 'operations'], [14, 'QA, security, pilots', 'Release evidence; honest demonstrations', 'capabilities'],
];
export const PILLS: Array<[string, string]> = [['', 'Overview'], ['connect', 'Instant Connect'], ['telemetry', 'Telemetry'], ['signage', 'Signage'], ['itsm', 'Service'], ['schedule', 'Schedules'], ['geometry', 'Spatial twin'], ['diagnostics', 'Diagnostics'], ['robot', 'Robotic audio'], ['camera', 'Camera survey'], ['optimize', 'Optimize'], ['operations', 'Operations Ready'], ['graph', 'Fixture graph'], ['schema', 'Contracts'], ['capabilities', 'Capabilities'], ['plan', 'Phase plan'], ['hub', 'Integrations Hub'], ['identity', 'Asset identity']];
export const CAPS: Array<[string, Ev, string]> = [
  ['Shell, roles, Search Party first touch, Pro, Lite, Studio, Scouter, Campus, ServiceHands, Projects, Commissioning, Learn', 'LIVE_VERIFIED', 'The rebuilt demonstration; its browser suites run on every build'],
  ['Canonical graph: Tenant → Site → Building → Floor → Room → UC solution → compute → assets → interfaces, with aliases to Core ids', 'DEMO', 'Fixtures from the thirty room records of this demonstration'],
  ['Durable random asset ids (ULID / UUIDv7 shape) and readable asset tags', 'DEMO', 'Deterministic 26-character ids in the demonstrator; a service would mint real ULIDs'],
  ['Typed contracts: 18 kinds with provenance, tenant and evidence kind; validator', 'DEMO', 'The schema on this page; every fixture record carries an evidence kind'],
  ['Evidence vocabulary on every V1.4 figure', 'LIVE_VERIFIED', 'Live · measured · observed · modeled · simulated · proposed · not measured · not authorized'],
  ['Instant Connect onboarding (device / UC engine / room / floor / building / estate) with scoped approval, states and timings', 'PROPOSED', 'Simulated here with a visible clock; no device is reached'],
  ['Integrations Hub: candidate connectors, each with a truthful status; no connector is called', 'PROPOSED', 'Sixteen categories, every one simulated'],
  ['Asset identity graph: OEM vs hardware OEM vs platform; USB parentage; AMBIGUOUS review; replacement history', 'DEMO', 'Identity states from the room records: UNKNOWN, DECLARED, OBSERVED, VERIFIED'],
  ['Telemetry decoding with raw vs normalized evidence and dual timestamps', 'PROPOSED', 'Seven indicators per room, simulated readings labelled as such'],
  ['ITSM read-only issue ingest (idempotency, unmatched review, no email)', 'PROPOSED', 'The ServiceHands workspace of this browser stands in for an ITSM instance'],
  ['15-minute monitoring policy with effective interval, freshness and missed polls; biweekly room-local recommissioning proposals', 'PROPOSED', 'A simulated queue on the demonstration clock'],
  ['Lite geometry editing with revisions, units, approval and propagation; consent-based AI proposals', 'PROPOSED', 'Revisions kept in this browser; no model is called'],
  ['Remote UC / DSP / compute diagnostics', 'PROPOSED', '24 allowlisted templates in seven capability groups; claims limited to evidence'],
  ['Robotic multi-zone audio measurement simulator with hard safety stop; no audio output', 'PROPOSED', 'Every value synthetic; no sign-off on virtual values'],
  ['PTZ / FOV / spatial survey simulator without phantom dimensions', 'PROPOSED', 'Tests simulated; distances only from the record'],
  ['Optimize engine: scenarios, tradeoffs, change approval, affected retests', 'PROPOSED', 'Projections labelled modeled; nothing projected is called an improvement'],
  ['Operations Ready state machine and signed handoff', 'PROPOSED', 'Criteria judged from the room records; signing needs a permitted role'],
  ['Live vendor connectors, the customer edge bridge, credentials, robotics hardware', 'NOT_AUTHORIZED', 'Never part of this demonstration'],
];
export const SCHEMA: Record<string, string[]> = {
  Tenant: ['id', 'name', 'region', 'dataResidency', 'synthetic'], Site: ['id', 'tenantId', 'name', 'timezone', 'coreId', 'synthetic'], Building: ['id', 'siteId', 'name', 'coreId'], Floor: ['id', 'buildingId', 'level', 'coreId'],
  Room: ['id', 'floorId', 'name', 'timezone', 'coreId', 'archetype', 'capacity', 'geometryRevisionId'], UcSolution: ['id', 'roomId', 'lane', 'solutionVendor', 'platform'], Asset: ['id', 'roomId', 'kind', 'humanTag', 'identity.state', 'provenance', 'evidence'],
  Interface: ['id', 'assetId', 'kind', 'direction', 'parentId'], Contract: ['kind', 'provenance', 'tenantId', 'evidence'], Connector: ['id', 'family', 'mode', 'status'], Capability: ['id', 'text', 'evidence', 'note'],
  Observation: ['id', 'assetId', 'metric', 'value', 'sourceObservedAt', 'ingestedAt', 'decoderVersion', 'evidence'], Alert: ['id', 'assetId', 'severity', 'dedupKey', 'openedAt'], Incident: ['id', 'number', 'roomCoreId', 'state', 'priority'],
  Policy: ['id', 'source', 'intervalS', 'effectiveIntervalS'], Schedule: ['id', 'roomCoreId', 'recurrence', 'nextRunLocal', 'tz'], GeometryRevision: ['id', 'roomCoreId', 'number', 'state', 'provenance', 'editor', 'reviewer'], DiagnosticRun: ['id', 'roomCoreId', 'templateId', 'outcome', 'claim', 'evidence'],
};
export const DIAG: Array<[string, string, string, string]> = [
  ['T01', 'VERIFY_IDENTITY', 'Compute identity (serial, OEM id)', 'READ_FIRST'], ['T02', 'CHECK_ENUMERATION', 'Peripheral enumeration on the host', 'READ_FIRST'], ['T03', 'READ_DEVICE_HEALTH', 'Compute health (CPU, thermal, memory, storage, uptime)', 'READ_FIRST'],
  ['T04', 'READ_DEVICE_HEALTH', 'Network, DNS and application reachability from the room system', 'READ_ONLY'], ['T05', 'READ_DEVICE_HEALTH', 'OEM management reachability (separately from DNS)', 'READ_ONLY'], ['T06', 'READ_DEVICE_HEALTH', 'Meeting platform mode and app state through the approved surface', 'READ_ONLY'],
  ['T07', 'READ_SIGNAL_CONFIG', 'Audio endpoints on the host (microphone and loudspeaker endpoints)', 'READ_ONLY'], ['T08', 'READ_SIGNAL_CONFIG', 'DSP routes, levels, mutes, AEC reference, faults', 'READ_ONLY'], ['T09', 'READ_SIGNAL_CONFIG', 'Network audio clock and flow state through supported management', 'READ_ONLY'],
  ['T10', 'READ_SIGNAL_CONFIG', 'Beamformer / automixer observations from OEM diagnostics', 'READ_ONLY'], ['T11', 'READ_SIGNAL_CONFIG', 'Display power, input, EDID and content ingest', 'READ_ONLY'], ['T12', 'READ_DEVICE_HEALTH', 'Switch port, PoE budget and draw, impairment', 'READ_ONLY'],
  ['T13', 'READ_DEVICE_HEALTH', 'Touch panel and controller communication', 'READ_ONLY'], ['T14', 'READ_DEVICE_HEALTH', 'Codec cloud health and telemetry (supported models only)', 'READ_ONLY'], ['T15', 'READ_VENDOR_LOGS', 'Manufacturer cloud alerts, firmware and license', 'READ_ONLY'],
  ['T16', 'READ_DEVICE_HEALTH', 'Signage player status and content', 'READ_ONLY'], ['T17', 'READ_DEVICE_HEALTH', 'Telephony registration, line state and voice statistics', 'READ_ONLY'], ['T18', 'FUNCTIONAL_TEST', 'Camera selected-stream metadata (resolution, frame rate) when authorized', 'CONTROL_APPROVED'],
  ['T19', 'FUNCTIONAL_TEST', 'DSP internal test tone into its own meters (no room audio)', 'CONTROL_APPROVED'], ['T20', 'FUNCTIONAL_TEST', 'Test call through the approved platform surface', 'CONTROL_APPROVED'], ['T21', 'READ_DEVICE_HEALTH', 'On-box collection on a Windows room system', 'READ_ONLY'],
  ['T22', 'ACTIVE_PHYSICAL_TEST', 'Audible sweep, SPL and STI at the seats (instrument, person)', 'FIELD'], ['T23', 'ACTIVE_PHYSICAL_TEST', 'Camera framing at the seats, PTZ sweep', 'FIELD'], ['T24', 'ACTIVE_PHYSICAL_TEST', 'Controlled restart of the room system', 'FIELD'],
];
export const OPS_STATES: Record<string, string> = {
  DISCOVERED: 'The room exists on the register; nothing has observed it', OBSERVED_ONLY: 'Telemetry or an inventory read has seen it; no function has been checked', FUNCTIONAL_CHECK_PENDING: 'Remote functional checks have not run or have not passed',
  FIELD_MEASUREMENT_REQUIRED: 'A criterion needs an instrument in the room (acoustic, optical)', RECOMMISSION_IN_PROGRESS: 'A recommissioning assessment or a targeted retest is queued or running', VALIDATION_FAILED: 'A mandatory criterion failed', INCONCLUSIVE: 'A mandatory criterion could not be judged',
  ACCEPTED_WITH_EXCEPTIONS: 'Every mandatory criterion passed or carries an approved, unexpired exception; not yet signed', OPERATIONS_READY: 'Signed by a permitted signatory with every mandatory criterion satisfied', OPERATIONS_DEGRADED: 'Signed, then a post-acceptance read or alert degraded it', REVOKED: 'Readiness withdrawn by an authorised role with a reason',
};
export const TEL_IND: Array<[string, string, string]> = [
  ['REACHABLE', 'Reachable', 'A fresh reading from the room system; says nothing about the room working'], ['IDENTIFIED', 'Identified', 'The compute and its peripherals have a resolved identity'], ['ENUMERATED', 'Enumerated', 'The host sees every peripheral the design expects; seeing is not working'],
  ['FUNCTIONALLY_VALIDATED', 'Functionally validated', 'Authorized functional evidence: audio heard, camera framed, call joined'], ['CONFIG_VALIDATED', 'Config validated', 'Firmware and configuration match the approved baseline'], ['MEASURED', 'Measured', 'A calibrated instrument measured the room'], ['ACCEPTED', 'Accepted', 'Operations Ready acceptance signed'],
];
export const IC_KINDS: Array<[string, string, string]> = [['NEW_DEVICE', 'A device', 'One asset that is not in the graph yet'], ['UC_ENGINE', 'A UC engine', 'One room system compute or codec'], ['ROOM', 'A room', 'One room and everything in it'], ['FLOOR', 'A floor', 'Every approved room on a floor'], ['BUILDING', 'A building', 'Every approved room in a building; partial results are reported as partial'], ['ESTATE', 'The estate', 'Every building; grouped by platform and network zone, bounded concurrency']];
export const IC_STATES = ['PREPARING', 'WAITING_AUTHORIZATION', 'PREFLIGHT', 'QUEUED', 'DISCOVERING', 'RECONCILING', 'DISCOVERED', 'BASELINE_PENDING', 'MONITORING_ENABLED'];
export const SCH_STATES = ['SCHEDULED', 'PREFLIGHT', 'WAITING_WINDOW', 'WAITING_APPROVAL', 'RUNNING_NONINVASIVE', 'VERIFYING', 'REVIEW_REQUIRED', 'COMPLETE'];
export const CM_TESTS: Array<[string, string, Ev]> = [['frame', 'Frame format, resolution and rate', 'SIMULATED'], ['framing', 'Framing against consented test targets', 'SIMULATED'], ['afaewb', 'Autofocus, exposure and white balance behaviour', 'SIMULATED'], ['ingest', 'Streaming / ingest status', 'OBSERVED'], ['ptz_repeat', 'Pan / tilt / zoom repeatability and endpoint accuracy', 'SIMULATED'], ['distortion', 'Optical distortion parameters', 'NOT_MEASURED'], ['avsync', 'Audio / video synchronization', 'SIMULATED'], ['lowlight', 'Motion blur and low-light behaviour', 'NOT_MEASURED']];
export const RB_SAFETY: Array<[string, string]> = [['estop_local', 'Local emergency stop reachable'], ['watchdog', 'Watchdog heartbeat'], ['limit_switches', 'Limit switches reported'], ['proximity', 'Proximity sensing clear'], ['room_clear', 'Room clear of people'], ['no_meeting', 'No session booked in the window'], ['maintenance_approval', 'Maintenance window approved'], ['technician', 'Technician present'], ['exposure_policy', 'Sound exposure policy loaded'], ['spl_stop', 'SPL hard stop set']];

/** The fixture graph: every V1.4 figure is counted from these, which are built from the thirty rooms. */
export interface Fixtures { rooms: RoomRecord[]; sites: number; buildings: number; floors: number; assets: number; interfaces: number; lanes: Record<string, number>; identity: Record<string, number>; connectors: number; contracts: number }
export function fixtures(): Fixtures {
  const rooms = allRecords(); const hw = rooms.flatMap((r) => r.positions.filter((p) => !p.furniture));
  const lane = (r: RoomRecord) => (r.positions.some((p) => p.cat === 'bar') ? 'AIO hub' : r.positions.some((p) => p.cat === 'dsp') ? 'DSP composite' : r.positions.some((p) => p.cat === 'compute') ? 'Room system' : 'None');
  const lanes: Record<string, number> = {}; rooms.forEach((r) => { lanes[lane(r)] = (lanes[lane(r)] || 0) + 1; });
  const identity: Record<string, number> = {}; hw.forEach((p) => { identity[p.identity] = (identity[p.identity] || 0) + 1; });
  return { rooms, sites: 1, buildings: BUILDINGS.length, floors: new Set(ROOMS.map((r) => `${r.building}-${r.floor}`)).size, assets: hw.length, interfaces: rooms.reduce((s, r) => s + r.connections.length, 0), lanes, identity, connectors: 16, contracts: Object.keys(SCHEMA).length };
}
export const tz = (o: RoomOutline) => (o.building === 'HZN' || o.building === 'BCN' ? 'America/New_York' : 'America/Chicago');
/** Telemetry indicators for a room: simulated readings where the record supports them, never a false PASS. */
export function indicators(r: RoomRecord): Array<{ key: string; label: string; state: 'pass' | 'fail' | 'not measured'; ev: Ev; note: string; what: string }> {
  const rnd = seeded(`tel:${r.outline.id}`); const built = r.lifecycle !== 'PLANNED' && r.lifecycle !== 'DESIGN_APPROVED' && r.lifecycle !== 'INSTALLATION_PENDING';
  const hw = r.positions.filter((p) => !p.furniture); const ver = hw.filter((p) => p.identity === 'VERIFIED' || p.identity === 'OBSERVED').length; const issues = openIssues(r).length;
  const ago = Math.round(2 + rnd() * 10);
  return TEL_IND.map(([key, label, what]) => {
    if (!built) return { key, label, state: 'not measured' as const, ev: 'NOT_MEASURED' as Ev, note: 'The room is not installed: nothing can be read', what };
    if (key === 'REACHABLE') return { key, label, state: 'pass' as const, ev: 'SIMULATED' as Ev, note: `Running; this reading observed ${ago} min ago (simulated). A fresh reading says nothing about the room working`, what };
    if (key === 'IDENTIFIED') return { key, label, state: ver === hw.length ? 'pass' as const : 'fail' as const, ev: 'OBSERVED' as Ev, note: ver === hw.length ? 'Every position has an observed or verified identity' : `${hw.length - ver} of ${hw.length} positions keep an UNKNOWN or DECLARED identity: no make, model or serial is invented`, what };
    if (key === 'ENUMERATED') return { key, label, state: issues ? 'fail' as const : 'pass' as const, ev: 'SIMULATED' as Ev, note: issues ? `${issues} open issue(s) name a device the host should see` : `${hw.length} of ${hw.length} expected peripherals enumerated by the host (seen, not proven working)`, what };
    if (key === 'FUNCTIONALLY_VALIDATED') return { key, label, state: 'not measured' as const, ev: 'NOT_MEASURED' as Ev, note: 'No functional evidence: nothing here has heard the room or framed a seat. Remote diagnostics and field work produce it', what };
    if (key === 'CONFIG_VALIDATED') return { key, label, state: r.baselines.some((b) => b.state === 'CURRENT') ? (issues ? 'fail' as const : 'pass' as const) : 'not measured' as const, ev: r.baselines.length ? 'OBSERVED' as Ev : 'NOT_MEASURED' as Ev, note: r.baselines.length ? (issues ? 'Differs from the commissioned baseline on an open issue' : 'Matches the approved baseline on record') : 'No baseline to compare with', what };
    if (key === 'MEASURED') return { key, label, state: r.counts.verified ? 'pass' as const : 'not measured' as const, ev: r.counts.verified ? 'MEASURED' as Ev : 'NOT_MEASURED' as Ev, note: r.counts.verified ? `${r.counts.verified} verified commissioning results on record` : 'No verified result on record', what };
    return { key, label, state: r.lifecycle === 'ACCEPTED' || r.lifecycle === 'OPERATIONAL' ? 'pass' as const : 'not measured' as const, ev: 'OBSERVED' as Ev, note: r.lifecycle === 'ACCEPTED' || r.lifecycle === 'OPERATIONAL' ? `Acceptance recorded (${r.lifecycle.toLowerCase()})` : `Not accepted: ${r.lifecycle.toLowerCase().replace(/_/g, ' ')}`, what };
  });
}
/** Operations Ready: the criteria judged from the room record and the state they give. */
export function readiness(r: RoomRecord) {
  const hw = r.positions.filter((p) => !p.furniture); const amb = hw.filter((p) => p.identity === 'UNKNOWN' || p.identity === 'DECLARED').length; const issues = openIssues(r);
  const built = !(r.lifecycle === 'PLANNED' || r.lifecycle === 'DESIGN_APPROVED' || r.lifecycle === 'INSTALLATION_PENDING');
  const crit: Array<{ id: string; label: string; mandatory: boolean; state: 'PASS' | 'FAIL' | 'OBSERVED_ONLY' | 'FIELD' | 'NOT_APPLICABLE'; why: string }> = [
    { id: 'inventory-identity', label: 'Inventory identity resolved', mandatory: true, state: !built ? 'NOT_APPLICABLE' : amb ? 'OBSERVED_ONLY' : 'PASS', why: !built ? 'not installed' : amb ? `${amb} position(s) not resolved` : `${hw.length} positions with a resolved identity` },
    { id: 'itsm-linkage', label: 'No open incident on the room', mandatory: true, state: !built ? 'NOT_APPLICABLE' : issues.length ? 'FAIL' : 'PASS', why: issues.length ? `${issues.length} open: ${issues.map((i) => i.id).join(', ')}` : 'nothing open' },
    { id: 'commissioning', label: 'Every applicable test verified', mandatory: true, state: !built ? 'NOT_APPLICABLE' : r.counts.verified >= r.counts.applicable && r.counts.applicable > 0 ? 'PASS' : 'FAIL', why: `${r.counts.verified} of ${r.counts.applicable} verified` },
    { id: 'baseline', label: 'A current baseline', mandatory: true, state: !built ? 'NOT_APPLICABLE' : r.baselines.some((b) => b.state === 'CURRENT') ? 'PASS' : 'FAIL', why: r.baselines.some((b) => b.state === 'CURRENT') ? `v${r.baselines.find((b) => b.state === 'CURRENT')!.version}` : 'none current' },
    { id: 'acoustic', label: 'Speech intelligibility measured at the seats', mandatory: false, state: built ? 'FIELD' : 'NOT_APPLICABLE', why: 'needs an instrument in the room; never simulated' },
    { id: 'optical', label: 'Camera framing at the seats', mandatory: false, state: built ? 'FIELD' : 'NOT_APPLICABLE', why: 'needs a person at the seats' },
  ];
  const m = crit.filter((c) => c.mandatory && c.state !== 'NOT_APPLICABLE');
  const state = !built ? 'DISCOVERED' : m.some((c) => c.state === 'FAIL') ? 'VALIDATION_FAILED' : m.some((c) => c.state === 'OBSERVED_ONLY') ? 'OBSERVED_ONLY' : r.lifecycle === 'OPERATIONAL' ? 'OPERATIONS_READY' : 'ACCEPTED_WITH_EXCEPTIONS';
  return { crit, state };
}
export const demoClock = DEMO_NOW;
export const roomLabel = (r: RoomRecord) => `${shortName(r.outline)} — ${r.outline.name}`;
