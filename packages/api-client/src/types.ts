/**
 * Hand-written response types for the operations the web app uses. They mirror the domain modules of services/enterprise-api
 * (read.ts, rooms.ts, commissioning.ts, org.ts, analytics.ts, platform.ts); the client test checks them against a live response.
 * Result labels are PASS_VERIFIED / PASS_UNVERIFIED / FAIL / NOT_SUPPORTED / INCONCLUSIVE / NOT_TESTED — never a bare PASS.
 */
export type ResultLabel = 'PASS_VERIFIED' | 'PASS_UNVERIFIED' | 'FAIL' | 'NOT_SUPPORTED' | 'INCONCLUSIVE' | 'NOT_TESTED';
export type Lifecycle = 'PLANNED' | 'DESIGN_APPROVED' | 'INSTALLATION_PENDING' | 'INSTALLED_UNVERIFIED' | 'COMMISSIONING' | 'ACCEPTED' | 'OPERATIONAL';

export interface Me { person: { id: string; name: string }; tenant: string; role: string; authorities: string[]; siteScope: string[] | null }
export interface Token { accessToken: string; tokenType: 'Bearer'; expiresIn: number; tenant: string; role: string; person: string }
export interface RoomSummary { code: string; name: string; lifecycle: Lifecycle; template: string; occupancy: number; building: string; archetype: string | null; rev: number; updated_at: string }
export interface Device { id: string; cat: string; label: string; role: string | null; model: string; generic: boolean; x: number; y: number; z: number; rot: number; mount: string; furniture: boolean; lifecycle: string }
export interface PlanRow { test_id: string; label: string; pack: string | null; domain: string; phase: number; tier: number; applicable: boolean; status: string; why: string[]; personas: string[]; evidence: string[]; instrument: boolean; devices: string[]; result: ResultLabel }
export interface Issue { code: string; key: string; category: string; check_name: string; severity: 'Critical' | 'High' | 'Medium' | 'Low' | string; title: string; rationale: string; assets: string[]; state: 'OPEN' | 'RESOLVED' | string; owner_role: string | null }
export interface RoomDetail {
  room: { code: string; id: string; name: string; lifecycle: Lifecycle; template: string; intendedUse: string; occupancy: number; unit: string; geometry: { shape: string; points: Array<[number, number]>; widthM: number; lengthM: number; ceiling: number }; rev: number; approvedRevision: number | null; classification: { archetype: string; archetypeName: string; why: string[] } & Record<string, unknown>; approvedClassification?: unknown };
  devices: Device[];
  connections: Array<{ id: string; from: string; to: string; kind: string; why: string | null }>;
  drawings: Array<{ kind: string; state: string; revNo: number | null }>;
  revisions: Array<{ rev_no: number; sha256: string; reason: string; created_at: string }>;
  issues: Issue[];
  commissioning: { planId: string; engineVersion: string; ruleVersion: string; library: number; applicable: number; counts: Record<string, number>; rows: PlanRow[] } | null;
}
export interface Analysis { applicable: number; openIssues: number; planChanged: boolean }
export interface ReadModel { room_code: string; name: string; lifecycle: Lifecycle; lifecycle_label: string; archetype: string | null; devices: number; open_issues: number; open_high: number; applicable_tests: number; results: Record<string, number>; live_health: 'NOT_MONITORED' }
export interface Ratio { value: number | null; definition: string }
export interface Summary {
  scope: 'tenant' | 'site-scoped';
  rooms: { total: number; byLifecycle: Record<string, number> };
  commissioning: { applicableTests: number; byLabel: Partial<Record<ResultLabel, number>>; coverage: Ratio; verifiedShare: Ratio; firstTimeFailRate: Ratio };
  issues: { open: number; openHighOrCritical: number; deficienciesResolved: number; meanHoursToResolveDeficiency: number | null; byCategorySeverityState: Array<{ category: string; severity: string; state: string; n: number }> };
  workOrders: Record<string, number>;
  assets: { planned: number; genericModels: number; distinctModels: number; genericShare: Ratio };
  evidence: { objects: number; bytes: number };
  operationalPerformance: 'NOT_MONITORED';
}
export interface Site { code: string; name: string; buildings: Array<{ code: string; name: string; floors: number | null; rooms: number }> }

export interface ResponseTypes {
  postV1AuthToken: Token;
  getV1Me: Me;
  getV1Rooms: { items: RoomSummary[]; next: string | null };
  postV1Rooms: { code: string; id: string };
  getV1RoomsRoom: RoomDetail;
  patchV1RoomsRoom: Analysis;
  postV1RoomsRoomDevices: Analysis & { assetId: string; label: string };
  patchV1RoomsRoomDevicesAsset: Analysis;
  deleteV1RoomsRoomDevicesAsset: Analysis;
  postV1RoomsRoomRevisions: Analysis & { revision: number; sha256: string };
  postV1RoomsRoomClassificationApprove: Analysis & { approved: Record<string, unknown> };
  postV1RoomsRoomDrawingsGenerate: { drawings: Array<{ kind: string; state: string; revNo: number | null }> };
  postV1RoomsRoomLifecycle: Analysis & { from: Lifecycle; to: Lifecycle };
  postV1Evidence: { id: string; sha256: string; bytes: number; mediaType: string; fileName: string; uploadedAt: string; retentionUntil: string };
  postV1RoomsRoomResults: { resultId: string; testId: string; state: string; resultLabel: ResultLabel };
  postV1RoomsRoomResultsTestVerify: { testId: string; resultLabel: ResultLabel };
  postV1IssuesIssueAssign: { issueId: string; ownerRole: string };
  postV1IssuesIssueWorkOrders: { workOrderId: string; state: 'OPEN'; assignedRole: string };
  postV1WorkOrdersWorkOrderClose: { workOrderId: string; state: 'CLOSED'; note: string };
  getV1ReadRooms: { items: ReadModel[] };
  getV1ReportsSummary: Summary;
  getV1Sites: { items: Site[] };
  getV1Projects: { items: Array<{ code: string; name: string; state: string; createdAt: string; rooms: Array<{ code: string; name: string; lifecycle: Lifecycle }> }> };
  getV1Notifications: { items: Array<{ id: number; kind: string; title: string; link: string | null; created_at: string; read_at: string | null }> };
}
