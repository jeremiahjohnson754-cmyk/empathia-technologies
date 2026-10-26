/**
 * Canonical room-model contracts shared by the demonstrator port, the enterprise API and the Founder Studio.
 *
 * Source of truth for the shapes: the V2.5.3 rc3 / 2.5.4 demonstrator (`src/v25-60-room.js`, `RoomDesign` records).
 * Field names are kept identical so that a demonstrator export can be imported without a mapping layer.
 * All values in this repository are synthetic.
 */

/** Lifecycle of a planned room. A design never reaches ACCEPTED or OPERATIONAL without recorded, independently verified field results. */
export const ROOM_LIFECYCLE = [
  'PLANNED',
  'DESIGN_APPROVED',
  'INSTALLATION_PENDING',
  'INSTALLED_UNVERIFIED',
  'COMMISSIONING',
  'ACCEPTED',
  'OPERATIONAL',
] as const;
export type RoomLifecycle = (typeof ROOM_LIFECYCLE)[number];

/** Where a dimension came from. PHOTO_INFERRED values are never treated as known facts by the applicability engine. */
export type Provenance = 'DECLARED' | 'MODELED' | 'PHOTO_INFERRED' | 'SCALED_PLAN';

export interface RoomGeometry {
  shape: 'rect' | 'lshape' | 'custom' | string;
  /** Outline in metres, counter-clockwise or clockwise; the first point is not repeated. */
  points: Array<[number, number]>;
  ceiling: number;
  lengthM: number;
  widthM: number;
  provenance: { length: Provenance | string; width: Provenance | string; ceiling: Provenance | string };
  confidence: 'declared' | 'modeled' | 'low' | string;
}

export type Mount = 'floor' | 'wall' | 'ceiling' | 'table' | 'rack' | string;

export interface PlannedDevice {
  /** Canonical planned-asset id (PA-xxxx). It never changes on substitution. */
  id: string;
  cat: string;
  label: string;
  role: string;
  model: string;
  generic: boolean;
  brand: string | null;
  modelName: string | null;
  x: number;
  y: number;
  z?: number;
  rot?: number;
  mount: Mount;
  props: Record<string, unknown>;
  furniture?: boolean;
  removed?: boolean;
  lifecycle?: string;
  modelHistory?: unknown[];
  provenance?: string;
}

export type ConnectionKind = 'signal' | 'network' | 'power' | 'control' | string;

export interface Connection {
  id: string;
  from: string;
  to: string;
  kind: ConnectionKind;
  state?: string;
  why?: string;
  removed?: boolean;
}

export interface ApprovedClassification {
  archetype: string | null;
  override: boolean;
  stale?: boolean;
  reason?: string;
  by?: string;
}

/** The inputs every room engine needs. A subset of the demonstrator's RoomDesign record. */
export interface RoomDesignInput {
  template: string;
  intendedUse: string;
  occupancy: number;
  lifecycle: RoomLifecycle | string;
  coreRoomId: string;
  geometry: RoomGeometry;
  devices: PlannedDevice[];
  connections: Connection[];
  classification: { approved: ApprovedClassification | null };
  results?: Record<string, RecordedResult>;
}

export type SizeCategory = 'small' | 'medium' | 'large' | 'extra large';
export type Complexity = 'basic' | 'standard' | 'advanced' | 'critical';

export interface Classification {
  archetype: string | null;
  archetypeName: string;
  subtype: string;
  intendedUse: string;
  capacityEstimate: number;
  people: number;
  sizeCategory: SizeCategory;
  complexity: Complexity;
  families: string[];
  cxRoomType: string | null;
  source: string;
  confidence: 'medium' | 'low';
  why: string[];
  assumptions: string[];
}

export type Severity = 'High' | 'Medium' | 'Low';

export interface DesignFinding {
  /** Stable correlation key: the same deficiency found again updates one issue instead of creating another. */
  key: string;
  category: 'DESIGN_DEFICIENCY';
  check: string;
  severity: Severity;
  rationale: string;
  title: string;
  assets: string[];
  source: string;
  action: string;
}

// ---------------------------------------------------------------------------------------------------- commissioning results

/** What a field engineer may record. A design never produces a result. */
export const RECORDABLE_STATES = ['PASS', 'FAIL', 'NOT_SUPPORTED', 'INCONCLUSIVE'] as const;
export type RecordableState = (typeof RECORDABLE_STATES)[number];

/**
 * The only result vocabulary any surface, export, event or API may show (audit 253 F-03, rc3 R3-2).
 * There is deliberately no bare `PASS` here: a recorded PASS is PASS_UNVERIFIED until someone other than the recorder verifies it.
 */
export const RESULT_LABELS = ['NOT_TESTED', 'PASS_UNVERIFIED', 'PASS_VERIFIED', 'FAIL', 'NOT_SUPPORTED', 'INCONCLUSIVE'] as const;
export type ResultLabel = (typeof RESULT_LABELS)[number];

export interface RecordedResult {
  state: RecordableState;
  evidence: { kind: string; ref: string; instrument?: string | null };
  by: string;
  at?: string;
  verified: { by: string; at?: string } | null;
  history?: unknown[];
}

export type ApplicabilityStatus =
  | 'NOT_APPLICABLE'
  | 'PENDING_INFORMATION'
  | 'BLOCKED_BY_PREREQUISITE'
  | 'REQUIRES_PHYSICAL_EXECUTION';

export interface ApplicabilityRow {
  id: string;
  label: string;
  pack: string | null;
  domain: string;
  phase: number;
  tier: number;
  applicable: boolean;
  status: ApplicabilityStatus;
  why: string[];
  justification?: string;
  missing?: string[];
  prerequisite?: string | null;
  verifier?: string;
  personas?: string[];
  evidence?: string[];
  instrument?: boolean;
  window?: boolean;
  devices?: string[];
  result?: ResultLabel;
}

export interface ApplicabilityContext {
  type: string;
  room: string;
  families: string[];
  tier: Complexity;
  risk: 'standard' | 'critical';
}

export interface Applicability {
  library: number;
  applicable: number;
  notApplicable: number;
  byStatus: Partial<Record<ApplicabilityStatus, number>>;
  packs: string[];
  ctx: ApplicabilityContext;
  rows: ApplicabilityRow[];
}

export interface ResultCounts {
  applicable: number;
  recorded: number;
  verified: number;
  awaiting: number;
  failed: number;
  notSupported: number;
  inconclusive: number;
  notTested: number;
}
