/**
 * Commissioning Phase 5: documentation tracking and submission, as rules (founder's directive of 11 Nov 2026, §12 and §13).
 *
 * "Phase 5 must be a first-class Documentation Tracking & Submission experience. It cannot be a single file-upload field."
 *
 * The same architecture as the acceptance of a dossier: nothing is stored but a list of events; what is required, who owns it, which
 * revision is current, what is wrong with it and whether it is satisfied are all derived by replaying that list over the room's own
 * record. A stored event is untrusted: `replay` runs every event through the same `check` that `attempt` uses, with the authority of
 * the role the event names, and an event the rules refuse is dropped and counted. So a document cannot be accepted by the role that
 * submitted it, acknowledged by a role nobody asked, or given a revision number out of order, by editing what the browser keeps.
 *
 * What is required is decided by applicability rules over the room's profile, each with its reason, so "a simple meeting room is not
 * forced through irrelevant Townhall-level documentation". A file is never stored or sent: a submission carries the file's name, size
 * and SHA-256, computed where the file was chosen.
 *
 * Phase 6 reads this: a required document that is not satisfied stops acceptance like any other open item, and cannot be waived
 * there. Where the dossier already has a test for a document (the operator guide, the configuration backup), that test is the single
 * gate, so one missing thing is never counted twice; the tracker then shows where the two records agree and where they do not.
 *
 * Nothing here fabricates: findings are computed from the submissions and the room's record, and the "what is missing" list is made of
 * those findings and nothing else.
 */
import type { Actor, Blocker, Working } from './acceptance.js';

export const DELIVERABLES = ['as_built_drawings', 'signal_flow', 'network_diagram', 'rack_elevations', 'asset_list', 'bom_revision', 'config_backup', 'dsp_documentation', 'camera_configuration',
  'firmware_records', 'commissioning_results', 'measurement_evidence', 'deficiency_closure', 'training_materials', 'support_contacts', 'warranty_information', 'vendor_signoff', 'operational_handoff'] as const;
export type DeliverableType = typeof DELIVERABLES[number];

/** What the rules need to know about a room. The caller derives it from the room's own record; nothing is typed by hand. */
export interface RoomProfile {
  roomId: string; name: string; size: 'huddle' | 'meeting' | 'large' | 'venue'; seats: number; /** installed positions */ devices: number;
  hasDsp: boolean; hasCameras: boolean; /** any device on the network */ hasNetwork: boolean; /** a control processor or a touch panel */ hasControl: boolean; hasRack: boolean;
  /** anything that holds a configuration or firmware: a processor, a controller, a codec */ hasProgrammable: boolean; vendorInstalled: boolean;
}
/** The room's record as it is when the documents are read. */
export interface DocContext {
  roomRevision: number; /** position codes of the room */ positions: readonly string[]; /** installed units by category */ counts: Readonly<Record<string, number>>;
  /** evidence records on the room's dossier */ evidence: readonly string[];
  /** the dossier's tests, when the room has one: `settled` is a pass with evidence that needs no further verification */
  tests: readonly { id: string; name: string; settled: boolean }[]; deficiencies: readonly { id: string; open: boolean }[];
}
export interface DocAuthority { assign: boolean; submit: boolean; /** request a correction or accept */ review: boolean; acknowledge: boolean; /** record what a vendor sent */ recordVendor: boolean }
export type DocPolicy = (role: string) => DocAuthority;

export interface Attachment { name: string; bytes: number; /** hex, computed where the file was chosen; the file itself is not kept */ sha256: string }
interface SubmitBody { doc: DeliverableType; revision: number; fields: Record<string, string>; equipment: string[]; evidence: string[]; attachment: Attachment | null;
  /** the revisions this document was written against: the room record's, and those of the documents it depends on */ against: { room: number; docs: Partial<Record<DeliverableType, number>> };
  /** asset list only: installed units by category, as the document states them */ counts?: Record<string, number>; by: Actor; at: string }
export type DocEvent =
  | { kind: 'ASSIGN'; doc: DeliverableType; owner: Actor; due: string; by: Actor; at: string }
  | ({ kind: 'SUBMIT' } & SubmitBody)
  | ({ kind: 'VENDOR_SUBMISSION'; /** who sent it; `by` is who recorded receiving it */ vendor: string } & SubmitBody)
  | { kind: 'REQUEST_CORRECTION'; doc: DeliverableType; comment: string; by: Actor; at: string }
  | { kind: 'ACCEPT'; doc: DeliverableType; revision: number; by: Actor; at: string }
  | { kind: 'ACKNOWLEDGE'; doc: DeliverableType; revision: number; by: Actor; at: string }
  | { kind: 'WITHDRAW'; doc: DeliverableType; reason: string; by: Actor; at: string };

export interface FieldDef { key: string; label: string }
interface Rule {
  title: string; /** the role that owns it by default */ owner: string; ownerLabel: string; fields: readonly FieldDef[]; attachment: boolean;
  /** all: must list every position of the room; some: at least one */ equipment: 'all' | 'some' | 'none'; /** packet: must include every evidence record of the dossier */ evidence: 'packet' | 'some' | 'none';
  dependsOn: readonly DeliverableType[]; /** roles that must acknowledge the accepted revision */ acknowledgers: readonly Actor[]; /** arrives from the vendor */ vendor?: true; counts?: true;
  /** not submitted: read from the dossier's own deficiencies */ derived?: 'deficiencies';
  applies: (p: RoomProfile, deficiencies: number) => [boolean, string];
}
const f = (key: string, label: string): FieldDef => ({ key, label });
const always = (why: string) => (): [boolean, string] => [true, why];
const when = (test: (p: RoomProfile) => boolean, yes: string, no: string) => (p: RoomProfile): [boolean, string] => (test(p) ? [true, yes] : [false, no]);
const SM: Actor = { role: 'svcmgr', label: 'Service Manager' }; const CH: Actor = { role: 'sitechamp', label: 'Site Champion' }; const OPS: Actor = { role: 'ops', label: 'AV Operations Lead' };

/** The eighteen deliverables of §12, each with when it applies and why, who owns it, what it must state and what it must reference.
 *  Role names are the demonstration's own (V2.5.3): Designer, Systems Engineer, Installation Engineer, Commissioning Engineer, Service Manager, Integration PM. */
export const RULES: Readonly<Record<DeliverableType, Rule>> = {
  as_built_drawings: { title: 'As-built drawings', owner: 'designer', ownerLabel: 'Designer', fields: [f('drawing_number', 'Drawing number'), f('sheets', 'Number of sheets')], attachment: true, equipment: 'none', evidence: 'none', dependsOn: [], acknowledgers: [],
    applies: always('Every commissioned room has a drawing of what was built') },
  signal_flow: { title: 'Signal flow diagram', owner: 'designer', ownerLabel: 'Designer', fields: [f('drawing_number', 'Drawing number')], attachment: true, equipment: 'none', evidence: 'none', dependsOn: ['as_built_drawings'], acknowledgers: [],
    applies: when((p) => p.hasDsp || p.devices >= 5, 'The room routes signals through a processor or between five or more devices', 'A display and its sources: the as-built drawing shows the only connections') },
  network_diagram: { title: 'Network diagram', owner: 'syseng', ownerLabel: 'Systems Engineer', fields: [f('vlan_plan', 'VLANs and addressing shown'), f('switch_ports', 'Switch and ports')], attachment: true, equipment: 'none', evidence: 'none', dependsOn: ['as_built_drawings'], acknowledgers: [],
    applies: when((p) => p.hasNetwork, 'The room has devices on the network', 'Nothing in the room is on the network') },
  rack_elevations: { title: 'Rack elevations', owner: 'designer', ownerLabel: 'Designer', fields: [f('rack_id', 'Rack'), f('rack_units', 'Rack units used')], attachment: true, equipment: 'none', evidence: 'none', dependsOn: ['as_built_drawings'], acknowledgers: [],
    applies: when((p) => p.hasRack, 'The room has an equipment rack', 'The room has no equipment rack') },
  asset_list: { title: 'Asset list', owner: 'installer', ownerLabel: 'Installation Engineer', fields: [f('register_reference', 'Asset register reference')], attachment: false, equipment: 'all', evidence: 'none', dependsOn: ['bom_revision'], acknowledgers: [], counts: true,
    applies: always('Every installed unit is on the asset register') },
  bom_revision: { title: 'Bill of materials revision', owner: 'designer', ownerLabel: 'Designer', fields: [f('bom_number', 'Bill of materials number'), f('change_summary', 'What changed in this revision')], attachment: true, equipment: 'none', evidence: 'none', dependsOn: [], acknowledgers: [],
    applies: always('What was bought and installed is recorded for every room') },
  config_backup: { title: 'Software and configuration backup', owner: 'syseng', ownerLabel: 'Systems Engineer', fields: [f('software_version', 'Software or design version'), f('restore_tested', 'Restore tested (yes or no, and when)')], attachment: true, equipment: 'some', evidence: 'none', dependsOn: [], acknowledgers: [],
    applies: when((p) => p.hasProgrammable, 'The room has devices that hold a configuration', 'Nothing in the room holds a configuration') },
  dsp_documentation: { title: 'DSP documentation', owner: 'syseng', ownerLabel: 'Systems Engineer', fields: [f('design_file', 'Design file name'), f('presets', 'Presets and what each is for')], attachment: true, equipment: 'some', evidence: 'none', dependsOn: [], acknowledgers: [],
    applies: when((p) => p.hasDsp, 'The room has an audio processor', 'The room has no audio processor') },
  camera_configuration: { title: 'Camera configuration', owner: 'syseng', ownerLabel: 'Systems Engineer', fields: [f('presets', 'Presets and what each frames')], attachment: false, equipment: 'some', evidence: 'none', dependsOn: [], acknowledgers: [],
    applies: when((p) => p.hasCameras, 'The room has cameras', 'The room has no camera') },
  firmware_records: { title: 'Firmware records', owner: 'syseng', ownerLabel: 'Systems Engineer', fields: [f('versions', 'Version installed on each device')], attachment: false, equipment: 'some', evidence: 'none', dependsOn: [], acknowledgers: [],
    applies: when((p) => p.hasProgrammable, 'The room has devices that run firmware', 'Nothing in the room runs updatable firmware') },
  commissioning_results: { title: 'Commissioning results', owner: 'cxeng', ownerLabel: 'Commissioning Engineer', fields: [f('procedure_revision', 'Test procedure revision')], attachment: true, equipment: 'none', evidence: 'packet', dependsOn: [], acknowledgers: [],
    applies: always('Every commissioned room has its results on record') },
  measurement_evidence: { title: 'Measurement evidence', owner: 'cxeng', ownerLabel: 'Commissioning Engineer', fields: [f('instrument', 'Instrument and its calibration date'), f('method', 'Method')], attachment: true, equipment: 'none', evidence: 'some', dependsOn: [], acknowledgers: [],
    applies: when((p) => p.hasDsp || p.size === 'large' || p.size === 'venue', 'The room has audio that is measured, not only checked', 'Nothing in the room is commissioned by measurement') },
  deficiency_closure: { title: 'Deficiency closure records', owner: 'cxeng', ownerLabel: 'Commissioning Engineer', fields: [], attachment: false, equipment: 'none', evidence: 'none', dependsOn: [], acknowledgers: [], derived: 'deficiencies',
    applies: (_p, n) => (n > 0 ? [true, `${n} ${n === 1 ? 'deficiency was' : 'deficiencies were'} raised in commissioning`] : [false, 'No deficiency was raised in commissioning']) },
  training_materials: { title: 'Training materials and operator guide', owner: 'svcmgr', ownerLabel: 'Service Manager', fields: [f('audience', 'Who it is for'), f('duration', 'How long the session takes')], attachment: true, equipment: 'none', evidence: 'none', dependsOn: [], acknowledgers: [OPS, CH],
    applies: when((p) => p.hasControl || p.size === 'large' || p.size === 'venue', 'The room has controls an operator has to learn', 'The room has no controls to learn: it is used as it is found') },
  support_contacts: { title: 'Support contacts', owner: 'svcmgr', ownerLabel: 'Service Manager', fields: [f('first_line', 'First line (a role, not a name)'), f('escalation', 'Escalation')], attachment: false, equipment: 'none', evidence: 'none', dependsOn: [], acknowledgers: [],
    applies: always('Whoever uses the room must be able to reach support') },
  warranty_information: { title: 'Warranty information', owner: 'installer', ownerLabel: 'Installation Engineer', fields: [f('start_date', 'Start date'), f('term', 'Term'), f('provider', 'Provider')], attachment: false, equipment: 'none', evidence: 'none', dependsOn: [], acknowledgers: [],
    applies: always('Every installed system has a warranty position, even if it is "none"') },
  vendor_signoff: { title: 'Vendor sign-off', owner: 'ipm', ownerLabel: 'Integration PM', fields: [f('signatory_role', 'Role of the person who signed')], attachment: true, equipment: 'none', evidence: 'none', dependsOn: [], acknowledgers: [], vendor: true,
    applies: when((p) => p.vendorInstalled, 'The room was installed by a vendor', 'The room was not installed by a vendor') },
  operational_handoff: { title: 'Operational handoff', owner: 'ipm', ownerLabel: 'Integration PM', fields: [f('summary', 'What is being handed over'), f('open_items', 'Open items carried into operation ("none" if none)')], attachment: false, equipment: 'none', evidence: 'none', dependsOn: [], acknowledgers: [SM, OPS],
    applies: always('Operations takes the room over from the project') },
};

export interface Requirement { type: DeliverableType; title: string; applies: boolean; why: string; owner: string; ownerLabel: string; fields: readonly FieldDef[]; attachment: boolean; equipment: Rule['equipment']; evidence: Rule['evidence']; dependsOn: readonly DeliverableType[]; acknowledgers: readonly Actor[]; vendor: boolean; derived: boolean }
/** Every deliverable for this room, with whether it applies and why (or why not). */
export function requiredFor(p: RoomProfile, deficiencies = 0): Requirement[] {
  return DELIVERABLES.map((type) => { const r = RULES[type]; const [applies, why] = r.applies(p, deficiencies);
    return { type, title: r.title, applies, why, owner: r.owner, ownerLabel: r.ownerLabel, fields: r.fields, attachment: r.attachment, equipment: r.equipment, evidence: r.evidence, dependsOn: r.dependsOn, acknowledgers: r.acknowledgers, vendor: !!r.vendor, derived: !!r.derived }; });
}

/** One room's documentation: its profile, which dossier tests stand for which document, and the history it was seeded with. */
export interface DocSet { id: string; profile: RoomProfile; /** document → the dossier test that is its gate */ represents: Partial<Record<DeliverableType, string>>; history: readonly DocEvent[] }

export type DocState = 'NOT_APPLICABLE' | 'NOT_STARTED' | 'ASSIGNED' | 'SUBMITTED' | 'CORRECTION_REQUESTED' | 'ACCEPTED' | 'OUTDATED';
export type FindingKind = 'not_submitted' | 'unassigned' | 'overdue' | 'missing_attachment' | 'field_empty' | 'vendor_missing' | 'unknown_equipment' | 'equipment_not_listed' | 'no_equipment' | 'unknown_evidence'
  | 'evidence_not_in_packet' | 'no_evidence' | 'outdated_room' | 'ahead_of_room' | 'outdated_reference' | 'reference_missing' | 'contradiction_count' | 'contradiction_revision' | 'correction_requested' | 'awaiting_review'
  | 'acknowledgement_outstanding' | 'deficiency_open' | 'not_on_dossier' | 'dossier_ahead';
export interface Finding { doc: DeliverableType; kind: FindingKind; /** what is wrong, from the records */ detail: string; /** what would correct it */ action: string; /** stops the document being accepted */ blocking: boolean }
export interface Submission { revision: number; fields: Record<string, string>; equipment: string[]; evidence: string[]; attachment: Attachment | null; against: { room: number; docs: Partial<Record<DeliverableType, number>> }; counts: Record<string, number>; by: Actor; at: string; vendor: string | null }
export interface WorkingDoc {
  type: DeliverableType; title: string; applies: boolean; why: string; ownerRole: string; ownerLabel: string; owner: Actor | null; due: string | null; overdue: boolean;
  state: DocState; /** the current submission, if there is one */ submission: Submission | null; /** the last revision number used, withdrawn or not */ lastRevision: number;
  accepted: { revision: number; by: Actor; at: string } | null; correction: { comment: string; by: Actor; at: string } | null;
  acknowledgements: { need: readonly Actor[]; have: { by: Actor; at: string }[]; outstanding: Actor[] };
  findings: Finding[]; /** accepted, complete and consistent in this tracker */ satisfied: boolean;
  /** what decides this requirement for acceptance: this tracker, a test of the dossier, or the dossier's deficiencies */ gate: 'tracker' | 'dossier' | 'none'; test: string | null; /** the requirement is met for acceptance */ met: boolean;
  history: DocEvent[];
}
export interface DocsWorking { set: string; docs: WorkingDoc[]; required: number; met: number; /** stored events the rules refused */ dropped: number; lastAt: string | null; findings: Finding[]; /** required documents, gated here, that are not satisfied */ blockers: Blocker[] }

const DAY = /^\d{4}-\d{2}-\d{2}$/; const HEX64 = /^[0-9a-f]{64}$/; const ROLE = /^[a-z]{2,12}$/;
const str = (v: unknown, min: number, max: number): v is string => typeof v === 'string' && v.trim().length >= min && v.length <= max;
const actor = (a: unknown): a is Actor => !!a && typeof a === 'object' && ROLE.test(String((a as Actor).role)) && str((a as Actor).label, 2, 60);
const when_ = (v: unknown): v is string => typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v));
const list = (v: unknown, max: number): v is string[] => Array.isArray(v) && v.length <= max && v.every((x) => str(x, 1, 60)) && new Set(v).size === v.length;
const rev = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < 10000;
const isType = (v: unknown): v is DeliverableType => typeof v === 'string' && (DELIVERABLES as readonly string[]).includes(v);
export const DOC_LIMITS = { comment: 12, field: 400, attachmentBytes: 2 * 1024 * 1024 * 1024, events: 600 } as const;

/** Is this the shape of an event at all? Anything read back from storage passes through here before it is replayed. */
export function wellFormedDocEvent(e: unknown): e is DocEvent {
  if (!e || typeof e !== 'object') return false; const x = e as Record<string, unknown>;
  if (!isType(x.doc) || !actor(x.by) || !when_(x.at)) return false;
  switch (x.kind) {
    case 'ASSIGN': return actor(x.owner) && typeof x.due === 'string' && DAY.test(x.due) && !Number.isNaN(Date.parse(x.due));
    case 'VENDOR_SUBMISSION': if (!str(x.vendor, 2, 80)) return false;   // falls through to the body of a submission
    case 'SUBMIT': { // eslint-disable-line no-fallthrough
      const a = x.attachment as Attachment | null; const g = x.against as SubmitBody['against'] | undefined; const fields = x.fields as Record<string, unknown> | undefined; const counts = x.counts as Record<string, unknown> | undefined;
      return rev(x.revision) && x.revision >= 1 && !!fields && typeof fields === 'object' && Object.keys(fields).length <= 12 && Object.entries(fields).every(([k, v]) => k.length <= 40 && typeof v === 'string' && v.length <= DOC_LIMITS.field)
        && list(x.equipment, 200) && list(x.evidence, 200) && (a === null || (!!a && typeof a === 'object' && str(a.name, 1, 160) && Number.isInteger(a.bytes) && a.bytes > 0 && a.bytes <= DOC_LIMITS.attachmentBytes && HEX64.test(String(a.sha256))))
        && !!g && typeof g === 'object' && rev(g.room) && !!g.docs && typeof g.docs === 'object' && Object.entries(g.docs).every(([k, v]) => isType(k) && rev(v))
        && (counts === undefined || (!!counts && typeof counts === 'object' && Object.keys(counts).length <= 40 && Object.entries(counts).every(([k, v]) => k.length <= 40 && rev(v))));
    }
    case 'REQUEST_CORRECTION': return str(x.comment, 1, 600);
    case 'ACCEPT': case 'ACKNOWLEDGE': return rev(x.revision) && x.revision >= 1;
    case 'WITHDRAW': return str(x.reason, 1, 600);
    default: return false;
  }
}

interface Slot { type: DeliverableType; rule: Rule; applies: boolean; why: string; owner: Actor | null; due: string | null; current: Submission | null; lastRevision: number; accepted: WorkingDoc['accepted']; correction: WorkingDoc['correction']; acks: { by: Actor; at: string }[]; history: DocEvent[] }
interface State { slots: Map<DeliverableType, Slot>; lastAt: string | null }
const start = (p: RoomProfile, deficiencies: number): State => ({ lastAt: null, slots: new Map(DELIVERABLES.map((type) => { const rule = RULES[type]; const [applies, why] = rule.applies(p, deficiencies);
  return [type, { type, rule, applies, why, owner: null, due: null, current: null, lastRevision: 0, accepted: null, correction: null, acks: [], history: [] }]; })) });

/** what is wrong with a submission whatever the room's record says: these stop an acceptance even in a replay of stored events */
function intrinsic(s: Slot): Finding[] {
  const out: Finding[] = []; const c = s.current; if (!c) return out; const t = s.rule.title;
  if (s.rule.attachment && !c.attachment) out.push({ doc: s.type, kind: 'missing_attachment', detail: `Revision ${c.revision} has no file attached.`, action: `Submit a new revision of the ${t.toLowerCase()} with its file.`, blocking: true });
  for (const fd of s.rule.fields) if (!str(c.fields[fd.key], 1, DOC_LIMITS.field)) out.push({ doc: s.type, kind: 'field_empty', detail: `“${fd.label}” is empty in revision ${c.revision}.`, action: `Submit a new revision that states it.`, blocking: true });
  if (s.rule.vendor && !c.vendor) out.push({ doc: s.type, kind: 'vendor_missing', detail: `Revision ${c.revision} is not recorded as received from the vendor.`, action: 'Record what the vendor sent as a vendor submission.', blocking: true });
  return out;
}

/** The one place a step is judged. Returns why it is refused, or null. */
function check(st: State, e: DocEvent, policy: DocPolicy): string | null {
  if (!wellFormedDocEvent(e)) return 'That is not a well-formed record.';
  const s = st.slots.get(e.doc)!; const t = s.rule.title; const may = policy(e.by.role);
  if (!s.applies) return `${t} does not apply to this room: ${s.why.charAt(0).toLowerCase()}${s.why.slice(1)}.`;
  if (s.rule.derived) return `${t} are read from the dossier’s own deficiencies; nothing is submitted here.`;
  if (st.lastAt && Date.parse(e.at) < Date.parse(st.lastAt)) return 'A record cannot be dated before the one before it.';
  const c = s.current;
  switch (e.kind) {
    case 'ASSIGN':
      if (!may.assign) return 'This role does not assign documentation.';
      if (!policy(e.owner.role).submit && !(s.rule.vendor && policy(e.owner.role).recordVendor)) return `${e.owner.label} is not a role that submits documentation.`;
      if (e.due < e.at.slice(0, 10)) return 'The due date is already past.';
      return null;
    case 'SUBMIT': case 'VENDOR_SUBMISSION':
      if (e.kind === 'SUBMIT' ? !may.submit : !may.recordVendor) return e.kind === 'SUBMIT' ? 'This role does not submit documentation.' : 'This role does not record vendor submissions.';
      if (s.rule.vendor && e.kind === 'SUBMIT') return `${t} comes from the vendor: record it as received from the vendor.`;
      if (e.kind === 'SUBMIT' && s.owner && s.owner.role !== e.by.role) return `${t} is assigned to the ${s.owner.label}.`;
      if (e.revision !== s.lastRevision + 1) return `The next revision of the ${t.toLowerCase()} is ${s.lastRevision + 1}.`;
      if (s.rule.counts && !e.counts) return `${t} must state how many units of each category are installed.`;
      return null;
    case 'REQUEST_CORRECTION':
      if (!may.review) return 'This role does not review documentation.';
      if (!c) return `There is no submission of the ${t.toLowerCase()} to correct.`;
      if (s.correction) return 'A correction is already requested.';
      if (c.by.role === e.by.role) return 'A submission is reviewed by a different role from the one that submitted it.';
      if (!str(e.comment, DOC_LIMITS.comment, 600)) return `Say what has to be corrected, in at least ${DOC_LIMITS.comment} characters.`;
      return null;
    case 'ACCEPT': {
      if (!may.review) return 'This role does not review documentation.';
      if (!c) return `There is no submission of the ${t.toLowerCase()} to accept.`;
      if (s.accepted) return `Revision ${s.accepted.revision} is already accepted.`;
      if (s.correction) return 'A correction was requested: a new revision has to be submitted first.';
      if (e.revision !== c.revision) return `The current revision is ${c.revision}.`;
      if (c.by.role === e.by.role) return 'A submission is accepted by a different role from the one that submitted it.';
      const wrong = intrinsic(s); if (wrong.length) return `Revision ${c.revision} cannot be accepted: ${wrong.map((x) => x.detail).join(' ')}`;
      return null;
    }
    case 'ACKNOWLEDGE':
      if (!may.acknowledge) return 'This role does not acknowledge documentation.';
      if (!s.rule.acknowledgers.some((a) => a.role === e.by.role)) return s.rule.acknowledgers.length ? `${t} is acknowledged by: ${s.rule.acknowledgers.map((a) => a.label).join(', ')}.` : `${t} needs no acknowledgement.`;
      if (!s.accepted || !c) return 'Only an accepted revision is acknowledged.';
      if (e.revision !== s.accepted.revision) return `The accepted revision is ${s.accepted.revision}.`;
      if (c.by.role === e.by.role) return 'The role that wrote a document does not acknowledge receiving it.';
      if (s.acks.some((a) => a.by.role === e.by.role)) return 'Already acknowledged by this role.';
      return null;
    case 'WITHDRAW':
      if (!c) return `There is no submission of the ${t.toLowerCase()} to withdraw.`;
      if (!((c.by.role === e.by.role && (may.submit || may.recordVendor)) || may.review)) return 'A submission is withdrawn by the role that made it, or by a reviewer.';
      if (!str(e.reason, DOC_LIMITS.comment, 600)) return `Say why, in at least ${DOC_LIMITS.comment} characters.`;
      return null;
  }
}
function apply(st: State, e: DocEvent): void {
  const s = st.slots.get(e.doc)!; st.lastAt = e.at; s.history.push(e);
  if (e.kind === 'ASSIGN') { s.owner = e.owner; s.due = e.due; }
  else if (e.kind === 'SUBMIT' || e.kind === 'VENDOR_SUBMISSION') { s.current = { revision: e.revision, fields: { ...e.fields }, equipment: [...e.equipment], evidence: [...e.evidence], attachment: e.attachment ? { ...e.attachment } : null, against: { room: e.against.room, docs: { ...e.against.docs } }, counts: { ...(e.counts || {}) }, by: e.by, at: e.at, vendor: e.kind === 'VENDOR_SUBMISSION' ? e.vendor : null }; s.lastRevision = e.revision; s.accepted = null; s.correction = null; s.acks = []; }   // a new revision supersedes the accepted one: it is reviewed and acknowledged again
  else if (e.kind === 'REQUEST_CORRECTION') { s.correction = { comment: e.comment, by: e.by, at: e.at }; s.accepted = null; s.acks = []; }
  else if (e.kind === 'ACCEPT') s.accepted = { revision: e.revision, by: e.by, at: e.at };
  else if (e.kind === 'ACKNOWLEDGE') s.acks.push({ by: e.by, at: e.at });
  else { s.current = null; s.accepted = null; s.correction = null; s.acks = []; }
}
const fold = (set: DocSet, events: readonly DocEvent[], ctx: DocContext, policy: DocPolicy, until?: string): { st: State; dropped: number } => {
  const st = start(set.profile, ctx.deficiencies.length); let dropped = 0;
  for (const e of [...set.history, ...events].slice(0, DOC_LIMITS.events)) {
    if (until && wellFormedDocEvent(e) && Date.parse(e.at) > Date.parse(until)) break;        // the record as it stood then
    if (check(st, e, policy)) dropped++; else apply(st, e);
  }
  return { st, dropped };
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** a calendar day in words: 2026-11-01 → 1 November 2026 */
const inWords = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const some = (a: readonly string[], n = 4) => (a.length > n ? `${a.slice(0, n).join(', ')} and ${a.length - n} more` : a.join(', '));

/**
 * Read the documentation of a room: the seeded history, then the stored events, replayed under the rules; then every finding, computed
 * against the room's record as it is now. `asOf` is the moment of reading (for what is overdue) and, with `until`, the record is read
 * as it stood at that moment.
 */
export function replayDocs(set: DocSet, events: readonly DocEvent[], ctx: DocContext, policy: DocPolicy, asOf?: string, opts: { until?: string } = {}): DocsWorking {
  const { st, dropped } = fold(set, events, ctx, policy, opts.until); const now = asOf ?? st.lastAt ?? '1970-01-01T00:00:00Z'; const today = now.slice(0, 10);
  const slot = (t: DeliverableType) => st.slots.get(t)!; const positions = new Set(ctx.positions); const evidence = new Set(ctx.evidence);
  const docs: WorkingDoc[] = DELIVERABLES.map((type) => {
    const s = slot(type); const r = s.rule; const c = s.current; const fs: Finding[] = []; const lower = r.title.toLowerCase();
    const add = (kind: FindingKind, detail: string, action: string, blocking = true) => fs.push({ doc: type, kind, detail, action, blocking });
    const testId = set.represents[type] ?? null; const test = testId ? ctx.tests.find((x) => x.id === testId) ?? null : null;
    const gate: WorkingDoc['gate'] = !s.applies ? 'none' : r.derived || test ? 'dossier' : 'tracker';
    if (s.applies && r.derived) {
      const open = ctx.deficiencies.filter((x) => x.open).map((x) => x.id);
      if (open.length) add('deficiency_open', `${plural(open.length, 'deficiency is', 'deficiencies are')} still open: ${some(open)}.`, 'Correct each one and retest it on the dossier; it closes when the retest is independently verified.', false);
      return { type, title: r.title, applies: true, why: s.why, ownerRole: r.owner, ownerLabel: r.ownerLabel, owner: null, due: null, overdue: false, state: open.length ? 'SUBMITTED' as const : 'ACCEPTED' as const, submission: null, lastRevision: 0, accepted: null, correction: null,
        acknowledgements: { need: [], have: [], outstanding: [] }, findings: fs, satisfied: !open.length, gate, test: null, met: !open.length, history: [] };
    }
    if (s.applies && c) {
      fs.push(...intrinsic(s));
      const unknownEq = c.equipment.filter((x) => !positions.has(x));
      if (unknownEq.length) add('unknown_equipment', `Revision ${c.revision} names ${plural(unknownEq.length, 'position', 'positions')} the room does not have: ${some(unknownEq)}.`, 'Submit a new revision that names only the room’s own positions.');
      if (r.equipment === 'all') { const missing = ctx.positions.filter((x) => !c.equipment.includes(x)); if (missing.length) add('equipment_not_listed', `Revision ${c.revision} leaves out ${plural(missing.length, 'position', 'positions')} of the room: ${some(missing)}.`, 'Submit a new revision that lists every installed position.'); }
      if (r.equipment === 'some' && !c.equipment.length) add('no_equipment', `Revision ${c.revision} does not say which equipment it is about.`, 'Submit a new revision that names the positions it covers.');
      const unknownEv = c.evidence.filter((x) => !evidence.has(x));
      if (unknownEv.length) add('unknown_evidence', `Revision ${c.revision} cites ${plural(unknownEv.length, 'evidence record', 'evidence records')} the dossier does not hold: ${some(unknownEv)}.`, 'Submit a new revision that cites only records on the dossier.');
      if (r.evidence === 'packet') { const missing = ctx.evidence.filter((x) => !c.evidence.includes(x)); if (missing.length) add('evidence_not_in_packet', `Revision ${c.revision} does not include ${plural(missing.length, 'evidence record', 'evidence records')} that the dossier holds: ${some(missing)}.`, 'Resubmit the packet with every evidence record of the dossier in it.'); }
      if (r.evidence === 'some' && !c.evidence.length) add('no_evidence', `Revision ${c.revision} cites no evidence record.`, 'Submit a new revision that cites the evidence it rests on.');
      if (c.against.room < ctx.roomRevision) add('outdated_room', `Revision ${c.revision} was written against revision ${c.against.room} of the room record; the room record is now at revision ${ctx.roomRevision}.`, `Check the ${lower} against the room as it is now and submit a new revision.`);
      if (c.against.room > ctx.roomRevision) add('ahead_of_room', `Revision ${c.revision} says it was written against revision ${c.against.room} of the room record, which is at revision ${ctx.roomRevision}.`, 'Submit a new revision that states the revision it was actually written against.');
      for (const dep of r.dependsOn) { const d = slot(dep); if (!d.applies || !d.current) continue; const seen = c.against.docs[dep];
        if (seen === undefined) add('reference_missing', `Revision ${c.revision} does not say which revision of the ${d.rule.title.toLowerCase()} it was written against.`, 'Submit a new revision that states it.');
        else if (seen < d.current.revision) add('outdated_reference', `Revision ${c.revision} was written against revision ${seen} of the ${d.rule.title.toLowerCase()}, which is now at revision ${d.current.revision}.`, `Check the ${lower} against the newer ${d.rule.title.toLowerCase()} and submit a new revision.`);
        else if (seen > d.current.revision) add('ahead_of_room', `Revision ${c.revision} cites revision ${seen} of the ${d.rule.title.toLowerCase()}, which is at revision ${d.current.revision}.`, 'Submit a new revision that cites a revision that exists.'); }
      if (r.counts) { const cats = [...new Set([...Object.keys(ctx.counts), ...Object.keys(c.counts)])].filter((k) => (ctx.counts[k] || 0) !== (c.counts[k] || 0));
        if (cats.length) add('contradiction_count', `Revision ${c.revision} disagrees with the room record: ${cats.map((k) => `${k} ${c.counts[k] || 0} listed, ${ctx.counts[k] || 0} installed`).join('; ')}.`, 'Find which is right, correct the other, and submit a new revision.'); }
      if (type === 'signal_flow' || type === 'as_built_drawings') { const other = slot(type === 'signal_flow' ? 'as_built_drawings' : 'signal_flow');
        if (other.applies && other.current && other.current.against.room !== c.against.room) add('contradiction_revision', `The ${lower} (revision ${c.revision}) describes revision ${c.against.room} of the room record, and the ${other.rule.title.toLowerCase()} (revision ${other.current.revision}) describes revision ${other.current.against.room}.`, 'Bring both to the same revision of the room record.'); }
    }
    const acksOut = s.accepted ? r.acknowledgers.filter((a) => !s.acks.some((h) => h.by.role === a.role)) : [];
    if (s.applies) {
      if (!c) add('not_submitted', s.lastRevision ? `Revision ${s.lastRevision} was withdrawn and nothing has replaced it.` : 'Nothing has been submitted.', s.owner ? `The ${s.owner.label} submits it${s.due ? `, due ${inWords(s.due)}` : ''}.` : `Assign it (it is normally the ${r.ownerLabel}’s) and set a due date.`, false);
      if (!c && !s.owner) add('unassigned', 'It has no owner.', `Assign it; it is normally the ${r.ownerLabel}’s.`, false);
      if (c && s.correction) add('correction_requested', `The ${s.correction.by.label} asked for a correction of revision ${c.revision}: “${s.correction.comment}”`, 'Submit a new revision that answers it.', false);
      if (c && !s.correction && !s.accepted) add('awaiting_review', `Revision ${c.revision} is waiting for review by a role other than the ${c.by.label}.`, 'A reviewer accepts it or asks for a correction.', false);
      if (acksOut.length) add('acknowledgement_outstanding', `Revision ${s.accepted!.revision} is accepted but not yet acknowledged by: ${acksOut.map((a) => a.label).join(', ')}.`, 'Each of them reads it and acknowledges it.', false);
    }
    const blocking = fs.some((x) => x.blocking);
    const satisfied = s.applies && !!c && !!s.accepted && !s.correction && !blocking && !acksOut.length;
    const met = !s.applies ? true : gate === 'dossier' ? !!test?.settled : satisfied;
    if (s.applies && test) {
      if (satisfied && !test.settled) add('not_on_dossier', `Accepted here, but test ${test.id} (“${test.name}”) is still open on the dossier.`, `Record it on the dossier with this document as its evidence; it then needs independent verification.`, false);
      if (!satisfied && test.settled) add('dossier_ahead', `Test ${test.id} (“${test.name}”) is recorded as passed on the dossier, which this tracker does not yet bear out.`, 'Complete the document here so the two records agree.', false);
    }
    const overdue = s.applies && !!s.due && today > s.due && !satisfied;
    if (overdue) add('overdue', `It was due on ${inWords(s.due!)}.`, s.owner ? `The ${s.owner.label} is its owner.` : 'Assign an owner.', false);
    const stale = fs.some((x) => x.kind === 'outdated_room' || x.kind === 'outdated_reference');
    const state: DocState = !s.applies ? 'NOT_APPLICABLE' : !c ? (s.owner ? 'ASSIGNED' : 'NOT_STARTED') : s.correction ? 'CORRECTION_REQUESTED' : s.accepted ? (stale ? 'OUTDATED' : 'ACCEPTED') : 'SUBMITTED';
    return { type, title: r.title, applies: s.applies, why: s.why, ownerRole: r.owner, ownerLabel: r.ownerLabel, owner: s.owner, due: s.due, overdue, state, submission: c, lastRevision: s.lastRevision, accepted: s.accepted, correction: s.correction,
      acknowledgements: { need: r.acknowledgers, have: s.acks, outstanding: acksOut }, findings: fs, satisfied, gate, test: test ? test.id : null, met, history: s.history };
  });
  const req = docs.filter((d) => d.applies);
  const why = (d: WorkingDoc): string => { const b = d.findings.find((x) => x.blocking); return d.state === 'NOT_STARTED' || d.state === 'ASSIGNED' ? 'is not submitted' : d.state === 'CORRECTION_REQUESTED' ? 'has a correction requested' : d.state === 'OUTDATED' ? 'is outdated' : d.state === 'SUBMITTED' ? 'awaits review'
    : b ? `is not consistent with the room record (${b.kind.replace(/_/g, ' ')})` : d.acknowledgements.outstanding.length ? `awaits acknowledgement by the ${d.acknowledgements.outstanding.map((a) => a.label).join(' and the ')}` : 'is not complete'; };
  return { set: set.id, docs, required: req.length, met: req.filter((d) => d.met).length, dropped, lastAt: st.lastAt, findings: docs.flatMap((d) => d.findings),
    blockers: req.filter((d) => d.gate === 'tracker' && !d.satisfied).map((d) => ({ test: null, reason: `document “${d.title}” ${why(d)}` })) };
}

/** Try one step now. Refused if the rules refuse it, or if accepting would accept a document the room's record contradicts. */
export function attemptDoc(set: DocSet, events: readonly DocEvent[], e: DocEvent, ctx: DocContext, policy: DocPolicy): { events: DocEvent[] } | { refused: string } {
  if (set.history.length + events.length >= DOC_LIMITS.events) return { refused: 'This record is full.' };
  const { st } = fold(set, events, ctx, policy); const no = check(st, e, policy); if (no) return { refused: no };
  if (e.kind === 'ACCEPT') { const d = replayDocs(set, events, ctx, policy, e.at).docs.find((x) => x.type === e.doc)!; const wrong = d.findings.filter((x) => x.blocking);
    if (wrong.length) return { refused: `Revision ${e.revision} cannot be accepted: ${wrong.map((x) => x.detail).join(' ')}` }; }
  return { events: [...events, e] };
}

/** What is missing, in words, with what would correct it. Each line is one finding; nothing is added. */
export function whatIsMissing(w: DocsWorking): { doc: DeliverableType; title: string; finding: Finding; text: string }[] {
  const rank = (x: Finding) => (x.blocking ? 0 : x.kind === 'overdue' ? 1 : x.kind === 'not_on_dossier' || x.kind === 'dossier_ahead' ? 3 : 2);
  return w.docs.flatMap((d) => d.findings.filter((x) => !(x.kind === 'unassigned')).map((finding) => ({ doc: d.type, title: d.title, finding, text: `${d.title}. ${finding.detail} ${finding.action}` }))).sort((a, b) => rank(a.finding) - rank(b.finding));
}

export interface ReleaseControl { id: 'tests' | 'evidence' | 'deficiencies' | 'documents' | 'identity' | 'revisions' | 'signoff' | 'retest' | 'handoff' | 'baseline'; title: string; state: 'PASS' | 'OPEN'; /** what is open, in words; empty when it passes */ open: string[]; /** of those, how many a standing waiver covers */ waived: number; basis: string }
/**
 * The ten checks before acceptance (§13), each computed from the dossier and the documentation as they stand. `approvers` are the roles
 * the caller's policy lets give each approval; the check is whether anyone eligible is left once those who did the work are set aside.
 */
export function releaseControls(d: Working, docs: DocsWorking, approvers: { first: readonly Actor[]; second: readonly Actor[] }): ReleaseControl[] {
  const standing = new Set(d.waivers.filter((x) => x.state === 'STANDING').map((x) => x.test));
  const tests = d.tests.filter((t) => t.result !== 'PASS'); const noEv = d.tests.filter((t) => t.result === 'PASS' && !t.evidence);
  const defs = d.deficiencies.filter((x) => x.state !== 'CLOSED'); const awaiting = d.tests.filter((t) => t.changed && t.result === 'PASS' && !!t.evidence && !t.verifiedBy); const corrected = d.deficiencies.filter((x) => x.state === 'CORRECTED_AWAITING_RETEST');
  const req = docs.docs.filter((x) => x.applies); const of = (...k: FindingKind[]) => docs.findings.filter((x) => k.includes(x.kind));
  const say = (x: Finding) => `${req.find((r) => r.type === x.doc)?.title}: ${x.detail}`;
  const worked = (a: Actor) => d.tests.some((t) => t.recordedBy?.role === a.role || t.verifiedBy?.role === a.role) || d.waivers.some((w) => w.state === 'STANDING' && (w.by.role === a.role || w.review?.by.role === a.role));
  const first = approvers.first.filter((a) => !worked(a)); const second = approvers.second.filter((a) => !worked(a));
  const pair = first.some((a) => second.some((b) => b.role !== a.role));
  const doc = (t: DeliverableType) => req.find((x) => x.type === t);
  const base = (['config_backup', 'as_built_drawings', 'asset_list'] as const).map(doc).filter((x): x is WorkingDoc => !!x);
  const c = (id: ReleaseControl['id'], title: string, open: string[], basis: string, waived = 0): ReleaseControl => ({ id, title, state: open.length ? 'OPEN' : 'PASS', open, waived, basis });
  return [
    c('tests', 'Test completion', tests.map((t) => `${t.id} ${t.result === 'FAIL' ? 'fails' : 'is pending'}: ${t.name}`), `${d.totals.pass} of ${d.totals.tests} tests pass`, tests.filter((t) => standing.has(t.id)).length),
    c('evidence', 'Required evidence', noEv.map((t) => `${t.id} passes with no evidence record: ${t.name}`), `${d.totals.evidence} of ${d.totals.tests} tests have an evidence record`),
    c('deficiencies', 'Open deficiencies', defs.map((x) => `${x.id} (${x.severity}) on ${x.test}: ${x.statement}`), `${d.deficiencies.length - defs.length} of ${d.deficiencies.length} closed`, defs.filter((x) => standing.has(x.test)).length),
    c('documents', 'Required documents', req.filter((x) => !x.met).map((x) => `${x.title}: ${x.gate === 'dossier' && x.test ? `test ${x.test} is open on the dossier` : x.findings[0]?.detail ?? 'not complete'}`), `${docs.met} of ${docs.required} required documents are complete`),
    c('identity', 'Equipment identity', of('unknown_equipment', 'equipment_not_listed', 'contradiction_count').map(say), 'Every document names only the room’s own positions, and the asset list agrees with the room record'),
    c('revisions', 'Revision consistency', of('outdated_room', 'ahead_of_room', 'outdated_reference', 'reference_missing', 'contradiction_revision').map(say), `Documents are written against revision ${docs.docs.find((x) => x.submission)?.submission?.against.room ?? '—'} of the room record and the current revisions of each other`),
    c('signoff', 'Sign-off permissions', pair ? [] : [!first.length ? 'No role that may give the first approval is free of the work in this dossier.' : !second.length ? 'No role that may give the second approval is free of the work in this dossier.' : 'The only eligible first and second approvers are the same role.'],
      `First approval: ${first.map((a) => a.label).join(' or ') || 'nobody eligible'}. Second: ${second.map((a) => a.label).join(' or ') || 'nobody eligible'}. A role that recorded, verified or waived anything here approves nothing`),
    c('retest', 'Retest status', [...awaiting.map((t) => `${t.id} was retested and awaits independent verification`), ...corrected.map((x) => `${x.id} is corrected and awaits its retest`)], 'A result recorded after the report counts once a different role has verified it'),
    c('handoff', 'Operational handoff', (['operational_handoff', 'training_materials', 'support_contacts'] as const).map(doc).filter((x): x is WorkingDoc => !!x && !x.met).map((x) => `${x.title}: ${x.gate === 'dossier' && x.test ? `test ${x.test} is open on the dossier` : x.findings[0]?.detail ?? 'not complete'}`), 'Operations has the handoff, the operator guide and the support contacts, each acknowledged where it must be'),
    c('baseline', 'Accepted baseline', base.filter((x) => !x.met || x.findings.some((y) => y.kind === 'outdated_room')).map((x) => `${x.title} is not accepted against the room record as it is now`), `The baseline that acceptance freezes is the ${base.map((x) => x.title.toLowerCase()).join(', the ')}`),
  ];
}

/**
 * A synthetic history for a demonstration room: every document the tracker gates, assigned, submitted once with valid content and
 * accepted by an independent reviewer. It is generated from the room's own record, so its references are always the room's positions
 * and the dossier's evidence. `hold` leaves named documents short of complete, as the reference report describes them.
 */
export function fixtureHistory(p: RoomProfile, ctx: DocContext, o: { reviewer: Actor; assigner: Actor; actors: Readonly<Record<string, Actor>>; from: string; represents?: Partial<Record<DeliverableType, string>>;
  hold?: Partial<Record<DeliverableType, { packetWithout?: readonly string[]; correction?: string; acknowledgedBy?: readonly string[] }>> }): DocEvent[] {
  // four passes, as a project runs: everything assigned on the first day; submitted from the ninth; reviewed from the fourteenth;
  // acknowledged on the sixteenth. Due on the twelfth day. Times only ever move forward.
  const t0 = Date.parse(o.from); const due = new Date(t0 + 12 * 86400000).toISOString().slice(0, 10); const DAYS = 86400000; const MIN = 60000;
  const sha = (s: string) => { let h = 2166136261; let hex = ''; for (let i = 0; i < 8; i++) { for (const ch of `${s}:${i}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } hex += h.toString(16).padStart(8, '0'); } return hex; };   // a stand-in checksum for a file that does not exist: the fixture says so
  const req = requiredFor(p, ctx.deficiencies.length).filter((q) => q.applies && !q.derived); const ownerOf = (q: Requirement) => o.actors[q.owner] ?? { role: q.owner, label: q.ownerLabel };
  const assign: DocEvent[] = req.map((q, i) => ({ kind: 'ASSIGN', doc: q.type, owner: ownerOf(q), due, by: o.assigner, at: new Date(t0 + i * 4 * MIN).toISOString() }));
  const submit: DocEvent[] = req.map((q, i) => { const hold = o.hold?.[q.type];
    const body: SubmitBody = { doc: q.type, revision: 1, fields: Object.fromEntries(q.fields.map((x) => [x.key, `Synthetic: ${x.label.toLowerCase()}`])), equipment: q.equipment === 'all' ? [...ctx.positions] : q.equipment === 'some' ? ctx.positions.slice(0, 1) : [],
      evidence: q.evidence === 'packet' ? ctx.evidence.filter((x) => !hold?.packetWithout?.includes(x)) : q.evidence === 'some' ? ctx.evidence.slice(0, 1) : [],
      attachment: q.attachment ? { name: `${p.roomId}-${q.type}-r1.pdf`, bytes: 180000 + q.type.length * 4096, sha256: sha(`${p.roomId}/${q.type}/1`) } : null,
      against: { room: ctx.roomRevision, docs: Object.fromEntries(q.dependsOn.map((d) => [d, 1])) }, ...(q.type === 'asset_list' ? { counts: { ...ctx.counts } } : {}), by: ownerOf(q), at: new Date(t0 + 9 * DAYS + i * 170 * MIN).toISOString() };
    return q.vendor ? { kind: 'VENDOR_SUBMISSION', vendor: 'Synthetic Integration Ltd (fictional)', ...body } : { kind: 'SUBMIT', ...body }; });
  const review: DocEvent[] = req.flatMap((q, i): DocEvent[] => { const hold = o.hold?.[q.type]; const at = new Date(t0 + 14 * DAYS + i * 55 * MIN).toISOString();
    return hold?.correction ? [{ kind: 'REQUEST_CORRECTION', doc: q.type, comment: hold.correction, by: o.reviewer, at }] : hold?.packetWithout ? [] : [{ kind: 'ACCEPT', doc: q.type, revision: 1, by: o.reviewer, at }]; });
  const accepted = new Set(review.filter((e) => e.kind === 'ACCEPT').map((e) => e.doc)); let k = 0;
  const acks: DocEvent[] = req.filter((q) => accepted.has(q.type)).flatMap((q) => q.acknowledgers.filter((a) => !o.hold?.[q.type]?.acknowledgedBy || o.hold[q.type]!.acknowledgedBy!.includes(a.role)).map((a): DocEvent => ({ kind: 'ACKNOWLEDGE', doc: q.type, revision: 1, by: a, at: new Date(t0 + 16 * DAYS + (k++) * 95 * MIN).toISOString() })));
  const out = [...assign, ...submit, ...review, ...acks];
  return out;
}
