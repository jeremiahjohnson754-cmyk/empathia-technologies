/**
 * @empathia/project-governance — the governed project lifecycle, as a pure engine shared by the enterprise API and the demonstration.
 *
 * Two state machines carried over verbatim from the Living Campus V2.5.3 demonstrator (src/v25-01-core.js, `V25_STATE_MACHINES`):
 *   - project_governance: DRAFT → SUBMITTED → (VENDOR_ACKNOWLEDGED | INTERNAL_ROUTE_RECORDED) → PITCH_READY → DECISION_PENDING →
 *     (APPROVED | HELD | REJECTED) → FUNDED → SUSPENDED; reopening is a new scope revision and a new approval chain, history immutable.
 *   - design_and_commissioning (delivery): ENGINEERING_REVIEW → DESIGN_DRAFT → DESIGN_REVIEW → DESIGN_RELEASED → PLAN_COMPILED →
 *     FIELD_AUTHORIZED → FIELD_ACTIVE → TESTS_VERIFIED → DOCUMENTS_APPROVED → CUSTOMER_ACCEPTED → HANDED_OFF → BASELINED.
 * Every transition names the authority that may take it and the guard that must be clear; a guard returns the reasons it is not, and
 * the caller refuses with every reason named (nothing is recorded by a refusal except the refusal itself). The directive's seven stages
 * map onto these states: intake (DRAFT→SUBMITTED), review (routing + ENGINEERING_REVIEW), brief (PITCH_READY — the versioned
 * engineering brief, the demonstrator's "pitch deck"), collaborative design (DESIGN_DRAFT ⇄ DESIGN_REVIEW with domain reviews and
 * RFIs), approval (DECISION_PENDING → APPROVED → FUNDED), execution/handoff (PLAN_COMPILED … HANDED_OFF, read from the rooms' own
 * governed lifecycle), operational transition (BASELINED, and the rooms' OPERATIONAL step which needs live monitoring evidence).
 *
 * The nine request types are the union of the demonstrator's intake work types (v25 intake form + V25_WORK_NEEDS) and its project
 * kinds (Pro project passports, `p.need`), de-duplicated: new_install and new_room were one type in the demonstrator (new_room →
 * projectType new_install). "Program" (a change applied across many rooms, one room at a time) is a flag on a project, not a type.
 */

export const REQUEST_TYPES = Object.freeze({
  new_room: { label: 'New room', source: 'v25 intake: new_room / new_install; Pro kind "Room build"', summary: 'A new room the business has asked for, with the capacity and purpose agreed with the sponsor.' },
  room_refresh: { label: 'Room refresh', source: 'Pro kind "Room refresh"', summary: 'A room that no longer meets its purpose or its standard, brought back to it.' },
  camera_replacement: { label: 'Camera replacement', source: 'v25 intake work type', summary: 'A camera, its mount and its automation replaced in an existing room.' },
  dsp_upgrade: { label: 'DSP / audio upgrade', source: 'v25 intake work type', summary: 'Audio processing, microphones or loudspeakers upgraded in an existing room.' },
  network_change: { label: 'Network change', source: 'v25 intake work type; Pro kind "Network"', summary: 'Room devices moved to managed segments so they can be supported and secured.' },
  lifecycle_replacement: { label: 'Lifecycle replacement', source: 'Pro kind "Lifecycle"', summary: 'Devices reaching the end of support replaced before they fail.' },
  signage: { label: 'Signage', source: 'Pro kind "Signage"', summary: 'Displays, players and publishing so visitors and staff find their way and see priority messages.' },
  break_fix: { label: 'Break / fix', source: 'v25 intake work type; V25_WORK_NEEDS.break_fix', summary: 'A fault in an existing room, corrected and retested.' },
  room_verification: { label: 'Room verification', source: 'V25_WORK_NEEDS.room_verification', summary: 'A room re-verified against its baseline without a design change.' },
} as const);
export type RequestType = keyof typeof REQUEST_TYPES;
export const REQUEST_TYPE_KEYS = Object.keys(REQUEST_TYPES) as RequestType[];

export const GOVERNANCE_STATES = ['DRAFT', 'SUBMITTED', 'VENDOR_ACKNOWLEDGED', 'INTERNAL_ROUTE_RECORDED', 'PITCH_READY', 'DECISION_PENDING', 'APPROVED', 'HELD', 'REJECTED', 'FUNDED', 'SUSPENDED'] as const;
export type GovernanceState = typeof GOVERNANCE_STATES[number];
export const DELIVERY_STATES = ['ENGINEERING_REVIEW', 'DESIGN_DRAFT', 'DESIGN_REVIEW', 'DESIGN_RELEASED', 'PLAN_COMPILED', 'FIELD_AUTHORIZED', 'FIELD_ACTIVE', 'TESTS_VERIFIED', 'DOCUMENTS_APPROVED', 'CUSTOMER_ACCEPTED', 'HANDED_OFF', 'BASELINED'] as const;
export type DeliveryState = typeof DELIVERY_STATES[number];

export interface Transition<S extends string> { from: S; to: S; role: string; authority: string; guard: string }
/** Verbatim transitions (from, to, authorized_role, guard) with the persona authority that role holds in the persona policy (V25_PERSONAS). */
export const GOVERNANCE_TRANSITIONS: readonly Transition<GovernanceState>[] = Object.freeze([
  { from: 'DRAFT', to: 'SUBMITTED', role: 'requestor', authority: 'request.submit', guard: 'valid_request' },
  { from: 'SUBMITTED', to: 'VENDOR_ACKNOWLEDGED', role: 'vendor', authority: 'vendor.acknowledge', guard: 'vendor_in_scope' },
  { from: 'SUBMITTED', to: 'INTERNAL_ROUTE_RECORDED', role: 'operations_lead', authority: 'route.internal', guard: 'document_internal_exception' },
  { from: 'VENDOR_ACKNOWLEDGED', to: 'PITCH_READY', role: 'operations_lead', authority: 'pitch.submit', guard: 'versioned_pitch' },
  { from: 'INTERNAL_ROUTE_RECORDED', to: 'PITCH_READY', role: 'operations_lead', authority: 'pitch.submit', guard: 'versioned_pitch' },
  { from: 'PITCH_READY', to: 'DECISION_PENDING', role: 'operations_lead', authority: 'approver.select', guard: 'eligible_approver_selected' },
  { from: 'DECISION_PENDING', to: 'APPROVED', role: 'executive', authority: 'project.decide', guard: 'valid_delegation_and_distinct_author' },
  { from: 'DECISION_PENDING', to: 'HELD', role: 'executive', authority: 'project.decide', guard: 'reason_and_next_review' },
  { from: 'DECISION_PENDING', to: 'REJECTED', role: 'executive', authority: 'project.decide', guard: 'reason' },
  { from: 'APPROVED', to: 'FUNDED', role: 'finance', authority: 'funding.authorize', guard: 'signed_budget_with_scope_rev' },
  { from: 'FUNDED', to: 'SUSPENDED', role: 'finance', authority: 'funding.withdraw', guard: 'withdrawal_or_expiry' },
]);
export const DELIVERY_TRANSITIONS: readonly Transition<DeliveryState>[] = Object.freeze([
  { from: 'ENGINEERING_REVIEW', to: 'DESIGN_DRAFT', role: 'systems_engineer', authority: 'brief.approve', guard: 'project_funded_and_scope_approved' },
  { from: 'DESIGN_DRAFT', to: 'DESIGN_REVIEW', role: 'designer', authority: 'design.submit', guard: 'versioned_files_and_divr' },
  { from: 'DESIGN_REVIEW', to: 'DESIGN_RELEASED', role: 'systems_engineer', authority: 'design.release', guard: 'domain_approvals_and_geometry_validated' },
  { from: 'DESIGN_RELEASED', to: 'PLAN_COMPILED', role: 'commissioning_lead', authority: 'plan.compile', guard: 'rules_compiled_version_pinned' },
  { from: 'PLAN_COMPILED', to: 'FIELD_AUTHORIZED', role: 'service_manager', authority: 'field.authorize', guard: 'qualified_staff_and_site_access' },
  { from: 'FIELD_AUTHORIZED', to: 'FIELD_ACTIVE', role: 'field_technician', authority: 'work.accept', guard: 'work_order_assigned_and_accepted' },
  { from: 'FIELD_ACTIVE', to: 'TESTS_VERIFIED', role: 'commissioning_lead', authority: 'tests.verify.all', guard: 'all_required_tests_verified_and_no_blockers' },
  { from: 'TESTS_VERIFIED', to: 'DOCUMENTS_APPROVED', role: 'qa_reviewer', authority: 'documents.approve', guard: 'all_required_documents_approved_and_photos' },
  { from: 'DOCUMENTS_APPROVED', to: 'CUSTOMER_ACCEPTED', role: 'customer_approver', authority: 'customer.accept', guard: 'approved_report_and_customer_scope' },
  { from: 'CUSTOMER_ACCEPTED', to: 'HANDED_OFF', role: 'operations_lead', authority: 'handoff.accept', guard: 'support_owner_assigned_and_qa' },
  { from: 'HANDED_OFF', to: 'BASELINED', role: 'assurance_owner', authority: 'baseline.approve', guard: 'signed_accepted_evidence_snapshot' },
]);
/** Reopening after HELD / REJECTED / SUSPENDED: a new scope revision returns the project to its recorded route for a new brief and a new approval chain. */
export const REOPEN_FROM: readonly GovernanceState[] = ['HELD', 'REJECTED', 'SUSPENDED'];

export const transition = <S extends string>(table: readonly Transition<S>[], from: S, to: S): Transition<S> | undefined => table.find((t) => t.from === from && t.to === to);

// ------------------------------------------------------------------------------------------------------------------ guard facts
export interface RequestFacts { siteCode: string | null; type: string | null; intent: string | null; photoPolicy: string | null; photos: number }
export interface Dimension { name: string; value: number; unit: string; source: string; uncertainty: string }
export interface GovernanceFacts {
  state: GovernanceState; scopeRev: number;
  request: RequestFacts;
  routedVendorId: string | null;              // the vendor the request was sent to
  brief: { rev: number; scopeRev: number; authorId: string } | null;   // the latest versioned brief
  approverId: string | null; approverEligible: boolean;               // the selected approver and whether they hold project.decide
  decision?: { decision: 'APPROVED' | 'HELD' | 'REJECTED'; reason?: string; reviewDate?: string | null; scopeRev?: number };
  actorId: string; delegated: boolean; delegationExpired: boolean;
  funding?: { amount: number; currency: string | null; costCenter: string | null; scopeRev: number; financeOutage?: boolean };
  withdrawalReason?: string | null;
  acknowledgingVendorId?: string | null; exceptionReason?: string | null;
}
const w = (c: boolean, why: string, out: string[]) => { if (c) out.push(why); };

/** The governance guards, with the demonstrator's wording (V25_GUARDS). Returns [] when clear. */
export function governanceBlockers(to: GovernanceState, f: GovernanceFacts): string[] {
  const t = transition(GOVERNANCE_TRANSITIONS, f.state, to);
  if (!t) return [`no transition ${f.state} → ${to}: the project moves one governed step at a time`];
  const out: string[] = [];
  switch (t.guard) {
    case 'valid_request':
      w(!f.request.siteCode, 'site missing', out); w(!f.request.type, 'work type missing', out); w(!f.request.intent, 'usage intent missing', out);
      w(f.request.photoPolicy === 'LOCATION_VERIFICATION_REQUIRED' && f.request.photos < 1, 'photos required by the owner policy', out); break;
    case 'vendor_in_scope':
      w(!(f.acknowledgingVendorId && f.routedVendorId === f.acknowledgingVendorId), 'the acknowledging vendor is not the vendor this request was sent to', out); break;
    case 'document_internal_exception':
      w(!(f.exceptionReason && f.exceptionReason.length > 10), 'an internal-only route needs a documented exception reason', out); break;
    case 'versioned_pitch':
      if (!f.brief) out.push('no versioned engineering brief is linked'); else w(f.brief.scopeRev !== f.scopeRev, `the brief is for scope revision ${f.brief.scopeRev}, the project is at ${f.scopeRev}`, out); break;
    case 'eligible_approver_selected':
      if (!f.approverId) out.push('no approver selected'); else { w(!f.approverEligible, 'the selected approver is not an eligible approver for this scope (project.decide)', out); w(f.brief?.authorId === f.approverId, 'the author of the brief cannot be selected as approver', out); w(f.approverId === f.actorId, 'the person selecting the approver cannot select themself', out); } break;
    case 'valid_delegation_and_distinct_author':
      w(!!f.brief && f.brief.authorId === f.actorId, 'the approver authored the brief (segregation of duties)', out);
      w(!!f.approverId && f.approverId !== f.actorId && !f.delegated, `the decision was requested from the selected approver, not from ${f.actorId}; a delegation is required`, out);
      w(f.delegated && f.delegationExpired, 'the delegation has expired', out);
      w(f.decision?.scopeRev !== undefined && f.decision.scopeRev !== f.scopeRev, 'the decision names a different scope revision than the current one', out); break;
    case 'reason_and_next_review':
      w(!f.decision?.reason || f.decision.reason.length < 8, 'a hold needs a reason', out); w(!f.decision?.reviewDate, 'a hold needs a review date', out); break;
    case 'reason':
      w(!f.decision?.reason || f.decision.reason.length < 8, 'a reason is required', out); break;
    case 'signed_budget_with_scope_rev':
      if (!f.funding) out.push('no funding record'); else { w(!(f.funding.amount > 0), 'an amount above zero is required', out); w(!f.funding.currency, 'a currency is required', out); w(f.funding.scopeRev !== f.scopeRev, `funding names scope revision ${f.funding.scopeRev}, the approved scope is ${f.scopeRev}`, out); w(!f.funding.costCenter, 'a cost center is required', out); w(!!f.funding.financeOutage, 'the finance system is unavailable: funding stays pending, it is never auto-approved', out); } break;
    case 'withdrawal_or_expiry':
      w(!f.withdrawalReason, 'a withdrawal or expiry reason is required', out); break;
  }
  return out;
}

export interface DesignRevisionFacts { rev: number; files: number; liteModel: boolean; divr: boolean; reason: string | null; domainsNeeded: string[]; domainApprovals: Record<string, string>; openRfis: number; authorId: string }
export interface RoomFacts { code: string; lifecycle: string; hasPlan: boolean; applicable: number; verified: number; openIssues: number; drawingsApproved: boolean; photosApproved: boolean; hasBaseline: boolean }
export interface DeliveryFacts {
  state: DeliveryState; governance: GovernanceState;
  revision: DesignRevisionFacts | null;        // the latest design revision
  rooms: RoomFacts[];
  rulePackVersion: string | null;
  fieldAuthorization: { technicianQualified: boolean; siteAccess: boolean } | null;
  workOrders: { assigned: number; accepted: number } | null;
  supportOwnerId: string | null; qaSignoff: boolean;
  actorId: string;
}

/** The delivery guards. Execution facts are read from the rooms' own governed lifecycle (commissioning engine), never asserted. */
export function deliveryBlockers(to: DeliveryState, f: DeliveryFacts): string[] {
  const t = transition(DELIVERY_TRANSITIONS, f.state, to);
  if (!t) return [`no transition ${f.state} → ${to}: delivery moves one governed step at a time`];
  const out: string[] = []; const r = f.revision;
  switch (t.guard) {
    case 'project_funded_and_scope_approved':
      w(f.governance !== 'FUNDED', `the project is ${f.governance}, not FUNDED: an approved project without money is not field-authorized`, out); break;
    case 'versioned_files_and_divr':
      if (!r) out.push('no design revision'); else { w(r.files === 0 && !r.liteModel, 'no design files or Lite model in this revision', out); w(!r.divr, 'no Design Intent & Verification Record linked', out); w(!r.reason, 'a revision needs its reason', out); } break;
    case 'domain_approvals_and_geometry_validated':
      if (!r) out.push('no design revision'); else {
        for (const d of r.domainsNeeded) w(r.domainApprovals[d] !== 'APPROVED', `${d} review missing`, out);
        w(r.openRfis > 0, `${r.openRfis} open RFI(s) on this revision`, out);
        w(r.authorId === f.actorId, 'the author of the revision does not release it (segregation of duties)', out);
      }
      w(f.rooms.length === 0, 'no room is in this project', out);
      for (const room of f.rooms) w(!['DESIGN_APPROVED', 'INSTALLATION_PENDING', 'INSTALLED_UNVERIFIED', 'COMMISSIONING', 'ACCEPTED', 'OPERATIONAL'].includes(room.lifecycle), `geometry of ${room.code} is ${room.lifecycle}, not approved for construction`, out);
      w(['HELD', 'REJECTED', 'SUSPENDED'].includes(f.governance), `the project is ${f.governance}`, out); break;
    case 'rules_compiled_version_pinned':
      w(!f.rulePackVersion, 'no rule pack version pinned', out);
      for (const room of f.rooms) w(!room.hasPlan, `no compiled commissioning plan for ${room.code}`, out); break;
    case 'qualified_staff_and_site_access':
      if (!f.fieldAuthorization) out.push('no field authorization record'); else { w(!f.fieldAuthorization.technicianQualified, 'the assigned technician does not meet the work needs (certifications, experience, licences)', out); w(!f.fieldAuthorization.siteAccess, 'site access is not confirmed', out); } break;
    case 'work_order_assigned_and_accepted':
      if (!f.workOrders) out.push('no work order'); else { w(f.workOrders.assigned === 0, 'no work order assigned', out); w(f.workOrders.accepted < f.workOrders.assigned, 'not every assigned work order is accepted by its technician', out); } break;
    case 'all_required_tests_verified_and_no_blockers':
      for (const room of f.rooms) { w(room.applicable === 0 || room.verified < room.applicable, `${room.code}: ${room.verified} of ${room.applicable} applicable tests passed and independently verified`, out); w(room.openIssues > 0, `${room.code}: ${room.openIssues} open deficiency(ies)`, out); } break;
    case 'all_required_documents_approved_and_photos':
      for (const room of f.rooms) { w(!room.drawingsApproved, `${room.code}: as-built drawings not approved`, out); w(!room.photosApproved, `${room.code}: final photos not approved`, out); } break;
    case 'approved_report_and_customer_scope':
      for (const room of f.rooms) w(room.lifecycle !== 'ACCEPTED' && room.lifecycle !== 'OPERATIONAL', `${room.code} is ${room.lifecycle}, not ACCEPTED by the customer`, out); break;
    case 'support_owner_assigned_and_qa':
      w(!f.supportOwnerId, 'no support owner assigned', out); w(!f.qaSignoff, 'no QA sign-off recorded', out); break;
    case 'signed_accepted_evidence_snapshot':
      for (const room of f.rooms) w(!room.hasBaseline, `${room.code} has no current accepted baseline`, out); break;
  }
  return out;
}

/** The seven stages a project is in, derived from its two states (for readiness views; never a source of truth). The demonstrator's
 *  machine funds before it designs (an approved project without money is not field-authorized), so approval precedes collaborative
 *  design here; the directive lists the stages in a different order — reconciled in ADR-0008, for the owner to confirm. */
export function stageOf(g: GovernanceState, d: DeliveryState | null): { n: number; stage: string } {
  if (g === 'DRAFT') return { n: 1, stage: 'intake' };
  if (['SUBMITTED', 'VENDOR_ACKNOWLEDGED', 'INTERNAL_ROUTE_RECORDED'].includes(g)) return { n: 2, stage: 'review' };
  if (g === 'PITCH_READY') return { n: 3, stage: 'brief' };
  if (['DECISION_PENDING', 'APPROVED', 'HELD', 'REJECTED', 'SUSPENDED'].includes(g)) return { n: 4, stage: 'approval' };
  if (!d || ['ENGINEERING_REVIEW', 'DESIGN_DRAFT', 'DESIGN_REVIEW'].includes(d)) return { n: 5, stage: 'collaborative design' };
  if (d === 'BASELINED') return { n: 7, stage: 'operational transition' };
  return { n: 6, stage: 'execution and handoff' };
}
