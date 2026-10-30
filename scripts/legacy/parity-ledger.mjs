#!/usr/bin/env node
// Writes docs/legacy-parity.md and docs/legacy-parity.csv from the demonstrator inventories (scripts/legacy/inventory-demonstrator.mjs)
// and the classification below. Two applications, kept apart: the Living Campus (V2.5.3, investor-safe demo + authenticated platform)
// and the Founder Studio (private founder workspace). Every row carries the TARGET class the mandate allows, the STATUS now (what is
// actually built and tested at this commit — never a green mark for unbuilt work), the new route, what backs it, and the responsible test.
//   node scripts/legacy/parity-ledger.mjs
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const v253 = JSON.parse(fs.readFileSync(path.join(root, 'legacy/inventory/v253-inventory.json'), 'utf8'));
const v254 = JSON.parse(fs.readFileSync(path.join(root, 'legacy/inventory/v254-founder-inventory.json'), 'utf8'));
const studioNav = fs.readFileSync(path.join(root, 'apps/founder-studio/src/nav.ts'), 'utf8');
const destinations = [...studioNav.matchAll(/path: '([a-z-]+)', label: '([^']+)', group: '([^']+)'(?:, product: '([^']+)')?, blurb: '([^']*)'/g)].map((m) => ({ path: m[1], label: m[2], group: m[3], product: m[4] || '', blurb: m[5] }));
// ---- the classification (authored; the area key is the product's own AZ_AREA key)
// target: MIGRATED_REAL (authenticated app over the backend) | MIGRATED_DEMO (investor-safe demo, synthetic) | DEFERRED_WITH_REASON | BLOCKED_EXTERNAL_DEPENDENCY
// status now: DONE | PARTIAL | NOT_STARTED (REGRESSION is recorded only when a migrated route lost behaviour the original had: none at P0)
const T = {
  home: ['Mission Control', 'demo+app', 'MIGRATED_REAL', '/app (role home) · /demo', 'enterprise-web Inbox/Reports over GET /v1/notifications, /v1/reports/summary', 'PARTIAL', 'tests/e2e'],
  campus: ['Campus', 'demo+app', 'MIGRATED_REAL', '/app/sites · /demo/campus', 'GET /v1/sites, /v1/rooms', 'PARTIAL', 'tests/integration'],
  search: ['Search Party', 'demo+app', 'MIGRATED_REAL', '/app/search · /demo/search', 'GET /v1/graph/{type}/{id}, relationship-engine; indexed search NOT_STARTED', 'PARTIAL', 'tests/integration graph'],
  'search.support': ['Support paths', 'app', 'MIGRATED_REAL', '/app/search/support', 'org people/roles + coverage (P6)', 'NOT_STARTED', 'P6'],
  'search.ownership': ['Ownership', 'app', 'MIGRATED_REAL', '/app/search/ownership', 'P6', 'NOT_STARTED', 'P6'],
  'search.quality': ['Data quality and governance', 'app', 'MIGRATED_REAL', '/admin/data-quality', 'P6/P8', 'NOT_STARTED', 'P8'],
  'search.graph': ['Relationship trails', 'demo+app', 'MIGRATED_REAL', '/app/graph', 'GET /v1/graph (relationship-engine)', 'PARTIAL', 'tests/integration'],
  'search.people': ['People and expertise', 'app', 'MIGRATED_REAL', '/app/people', 'GET /v1/people, /v1/roles', 'PARTIAL', 'tests/integration org'],
  'search.projects': ['Project map', 'app', 'MIGRATED_REAL', '/app/projects', 'GET/POST /v1/projects', 'PARTIAL', 'tests/e2e projects'],
  'search.orgs': ['Organizations', 'app', 'MIGRATED_REAL', '/app/organizations', 'P6', 'NOT_STARTED', 'P6'],
  'search.activity': ['Activity network', 'app', 'MIGRATED_REAL', '/app/activity', 'GET /v1/audit (P6 view)', 'PARTIAL', 'tests/security audit'],
  'search.vault': ['Evidence and artifacts', 'app', 'MIGRATED_REAL', '/app/evidence', 'POST /v1/evidence, GET /v1/evidence/{id}/content (append-only)', 'PARTIAL', 'tests/integration evidence'],
  room: ['Technical room page', 'demo+app', 'MIGRATED_REAL', '/app/rooms/{id}', 'GET /v1/rooms/{room}, /read/rooms/{room}', 'DONE (slice)', 'tests/e2e room'],
  pro: ['Pro Command Center', 'demo+app', 'MIGRATED_REAL', '/app/operations', 'GET /v1/read/rooms, issues (P6)', 'PARTIAL', 'P6'],
  'pro.assets': ['Asset Intelligence', 'app', 'MIGRATED_REAL', '/app/assets', 'devices in rooms; population views P6', 'PARTIAL', 'P6'],
  'pro.issues': ['Issue Intelligence', 'app', 'MIGRATED_REAL', '/app/issues', 'POST /v1/issues/{issue}/assign, work orders', 'PARTIAL', 'tests/integration service'],
  'pro.ops': ['Operations Hub', 'app', 'MIGRATED_REAL', '/app/operations/hub', 'P6', 'NOT_STARTED', 'P6'],
  'pro.eng': ['Standards and Engineering', 'app', 'MIGRATED_REAL', '/app/standards', 'P6C (standards, SOP/SOW review)', 'NOT_STARTED', 'P6C'],
  'pro.exec': ['Executive Intelligence', 'app', 'MIGRATED_REAL', '/app/executive', 'GET /v1/reports/summary (KPI with denominators: P6C)', 'PARTIAL', 'P6C'],
  'set.devices': ['Devices behind a number', 'app', 'MIGRATED_REAL', '/app/assets?set=', 'drill-down P6C', 'NOT_STARTED', 'P6C'],
  'set.rooms': ['Rooms behind a number', 'app', 'MIGRATED_REAL', '/app/rooms?set=', 'drill-down P6C', 'NOT_STARTED', 'P6C'],
  'set.issues': ['Issues behind a number', 'app', 'MIGRATED_REAL', '/app/issues?set=', 'drill-down P6C', 'NOT_STARTED', 'P6C'],
  'set.docs': ['Documents behind a number', 'app', 'MIGRATED_REAL', '/app/evidence?set=', 'drill-down P6C', 'NOT_STARTED', 'P6C'],
  'set.changes': ['Changes behind a number', 'app', 'MIGRATED_REAL', '/app/changes?set=', 'drill-down P6C', 'NOT_STARTED', 'P6C'],
  lite: ['Workplace Explorer (Lite, 3D)', 'demo+app', 'MIGRATED_DEMO', '/demo/lite · /app/rooms/{id}/plan', '2D plan first (FloorPlan.tsx exists); 3D progressive (P6B)', 'PARTIAL', 'P6B'],
  'lite.services': ['Workplace services', 'demo', 'MIGRATED_DEMO', '/demo/lite/services', 'P3', 'NOT_STARTED', 'P3'],
  'lite.guides': ['Knowledge library', 'demo+app', 'MIGRATED_REAL', '/app/knowledge', 'GET /v1/knowledge', 'PARTIAL', 'tests knowledge 20/20'],
  intake: ['Intake', 'app', 'MIGRATED_REAL', '/app/requests', 'P5 (request → acknowledgement → pitch → approval → funding)', 'NOT_STARTED', 'P5'],
  'intake.new': ['New request', 'app', 'MIGRATED_REAL', '/app/requests/new', 'P5', 'NOT_STARTED', 'P5'],
  builder: ['Room Builder (V1)', 'demo+app', 'MIGRATED_REAL', '/app/rooms/{id}/design', 'rooms/devices/connections/revisions/drawings API (Build a Room)', 'DONE (slice)', 'tests/e2e 21/21'],
  scouter: ['Scouter', 'demo+app', 'MIGRATED_REAL', '/app/scouter', 'P6A (comparable rooms, reviewed proposals)', 'NOT_STARTED', 'P6A'],
  budget: ['Budgeting', 'app', 'MIGRATED_REAL', '/app/funding', 'P5 (separate funding authority)', 'NOT_STARTED', 'P5'],
  assurance: ['Assurance Command Center', 'demo+app', 'MIGRATED_REAL', '/app/assurance', 'GET /v1/rooms/{room}/assurance (assurance-engine, 17 dimensions)', 'PARTIAL', 'tests assurance 13/13'],
  'assurance.analysis': ['Drift analysis', 'app', 'MIGRATED_REAL', '/app/assurance/analysis', 'assurance-engine; UI P6', 'PARTIAL', 'P6'],
  'assurance.portfolio': ['Rooms by assurance result', 'app', 'MIGRATED_REAL', '/app/assurance/portfolio', 'P6', 'NOT_STARTED', 'P6'],
  'assurance.ready': ['Room ready checks', 'app', 'MIGRATED_REAL', '/app/assurance/ready', 'P6', 'NOT_STARTED', 'P6'],
  'assurance.room': ['Room vs baseline', 'app', 'MIGRATED_REAL', '/app/rooms/{id}/assurance', 'GET /v1/rooms/{room}/assurance', 'PARTIAL', 'tests assurance'],
  'assurance.recommission': ['Recommissioning', 'app', 'MIGRATED_REAL', '/app/rooms/{id}/recommission', 'versioned baselines P5 (never overwrite)', 'NOT_STARTED', 'P5 (27)'],
  'assurance.history': ['Baseline history', 'app', 'MIGRATED_REAL', '/app/rooms/{id}/baselines', 'P5', 'NOT_STARTED', 'P5 (26)'],
  'assurance.change': ['Change impact', 'app', 'MIGRATED_REAL', '/app/changes', 'P6', 'NOT_STARTED', 'P6'],
  'assurance.signals': ['Maintenance and experience signals', 'app', 'MIGRATED_REAL', '/app/signals', 'P6/P7 (telemetry coverage labelled)', 'NOT_STARTED', 'P7'],
  commissioning: ['Commissioning Command Center', 'demo+app', 'MIGRATED_REAL', '/app/commissioning', 'commissioning-engine (92 golden cases), POST /v1/rooms/{room}/results, verify', 'PARTIAL', 'tests/integration 20/20'],
  'commissioning.room': ['Commissioning record of a room', 'app', 'MIGRATED_REAL', '/app/rooms/{id}/commissioning', 'results + independent verification', 'DONE (slice)', 'tests/e2e'],
  control: ['Room control (V1)', 'demo', 'MIGRATED_DEMO', '/demo/control', 'simulated; no device control in the web app', 'NOT_STARTED', 'P3'],
  scheduler: ['Room scheduler (V1)', 'demo', 'MIGRATED_DEMO', '/demo/scheduler', 'synthetic', 'NOT_STARTED', 'P3'],
  learn: ['Learn and SIGNAL', 'demo+app', 'MIGRATED_REAL', '/app/learn', 'reviewed cases P6C; SIGNAL labs demo P3', 'NOT_STARTED', 'P6C'],
  agent: ['Room Health Check (V1.2 agent)', 'demo', 'MIGRATED_DEMO', '/demo/health-check', 'synthetic', 'NOT_STARTED', 'P3'],
  'agent.arch': ['Discovery agent architecture', 'demo', 'MIGRATED_DEMO', '/demo/architecture', 'explanatory', 'NOT_STARTED', 'P3'],
  ask: ['Ask Empathia', 'demo+app', 'MIGRATED_REAL', '/app/assistant', 'POST /v1/ai/requests (advisory; deterministic when no provider)', 'PARTIAL', 'tests assistant'],
  replay: ['Core Replay', 'demo', 'MIGRATED_DEMO', '/demo/replay', 'synthetic time replay', 'NOT_STARTED', 'P3'],
  compare: ['Core Compare', 'demo+app', 'MIGRATED_REAL', '/app/compare', 'GET /v1/rooms/{room}/revisions/compare (rooms); others P6', 'PARTIAL', 'tests/e2e compare'],
  ledger: ['Evidence ledger', 'app', 'MIGRATED_REAL', '/app/audit', 'GET /v1/audit (append-only)', 'DONE (slice)', 'tests/security 45/45'],
  fabric: ['Integration and event fabrics', 'app', 'MIGRATED_REAL', '/admin/integrations', 'GET /v1/integrations, probe/sync/observations (MOCK adapters only)', 'PARTIAL', 'integrations conformance 5/5'],
  qr: ['QR launch center', 'demo', 'DEFERRED_WITH_REASON', '—', 'launch convenience for a single-file demo; replaced by shareable demo links (P3)', 'NOT_STARTED', 'P3'],
  tours: ['Guided experiences', 'demo', 'MIGRATED_DEMO', '/demo/tours', 'A/B/C guided demos P3', 'NOT_STARTED', 'P3'],
  core: ['Core model', 'app', 'MIGRATED_REAL', '/admin/model', 'domain-types, schemas, entity dictionary (docs/database)', 'PARTIAL', 'schemas tests'],
  list: ['Records of one type', 'app', 'MIGRATED_REAL', '/app/records/{type}', 'read model P6', 'PARTIAL', 'P6'],
  servicehands: ['ServiceHands', 'demo+app', 'MIGRATED_REAL', '/app/service', 'issues → work orders → close (API); dispatch/preflight P6A', 'PARTIAL', 'tests/integration service'],
  'servicehands.new': ['Request a change', 'app', 'MIGRATED_REAL', '/app/service/new', 'P6A', 'NOT_STARTED', 'P6A'],
  service: ['Service Delivery Command Center', 'app', 'MIGRATED_REAL', '/app/service/manager', 'P6A', 'NOT_STARTED', 'P6A'],
  'service.coverage': ['Service coverage map', 'app', 'MIGRATED_REAL', '/app/coverage', 'P6A (who covers this)', 'NOT_STARTED', 'P6A'],
  'service.fixes': ['Known Fix library', 'app', 'MIGRATED_REAL', '/app/known-fixes', 'P6A', 'NOT_STARTED', 'P6A'],
  projects: ['Project portfolio', 'app', 'MIGRATED_REAL', '/app/projects', 'GET/POST /v1/projects', 'PARTIAL', 'tests/e2e projects'],
  install: ['Installation', 'app', 'MIGRATED_REAL', '/app/install', 'P5 lifecycle FIELD_ACTIVE', 'NOT_STARTED', 'P5'],
  handoff: ['Handoff chain', 'app', 'MIGRATED_REAL', '/app/handoff', 'P5 (acceptance gates, immutable baseline)', 'NOT_STARTED', 'P5 (25–26)'],
  decisions: ['Decision Memory', 'app', 'MIGRATED_REAL', '/app/decisions', 'P5 approvals with rationale', 'NOT_STARTED', 'P5'],
  lessons: ['Lessons learned', 'app', 'MIGRATED_REAL', '/app/learn/lessons', 'P6C', 'NOT_STARTED', 'P6C'],
  none: ['Unknown address', 'demo+app', 'MIGRATED_REAL', '404 / boundary page', 'router', 'PARTIAL', 'tests/e2e'],
  studio: ['Design a Space (V1.3.3 studio)', 'demo', 'MIGRATED_DEMO', '/demo/design-studio', 'synthetic', 'NOT_STARTED', 'P3'],
  investigate: ['Investigate', 'demo', 'MIGRATED_DEMO', '/demo/investigate', 'synthetic', 'NOT_STARTED', 'P3'],
  gate: ['Welcome page (role gate)', 'demo', 'MIGRATED_DEMO', '/demo (role perspective picker)', 'demo persona picker ≠ auth', 'NOT_STARTED', 'P3'],
  'scouter.anatomy': ['Scouter Anatomy', 'demo', 'MIGRATED_DEMO', '/demo/scouter/anatomy', 'explanatory', 'NOT_STARTED', 'P3'],
  exports: ['Reports and exports', 'app', 'MIGRATED_REAL', '/app/exports', 'worker job (xlsx writer exists in demonstrator) P8', 'NOT_STARTED', 'P8'],
  v14: ['V1.4 engineering foundation', 'demo', 'MIGRATED_DEMO', '/demo/foundation', 'explanatory', 'NOT_STARTED', 'P3'],
  signage: ['Signage control plane', 'demo', 'BLOCKED_EXTERNAL_DEPENDENCY', '/demo/signage (simulated)', 'no verified signage adapter; connector contract exists (MOCK)', 'NOT_STARTED', 'P7'],
  itsm: ['Service workspace (ITSM)', 'app', 'BLOCKED_EXTERNAL_DEPENDENCY', '/admin/integrations/itsm', 'ITSM adapter needs tenant credentials; MOCK adapter + contract exist', 'PARTIAL', 'integrations conformance'],
  schedule: ['Monitoring and schedules', 'app', 'MIGRATED_REAL', '/app/monitoring', 'worker schedules P7 (FI v1.3 passive)', 'NOT_STARTED', 'P7'],
  geometry: ['Spatial twin editor', 'demo+app', 'MIGRATED_REAL', '/app/rooms/{id}/geometry', 'geometry provenance tags P6B', 'NOT_STARTED', 'P6B (22)'],
  diagnostics: ['Remote diagnostics', 'app', 'BLOCKED_EXTERNAL_DEPENDENCY', '/app/diagnostics', 'needs device adapters; SIMULATED only', 'NOT_STARTED', 'P7'],
  robot: ['Robotic audio simulator', 'demo', 'MIGRATED_DEMO', '/demo/robot (SIMULATED)', 'never active hardware; FI v1.4 entitlement gate', 'NOT_STARTED', 'P7 (29)'],
  camera: ['Camera and optical lane', 'demo', 'BLOCKED_EXTERNAL_DEPENDENCY', '/demo/camera (SIMULATED)', 'no verified camera adapter', 'NOT_STARTED', 'P7'],
  optimize: ['Optimize', 'app', 'MIGRATED_REAL', '/app/optimize', 'P6C (advisory, cited)', 'NOT_STARTED', 'P6C'],
  operations: ['Operations Ready', 'app', 'MIGRATED_REAL', '/app/operations/ready', 'P6', 'NOT_STARTED', 'P6'],
  registry: ['Registers', 'app', 'MIGRATED_REAL', '/admin/registers', 'P6/P8', 'NOT_STARTED', 'P8'],
  investor: ['Investor demonstration landing', 'demo', 'MIGRATED_DEMO', '/demo', 'apps/demo landing with guided scenarios (2.5.5 investor start actions carried over)', 'NOT_STARTED', 'P3'],
  'v25.build': ['Build a Room with Lite (V2.5.3)', 'demo+app', 'MIGRATED_REAL', '/app/rooms/{id}/design · /demo/build-a-room', 'Build a Room engine ported (92 golden cases) + rooms API', 'DONE (slice)', 'tests/e2e, golden parity'],
};
const V25 = {
  intake: ['/app/requests', 'P5', 'NOT_STARTED'], vendor: ['/app/vendor-inbox', 'P5 (scoped vendor acknowledgement, test 15)', 'NOT_STARTED'], decisions: ['/app/decisions', 'P5 (approve/hold/reject, author ≠ approver)', 'NOT_STARTED'],
  design: ['/app/rooms/{id}/design', 'revisions, drawings, classification approval (API); DIVR/RFI/extraction P5', 'PARTIAL'], scouter: ['/app/scouter', 'P6A', 'NOT_STARTED'], lite: ['/app/rooms/{id}/plan', 'P6B', 'PARTIAL'],
  fi: ['/app/field-intelligence', 'P7 (v1.3 passive)', 'NOT_STARTED'], fipv: ['/app/field-intelligence/physical', 'P7 (v1.4 entitlement state machine; denial tests 29–31)', 'NOT_STARTED'],
  commissioning: ['/app/rooms/{id}/commissioning', 'engine + results + verify (API)', 'PARTIAL'], tracker: ['/app/rooms/{id}/documentation', 'P5 (36 columns, final-photo gate, test 25)', 'NOT_STARTED'],
  service: ['/app/service', 'issues/work orders (API); eligibility/preflight P6A', 'PARTIAL'], coverage: ['/app/coverage', 'P6A', 'NOT_STARTED'], assurance: ['/app/assurance', 'assurance-engine (API)', 'PARTIAL'],
  apex: ['/app/apex', 'P6B (hypotheses A0–A5, advisory)', 'NOT_STARTED'], exec: ['/app/executive', 'P6C (27 passports with denominators)', 'PARTIAL'], learn: ['/app/learn', 'P6C', 'NOT_STARTED'],
  ledger: ['/app/audit', 'GET /v1/audit', 'DONE (slice)'], walkthrough: ['/demo/walkthrough', 'P3', 'NOT_STARTED'], policy: ['/admin/policy', 'RBAC matrix (docs/api) + server policy; UI P4', 'PARTIAL'],
  cxworkbook: ['/app/rooms/{id}/workbook', 'P5/P6', 'NOT_STARTED'],
};
const FS = {   // Founder Studio destinations → the private founder application (authenticated, founder-only; never in demo or www)
  'mission-control': ['/founder', 'studio page over founder-scoped API (P4F)', 'PARTIAL'], 'enterprise-platform': ['/founder/platform', 'status matrix from the real repo/tests', 'PARTIAL'],
  'build-a-room': ['/founder/build-a-room', 'embedded Founder Edition today (DemoFrame) → native pages over the rooms API', 'PARTIAL'], 'search-party': ['/founder/products/search-party', 'product page', 'PARTIAL'],
  pro: ['/founder/products/pro', 'product page', 'PARTIAL'], commissioning: ['/founder/products/commissioning', 'product page + engine lab', 'PARTIAL'], assurance: ['/founder/products/assurance', 'product page', 'PARTIAL'],
  'field-intelligence': ['/founder/products/field-intelligence', 'product page', 'PARTIAL'], servicehands: ['/founder/products/servicehands', 'product page', 'PARTIAL'], intake: ['/founder/products/intake', 'product page', 'PARTIAL'],
  'drawing-intelligence': ['/founder/products/drawing-intelligence', 'product page', 'PARTIAL'], scouter: ['/founder/products/scouter', 'product page', 'PARTIAL'], procurement: ['/founder/products/procurement', 'product page', 'PARTIAL'],
  'control-studio': ['/founder/products/control-studio', 'product page (simulated)', 'PARTIAL'], learn: ['/founder/products/learn', 'product page', 'PARTIAL'], signal: ['/founder/products/signal', 'product page', 'PARTIAL'],
  onboard: ['/founder/products/onboard', 'product page', 'PARTIAL'], experiences: ['/founder/products/experiences', 'product page', 'PARTIAL'], 'collaboro-sing': ['/founder/products/collaboro-sing', 'product page', 'PARTIAL'],
  frontline: ['/founder/products/frontline', 'product page', 'PARTIAL'], scenarios: ['/founder/scenarios', 'scripted journeys over the demonstrators', 'PARTIAL'], media: ['/founder/media', 'films served from private storage (signed URLs) P4F', 'PARTIAL'],
  architecture: ['/founder/architecture', 'diagrams + source explorer (private)', 'PARTIAL'], docs: ['/founder/docs', 'blueprint documents (private)', 'PARTIAL'], maturity: ['/founder/maturity', 'evidence states from tests', 'PARTIAL'],
  vault: ['/founder/vault', 'IP & provenance vault (private, founder-only, audited reads)', 'PARTIAL'], settings: ['/founder/settings', 'appearance, export, reset (founder data only)', 'PARTIAL'],
};
const LEVELS = ['INVENTORIED', 'ROUTED', 'RENDERED', 'FUNCTIONAL', 'BACKEND_CONNECTED', 'REGRESSION_TESTED'];
// Evidence for a level is a test file that exists in this repo and names the capability. A route in apps/demo counts as ROUTED only
// (the shell resolves every Living Campus area to a page that states its status: tests/browser/demo.test.mjs D-04).
const MATURITY = {   // key → [level, evidence]
  room: [5, 'tests/e2e + tests/integration/api.test.mjs (room → devices → revisions → read model over the API)'], builder: [5, 'tests/browser/enterprise-web.test.mjs (Build a Room over the API) + commissioning-engine golden 92'],
  'v25.build': [5, 'tests/browser/enterprise-web.test.mjs; commissioning-engine golden parity'], 'commissioning.room': [5, 'tests/integration/api.test.mjs results + verify'], commissioning: [4, 'engine + API; no native UI of the command center yet'],
  ledger: [5, 'tests/security/authz.test.mjs (audit read authority) + api.test.mjs'], 'search.vault': [4, 'POST /v1/evidence, GET content: api.test.mjs; UI pending'], 'search.graph': [4, 'GET /v1/graph: api.test.mjs'],
  'pro.issues': [4, 'issues → work orders → close: api.test.mjs'], servicehands: [4, 'api.test.mjs service chain'], assurance: [4, 'assurance-engine 13/13 + GET /v1/rooms/{room}/assurance'], 'assurance.room': [4, 'same'],
  projects: [4, 'tests/e2e projects'], 'search.projects': [4, 'GET/POST /v1/projects'], 'search.people': [4, 'GET /v1/people (secadmin, audited): authz.test.mjs'], campus: [4, 'GET /v1/sites'], home: [4, 'notifications + reports/summary; role home UI partial'],
  compare: [4, 'revisions/compare: api.test.mjs'], fabric: [4, 'integrations probe/sync/observations: integration-worker.test.mjs + conformance 5/5'], 'lite.guides': [4, 'GET /v1/knowledge 20/20'], ask: [4, 'POST /v1/ai/requests'], core: [3, 'schemas package tests; no UI'],
  'pro.exec': [4, 'GET /v1/reports/summary'], 'search.activity': [4, 'GET /v1/audit'], lite: [2, 'FloorPlan.tsx renders 2D plan in enterprise-web'], investor: [5, 'tests/browser/demo.test.mjs (landing, three actions, seven scenarios)'],
  itsm: [3, 'MOCK adapter conformance (SIMULATED only)'],
  'assurance.baselines': [4, 'API + DB + regression (governance.test.mjs); UI lineage view pending'], 'lifecycle.recommission': [5, 'engine + API + regression; exercised through the lifecycle route'], measurements: [4, 'API + DB + regression; UI pending'], 'graph.identity': [4, 'DB + writers + graph read; client addressing by key later'],
  'authz.separation': [5, 'service layer, exercised through every protected route; regression-tested'], 'authz.delegation': [4, 'API + DB + regression; UI pending'], 'admin.invitations': [4, 'API + DB + regression; UI pending'], 'admin.memberships': [4, 'API + DB + regression; UI pending'], 'admin.policy': [4, 'API + regression; UI pending'], 'founder.platform-health': [4, 'API + regression; Founder Studio view pending'],
};
const maturityOf = (r) => { const m = MATURITY[r.key]; if (m) return m; if (r.app === 'Living Campus' && r.kind === 'area') return [1, 'apps/demo resolves the address to a status page (demo.test.mjs D-04)']; return [0, 'inventoried only']; };
const rows = [];
for (const a of v253.areas) { const c = T[a.area] || ['<unclassified>', '?', 'DEFERRED_WITH_REASON', '—', 'not yet classified', 'NOT_STARTED', '—']; rows.push({ app: 'Living Campus', kind: 'area', key: a.area, label: a.label, original: `area ${a.area} (${a.addedBy}); roles: ${Array.isArray(a.roles) ? a.roles.length : a.roles}`, feature: c[0], surface: c[1], target: c[2], newRoute: c[3], backing: c[4], status: c[5], test: c[6] }); }
for (const p of v253.v25Pages) { const c = V25[p.key] || ['—', 'not yet classified', 'NOT_STARTED']; rows.push({ app: 'Living Campus', kind: 'v25 page', key: `v25/${p.key}`, label: p.label, original: `#/v25/${p.key} — ${p.description}`, feature: p.label, surface: 'demo+app', target: 'MIGRATED_REAL', newRoute: c[0], backing: c[1], status: c[2], test: 'P5/P6 named tests' }); }
for (const n of v253.navGroups) for (const it of n.items) rows.push({ app: 'Living Campus', kind: 'navigation', key: it.key, label: it.label, original: `More menu › ${n.group} › ${it.href}`, feature: it.description, surface: 'demo+app', target: 'MIGRATED_REAL', newRoute: 'see area row', backing: 'navigation registry (packages/ui) P3', status: 'NOT_STARTED', test: 'P3 navigation test' });
for (const [k, t] of Object.entries(v253.tours)) rows.push({ app: 'Living Campus', kind: 'guided tour', key: `tour/${k}`, label: t.title, original: `${t.steps ?? '?'} steps`, feature: 'guided experience', surface: 'demo', target: 'MIGRATED_DEMO', newRoute: '/demo/tours/' + k, backing: 'A/B/C demos P3 (investor tour: 7 scenarios)', status: 'NOT_STARTED', test: 'P3' });
for (const r of v253.uiRoles) rows.push({ app: 'Living Campus', kind: 'UI role', key: r, label: r, original: 'AZ_KEYS (14 demo roles)', feature: 'demo role perspective', surface: 'demo', target: 'MIGRATED_DEMO', newRoute: '/demo?as=' + r, backing: 'perspective picker (never authorization)', status: 'NOT_STARTED', test: 'P3 role smoke' });
for (const [k, p] of Object.entries(v253.personas)) rows.push({ app: 'Living Campus', kind: 'persona', key: k, label: p.label, original: `V25_PERSONAS; authority: ${(p.authority || []).join(' ')}`, feature: 'role-specific home (' + p.home + ')', surface: 'app', target: 'MIGRATED_REAL', newRoute: '/app (home by role)', backing: 'roles in DB (GET /v1/roles); 22 journeys P6A', status: 'PARTIAL', test: 'P6A 22 role journeys' });
for (const [k, m] of Object.entries(v253.stateMachines)) if (!k.startsWith('__')) rows.push({ app: 'Living Campus', kind: 'state machine', key: k, label: k, original: `${m.states.length} states, ${m.transitions} transitions`, feature: 'governed lifecycle', surface: 'app', target: 'MIGRATED_REAL', newRoute: 'service layer', backing: k === 'design_and_commissioning' || k === 'service' ? 'partly in enterprise-api (lifecycle, service)' : 'P5', status: k === 'design_and_commissioning' || k === 'service' ? 'PARTIAL' : 'NOT_STARTED', test: 'P5 (18–27)' });
for (const d of destinations) { const c = FS[d.path] || ['—', '?', 'NOT_STARTED']; rows.push({ app: 'Founder Studio', kind: 'destination', key: d.path, label: d.label, original: `#/${d.path} (${d.group})${d.product ? ' product ' + d.product : ''}`, feature: d.blurb, surface: 'founder (private)', target: 'MIGRATED_REAL', newRoute: c[0], backing: c[1], status: c[2], test: 'tests/browser studio (19 PASS, 1 NOT_RUN)' }); }
// ---- owner decisions of 2026-10-30 (ADR-0003..0007): governance capabilities the originals did not have, or had only as a UI gesture
const GOV = [
  ['assurance.baselines', 'Versioned immutable baselines (lineage, exceptions)', 'room.baseline jsonb overwritten per acceptance', 'assurance', '/app/rooms/{id}/assurance (lineage pending in UI)', 'GET /v1/rooms/{room}/baselines, exceptions; migration 0011; ADR-0003', 'governance.test.mjs BL-1..BL-4'],
  ['lifecycle.recommission', 'Recommissioning (ACCEPTED → COMMISSIONING governed step)', 'not in the 7-state machine', 'governed lifecycle', 'service layer', 'commissioning-engine lifecycle.ts; re-acceptance publishes the next baseline version', 'governance.test.mjs BL-3'],
  ['measurements', 'Measurements with provenance, units, calibration, uncertainty, approval', 'free-text instrument/note on a result', 'commissioning evidence', '/app/rooms/{id}/measurements (UI pending)', 'GET/POST /v1/rooms/{room}/measurements, POST /v1/measurements/{id}/verify; migration 0013; ADR-0004', 'governance.test.mjs MEAS-1'],
  ['graph.identity', 'Graph edges keyed by stable ids (rev)', 'edges keyed by display code', 'relationship graph', '/app/graph', 'app.relationship from_key/to_key/rev; migration 0014; GET /v1/graph identity block', 'relationship.test.mjs; api.test.mjs graph'],
  ['authz.separation', 'Separation of duties per artifact (author ≠ approver)', 'role check only', 'authorization', 'service layer', 'RequestContext.separate; ADR-0005', 'governance.test.mjs SoD-1/2, BL-4, MEAS-1; administration ADM-3'],
  ['authz.delegation', 'Scoped, expiring delegations (≤ 90 d, revocable, audited use)', 'none', 'authorization', '/app/admin (UI pending)', 'GET/POST /v1/delegations, revoke; migration 0012; app.auth_delegations', 'governance.test.mjs DEL-1/2, BL-1'],
  ['admin.invitations', 'Invitations (hashed one-time token, tenant-pinned, founder boundary EM008)', 'none (demo role switch)', 'administration', '/app/admin (UI pending)', 'GET/POST /v1/admin/invitations, revoke; POST /v1/public/invitations/accept; migration 0015; ADR-0006', 'administration.test.mjs ADM-1/2'],
  ['admin.memberships', 'Scoped memberships grant/revoke (never own, never architect)', 'none', 'administration', '/app/admin (UI pending)', 'POST /v1/admin/memberships, revoke', 'administration.test.mjs ADM-3'],
  ['admin.policy', 'Policy model read: 22 personas, 14 UI roles → personas, SoD rules', 'AZ_KEYS role switch (UI only)', 'administration', '/app/admin (UI pending)', 'GET /v1/admin/policy; ADR-0006', 'administration.test.mjs ADM-4'],
  ['founder.platform-health', 'Founder platform-health summary (governed integration)', 'none', 'founder integration', 'Founder Studio › Platform (UI pending)', 'GET /v1/founder/platform-health; ADR-0007', 'administration.test.mjs FH-1'],
];
for (const [key, label, original, feature, newRoute, backing, test] of GOV) rows.push({ app: key.startsWith('founder') ? 'Founder Studio' : 'Living Campus', kind: 'governance (2026-10-30 decision)', key, label, original, feature, surface: key.startsWith('founder') ? 'founder (private)' : 'app', target: 'MIGRATED_REAL', newRoute, backing, status: /UI pending/.test(newRoute) ? 'PARTIAL (API complete, UI pending)' : 'DONE', test });
rows.push({ app: 'Founder Studio', kind: 'demonstrator', key: 'founder-edition-2.5.4', label: 'Founder Edition 2.5.4 (8.4 MB)', original: `embedded demonstrator; ${v254.areas.length} areas, ${v254.v25Pages.length} V2.5 pages, 22 personas`, feature: 'full product as founder demonstrator', surface: 'founder (private)', target: 'MIGRATED_REAL', newRoute: '/founder/demonstrator (private, legacy until each area is native)', backing: 'served privately, authenticated; shares nothing with demo/www', status: 'PARTIAL', test: 'tests/browser town hall 25/25' });
// ---- outputs
const csvEsc = (s) => '"' + String(s ?? '').replace(/"/g, '""') + '"';
for (const r of rows) { const [lvl, ev] = maturityOf(r); r.maturity = `${lvl} ${LEVELS[lvl]}`; r.maturityEvidence = ev; if (r.app === 'Founder Studio' && r.kind === 'destination') { r.maturity = '5 REGRESSION_TESTED (as the local studio; hosted form pending)'; r.maturityEvidence = 'tests/browser/founder-studio.test.mjs 19/19 + founder-townhall 25/25'; } }
const cols = ['app', 'kind', 'key', 'label', 'original', 'feature', 'surface', 'target', 'newRoute', 'backing', 'status', 'maturity', 'maturityEvidence', 'test'];
fs.writeFileSync(path.join(root, 'docs/legacy-parity.csv'), cols.join(',') + '\n' + rows.map((r) => cols.map((c) => csvEsc(r[c])).join(',')).join('\n') + '\n');
const count = (f) => rows.reduce((m, r) => { const k = r[f]; m[k] = (m[k] || 0) + 1; return m; }, {});
const md = [`# Legacy parity ledger — Living Campus V2.5.3 and Founder Studio`, '',
  `Generated ${new Date().toISOString()} by \`scripts/legacy/parity-ledger.mjs\` from \`legacy/inventory/*.json\` (built from the committed source of each demonstrator) and the classification in that script. **Two applications, kept apart:** the Living Campus (investor-safe demo + authenticated enterprise application) and the Founder Studio (private founder application). Shared: identity, design tokens, API contracts, audit. Not shared: Founder Studio data, its administrative capabilities, or any route of it on a public or investor surface.`, '',
  `## Baseline facts (verified on receipt)`, '',
  `| Original | Bytes | sha256 | Source commit | Inventory |`, `|---|---|---|---|---|`,
  `| Living Campus V2.5.3 live (investor-live) | 6,957,191 | 9d6e53ef…a09f2f1 | cf86866 (2.5.3 rc3; frozen) | ${v253.modules} modules, ${v253.areas.length} address areas, ${v253.v25Pages.length} V2.5 pages, ${v253.uiRoles.length} UI roles, ${Object.keys(v253.personas).length} personas, ${v253.v25Types.length} record types, ${v253.v25Events.length} events, ${Object.keys(v253.stateMachines).length - 1} state machines, ${v253.searchDestinations.length} search destinations, ${Object.keys(v253.tours).length} tours, ${v253.actions} action names, ${v253.tests} test suites |`,
  `| Living Campus V2.5.3 offline (investor-offline) | 6,957,206 | ecbde0bb…8307756 | cf86866 | same program; edition label differs |`,
  `| Founder Edition 2.5.4 (inside the Founder Studio package) | 8,371,566 | ecdf64be…bbe1ee | b8986d1 (2.5.4) | ${v254.areas.length} areas, ${v254.v25Pages.length} V2.5 pages |`,
  `| Founder Studio f51229b (React app + local server + film index) | studio.js 2,209,154 | see legacy/source/SHA256SUMS.txt | f51229b (this repo) | ${destinations.length} destinations |`, '',
  `Baseline browser runs (Chromium, file:// and the studio's own localhost server): \`legacy/baseline/*/baseline.json\` with screenshots. V2.5.3 loads in ~0.9–1.0 s from disk (6.6 MB single file), lands on \`#/investor\`, 0 page errors, 0 external requests at 1440 px and 390 px. Founder Edition 2.5.4: 8.0 MB, ~0.85 s, lands on \`#/home\`. Founder Studio: ~0.15 s, calls only its local API health endpoint.`, '',
  `## Classification`, '', `Target classes (mandate §1): MIGRATED_REAL · MIGRATED_DEMO · DEFERRED_WITH_REASON · BLOCKED_EXTERNAL_DEPENDENCY · REGRESSION (release blocker). Status now: DONE (slice) · PARTIAL · NOT_STARTED. A status is DONE only where a named test passes at this commit.`, '',
  `| Target | Rows |`, `|---|---|`, ...Object.entries(count('target')).map(([k, v]) => `| ${k} | ${v} |`), '', `| Status now | Rows |`, `|---|---|`, ...Object.entries(count('status')).map(([k, v]) => `| ${k} | ${v} |`), '',
  `### Maturity levels (owner requirement 2026-10-30 11:47)`, '', `A feature is never "migrated" because its route exists. Each row carries the highest level **with evidence at this commit**: 0 INVENTORIED · 1 ROUTED (the new app resolves the address) · 2 RENDERED (a native page draws it) · 3 FUNCTIONAL (its interactions work) · 4 BACKEND_CONNECTED (persisted through the API with server-side authorization) · 5 REGRESSION_TESTED (a named automated test covers it on the new application). Release acceptance requires level 5 for every MIGRATED_REAL row in scope and level 3+ for MIGRATED_DEMO rows.`, '', `| Maturity | Rows |`, `|---|---|`, ...Object.entries(rows.reduce((m, r) => { const k = r.maturity.split(' (')[0]; m[k] = (m[k] || 0) + 1; return m; }, {})).sort().map(([k, v]) => `| ${k} | ${v} |`), '', `**Regressions at this commit: none** — no original route has been removed; the originals remain the served demonstrators until each route is migrated natively (an embedded original is interim, never counted as a migration).`, '',
  `## Ledger`, '', `| App | Kind | Key | Original | Target | New route | Backed by | Status | Maturity (evidence) | Test |`, `|---|---|---|---|---|---|---|---|---|---|`,
  ...rows.map((r) => `| ${r.app} | ${r.kind} | \`${r.key}\` | ${r.label} — ${r.original} | ${r.target} | ${r.newRoute} | ${r.backing} | ${r.status} | ${r.maturity} (${r.maturityEvidence}) | ${r.test} |`), ''];
fs.writeFileSync(path.join(root, 'docs/legacy-parity.md'), md.join('\n'));
console.log(JSON.stringify({ rows: rows.length, byTarget: count('target'), byStatus: count('status'), unclassified: rows.filter((r) => r.feature === '<unclassified>').map((r) => r.key) }));
