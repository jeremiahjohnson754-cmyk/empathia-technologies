/**
 * The eighteen Empathia products and their evidence, as recorded. Every value cites a record:
 *   REG  = Empathia_V25/release/v2.5.2/PRODUCT_CAPABILITY_REGISTER.csv (builder register, 2.5.2)
 *   RC3  = Empathia_V25/handoff/2.5.3/RELEASE_REPORT_2.5.3.md (gate 85/85, three-edition 23/23, separate-AI review)
 *   MONO = this monorepo (ported engines, production starter)
 * Nothing here is an independent assessment. INDEPENDENTLY_AUDITED is never marked achieved: the 2.5.x reviews were done by a
 * separate AI reviewer, and the external page-API security assessment is outstanding.
 */

export const EVIDENCE_STATES = [
  'SPECIFIED', 'IMPLEMENTED', 'DEMONSTRATED', 'BUILDER_TESTED',
  'INDEPENDENTLY_AUDITED', 'HARDWARE_VERIFIED', 'PRODUCTION_VALIDATED', 'CUSTOMER_VALIDATED',
] as const;
export type EvidenceState = (typeof EVIDENCE_STATES)[number];
export type Rung = 'YES' | 'PARTIAL' | 'NO';

export const EVIDENCE_MEANING: Record<EvidenceState, string> = {
  SPECIFIED: 'A written specification or acceptance matrix exists.',
  IMPLEMENTED: 'Working code exists (in the browser demonstrator, or in the production starter where noted).',
  DEMONSTRATED: 'It can be used end to end in the demonstrator on synthetic data.',
  BUILDER_TESTED: 'The builder’s own automated suites cover it and pass.',
  INDEPENDENTLY_AUDITED: 'A reviewer independent of the builder (a third party) assessed it. Not achieved for any product.',
  HARDWARE_VERIFIED: 'Verified against real equipment. Not achieved for any product.',
  PRODUCTION_VALIDATED: 'Running in production with operational acceptance. Not achieved for any product.',
  CUSTOMER_VALIDATED: 'A customer accepted it on their own environment. Not achieved for any product.',
};

export interface Product {
  id: string;
  slug: string;
  name: string;
  group: 'operational' | 'expansion';
  /** One plain sentence: what it does for the person using it. */
  pitch: string;
  /** Demonstrator routes (hash routes in the Founder Edition). The first is opened in the studio. */
  routes: string[];
  /** The demonstrator persona the studio switches to before opening the route (the page's own persona control). */
  persona: string;
  /** Recorded implementation state and proof level (REG). */
  state: string;
  proof: string;
  ladder: Record<EvidenceState, Rung>;
  /** Builder test evidence (REG): suites that name the product's routes. */
  builderSuites: { suites: number; passed: number; notRun: number } | null;
  acceptance: string;
  whatWorks: string[];
  simulatedOrMissing: string[];
  sources: string[];
  films: string[];
  nextStep: string;
  discrepancy?: string;
}

const NONE_BEYOND: Pick<Record<EvidenceState, Rung>, 'INDEPENDENTLY_AUDITED' | 'HARDWARE_VERIFIED' | 'PRODUCTION_VALIDATED' | 'CUSTOMER_VALIDATED'> = {
  INDEPENDENTLY_AUDITED: 'NO', HARDWARE_VERIFIED: 'NO', PRODUCTION_VALIDATED: 'NO', CUSTOMER_VALIDATED: 'NO',
};
const L = (s: Rung, i: Rung, d: Rung, b: Rung): Record<EvidenceState, Rung> => ({ SPECIFIED: s, IMPLEMENTED: i, DEMONSTRATED: d, BUILDER_TESTED: b, ...NONE_BEYOND });
const T = (suites: number, passed: number, notRun: number) => ({ suites, passed, notRun });
const SRC = (...f: string[]) => f.map((x) => `Empathia_V25/work/source-254/${x}`);

export const PRODUCTS: Product[] = [
  {
    id: '01', slug: 'search-party', name: 'Search Party', group: 'operational',
    pitch: 'Find the person, the room or the system behind anything, and see how it is all connected.',
    routes: ['#/search', '#/search/graph', '#/v25/coverage', '#/service/coverage'], persona: 'architect',
    state: 'SIMULATED_FUNCTIONAL', proof: 'OFFLINE_SYNTHETIC', ladder: L('YES', 'YES', 'YES', 'PARTIAL'), builderSuites: T(42, 36, 6), acceptance: 'none agreed',
    whatWorks: ['people, ownership and support coverage for any room', 'relationship explorer (levels A–D, intents) with edge-level visibility rules', 'planned rooms from Build a Room appear as PLANNED — NOT YET COMMISSIONED'],
    simulatedOrMissing: ['Teams/Outlook links only open the client; nothing is sent', 'no directory integration (synthetic people)'],
    sources: SRC('src/60-search.js', 'src/78-ui-search.js', 'src/8999975-ui-party.js', 'src/v25-10-shell.js'), films: ['F01', 'S03'],
    nextStep: 'Production: relationship engine (packages/relationship-engine) over tenant-scoped PostgreSQL edges.',
  },
  {
    id: '02', slug: 'servicehands', name: 'ServiceHands', group: 'operational',
    pitch: 'Small field changes done properly: routed, prepared, executed and verified with evidence.',
    routes: ['#/servicehands', '#/v25/service', '#/service'], persona: 'svcmgr',
    state: 'SIMULATED_FUNCTIONAL', proof: 'OFFLINE_SYNTHETIC', ladder: L('YES', 'YES', 'YES', 'PARTIAL'), builderSuites: T(17, 14, 3), acceptance: 'none agreed',
    whatWorks: ['request and work-order lifecycle with hard-gated eligibility and preflight', 'field execution with evidence; closing a work order never passes a test', 'room work orders from Build a Room deficiencies'],
    simulatedOrMissing: ['no offline draft queue with re-authentication', 'no photo upload to a server'],
    sources: SRC('src/8999971-ui-servicehands.js', 'src/v25-092-service.js', 'src/v25-23-s07-ui.js'), films: ['F02'],
    nextStep: 'Production: work-order module in the enterprise API (vertical slice step "Service workflow").',
  },
  {
    id: '03', slug: 'intake', name: 'Intake Portal', group: 'operational',
    pitch: 'Turn a request with photos, plans and dimensions into an engineering brief and a funded decision.',
    routes: ['#/v25/intake', '#/intake', '#/v25/vendor', '#/v25/decisions'], persona: 'architect',
    state: 'SIMULATED_FUNCTIONAL', proof: 'OFFLINE_SYNTHETIC', ladder: L('YES', 'YES', 'YES', 'PARTIAL'), builderSuites: T(16, 14, 2), acceptance: 'none agreed',
    whatWorks: ['requests, triage, approve / hold / reject', 'supplier inbox (acknowledgement only)', 'decision desk bound to a scope revision'],
    simulatedOrMissing: ['finance authority is a role check in the browser, not enforced server-side'],
    sources: SRC('src/v25-03-governance.js', 'src/v25-20-s04-ui.js', 'src/v25-42-emp.js'), films: ['F01'],
    nextStep: 'Production: request and decision modules with server-side approval authority.',
  },
  {
    id: '04', slug: 'pro', name: 'Empathia Pro', group: 'operational',
    pitch: 'The operational view of every room and device: what is open, how it stands, where to look next.',
    routes: ['#/pro', '#/pro/assets', '#/pro/planned', '#/v14/operations', '#/v25/exec'], persona: 'architect',
    state: 'SIMULATED_FUNCTIONAL', proof: 'OFFLINE_SYNTHETIC', ladder: L('YES', 'YES', 'YES', 'PARTIAL'), builderSuites: T(47, 41, 6), acceptance: 'none agreed',
    whatWorks: ['command center, registries, issues, operations and executive KPI passports', 'planned-room lifecycle visibility from Build a Room'],
    simulatedOrMissing: ['monitoring over synthetic telemetry only; no live device data', 'manufacturer coverage not proven'],
    sources: SRC('src/84-ui-pro.js', 'src/v25-094-exec.js', 'src/v25-25-s09-ui.js'), films: ['F02', 'FA'],
    nextStep: 'Production: operational read model fed by the outbox (vertical slice step "Operational read model").',
  },
  {
    id: '05', slug: 'assurance', name: 'Assurance / APEX', group: 'operational',
    pitch: 'Keep the accepted baseline honest: drift against it, and evidence-cited diagnosis when something breaks.',
    routes: ['#/v25/assurance', '#/v25/apex', '#/assurance', '#/agent'], persona: 'architect',
    state: 'SIMULATED_FUNCTIONAL', proof: 'OFFLINE_SYNTHETIC', ladder: L('YES', 'YES', 'YES', 'PARTIAL'), builderSuites: T(45, 41, 4), acceptance: 'none agreed',
    whatWorks: ['golden baselines, NOT_VERIFIED until accepted', 'drift detection against the baseline', 'APEX diagnosis tiers A0–A5 with their evidence'],
    simulatedOrMissing: ['hypotheses and action tiers are simulation', 'no real runbook execution'],
    sources: SRC('src/v25-093-assure.js', 'src/v25-24-s08-ui.js', 'src/57-derive-assure.js'), films: ['F02', 'FB'],
    nextStep: 'Production: assurance engine (packages/assurance-engine) over accepted baselines in PostgreSQL.',
  },
  {
    id: '06', slug: 'field-intelligence', name: 'Field Intelligence', group: 'operational',
    pitch: 'Authorized, read-only discovery and safe measurement planning, with optional licensed physical validation.',
    routes: ['#/v25/fi', '#/v25/fipv', '#/v14/robot'], persona: 'architect',
    state: 'SIMULATED_FUNCTIONAL', proof: 'OFFLINE_SYNTHETIC', ladder: L('YES', 'PARTIAL', 'YES', 'YES'), builderSuites: T(9, 9, 0), acceptance: 'none agreed',
    whatWorks: ['V1.3 collector shown from its source with hashes (redistribution copy)', 'V1.4 physical-validation workflow as a governed simulator'],
    simulatedOrMissing: ['no measurement taken', 'no real camera or meter control', 'collector origin needs chain-of-title review'],
    sources: SRC('src/v25-08-fi.js', 'src/v25-21-s05-ui.js').concat(['Empathia_FI_Film/collector/']), films: ['IE', 'IE-trailer', 'IE-teaser'],
    nextStep: 'Contract-only adapter interfaces; real collection only with authorization, site consent and a verified test environment.',
  },
  {
    id: '07', slug: 'commissioning', name: 'Universal Commissioning', group: 'operational',
    pitch: 'Five-phase commissioning: the right tests for this room, the evidence each needs, and nothing passed without it.',
    routes: ['#/v25/commissioning', '#/v25/cxworkbook', '#/v25/tracker', '#/commissioning'], persona: 'cxeng',
    state: 'SIMULATED_FUNCTIONAL', proof: 'OFFLINE_SYNTHETIC', ladder: L('YES', 'YES', 'YES', 'YES'), builderSuites: T(28, 24, 4), acceptance: 'TEST_LIBRARY_MANIFEST.json (33 base + 61 pack definitions, 11 packs)',
    whatWorks: ['adaptive plans compiled from the rule pack, with WHY and WHY NOT', 'evidence states and independent verification', 'workbooks (JSON, CSV, .xlsx)', 'ported to TypeScript with 92-case parity (MONO)'],
    simulatedOrMissing: ['definitions are not executions: no field test has been run', 'acceptance needs real, independently verified evidence'],
    sources: SRC('src/v25-096-cxuni.js', 'src/v25-09-commissioning.js', 'src/v25-60-room.js').concat(['empathia-technologies/packages/commissioning-engine/src/']), films: ['F03'],
    nextStep: 'Production: commissioning module in the enterprise API using packages/commissioning-engine server-side.',
  },
  {
    id: '08', slug: 'lite', name: 'Empathia Lite', group: 'expansion',
    pitch: 'Rooms, floors and campuses in 2D and 3D, with a confidence it never exceeds.',
    routes: ['#/lite', '#/v25/lite', '#/studio/new', '#/v14/geometry'], persona: 'designer',
    state: 'SIMULATED_FUNCTIONAL', proof: 'OFFLINE_SYNTHETIC', ladder: L('YES', 'YES', 'YES', 'PARTIAL'), builderSuites: T(55, 49, 6), acceptance: 'none agreed',
    whatWorks: ['campus / floor / room explorer', '2D design and browser 3D', 'modeled coverage and design scenarios'],
    simulatedOrMissing: ['no native UE5 runtime (UE5_NOT_RUN)', 'coverage is modeled, never measured'],
    sources: SRC('src/88-ui-lite.js', 'src/87-ui-lite3d.js', 'src/54-derive-lite.js', 'src/v25-07-lite.js'), films: ['F01', 'S07'],
    nextStep: 'Production: spatial module (geometry in PostgreSQL; PostGIS evaluated) and a React Three Fiber viewer.',
  },
  {
    id: '09', slug: 'scouter', name: 'Scouter', group: 'expansion',
    pitch: 'Answer an equipment requirement with a ranked, explained shortlist from sourced, staleness-aware data.',
    routes: ['#/scouter', '#/v25/scouter'], persona: 'designer',
    state: 'SIMULATED_FUNCTIONAL', proof: 'OFFLINE_SYNTHETIC', ladder: L('YES', 'YES', 'YES', 'PARTIAL'), builderSuites: T(19, 16, 3), acceptance: 'none agreed',
    whatWorks: ['device evaluation and standardization proposals from eligible cohorts', 'explainable scoring'],
    simulatedOrMissing: ['synthetic catalogue (fictional makers only)', 'no automatic selection'],
    sources: SRC('src/896-ui-eng-scouter.js', 'src/5967-derive-scout13.js', 'src/v25-06-scouter.js'), films: [],
    nextStep: 'Production: catalogue service with supplier evidence and licence-checked data sources.',
  },
  {
    id: '10', slug: 'procurement', name: 'Procurement', group: 'expansion',
    pitch: 'Budgets, bills of materials, substitutions and receiving, tied to the design revision they serve.',
    routes: ['#/budget', '#/v25/project', '#/projects'], persona: 'architect',
    state: 'SIMULATED_FUNCTIONAL', proof: 'OFFLINE_SYNTHETIC', ladder: L('YES', 'PARTIAL', 'PARTIAL', 'PARTIAL'), builderSuites: T(23, 19, 4), acceptance: 'none agreed',
    whatWorks: ['budget and project delivery views', 'ROM, capital, running cost and lifecycle'],
    simulatedOrMissing: ['bids, receiving and revocation-suspends-commitments are not a separate product'],
    sources: SRC('src/898-ui-eng-budget.js', 'src/59-derive-eng-cost.js'), films: [],
    nextStep: 'Specify the procurement product boundary before building it.',
  },
  {
    id: '11', slug: 'drawing-intelligence', name: 'Drawing Intelligence', group: 'expansion',
    pitch: 'Drawings generated from the design, with revision checks that flag when an approved drawing no longer matches.',
    routes: ['#/v25/design', '#/v25/build'], persona: 'designer',
    state: 'MOCKED_UI_ONLY (2.5.2) → drawing set and revision checks in Build a Room (2.5.3)', proof: 'OFFLINE_SYNTHETIC', ladder: L('YES', 'PARTIAL', 'PARTIAL', 'PARTIAL'), builderSuites: T(20, 16, 4), acceptance: 'none agreed',
    whatWorks: ['design workspace: revisions, redlines, DIVR', 'Build a Room drawing set (plan, placement, schedule, relationships, signal, network, summary) with REVIEW_REQUIRED on change'],
    simulatedOrMissing: ['no CAD / BIM / DWG / IFC import or extraction'],
    sources: SRC('src/v25-60-room.js', 'src/v25-61-room-ui.js', 'src/v25-20-s04-ui.js'), films: [],
    nextStep: 'Production: drawing-revision records (vertical slice step "Drawing revision"); file-format import is a separate project.',
  },
  {
    id: '12', slug: 'control-studio', name: 'Control Studio', group: 'expansion',
    pitch: 'Design, simulate, publish and commission a room’s control system — every device virtual until proven.',
    routes: ['#/v25/cstudio', '#/control', '#/scheduler'], persona: 'architect',
    state: 'SIMULATED_FUNCTIONAL', proof: 'OFFLINE_SYNTHETIC', ladder: L('YES', 'YES', 'YES', 'YES'), builderSuites: T(14, 12, 2), acceptance: 'CS-AT: 44 of 45 pre-agreed tests pass; CS-AT-41 not passed or not run',
    whatWorks: ['routing canvas, matrix, scenes, panel builder, bindings, logic', 'virtual-device runtime, command guard, simulation', 'publish / deploy / rollback to synthetic rooms; commissioning and assurance sync'],
    simulatedOrMissing: ['all SIMULATED; no device is addressed'],
    sources: SRC('src/v25-40-cs-engine.js', 'src/v25-41-cs-ui.js').concat(['Empathia_Products/Control_Studio/']), films: [],
    nextStep: 'Close CS-AT-41; keep device actuation out of scope until a verified test environment exists.',
  },
  {
    id: '13', slug: 'learn', name: 'Empathia Learn', group: 'expansion',
    pitch: 'Cases, labs and practice written from what actually happened in the estate.',
    routes: ['#/learn', '#/v25/learn', '#/learn/labs'], persona: 'architect',
    state: 'SIMULATED_FUNCTIONAL', proof: 'OFFLINE_SYNTHETIC', ladder: L('YES', 'YES', 'YES', 'PARTIAL'), builderSuites: T(30, 26, 4), acceptance: 'none agreed',
    whatWorks: ['Mission Control, labs, lessons, practice, case files', 'competency signals (scores grant no access)'],
    simulatedOrMissing: ['content is synthetic'],
    sources: SRC('src/899991-ui-learn.js', 'src/596-derive-learn.js', 'src/v25-25-s09-ui.js'), films: [],
    nextStep: 'Production: knowledge-document module with permission-aware retrieval.',
  },
  {
    id: '14', slug: 'signal', name: 'SIGNAL', group: 'expansion',
    pitch: 'A story mode that teaches the platform through a playable season.',
    routes: ['#/learn/signal', '#/learn/story'], persona: 'architect',
    state: 'SIMULATED_FUNCTIONAL', proof: 'OFFLINE_SYNTHETIC', ladder: L('YES', 'YES', 'YES', 'PARTIAL'), builderSuites: T(13, 9, 4), acceptance: 'none agreed',
    whatWorks: ['SIGNAL story mode inside Learn; Season 1 playable'],
    simulatedOrMissing: ['the 12-season / 133-episode corpus is not in this build (SOURCE_MISSING)'],
    sources: SRC('src/8999977-ui-signal.js', 'src/2971-static-signal-lib.js', 'src/89999772-ui-story2.js'), films: [],
    nextStep: 'Recover or author the remaining seasons before claiming them.',
  },
  {
    id: '15', slug: 'onboard', name: 'Onboard', group: 'expansion',
    pitch: 'A new hire’s first connected milestone: equipment, articles and competency evidence in one journey.',
    routes: ['#/v25/onboard', '#/lite/guides'], persona: 'architect',
    state: 'QUEUED (register) — see discrepancy', proof: 'NOT_ASSESSED', ladder: L('YES', 'PARTIAL', 'PARTIAL', 'PARTIAL'), builderSuites: T(8, 6, 2), acceptance: 'Empathia_Products/Onboard: 25 MVP tests specified',
    whatWorks: ['#/v25/onboard: first connected milestone in the browser room, competency evidence in Learn'],
    simulatedOrMissing: ['the three books are specified but not fully authored'],
    sources: SRC('src/v25-46-onboard-data.js', 'src/v25-47-onboard.js').concat(['Empathia_Products/Onboard/']), films: [],
    nextStep: 'Author the books; owner review against the 25 MVP tests.',
    discrepancy: 'The 2.5.2 register says "Guides page only", but the #/v25/onboard milestone page shipped in 2.5.2 rc1 (commit 6669fda). The frozen register is left as it is; this correction is recorded here.',
  },
  {
    id: '16', slug: 'experiences', name: 'Experiences / UE5', group: 'expansion',
    pitch: 'Guided, cinematic walk-throughs of the estate; an Unreal Engine path is planned.',
    routes: ['#/tours', '#/v25/walkthrough'], persona: 'architect',
    state: 'QUEUED', proof: 'NOT_ASSESSED', ladder: L('PARTIAL', 'PARTIAL', 'PARTIAL', 'PARTIAL'), builderSuites: T(14, 11, 3), acceptance: 'none agreed',
    whatWorks: ['nine guided browser tours over the real pages'],
    simulatedOrMissing: ['no UE5 project exists; UE5 has never been run here (UE5_NOT_RUN)'],
    sources: SRC('src/899996-ui-tour.js', 'src/8999985-ui-cine.js'), films: ['FL', 'FT'],
    nextStep: 'Write the UE5 contract (spatial/ue5-contracts) before any engine work.',
  },
  {
    id: '17', slug: 'collaboro-sing', name: 'Collaboro-Sing', group: 'expansion',
    pitch: 'Remote rehearsal and practice for musicians, measured honestly.',
    routes: ['#/v25/sing'], persona: 'architect',
    state: 'SIMULATED_FUNCTIONAL', proof: 'OFFLINE_SYNTHETIC', ladder: L('YES', 'YES', 'YES', 'PARTIAL'), builderSuites: T(2, 2, 0), acceptance: 'CSG-AT: a PROPOSED 15-test matrix (owner approval pending)',
    whatWorks: ['V2.5.2 practice demonstrator on its own tenant', 'recovered SyncLab v0.2 (loopback integration test; unit 7/7 re-run 23 Oct)'],
    simulatedOrMissing: ['no pilot results', 'matrix not yet approved'],
    sources: SRC('src/v25-43-sing.js').concat(['collabora-sing-synclab/', 'collabora-sing-synclab-3d/']), films: ['SyncLab'],
    nextStep: 'Owner approval of the 15-test matrix; then a pilot with consenting participants.',
  },
  {
    id: '18', slug: 'frontline', name: 'Frontline', group: 'expansion',
    pitch: 'Frontline teams (church and community settings) running their rooms with simple, guided steps.',
    routes: ['#/v25/frontline'], persona: 'architect',
    state: 'SIMULATED_FUNCTIONAL', proof: 'OFFLINE_SYNTHETIC', ladder: L('YES', 'YES', 'YES', 'PARTIAL'), builderSuites: T(1, 1, 0), acceptance: 'FL-AT: a PROPOSED 15-test matrix (owner review)',
    whatWorks: ['V2.5.2 demonstrator on its own tenant'],
    simulatedOrMissing: ['no earlier source recovered', 'matrix not yet approved'],
    sources: SRC('src/v25-44-frontline.js'), films: [],
    nextStep: 'Owner review of the matrix.',
  },
];

export const productBySlug = (s: string) => PRODUCTS.find((p) => p.slug === s);
