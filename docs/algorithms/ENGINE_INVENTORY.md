# Empathia engine inventory

Directive section 8: every AI, rules, optimization, inference, search and analytics function found in the source, what mechanism it actually uses, and the eleven named engines in thirteen items each. Machine-readable twin: [ENGINE_INVENTORY.json](ENGINE_INVENTORY.json).

**Sources read.** Empathia 2.5.4 founder build source, /home/claude/Empathia_V25/work/source-254 (branch founder/2.5.4, commit b8986d1); paths below are written source-254/src/<file>:<line>. Empathia monorepo /home/claude/empathia-technologies at commit 10dffe2 plus the working tree of 2026-10-26; paths are repository-relative. Every claim cites the file and line it was read from. Tests marked PASS were run on 2026-10-26; tests marked NOT_RUN exist but were not executed for this document.

## Machine learning: what exists

No trained model, no training dataset and no PyTorch code exist in the 2.5.4 demonstrator or in the starter. Every function inventoried below is deterministic code; nothing has been trained. PyTorch is **BLOCKED** in this environment (not installable), so no PyTorch training or inference has been run. A separately labelled synthetic research prototype (numpy/scikit-learn) is being added by this program — see `ml/`. It makes no claim of real-world predictive validity.

Several demonstrator features use the words "AI", "agent", "learned", "intelligence" or "confidence". Reading the code shows what they are:

- The geometry "AI engine" declares its own model as `rules-engine 0.8 (no learned model in the standalone file)` (source-254/src/39991-v14-geometry.js:74). Its "hypothesis" confidence is a constant: 0.6 when scaled, 0.2 when not (:87).
- Ask Empathia matches a question to one of 11 regular-expression intents and builds the answer from records; its header says "There is no language model here and nothing is sent anywhere" (62-ask.js:1-2).
- Search Party's plain-language interpreter is a handful of regular-expression rules; header: "No AI service is called; every rule is below" (60-search.js:1-2).
- The "AI ranking" in Optimize ranks at most three deterministic candidates; its own output says "rule-based ranking (no model inference)" (99999-v14-optimize.js:160-165).
- "Learned rules" in Room Builder average the offsets of approved designer edits per archetype (543-derive-eng13.js:384-395): aggregation, not a trained model.
- APEX "diagnosis" picks a fixed hypothesis branch from a symptom keyword (v25-093-assure.js:51, :87); Drawing Intelligence "extraction" generates proposals from a seeded hash of the file name with fixed confidence values (v25-05-design.js:86-104); the Assurance "discovery agent" derives timings and regression outcomes from hashes of record ids (57-derive-assure.js:157-161, :257-258). These are simulations, labelled as such in their own comments.
- The asset identity matcher's "confidence" (0.97, 0.95, 0.82, 0.74, 0.45, 0.4, 0.2 …) is a constant per rule, not a calibrated probability (999-v14-identity.js:8-22).

## Status legend

| Label | Meaning |
|---|---|
| PORTED TO STARTER | Implemented in the 2.5.4 demonstrator and ported to the starter monorepo (TypeScript), with tests |
| STARTER ONLY | Exists only in the starter (server-side code with no demonstrator counterpart) |
| DEMONSTRATOR ONLY | Exists only in the browser demonstrator (JavaScript in one HTML file); not in the starter |
| SPECIFIED ONLY | Described but not implemented anywhere |
| IN PROGRESS | Being written in this program at the time of this document |
| NOT_RUN | A test exists but was not executed for this document |
| NONE | No test exists |

## Part 1 — Function inventory

157 functions (or tight groups of functions that decide one thing together). Mechanism counts: Deterministic rules 93, Traditional algorithms 26, Simulation 19, Graph traversal 9, Statistical analysis 5, SQL queries 3, Placeholder or conceptual future functionality 2. Mechanisms with zero entries: Optimization, Retrieval-augmented generation, External AI model inference, Locally hosted machine learning, PyTorch training or inference.

Status counts at first writing: DEMONSTRATOR ONLY 120, PORTED TO STARTER 26, STARTER ONLY 10, IN PROGRESS 1. The one IN PROGRESS item (assurance-engine) has since been ported — see the addendum below.

### Search Party Relationship Engine (16)

| Function | Location | What it decides | Mechanism | Status |
|---|---|---|---|---|
| `edges / outs / ins / link` | `source-254/src/10-model.js:111` | typed directed edges of the in-memory Core graph and their inverse reads | Graph traversal | DEMONSTRATOR ONLY |
| `conf` | `source-254/src/10-model.js:127` | confidence label of a record from its evidence state (lookup) | Deterministic rules | DEMONSTRATOR ONLY |
| `buildIndex` | `source-254/src/60-search.js:43` | builds the keyword index over every searchable record | Traditional algorithms | DEMONSTRATOR ONLY |
| `keywordSearch` | `source-254/src/60-search.js:45` | token-AND match with fixed score bonuses (prefix 6, word-start 4, substring 3, exact name +14 ...) | Traditional algorithms | DEMONSTRATOR ONLY |
| `interpret` | `source-254/src/60-search.js:69` | plain-language question → filter, via regular-expression rules (DOMAIN_WORDS, ARCH_WORDS); null when no rule applies; file header: "No AI service is called" | Deterministic rules | DEMONSTRATOR ONLY |
| `search / typeahead` | `source-254/src/60-search.js:152` | combines interpret() and keywordSearch(), groups results by type | Deterministic rules | DEMONSTRATOR ONLY |
| `xpParse` | `source-254/src/999999-v14-explorer.js:317` | question → intent (find/path/impact/...) by matching XP_RULES regular expressions | Deterministic rules | DEMONSTRATOR ONLY |
| `xpCandidates` | `source-254/src/999999-v14-explorer.js:323` | role-filtered candidate records for a phrase (exact id, then keywordSearch) | Traditional algorithms | DEMONSTRATOR ONLY |
| `xpPathBetween` | `source-254/src/999999-v14-explorer.js:357` | breadth-first chain between two records, max 4 hops, max 4,000 nodes, role-visible edges only | Graph traversal | DEMONSTRATOR ONLY |
| `xpImpact` | `source-254/src/999999-v14-explorer.js:433` | downstream rooms/devices of a switch or power node (UPLINKS_TO / POWERED_BY), depth ≤ 5 | Graph traversal | DEMONSTRATOR ONLY |
| `xpLineage / xpAnswer` | `source-254/src/999999-v14-explorer.js:250` | composes answers to explorer intents from recorded relationships | Graph traversal | DEMONSTRATOR ONLY |
| `Graph / neighbourhood` | `packages/relationship-engine/src/index.ts:19` | typed multigraph; BFS neighbourhood to a depth in both directions with inverse labels; caller-supplied visibility predicate | Graph traversal | PORTED TO STARTER |
| `impact` | `packages/relationship-engine/src/index.ts:58` | forward BFS over FEEDS / CONNECTS_TO / PLANS_DEVICE / HAS_DEVICE | Graph traversal | PORTED TO STARTER |
| `path` | `packages/relationship-engine/src/index.ts:71` | shortest undirected path (BFS) or null | Graph traversal | PORTED TO STARTER |
| `graph (API)` | `services/enterprise-api/src/domain/read.ts:75` | loads app.relationship rows under RLS, hides rooms (and their assets/issues) outside the caller's site scope, runs neighbourhood + impact | Graph traversal | STARTER ONLY |
| `relate (API)` | `services/enterprise-api/src/domain/rooms.ts:144` | writes a relationship fact with provenance in the same transaction as the change | SQL queries | STARTER ONLY |

### Commissioning Intelligence Engine (25)

| Function | Location | What it decides | Mechanism | Status |
|---|---|---|---|---|
| `v25RoomClassifyCompute` | `source-254/src/v25-60-room.js:279` | room archetype, size, complexity tier from area, occupancy, intended-use keywords and equipment (labelled "rule-based classifier") | Deterministic rules | PORTED TO STARTER |
| `classifyRoom / recommendArch / deviceFamily` | `packages/commissioning-engine/src/classify.ts:44` | TypeScript port of the classifier (same constants) | Deterministic rules | PORTED TO STARTER |
| `v25RoomChecks / v25RoomIssues` | `source-254/src/v25-60-room.js:338` | design deficiencies (missing equipment, unresolved connection, incompatible components, placement) with stable correlation keys | Deterministic rules | PORTED TO STARTER |
| `designChecks` | `packages/commissioning-engine/src/checks.ts:12` | port of the design checks; connectivity is breadth-first search over proposed connections | Deterministic rules | PORTED TO STARTER |
| `v25RoomAutoConnect / proposeConnections` | `source-254/src/v25-60-room.js:220` | proposes connections between planned devices by category rules | Deterministic rules | PORTED TO STARTER |
| `v25RequiredTests / requiredTests` | `source-254/src/v25-05-design.js:151` | required test ids from rule pack: base + project type + room type + device families + risk (+ design_conformance, + RT60 for townhall) | Deterministic rules | PORTED TO STARTER |
| `v25CxApplies / packApplies` | `source-254/src/v25-096-cxuni.js:131` | a discipline-pack test applies when every named dimension (type, room, family, tier, risk) matches | Deterministic rules | PORTED TO STARTER |
| `v25RoomApplicabilityCompute / computeApplicability` | `source-254/src/v25-60-room.js:385` | per-test status: NOT_APPLICABLE / PENDING_INFORMATION / BLOCKED_BY_PREREQUISITE / REQUIRES_PHYSICAL_EXECUTION; never a pass | Deterministic rules | PORTED TO STARTER |
| `knownFacts` | `packages/commissioning-engine/src/applicability.ts:71` | facts a design can supply; PHOTO_INFERRED dimensions do not count | Deterministic rules | PORTED TO STARTER |
| `v25RiskOf` | `source-254/src/v25-09-commissioning.js:51` | project risk (network_change or TWN or mission-critical new install → high) | Deterministic rules | DEMONSTRATOR ONLY |
| `v25CompilePlan / v25OnDesignChange` | `source-254/src/v25-09-commissioning.js:53` | compiles a commissioning plan pinned to a rule version; recompiles on design change | Deterministic rules | DEMONSTRATOR ONLY |
| `v25CxExtendPlan / v25CxStatus` | `source-254/src/v25-096-cxuni.js:136` | universal plan extension and per-test status (BLOCKED with reasons, owners) | Deterministic rules | DEMONSTRATOR ONLY |
| `v25RoomRecord / recordBlockers` | `source-254/src/v25-60-room.js:510` | a result needs COMMISSIONING, an applicable test, the responsible persona (or cxeng/architect), an accepted evidence kind, a reference, and an instrument when instrument-measured | Deterministic rules | PORTED TO STARTER |
| `v25RoomVerify / verifyBlockers` | `source-254/src/v25-60-room.js:527` | only a recorded PASS, never by the recorder, never twice | Deterministic rules | PORTED TO STARTER |
| `v25RoomResultLabel / resultLabel` | `source-254/src/v25-60-room.js:500` | PASS → PASS_UNVERIFIED until verified → PASS_VERIFIED (no bare PASS) | Deterministic rules | PORTED TO STARTER |
| `v25RoomResultCounts / resultCounts` | `source-254/src/v25-60-room.js:502` | counts of applicable tests by result label | Deterministic rules | PORTED TO STARTER |
| `v25RoomLifecycle / lifecycleBlockers` | `source-254/src/v25-60-room.js:452` | governed one-step lifecycle with authority per target state and blockers | Deterministic rules | PORTED TO STARTER |
| `v25RoomCxIssue / openCxDeficiency` | `source-254/src/v25-60-room.js:533` | a FAIL opens one installation/commissioning deficiency per test; only a verified retest resolves it | Deterministic rules | PORTED TO STARTER |
| `v25CxContradictions` | `source-254/src/v25-096-cxuni.js:225` | contradiction rules C2 (one evidence ref proves tests in >1 domain), C5 (PASS older than deficiency), C6, C7 (dBFS claimed as SPL), C10 (conformance vs register) ... | Deterministic rules | DEMONSTRATOR ONLY |
| `v25CxIntelligence / v25CxProposals` | `source-254/src/v25-096-cxuni.js:241` | "intelligence" panel = blockers + contradictions + compatibility flags + rule-named proposals; no model | Deterministic rules | DEMONSTRATOR ONLY |
| `v25CxWorkbook / v25RoomWorkbook` | `source-254/src/v25-096-cxuni.js:265` | commissioning workbook rows (XLSX writer in v25-62-xlsx.js) | Deterministic rules | DEMONSTRATOR ONLY |
| `comTestOutcome / comSameCause / comEstate` | `source-254/src/55-derive-com.js:67` | v0.6 commissioning record: outcome per test; deficiencies sharing a check family and zone grouped as same cause | Deterministic rules | DEMONSTRATOR ONLY |
| `fingerprint / sealCheck / trailCheck` | `source-254/src/5968-derive-com13.js:17` | FNV-style 64-bit fingerprint of canonical JSON; seal and audit-trail consistency checks | Traditional algorithms | DEMONSTRATOR ONLY |
| `analyzeRoom` | `packages/commissioning-engine/src/index.ts:39` | classify → checks → applicability → counts (port of v25RoomAnalyze order) | Deterministic rules | PORTED TO STARTER |
| `recordResult / verifyResult (API)` | `services/enterprise-api/src/domain/commissioning.ts:57` | server-side enforcement of the rules above, plus DB triggers EM002/EM003 and CHECK verification_is_independent | Deterministic rules | STARTER ONLY |

### Assurance / APEX Engine (21)

| Function | Location | What it decides | Mechanism | Status |
|---|---|---|---|---|
| `layoutDiff` | `source-254/src/57-derive-assure.js:17` | objects moved (>0.12 m or >3°), added, removed between commissioned and current layouts; seats counted; presets moved (>1.5°) | Traditional algorithms | DEMONSTRATOR ONLY |
| `assuranceOf` | `source-254/src/57-derive-assure.js:29` | 17 assurance dimensions × designed/commissioned/current/proposed with status match/drift/fail/na/unknown and drift type | Deterministic rules | DEMONSTRATOR ONLY |
| `remedyOf` | `source-254/src/57-derive-assure.js:130` | heaviest remedy: redesign > replace > minor > recommission | Deterministic rules | DEMONSTRATOR ONLY |
| `assuranceEstate` | `source-254/src/57-derive-assure.js:146` | every room with a baseline, with findings and cost to put right | Deterministic rules | DEMONSTRATOR ONLY |
| `discoveryOf` | `source-254/src/57-derive-assure.js:162` | "discovery agent" result: 16 checks read from the synthetic model; timings derived from a hash of the room id (comment says so) | Simulation | DEMONSTRATOR ONLY |
| `driftCompare` | `source-254/src/57-derive-assure.js:189` | technical values that differ between commissioned and current state, with recommendation | Deterministic rules | DEMONSTRATOR ONLY |
| `readyCheckOf` | `source-254/src/57-derive-assure.js:212` | room ready check: 11 checks → READY / READY WITH NOTE / ATTENTION REQUIRED | Deterministic rules | DEMONSTRATOR ONLY |
| `validationPlanOf` | `source-254/src/57-derive-assure.js:239` | which checks to run in which rooms for a planned change, order, rollback | Deterministic rules | DEMONSTRATOR ONLY |
| `regressionOf` | `source-254/src/57-derive-assure.js:257` | regression outcome per room from hash(change id\|room id) % 100: <5 Fail, <14 Degraded, else Pass (synthetic) | Simulation | DEMONSTRATOR ONLY |
| `recomRun` | `source-254/src/57-derive-assure.js:295` | recommissioning run phases and exceptions from assurance rows | Simulation | DEMONSTRATOR ONLY |
| `assuranceTrend` | `source-254/src/57-derive-assure.js:308` | counts of assurance runs per week over the last four weeks | Statistical analysis | DEMONSTRATOR ONLY |
| `v25BaselineSnapshot / v25BaselineCompare` | `source-254/src/v25-093-assure.js:12` | golden baseline only from released design + verified Tier 1–3 results + accepted evidence; NOT_MEASURED items named; version compare | Deterministic rules | DEMONSTRATOR ONLY |
| `v25AssureRoom / v25DriftToIncident` | `source-254/src/v25-093-assure.js:35` | per-dimension state from recorded checks; drift → incident (deduplicated per room+dimension) | Deterministic rules | DEMONSTRATOR ONLY |
| `v25SymptomKey` | `source-254/src/v25-093-assure.js:87` | incident text → symptom key by regular expressions (echo/camera/display/network/generic) | Deterministic rules | DEMONSTRATOR ONLY |
| `v25ApexOpen` | `source-254/src/v25-093-assure.js:57` | APEX case: picks a fixed branch from V25_APEX_BRANCHES by symptom key; hypotheses are the branch's predefined list with citations; labelled "synthetic branch simulation" | Deterministic rules | DEMONSTRATOR ONLY |
| `v25ApexReview / v25ApexAct` | `source-254/src/v25-093-assure.js:65` | engineer review; action tiers A0–A2 read-only, A3 draft needing approval, A4 simulated, A5 human-led only | Deterministic rules | DEMONSTRATOR ONLY |
| `v25IncidentDedupe` | `source-254/src/v25-093-assure.js:88` | groups open incidents of a room by dimension or symptom key | Deterministic rules | DEMONSTRATOR ONLY |
| `v25RoomApex` | `source-254/src/v25-60-room.js:564` | room-issue hypotheses from shared assets between related issues | Deterministic rules | DEMONSTRATOR ONLY |
| `csBaselineSet / csDrift` | `source-254/src/v25-40-cs-engine.js:421` | Control Studio deployed-design drift against a recorded baseline hash | Deterministic rules | DEMONSTRATOR ONLY |
| `telIndicators / telHealth / telConflicts` | `source-254/src/9995-v14-telemetry.js:146` | seven independent indicators per room from decoded (simulated) telemetry; conflicting fresh values flagged | Deterministic rules | DEMONSTRATOR ONLY |
| `assess`, `layoutDiff`, `worse`, remedy precedence | `packages/assurance-engine/src/assess.ts`, `layout.ts` | baseline vs current across 17 dimensions; gap vs drift; remedy | Deterministic rules | PORTED TO STARTER |

### Field Intelligence Engine (10)

| Function | Location | What it decides | Mechanism | Status |
|---|---|---|---|---|
| `v25Fi13Plan / v25Fi13Export` | `source-254/src/v25-08-fi.js:16` | composes the PLAN_ONLY plan shape of the shipped v1.3 collector script from room devices; nothing runs | Deterministic rules | DEMONSTRATOR ONLY |
| `v25FiEligibility / v25FiPreflight` | `source-254/src/v25-08-fi.js:79` | v1.4 physical-validation gates: licence, entitlement, adapter tier, calibration, consent, safety limits | Deterministic rules | DEMONSTRATOR ONLY |
| `v25FiDryRun / v25FiRun / v25FiEstop` | `source-254/src/v25-08-fi.js:101` | session state machine with dry run, bounded simulated run with failure branches and e-stop | Simulation | DEMONSTRATOR ONLY |
| `v25FiSubmitEvidence / v25FiReview` | `source-254/src/v25-08-fi.js:29` | external instrument file → SUBMITTED_PENDING_INDEPENDENT_REVIEW; dBFS ≠ dB SPL | Deterministic rules | DEMONSTRATOR ONLY |
| `v14Collector / v14Match` | `source-254/src/999-v14-identity.js:8` | asset identity matcher: serial/OEM id (strong) → topology → room inventory → weak hints that never merge; fixed confidence constants 0.97/0.95/0.82/0.74/0.4/0.2 | Deterministic rules | DEMONSTRATOR ONLY |
| `telIngest / telReprocess` | `source-254/src/9995-v14-telemetry.js:78` | versioned decoders → canonical observations with raw hash, freshness, unit; replay supersedes, never overwrites (simulated payloads) | Traditional algorithms | DEMONSTRATOR ONLY |
| `diagPlan / diagJudge / diagRun` | `source-254/src/99993-v14-diag.js:55` | allow-listed read-only remote test templates; a claim limited to the evidence received | Deterministic rules | DEMONSTRATOR ONLY |
| `rbPlan / rbSafety / rbSimulate` | `source-254/src/99995-v14-robot.js:25` | robot-assisted measurement plan with hard interlocks; simulator labelled SYNTHETIC; virtual values never reach sign-off | Simulation | DEMONSTRATOR ONLY |
| `cmFov / cmCoverage / cmSweepPlan` | `source-254/src/99997-v14-camera.js:23` | camera field of view from sensor geometry, angular coverage, safe PTZ sweep planner; no scale → dimensions UNMEASURED | Traditional algorithms | DEMONSTRATOR ONLY |
| `agentRunOf / agentCoverageOf` | `source-254/src/8999989-ui-agent.js:60` | Room Health Check runs simulated from Core device states and seeded conditions (pilot vs tuned rules) | Simulation | DEMONSTRATOR ONLY |

### Harmony Engine (9)

| Function | Location | What it decides | Mechanism | Status |
|---|---|---|---|---|
| `csCommand (ownership guard)` | `source-254/src/v25-40-cs-engine.js:242` | command guard: authorization → profile → ownership (Harmony) → room state → rate/duplicate → dispatch; refuses when another platform owns the control class | Deterministic rules | DEMONSTRATOR ONLY |
| `csOwnership` | `source-254/src/v25-40-cs-engine.js:431` | records which (simulated) platform owns a control class in a room | Deterministic rules | DEMONSTRATOR ONLY |
| `itsmPoll` | `source-254/src/9998-v14-itsm.js:56` | read-only incremental poll of a mock ITSM: watermark, cursor pagination, sys_id idempotency, ACL refusal, failure → coverage UNKNOWN | Traditional algorithms | DEMONSTRATOR ONLY |
| `itsmCorrelate` | `source-254/src/9998-v14-itsm.js:47` | CMDB record → canonical asset via v14Match; location disagreement kept as CONFLICT, never merged; other tenant REFUSED | Deterministic rules | DEMONSTRATOR ONLY |
| `schTick / schBackoffMs` | `source-254/src/3999-v14-schedule.js:44` | job scheduler: leases, retries with exponential backoff (30 s·2^(n−1), cap 15 min, +≤30 % jitter), breaker per source (open after 3 failures, half-open after 10 min), tenant quota 50 per 900 s | Traditional algorithms | DEMONSTRATOR ONLY |
| `v25LiteToFi / v25FiToLite / v25LiteReconcile` | `source-254/src/v25-07-lite.js:68` | two-way Lite ↔ Field Intelligence sync contract with explicit reconciliation | Deterministic rules | DEMONSTRATOR ONLY |
| `integDepthOf` | `source-254/src/5969-derive-integ13.js:44` | integration depth ladder (Defined/Modeled/Exercised/Round trip/Live) computed from record counts; Live is never reached | Deterministic rules | DEMONSTRATOR ONLY |
| `OutboxWorker` | `services/enterprise-api/src/worker/outbox.ts:46` | transactional outbox delivery: FOR UPDATE SKIP LOCKED, backoff min(2^attempts, 600) s, DEAD_LETTER after 8 attempts | Traditional algorithms | STARTER ONLY |
| `integrations / probeIntegration (API)` | `services/enterprise-api/src/domain/platform.ts:54` | catalogue with honest states; MOCK answers locally, everything else NOT_CONFIGURED; no network call | Deterministic rules | STARTER ONLY |

### Drawing Intelligence Engine (8)

| Function | Location | What it decides | Mechanism | Status |
|---|---|---|---|---|
| `v25Extract` | `source-254/src/v25-05-design.js:90` | "synthetic-extractor 0.1": proposals generated from a seeded hash RNG over file names with fixed confidence values (0.86−rnd/100, 0.71, 0.9, 0.88, 0.74); conflicts beyond 0.15 m tolerance open an RFI | Simulation | DEMONSTRATOR ONLY |
| `v25ReviewProposal / v25ResolveRfi` | `source-254/src/v25-05-design.js:115` | engineer accepts/rejects extracted proposals (accepted = engineer-approved target, never a measurement) | Deterministic rules | DEMONSTRATOR ONLY |
| `v25Compare` | `source-254/src/v25-05-design.js:75` | design revision comparison | Traditional algorithms | DEMONSTRATOR ONLY |
| `v25RoomCompare / revisions (API)` | `source-254/src/v25-60-room.js:323` | room revision diff: geometry, devices added/removed/moved/swapped, connections | Traditional algorithms | PORTED TO STARTER |
| `v25RoomDrawingStates / drawingInput` | `source-254/src/v25-60-room.js:433` | drawing state DRAFT/GENERATED/REVIEW_REQUIRED/APPROVED by comparing a hash of the drawing's input | Traditional algorithms | PORTED TO STARTER |
| `v25RoomDrawingFindings` | `source-254/src/v25-60-room.js:434` | an APPROVED schedule/placement drawing whose input changed → Medium drawing_schedule_disagreement deficiency | Deterministic rules | PORTED TO STARTER |
| `v25RoomGenerate / generateDrawings` | `source-254/src/v25-60-room.js:435` | records a GENERATED DIAGRAM per kind with its input hash (not a stamped drawing) | Deterministic rules | PORTED TO STARTER |
| `geoValidate / geoDiff / geoApprove` | `source-254/src/39991-v14-geometry.js:25` | versioned canonical geometry: validation, diff, engineering approval, invalidation of dependants | Deterministic rules | DEMONSTRATOR ONLY |

### Scouter (9)

| Function | Location | What it decides | Mechanism | Status |
|---|---|---|---|---|
| `scoutRank` | `source-254/src/59-derive-eng-cost.js:41` | ranks catalogue entries of a category: weighted mean of 15 dimension scores (SCOUT_WEIGHTS, 26-static-eng.js:80) with criticality/management/budget weight multipliers; spatial fit from the Lite engine; hard eligibility (state, condition, size, pilot not in mission-critical) | Traditional algorithms | DEMONSTRATOR ONLY |
| `evidenceScore` | `source-254/src/59-derive-eng-cost.js:16` | installed-history score clamp(96 − 90·perUnitIssues − 60·notOnline/units − (units<3 ? 12 : 0), 20, 96); capped at 40 when all units are in the room judged | Deterministic rules | DEMONSTRATOR ONLY |
| `conditionMet` | `source-254/src/59-derive-eng-cost.js:24` | whether a CONDITIONAL candidate's condition holds for a room | Deterministic rules | DEMONSTRATOR ONLY |
| `sourceOf` | `source-254/src/5967-derive-scout13.js:14` | data-freshness record; "days since verified" derived from a hash of the candidate id within SCOUT_VERIFY_DAYS ranges (synthetic) | Simulation | DEMONSTRATOR ONLY |
| `compatOf` | `source-254/src/5967-derive-scout13.js:26` | compatibility records between candidates that must work together | Deterministic rules | DEMONSTRATOR ONLY |
| `marketImpact` | `source-254/src/59-derive-eng-cost.js:84` | what a market-watch event means for the estate | Deterministic rules | DEMONSTRATOR ONLY |
| `costScope / budgetOptionsFor / initialRom / romCompare` | `source-254/src/59-derive-eng-cost.js:106` | rough-order-of-magnitude cost from catalogue ranges (synthetic) | Deterministic rules | DEMONSTRATOR ONLY |
| `portfolioPlan / planYears` | `source-254/src/59-derive-eng-cost.js:256` | multi-year budget plan from remedies and lifecycle | Deterministic rules | DEMONSTRATOR ONLY |
| `v25ScoutCohort / v25ScoutStale / v25ScoutAdopt` | `source-254/src/v25-06-scouter.js:10` | cohort of comparable rooms (role-visible), proposals, staleness | Deterministic rules | DEMONSTRATOR ONLY |

### Knowledge Fabric (8)

| Function | Location | What it decides | Mechanism | Status |
|---|---|---|---|---|
| `knowledgeKindOf / knowledgeIndex` | `source-254/src/595-derive-v1.js:6` | classifies records into 13 knowledge kinds and indexes them | Deterministic rules | DEMONSTRATOR ONLY |
| `knowledgeFor` | `source-254/src/595-derive-v1.js:25` | related knowledge for a record by recorded relationships | Graph traversal | DEMONSTRATOR ONLY |
| `contradictionsOf` | `source-254/src/595-derive-v1.js:214` | where reports disagree with checks, or a model with a measurement | Deterministic rules | DEMONSTRATOR ONLY |
| `ledgerOf / ledgerIndex` | `source-254/src/595-derive-v1.js:226` | evidence ledger for a conclusion; "None recorded" when no person signed it | Deterministic rules | DEMONSTRATOR ONLY |
| `replayOf / timeLayersOf / compareOf` | `source-254/src/595-derive-v1.js:57` | Core Replay and Core Compare over recorded history | Traditional algorithms | DEMONSTRATOR ONLY |
| `fabricSnapshot / eventRipple` | `source-254/src/595-derive-v1.js:282` | numbers one event moves, before/after | Deterministic rules | DEMONSTRATOR ONLY |
| `aiRetrieve` | `source-254/src/39991-v14-geometry.js:81` | tenant-scoped keyword retrieval over an index of synthetic documents with lineage; consent-gated | Traditional algorithms | DEMONSTRATOR ONLY |
| `knowledge (API)` | `services/enterprise-api/src/domain/platform.ts:68` | role-filtered keyword scoring (body occurrences + 3 × title hit) over app.knowledge_document under RLS | Traditional algorithms | STARTER ONLY |

### Governed AI Assistant (9)

| Function | Location | What it decides | Mechanism | Status |
|---|---|---|---|---|
| `askEmpathia / askRoom` | `source-254/src/62-ask.js:17` | 11 regex intents → templated answer built from records with citations; header: "There is no language model here and nothing is sent anywhere" | Deterministic rules | DEMONSTRATOR ONLY |
| `aiAllowed` | `source-254/src/39991-v14-geometry.js:79` | task/role/consent gate (AI_ALLOWED_FOR_TASK); refuses cross-tenant training | Deterministic rules | DEMONSTRATOR ONLY |
| `aiExtract` | `source-254/src/39991-v14-geometry.js:83` | regex extraction of width/depth/height with units and quote ("Deterministic here") | Deterministic rules | DEMONSTRATOR ONLY |
| `aiHypothesis` | `source-254/src/39991-v14-geometry.js:87` | scaled/unscaled layout hypothesis on a fixed grid; confidence constant 0.6 (scaled) or 0.2 (unscaled); AI_VERSION.model = "rules-engine 0.8 (no learned model in the standalone file)" | Deterministic rules | DEMONSTRATOR ONLY |
| `aiValidateOutput` | `source-254/src/39991-v14-geometry.js:85` | schema and physical-constraint check on any "AI" output | Deterministic rules | DEMONSTRATOR ONLY |
| `aiEvaluate` | `source-254/src/39991-v14-geometry.js:93` | fixed evaluation set; pass rate per prompt version as a drift monitor | Deterministic rules | DEMONSTRATOR ONLY |
| `optAiRank` | `source-254/src/99999-v14-optimize.js:160` | "AI ranking": sums modelled deltas of ≤3 deterministic candidates; note in code: "rule-based ranking (no model inference)" | Deterministic rules | DEMONSTRATOR ONLY |
| `v25LearnPropose / SmeReview / Approve` | `source-254/src/v25-093-assure.js:91` | Learn case from an incident needs permission, de-identification, a lesson, SME review | Deterministic rules | DEMONSTRATOR ONLY |
| `aiRequest (API)` | `services/enterprise-api/src/domain/platform.ts:79` | logs the request (prompt SHA-256, permitted sources); generation NOT_CONFIGURED (HTTP 501) | Placeholder or conceptual future functionality | STARTER ONLY |

### Lite Spatial Intelligence (23)

| Function | Location | What it decides | Mechanism | Status |
|---|---|---|---|---|
| `genericLayout / layoutOf / finishLayout` | `source-254/src/54-derive-lite.js:54` | deterministic room layout (tables, seats, displays, mics, speakers, cameras) per archetype and state | Traditional algorithms | DEMONSTRATOR ONLY |
| `applyEdits / applyMods / reaimPresets` | `source-254/src/54-derive-lite.js:339` | applies layout edits and re-aims camera presets | Traditional algorithms | DEMONSTRATOR ONLY |
| `rt60Of` | `source-254/src/54-derive-lite.js:390` | Sabine RT60 = 0.161·V/A with surface, seat (0.22) and person (0.42) absorption | Simulation | DEMONSTRATOR ONLY |
| `metricsOf` | `source-254/src/54-derive-lite.js:401` | seat-by-seat capture, reproduction, camera coverage, sight-line rays, acoustics — MODELED | Simulation | DEMONSTRATOR ONLY |
| `optionsOf / routeOf / readinessOf` | `source-254/src/54-derive-lite.js:505` | design options, walking route, room readiness | Traditional algorithms | DEMONSTRATOR ONLY |
| `airAbsorption` | `source-254/src/543-derive-eng13.js:17` | ISO 9613-1 atmospheric absorption | Simulation | DEMONSTRATOR ONLY |
| `acousticsOf / rtCalibrationOf` | `source-254/src/543-derive-eng13.js:40` | octave-band Sabine/Eyring reverberation, room constant, critical distance | Simulation | DEMONSTRATOR ONLY |
| `stiPath` | `source-254/src/543-derive-eng13.js:69` | modelled STI for one talker→receiver path (statistical room model) | Simulation | DEMONSTRATOR ONLY |
| `captureOf / camSpecOf / engineeringOf` | `source-254/src/543-derive-eng13.js:102` | pickup per seat and every engineering calculation with formula and inputs | Simulation | DEMONSTRATOR ONLY |
| `designScoreOf` | `source-254/src/543-derive-eng13.js:207` | weighted mean of dimension scores by use (SCORE_W); used only to trigger Assurance rule DR-70 | Traditional algorithms | DEMONSTRATOR ONLY |
| `criticalFailsOf / designReviewOf` | `source-254/src/543-derive-eng13.js:245` | critical engineering rules (CRITICAL_RULES) and the review they write | Deterministic rules | DEMONSTRATOR ONLY |
| `learnedRulesFor / learnedEditsFor` | `source-254/src/543-derive-eng13.js:384` | groups approved designer edits by archetype and op; averages offsets/positions into "learned" placement and model rules (no model training) | Statistical analysis | DEMONSTRATOR ONLY |
| `lineLoad / zoneCoverage / soundSystemOf` | `source-254/src/547-derive-distaudio.js:37` | distributed-audio line load and loudspeaker zone coverage | Simulation | DEMONSTRATOR ONLY |
| `simulateTracking / camAutoOf` | `source-254/src/548-derive-camauto.js:48` | camera auto-tracking over a scripted walk path (hyst 0.6, dwell 2.0, lost 1.5, step 0.5) | Simulation | DEMONSTRATOR ONLY |
| `hallStateFromSensors / crossRoomPaths / hallChecksOf` | `source-254/src/546-derive-divisible.js:52` | divisible-hall state from partition sensors and cross-room paths | Deterministic rules | DEMONSTRATOR ONLY |
| `v25LitePredict` | `source-254/src/v25-07-lite.js:48` | camera field-of-view seat coverage by angle test, mic and speaker reach — MODELED prediction | Simulation | DEMONSTRATOR ONLY |
| `optEvaluate / optQuick / optHeatmap` | `source-254/src/99999-v14-optimize.js:75` | scenario engine: per-domain figures from the Lite model with inputs, math and uncertainty; ≤3 candidate edits from threshold rules (no search or solver) | Simulation | DEMONSTRATOR ONLY |
| `optCertainty` | `source-254/src/99999-v14-optimize.js:63` | share of measured-or-approved inputs → LOW (<0.34) / MEDIUM (<0.67) / HIGH | Deterministic rules | DEMONSTRATOR ONLY |
| `optLearn` | `source-254/src/99999-v14-optimize.js:200` | tenant calibration factor = measured ÷ predicted, only from an approved scenario with an instrument-measured result | Statistical analysis | DEMONSTRATOR ONLY |
| `csSimulate / csEnumerate` | `source-254/src/v25-40-cs-engine.js:327` | Control Studio: enumerates control paths and runs them on a deterministic virtual-device runtime with injected faults | Simulation | DEMONSTRATOR ONLY |
| `csContrast / csA11y` | `source-254/src/v25-40-cs-engine.js:342` | WCAG contrast ratio and touch-panel accessibility checks | Traditional algorithms | DEMONSTRATOR ONLY |
| `v25RoomPolyCheck / polygonCheck` | `source-254/src/v25-60-room.js:118` | outline validity (closure, self-intersection, area) | Traditional algorithms | PORTED TO STARTER |
| `v25RoomParseLen / parseLength` | `source-254/src/v25-60-room.js:29` | metres / feet / feet-and-inches parsing; nothing substituted for unreadable input | Traditional algorithms | PORTED TO STARTER |

### Analytics Engine (10)

| Function | Location | What it decides | Mechanism | Status |
|---|---|---|---|---|
| `derive (room health)` | `source-254/src/50-derive.js:11` | room health score 100 − severity weights (Critical 32, High 16, Medium 7, Low 3) − 12/offline − 6/degraded − ...; ≥88 Healthy, ≥65 Monitor | Deterministic rules | DEMONSTRATOR ONLY |
| `attentionQueue / decisionQueue` | `source-254/src/50-derive.js:52` | ordered queues weighted by severity and criticality (CRIT_W) | Deterministic rules | DEMONSTRATOR ONLY |
| `deriveOps / issueStats / assetStats` | `source-254/src/52-derive-ops.js:12` | operational aggregates: means, percentages, ages | Statistical analysis | DEMONSTRATOR ONLY |
| `v25Kpi / v25KpiAll` | `source-254/src/v25-094-exec.js:46` | 27 KPI passports with numerator, denominator, coverage, freshness, exclusions, caveats, drill-down | Statistical analysis | DEMONSTRATOR ONLY |
| `v25Conf` | `source-254/src/v25-094-exec.js:10` | KPI confidence level from coverage and age (none/low/…) | Deterministic rules | DEMONSTRATOR ONLY |
| `serviceScore / learnProfile` | `source-254/src/596-derive-learn.js:79` | training-drill scoring from an action log | Deterministic rules | DEMONSTRATOR ONLY |
| `v25HardGates / v25Candidates` | `source-254/src/v25-092-service.js:53` | ServiceHands assignment: hard gates (certs, experience, site, leave, capacity ≥4 h, vendor agreement) then explained additive score (location 25/12, depth ≤30, history ≤15, capacity ≤15, backup 10, QA 5) | Traditional algorithms | DEMONSTRATOR ONLY |
| `coverageModel / serviceStats / escalationOf` | `source-254/src/597-derive-p8.js:77` | service coverage, statistics and escalation path | Deterministic rules | DEMONSTRATOR ONLY |
| `summary (API)` | `services/enterprise-api/src/domain/analytics.ts:12` | SQL KPI summary in tenant and site scope; ratios with definitions; null when no data; operational performance NOT_MONITORED | SQL queries | STARTER ONLY |
| `readModelHandler` | `services/enterprise-api/src/worker/outbox.ts:15` | rebuilds the room read model from canonical tables on each event (idempotent recompute) | SQL queries | STARTER ONLY |

### Platform (cross-cutting) (9)

| Function | Location | What it decides | Mechanism | Status |
|---|---|---|---|---|
| `canPerform / canViewEntity / azPolicy` | `source-254/src/12-authz.js:396` | front-end role policy (demonstration of authorization, not production security) | Deterministic rules | DEMONSTRATOR ONLY |
| `v25Can / v25InScope / v25CanSee` | `source-254/src/v25-02-policy.js:49` | V2.5 persona authority and scope | Deterministic rules | DEMONSTRATOR ONLY |
| `v25ValidateEvent / validateEvent` | `source-254/src/v25-01-core.js:157` | event payload contract check; starter also refuses resultLabel PASS | Deterministic rules | PORTED TO STARTER |
| `v25Transition` | `source-254/src/v25-01-core.js:171` | state machines with guards | Deterministic rules | DEMONSTRATOR ONLY |
| `csSha256` | `source-254/src/v25-40-cs-engine.js:10` | SHA-256 (FIPS 180-4) in JavaScript for design/report hashes | Traditional algorithms | DEMONSTRATOR ONLY |
| `singScore` | `source-254/src/v25-43-sing.js:52` | Collaboro-Sing rehearsal timing self-check score | Deterministic rules | DEMONSTRATOR ONLY |
| `opsAssess / opsSignOff` | `source-254/src/999993-v14-ops.js:44` | operations-ready acceptance criteria; sign-off needs a permitted signatory and "never an AI's thumbs-up" | Deterministic rules | DEMONSTRATOR ONLY |
| `regChecks` | `source-254/src/999997-v14-registry.js:58` | register consistency checks across modules | Deterministic rules | DEMONSTRATOR ONLY |
| `resolvePrincipal / ctx.require (API)` | `services/enterprise-api/src/domain/platform.ts:27` | principal resolved from the database on every request; deny-by-default authority with audited refusals | Deterministic rules | STARTER ONLY |

## Part 2 — The eleven engines

Each engine below has the thirteen items the directive requires, then at most three things a CTO should do first.

### 1. Search Party Relationship Engine

**Status:** PORTED TO STARTER (graph library + API); search and explorer DEMONSTRATOR ONLY

**1 Design explanation.** One canonical graph of typed facts ("Room PLANS_DEVICE PlannedAsset") with provenance on every edge. Search Party answers "what is this, what is it connected to, what breaks if it fails" by traversal over recorded relationships only, filtered by what the caller may see. In the demonstrator the graph lives in memory (10-model.js); in the starter the facts are rows in app.relationship and the traversal is the @empathia/relationship-engine library.

**2 Inputs.** Edges {from{type,id}, rel, to{type,id}, provenance}; a start node; depth (API: 1–4); a visibility predicate supplied by the caller. Search: a free-text query. Explorer: a question parsed by XP_RULES.

**3 Outputs.** neighbourhood → Step[] {node, depth, via{rel,label,from,provenance}}; impact → NodeRef[]; path → Edge[] | null. API GET /v1/graph/:type/:id → {start, depth, nodes, impact}. Search → grouped hits with scores.

**4 Types and schemas.** packages/relationship-engine/src/index.ts:13-14 (NodeRef, Edge), :35 (Step); vocabulary packages/domain-data/data/RELS.json (130 relations, forward/inverse labels) and TYPES.json; table app.relationship in database/migrations/0002_core.sql; OpenAPI docs/api/openapi.json (GET /v1/graph/{type}/{id}).

**5 Implementation location.** PORTED TO STARTER: packages/relationship-engine/src/index.ts:19 (Graph), :37 (neighbourhood), :58 (impact), :71 (path); services/enterprise-api/src/domain/read.ts:75 (graph endpoint), rooms.ts:144 (relate). DEMONSTRATOR ONLY: source-254/src/10-model.js:74-127, 60-search.js:43-165, 999999-v14-explorer.js:317-445.

**6 Algorithms and decision rules.** Breadth-first search in both directions with inverse labels; result cap 500 steps (index.ts:37 limit). impact follows forward edges of FEEDS, CONNECTS_TO, PLANS_DEVICE, HAS_DEVICE only. path = BFS shortest undirected. Visibility: a node the caller cannot see is dropped (never shown as "hidden"); in the API, rooms outside the site scope and the assets/issues that belong to them (PLANS_DEVICE / AFFECTS) are invisible (read.ts:82-87). Demonstrator explorer path: BFS ≤ 4 hops and ≤ 4,000 nodes (999999-v14-explorer.js:357); impact depth ≤ 5 over UPLINKS_TO / POWERED_BY (:433). keywordSearch scores: all tokens must occur; +6 name prefix, +4 word start, +3 substring, +1 otherwise; +14 exact name, +9 prefix, +5 contains; small type bonuses (60-search.js:45-63).

**7 Complexity/performance.** O(V+E) per traversal (stated in index.ts header). The API loads every non-removed relationship row of the tenant per request (read.ts:79) — fine for the seed (109 edges), not for an estate; a production version needs indexed recursive SQL or a bounded adjacency query.

**8 Error handling.** Unknown relation → throws (index.ts:26). API: bad type name or depth outside 1–4 → 400; unseen or isolated start node → 404 (read.ts:76-89).

**9 Security requirements.** Tenant isolation by RLS on app.relationship; site scope applied before traversal; the caller's visibility predicate is applied to every node, so a path never leaks an unseen intermediate node. Tested: tests/security/authz.test.mjs (cross-tenant and site-scoped graph reads → 404).

**10 Test cases.** packages/relationship-engine/test/graph.test.ts — 5/5 PASS (run 2026-10-26). tests/integration/api.test.mjs slice 2 (new asset appears in the room's neighbourhood) — part of 16/16 PASS. tests/security/authz.test.mjs graph cases — part of 44/44 PASS. Demonstrator: tests/search.test.mjs, v14-explorer.mjs — NOT_RUN in this pass.

**11 Limitations.** No relevance ranking beyond fixed keyword bonuses; no semantic search; no graph database (not needed at current scale); explorer intents are a fixed regex list; whole-graph load per API request.

**12 Version history.** Demonstrator explorer XP_VERSION 1.4.1-p192 (999999-v14-explorer.js:13); search "SEARCH PARTY, foundation" (60-search.js:1). Starter library first committed in e946152 (monorepo skeleton) and extended in 03d9410; no version constant in the package.

**13 Extension points.** canSee predicate; rels list for impact; new relation types via RELS.json (validated on add); move traversal into SQL (WITH RECURSIVE) behind the same function signatures.

**What a CTO should do first**

- Replace the per-request full edge load with a bounded recursive SQL query and add an index on (tenant_id, from_type, from_id).
- Port the explorer intents (path, impact, lineage) as API endpoints over the library.
- Decide whether ranked search needs PostgreSQL full-text search before considering anything heavier.

### 2. Commissioning Intelligence Engine

**Status:** PORTED TO STARTER (core rules); universal-framework extras DEMONSTRATOR ONLY

**1 Design explanation.** Decides, for a planned room, what it is (classification), what is wrong with the design (deficiencies), which of the 94 catalogue tests apply and why or why not, and governs how results are recorded and independently verified. "Intelligence" here is explicit rules with a WHY for every decision; there is no model. Nothing passes from a design: the engine never produces a pass, results come only from recorded field evidence.

**2 Inputs.** RoomDesignInput (template, intended use, occupancy, lifecycle, geometry with provenance, devices, connections, approved classification, recorded results) and the Catalog (rule pack, room types, packs, archetypes, required equipment).

**3 Outputs.** RoomAnalysis {engineVersion, classification, archetype, checks: DesignFinding[], applicability {rows with status and why/whyNot, byStatus}, counts}. Server: cx_plan + cx_plan_row records, room_issue records, result labels PASS_VERIFIED / PASS_UNVERIFIED / FAIL / NOT_SUPPORTED / INCONCLUSIVE / NOT_TESTED.

**4 Types and schemas.** packages/domain-types/src/room.ts (RoomDesignInput, ApplicabilityRow, RESULT_LABELS); rule data packages/domain-data/data/V25_DESIGN_rulePack.json, V25_CX_CATALOGUE.json, V25_CX_PACKS.json, V25_ROOM_REQUIRED.json, V25_ROOM_ROLEOK.json, ARCHETYPES.json; SQL database/migrations/0003_commissioning_evidence.sql (cx_plan, cx_plan_row, test_result, verification, current_result view); events packages/event-contracts.

**5 Implementation location.** PORTED TO STARTER: packages/commissioning-engine/src/classify.ts:44, checks.ts:12, applicability.ts:25/52/71/94, results.ts:9-40, recording.ts:15/40, lifecycle.ts:10/34, design.ts:16-110, index.ts:39 (analyzeRoom); server enforcement services/enterprise-api/src/domain/commissioning.ts:57 (recordResult), :104 (verifyResult), rooms.ts:384 (transition). Source of the port: source-254/src/v25-60-room.js:279-564, v25-05-design.js:151, v25-096-cxuni.js:131. DEMONSTRATOR ONLY: v25-096-cxuni.js:136-302 (plan extension, contradictions, proposals, workbook), v25-09-commissioning.js:51-119.

**6 Algorithms and decision rules.** Classifier (classify.ts:44 ← v25-60-room.js:279): capacity density 0.9 m²/person if occupancy ≥ 60 or use matches town|auditor|all-hands|event|lecture, else 2.2; no AV devices + rack + switch → CTL (equipment room); no AV → not a meeting space; people ≥ 100 or area ≥ 250 m² → TWN; size small <15 m², medium <40, large <100, else extra large; complexity critical if TWN or ≥14 devices, advanced ≥8 devices or ≥5 families, standard ≥4 or ≥3 families, else basic; confidence medium only when geometry declared and use stated, else low. Required tests (applicability.ts:25): base ∪ project type ∪ room type ∪ device families ∪ risk, + design_conformance when devices exist, + reverberation_rt60 for townhall. Pack test applies only when every named dimension matches (applicability.ts:52). Status: PENDING_INFORMATION when facts missing (PHOTO_INFERRED dimensions are not facts), BLOCKED_BY_PREREQUISITE before DESIGN_APPROVED, else REQUIRES_PHYSICAL_EXECUTION. Recording (recording.ts:15): room in COMMISSIONING; applicable; persona responsible or cxeng/architect; state ∈ PASS/FAIL/NOT_SUPPORTED/INCONCLUSIVE; evidence kind accepted; reference ≥ 4 chars; instrument named when instrument-measured. Verification (recording.ts:40): only a PASS, different person, once. Lifecycle (lifecycle.ts): one step at a time; DESIGN_APPROVED needs approved classification, no open High/Critical deficiency, a saved revision; ACCEPTED needs every applicable test PASS_VERIFIED and no open issue; OPERATIONAL needs a baseline and live monitoring evidence (never present in the starter). Design checks (checks.ts:12): missing_required_equipment (High), unresolved_connection (High/Medium, BFS over proposed connections), incompatible_components, placement_constraint (Medium), missing_device_role (Low). Demonstrator contradiction rules C2, C5, C6, C7, C10 (v25-096-cxuni.js:225).

**7 Complexity/performance.** Linear in tests × dimensions and devices × connections; analyzeRoom on the 30-asset town hall is well under the API's request time (integration slice steps 37–195 ms including the database).

**8 Error handling.** Pure functions return reasons (string[]) instead of throwing; the API turns reasons into 422 rule_refused (or 403 when the reason is the responsible role). Database backstops: trigger EM002 (result on a room not in COMMISSIONING), EM003 (verifying a non-PASS), CHECK verification_is_independent, append-only EM001.

**9 Security requirements.** Authority checked server-side for every lifecycle step (LIFECYCLE_AUTHORITY) and for record/verify; results and verifications append-only; a recorded PASS cannot be self-verified even by direct SQL. Front-end gating is convenience only.

**10 Test cases.** packages/commissioning-engine: 128/128 PASS (run 2026-10-26), including 92 golden parity cases extracted from the 2.5.4 demonstrator (packages/domain-data/golden/room-engine-golden.json) and design.test.ts. tests/integration/api.test.mjs slices 1–8 (16/16 PASS); tests/security/authz.test.mjs EM002/EM003/independence cases (44/44 PASS); tests/e2e/founder-townhall.e2e.mjs 25/25 on the Founder Edition (Stage 2). Demonstrator v25-cx.test.mjs, v25-cxu.test.mjs — NOT_RUN in this pass.

**11 Limitations.** Rule pack is synthetic-domain knowledge transcribed from the demonstrator, not reviewed against a published commissioning standard by a qualified engineer; thresholds (density, tier counts) are planning assumptions; classification confidence is a two-level label, not a probability. Known defect KD-01 (docs/qa/KNOWN_DEFECTS.md): design approval records the latest saved revision even when the current design has unsaved changes (inherited from 2.5.4).

**12 Version history.** Demonstrator V25_RULE_VERSION 2.5.0+v21aliases (v25-09-commissioning.js:9), V25_CXU_VERSION 2.5.1-uicf (v25-096-cxuni.js:21); 2.5.3 rc3 R3-2 result labels (source commit b8986d1). Starter ENGINE_VERSION 2.5.4-port.1 (packages/commissioning-engine/src/index.ts:26); port in e946152; design module and parity normalization in 03d9410.

**13 Extension points.** Catalog injection (every function takes C = defaultCatalog); new tests and packs as data; new design checks as functions returning DesignFinding with a stable key; new evidence kinds through the catalogue; a Python applicability service is not needed — the TypeScript engine already solves it.

**What a CTO should do first**

- Have a qualified commissioning engineer review the rule pack and thresholds; version the rule pack independently of code.
- Decide KD-01 (refuse design approval with unsaved changes).
- Port the contradiction rules (C2/C5/C7/C10) as server-side checks.

### 3. Assurance / APEX Engine

**Status:** PORTED TO STARTER (core rules) — `packages/assurance-engine` (13/13 tests) and `GET /v1/rooms/:room/assurance`; APEX diagnosis, discovery simulation and estate costing remain DEMONSTRATOR ONLY

**1 Design explanation.** Assurance asks one question: "Is the environment still behaving the way it was designed and commissioned to behave?" (28-static-assure.js:6). It compares four states (designed, commissioned, current, proposed) across seven layers and seventeen dimensions and names nine kinds of drift (28-static-assure.js:1-4). APEX reasons over cited evidence for an incident and proposes tiered actions with explicit uncertainty. Every probe in the demonstrator is a SIMULATED DISCOVERY.

**2 Inputs.** Room, its baseline (VERIFIED_BY), devices and states, assurance checks, measurements, open issues, Lite layouts of the commissioned and current state, recommendations, experience signals, maintenance signals (57-derive-assure.js:29-35). V2.5: released design, verified Tier 1–3 results, approved photos, closed critical deficiencies, support owner (v25-093-assure.js:2-4).

**3 Outputs.** assuranceOf → {room, base, rows[17] {k,label,layer,status,type,designed,commissioned,current,proposed,ev,ids,objs,note,gap,fix}, counts, worst, types, findings, L0, L1, M0, M1, diff}; ready check READY / READY WITH NOTE / ATTENTION REQUIRED; remedy redesign/replace/minor/recommission; APEX Hypothesis records with layers, ranked hypotheses, caveats and negative evidence.

**4 Types and schemas.** Untyped JavaScript objects in the demonstrator; fixed vocabulary 28-static-assure.js:13 (ASSURE_DIMS), STATUS_TEXT 57-derive-assure.js:9; APEX layers/branches v25-093-assure.js:51 (V25_APEX_BRANCHES). Starter: `packages/assurance-engine/src/vocabulary.ts` (Status, Dimension, DriftType, EvidenceClass, Remedy), `assess.ts` (Baseline, Current, Row, Assessment); SQL room.baseline jsonb (0002_core.sql).

**5 Implementation location.** DEMONSTRATOR ONLY: source-254/src/57-derive-assure.js:13-336, 28-static-assure.js, 38-generate-assure.js (synthetic generator pass), v25-093-assure.js:8-93, 9995-v14-telemetry.js:146-183, v25-40-cs-engine.js:420-421. Starter: ACCEPTED_BASELINE written by rooms.ts transition (signed baseline JSON); `packages/assurance-engine/src/assess.ts` (`assess`), `layout.ts` (`layoutDiff`, thresholds 0.12 m / 3° / 1.5°); API `services/enterprise-api/src/domain/assurance.ts`.

**6 Algorithms and decision rules.** layoutDiff (57-derive-assure.js:17): an object moved if displacement > 0.12 m or rotation > 3°; chairs counted not listed; a camera preset moved if aim differs > 1.5°. Status per dimension from device states (Offline → fail, Degraded → drift), assurance-check results and modelled coverage (e.g. camera: seats inside presets lost → drift). remedyOf (:130): purpose drift → redesign; dead device or inspection-recommended maintenance with support ending/repeat → replace; any fail or DEVICE/PERFORMANCE/NETWORK finding → minor; any drift → recommission. Baseline (v25-093-assure.js): built only from verified evidence; instrument-required items without an instrument session are NOT_MEASURED, never a score (V25_ACCEPT_POLICY :6). APEX (:57): symptom key from regexes (echo|hear → echo, camera|video source|no video → camera, blank|display|projector → display, network|drop|disconnect → network, else generic, :87); the branch's predefined hypotheses are attached with citations; action tiers A0–A2 read-only, A3 draft with approval, A4 simulated, A5 human-led (:66-67).

**7 Complexity/performance.** assuranceOf is cached per room and state sequence (ASSURE_CACHE, :30); each call runs two Lite layouts and metrics — the heaviest per-room computation in the demonstrator.

**8 Error handling.** Functions return {ok:false, why[]} for missing records or authority (v25-093-assure.js); a dimension that cannot be assessed is "unknown"/"na", never "match".

**9 Security requirements.** Read-only by design: nothing contacts a device; restore/recommission actions are authority-gated (v25Can lists in v25-093-assure.js:57-91); Learn cases need customer permission and de-identification (:91).

**10 Test cases.** Demonstrator tests/assure-engine.test.mjs, assure-smoke.mjs, v25-assure.test.mjs — NOT_RUN in this pass. Starter: `packages/assurance-engine/test/assurance.test.ts` 13/13 (thresholds, gap vs drift, remedy precedence, unknown-not-match); `tests/integration/api.test.mjs` assurance test (NO_BASELINE; fixture baseline → presence drift, other dimensions unknown).

**11 Limitations.** Discovery, regression outcomes and timings are synthetic: discoveryOf timings come from a hash of the room id (57-derive-assure.js:157-161) and regressionOf outcomes from hash(change|room) % 100 (<5 Fail, <14 Degraded, :257-258). APEX hypotheses are a static table per symptom, not inference. No live telemetry in either codebase.

**12 Version history.** Assurance vocabulary version 0.5 (28-static-assure.js:1); V2.5 Stage 08 baseline/APEX (v25-093-assure.js:1); telemetry TEL_VERSION 0.5.0 (9995-v14-telemetry.js:7).

**13 Extension points.** New dimensions via ASSURE_DIMS; new APEX branches via V25_APEX_BRANCHES; telemetry decoders (versioned) as the source of "current" once a real monitoring feed exists.

**What a CTO should do first**

- Finish packages/assurance-engine against the starter's signed baseline and test it on synthetic drift fixtures.
- Keep every simulated source labelled; replace hash-derived outcomes with real observations only behind a VERIFIED integration.
- Treat APEX as a rules-based triage table until there is labelled incident data.

### 4. Field Intelligence Engine

**Status:** DEMONSTRATOR ONLY (no starter implementation)

**1 Design explanation.** Authorized discovery and optional, safety-gated measurement. v1.3 (default): the plan semantics of the shipped universal-preview collector script — modes, PLAN_ONLY plans, DECLARED/UNKNOWN capabilities, NOT_TESTED pairs, passive 15-minute reachability monitoring. v1.4 (licensed, separately governed): a session state machine with entitlements, adapter tiers, calibration traceability, consent, dry run, bounded simulated run, external instrument file submission and independent review (v25-08-fi.js:1-9). "There is no Scan Now."

**2 Inputs.** Room devices; session inputs (consent, safety limits, calibration records, operator); external instrument files; identity candidates (serial, OEM id, parent device, model, IP, hostname).

**3 Outputs.** Plans, eligibility/preflight verdicts with reasons, simulated run records, evidence in SUBMITTED_PENDING_INDEPENDENT_REVIEW; identity decisions MATCHED / PROVISIONAL / AMBIGUOUS / CONFLICT / REVIEW / NEW with evidence and a confidence constant.

**4 Types and schemas.** V25_FI13 constants including the collector plan schema id empathia.universal-assurance.plan.v1 and config schema empathia.collector.config.v1.1 (v25-08-fi.js:10); no TypeScript types or JSON Schema files exist for these in the starter.

**5 Implementation location.** DEMONSTRATOR ONLY: source-254/src/v25-08-fi.js:12-118, 999-v14-identity.js:8-48, 9995-v14-telemetry.js:72-183, 99993-v14-diag.js:43-109, 99995-v14-robot.js:25-61, 99997-v14-camera.js:23-51, 8999989-ui-agent.js:60-122.

**6 Algorithms and decision rules.** Identity matcher (999-v14-identity.js:8): serial exact on one asset → MATCHED 0.97, on several → CONFLICT 0.3; OEM management id → MATCHED 0.95; USB child under a known parent with one same-model sibling → MATCHED 0.82, several → AMBIGUOUS 0.5; one same model in the named room → PROVISIONAL 0.74, several → AMBIGUOUS 0.45; IP last seen → REVIEW 0.4 (same room) / 0.15; hostname never matches; otherwise NEW 0.2. The confidence values are fixed constants per rule, not calibrated probabilities. Diagnostics claim only what the evidence shows ("enumeration is not function, a mute flag is not intelligibility", 99993-v14-diag.js:4-6). Robot runs: sound halts on occupancy, over-level, lost calibration, missing safety link, disconnect or manual stop; virtual values reach HUMAN_REVIEW, never SIGN_OFF (99995-v14-robot.js:3-7). Camera: without a trusted scale, room dimensions are UNMEASURED (99997-v14-camera.js:5-6).

**7 Complexity/performance.** Small fixtures; linear scans over assets. Not measured.

**8 Error handling.** Every gate returns reasons; failed connector calls leave coverage UNKNOWN (never "incident-free"); a real active session is NOT_CONFIGURED in standalone HTML.

**9 Security requirements.** Consent and licence gates; no network scan, no signal generation, no device actuation in any build; operator e-stop; external evidence needs independent review; tenant boundary on every record.

**10 Test cases.** Demonstrator tests/v25-fi.test.mjs, v14-identity.mjs, v14-telemetry.test.mjs, v14-diag.mjs, v14-robot.mjs, v14-camera.mjs — NOT_RUN in this pass. Starter: NONE.

**11 Limitations.** All telemetry payloads, runs and timings are deterministic SIMULATED fixtures; the real collector script ships unmodified but is not executed by the demonstrator; no adapter is VERIFIED.

**12 Version history.** V14_MATCHER_VERSION 0.4.0, TEL_VERSION 0.5.0, DIAG_VERSION 0.9.0, RB_VERSION 0.10.0, CM_VERSION 0.11.0 (version constants in their files); FI v1.3 script 1.3.0-universal-preview (v25-08-fi.js:10).

**13 Extension points.** Versioned telemetry decoders; diagnostic templates registry; identity matcher rules (versioned); instrument-neutral method interfaces for measurement.

**What a CTO should do first**

- Port the identity matcher to the starter first — every integration depends on it — and replace confidence constants with named evidence levels.
- Define JSON Schemas for the collector plan and observation records.
- Keep active measurement out of scope until there is an authorized test environment and safety approval.

### 5. Harmony Engine

**Status:** DEMONSTRATOR ONLY (ownership guard, ITSM poll, scheduler); outbox delivery STARTER ONLY

**1 Design explanation.** Keeps Empathia a good citizen among other systems: records which external system owns a control class or record, never sends a duplicate command where another platform owns control, ingests read-only with idempotency and watermarks, correlates records to canonical assets without silent merges, and retries with backoff and breakers. In the demonstrator "Harmony ownership" is explicitly "a simulated other platform" (v25-40-cs-engine.js:5).

**2 Inputs.** Ownership records per room and control class; command requests; ITSM mock tables (incidents, changes, configuration items); scheduler jobs; outbox events.

**3 Outputs.** Command dispatch or a refusal naming the owner; ingested records with sys_id idempotency and coverage state; correlation states MATCHED / CONFLICT / AMBIGUOUS / UNMATCHED / REFUSED; delivered or dead-lettered events.

**4 Types and schemas.** Demonstrator: untyped; ITSM_CONFIG (9998-v14-itsm.js). Starter: integration catalogue table app.integration and outbox_event (0004_platform.sql), event contracts packages/event-contracts (101 types, EVENT_SCHEMA_VERSION 1.0.0), integrations/contracts/INTEGRATION_REGISTRY.csv (CONTRACT_ONLY).

**5 Implementation location.** DEMONSTRATOR ONLY: source-254/src/v25-40-cs-engine.js:240-275 and :431, 9998-v14-itsm.js:14-79, 3999-v14-schedule.js:28-66, v25-07-lite.js:68-91, 5969-derive-integ13.js:44. STARTER ONLY: services/enterprise-api/src/worker/outbox.ts:46 (OutboxWorker), domain/platform.ts:54-66 (catalogue, probe).

**6 Algorithms and decision rules.** Command guard order: authorization → profile → ownership → room state → rate/duplicate → dispatch; an owned class is refused "Empathia sent nothing" (v25-40-cs-engine.js:240-256). ITSM: bounded pages above the source's updated-time watermark, idempotent on sys_id, per-record ACL refusal, any token/instance failure leaves coverage UNKNOWN; correlation via the identity matcher, CMDB location disagreeing with Core kept as CONFLICT (never moved or merged), other tenant REFUSED (9998-v14-itsm.js:47-55). Scheduler: backoff min(15 min, 30 s × 2^(attempt−1)) + up to 30 % hash jitter; breaker opens after 3 failures, half-open after 10 min; tenant quota 50 jobs per 900 s; leases 120 s (3999-v14-schedule.js:40-44). Starter outbox: FOR UPDATE SKIP LOCKED batches, backoff min(2^attempts, 600) s, DEAD_LETTER after MAX_ATTEMPTS = 8, admin retry (outbox.ts).

**7 Complexity/performance.** Outbox batch 50 per tick, 500 ms interval by default; SKIP LOCKED allows several workers. Not load-tested (NOT_RUN).

**8 Error handling.** Per-event savepoint: a failing handler rolls back only that event, records last_error and schedules a retry; dead letters are visible at /v1/admin/outbox and can be retried.

**9 Security requirements.** Read-only connectors by default; credentials referenced, never held, in configuration (9998-v14-itsm.js:3-4); worker policies admit only the empathia_worker role (migration 0008); integration probe never makes a network call; catalogued integrations are CONTRACT_ONLY with no partnership implied.

**10 Test cases.** tests/integration/api.test.mjs "outbox" (injected failures → DEAD_LETTER after 8 → admin retry → delivered) — part of 16/16 PASS. Demonstrator tests/v14-itsm.mjs, v14-schedule.test.mjs, v25-cs.test.mjs — NOT_RUN in this pass.

**11 Limitations.** No real external system anywhere; the ownership registry is a demonstrator overlay; the starter has no inbound webhook or polling adapter yet; no Redis (the outbox runs in PostgreSQL).

**12 Version history.** ITSM_VERSION 0.6.0 (9998-v14-itsm.js:9), SCH_VERSION 0.7.0 (3999-v14-schedule.js:7); Control Studio schema empathia.control-studio.design/0.1 (v25-40-cs-engine.js:31). Starter outbox in 03d9410; dead-letter tested in ad4ed25.

**13 Extension points.** Outbox handler list (OutboxWorker constructor); a common adapter interface over integrations/contracts; ownership registry as a table.

**What a CTO should do first**

- Replace a MOCK with the first VERIFIED read-only adapter, passing `integrations/mocks/src/conformance.ts` against the vendor sandbox.
- Port the scheduler's breaker and quota rules.
- Model ownership (which system is authoritative for which record) as data before any write-capable adapter.

### 6. Drawing Intelligence Engine

**Status:** PORTED TO STARTER (drawing states, revision compare, disagreement finding); extraction DEMONSTRATOR ONLY and synthetic

**1 Design explanation.** Generates engineering diagrams from design data, tracks whether each approved drawing still matches its input, compares revisions, and (demonstrator) proposes properties extracted from drawing files for engineer review, opening an RFI when sources disagree. Generated drawings are "GENERATED DIAGRAM — not an engineer-stamped construction drawing" (v25-60-room.js:438).

**2 Inputs.** Room design (geometry, devices, connections); drawing kind; revision numbers to compare; (demonstrator) revision files with what each can be read for.

**3 Outputs.** Drawing records {kind, state DRAFT/GENERATED/REVIEW_REQUIRED/APPROVED, inputHash, revisionNo}; Medium deficiency drawing_schedule_disagreement; revision diff; extraction proposals with confidence and RFIs.

**4 Types and schemas.** packages/commissioning-engine/src/design.ts:101 (DRAWING_KINDS), :110 (drawingInput); SQL app.drawing_revision (0003_commissioning_evidence.sql); OpenAPI generate/approve/compare operations.

**5 Implementation location.** PORTED TO STARTER: design.ts:101-110; services/enterprise-api/src/domain/rooms.ts:62 (drawingStates), :354 (generateDrawings), :369 (approveDrawing); read.ts:40 (revisions compare). Source: source-254/src/v25-60-room.js:431-449, :323. DEMONSTRATOR ONLY: v25-05-design.js:84-134 (extraction, review, RFI), 39991-v14-geometry.js (geometry revisions).

**6 Algorithms and decision rules.** State = hash of the kind-specific input (plan: geometry; schedule/placement: geometry + device id, category, model, x, y, mount, label; summary adds connections) compared with the hash stored at generation/approval; mismatch → REVIEW_REQUIRED; an APPROVED schedule or placement drawing that turns REVIEW_REQUIRED raises a Medium design deficiency. Extraction (demonstrator): proposals are generated by a seeded hash RNG over the file name and project ("synthetic-extractor 0.1 (demonstration)"), with fixed confidence values 0.86 − rnd/100, 0.71, 0.9, 0.88, 0.74; a field whose sources differ by more than 0.15 m opens one RFI listing every source (v25-05-design.js:87-111).

**7 Complexity/performance.** Hashing JSON of the design per drawing kind; linear in devices.

**8 Error handling.** Generation refused for roles without room.design; a fault-injection path reports "Drawing Intelligence is unavailable — no drawing was generated and none is marked current" (v25-60-room.js:436).

**9 Security requirements.** Approval only with room.classify.approve (engineer); drawings are tenant-scoped rows under RLS; extraction proposals never become measurements.

**10 Test cases.** tests/integration/api.test.mjs slice 3 (generate, designer cannot approve, engineer approves, revisions immutable) — part of 16/16 PASS; packages/commissioning-engine design.test.ts. Demonstrator v25-design.test.mjs — NOT_RUN in this pass.

**11 Limitations.** No drawing file parsing exists anywhere: there is no PDF/DWG/IFC reader; extraction is simulated. Generated drawings are records, not rendered CAD output.

**12 Version history.** GEO_VERSION 0.8.0 (39991-v14-geometry.js:8); extraction engine label "synthetic-extractor 0.1" (v25-05-design.js:108). Starter: 03d9410.

**13 Extension points.** DRAWING_KINDS and their input functions; a real extractor would sit behind the same proposal/review/RFI flow with its outputs validated like aiValidateOutput.

**What a CTO should do first**

- Decide whether real drawing ingestion (PDF dimension strings, IFC) is in scope; until then keep extraction labelled synthetic.
- Render generated diagrams (SVG) from the stored input so the record and the picture cannot diverge.
- Fix KD-01 together with drawing approval so approvals always reference a saved revision.

### 7. Scouter

**Status:** DEMONSTRATOR ONLY

**1 Design explanation.** Ranks catalogue equipment for a request in a specific room with explainable scores: spatial fit computed with the Lite engine in that room, fit to what is installed, support, lifecycle, cost and installed-history evidence. The catalogue is synthetic; "no maker is named or implied" (5967-derive-scout13.js:4).

**2 Inputs.** Query {cat, room, edits, seats, depth, displays, presenter, mgmt, crit, budget, construction, action} (59-derive-eng-cost.js:37-40); ScouterCandidate records; estate history; Lite layouts.

**3 Outputs.** {cat, room, base, rows [{c, dims, notes, total, selectable, blocked, flags, estate}], best, weights, query, bits}.

**4 Types and schemas.** Untyped; dimensions SCOUT_DIMS and weights SCOUT_WEIGHTS (26-static-eng.js:70, :80).

**5 Implementation location.** DEMONSTRATOR ONLY: source-254/src/59-derive-eng-cost.js:16-349, 5967-derive-scout13.js:9-41, v25-06-scouter.js:10-50.

**6 Algorithms and decision rules.** Total = Σ weight·score ÷ Σ weight over the dimensions that have a value; base weights ux 1, audio 1.3, video 1.3, spatial 1.6, mgmt 0.9, mon 0.7, net 0.8, sec 0.9, interop 1.1, deploy 0.6, comm 0.6, support 1, life 1, tco 1, evidence 1; support/life/evidence × 1.6 (mission critical) or × 1.3 (high); mgmt and mon × 1.6 when management is asked; tco × 1.4 with a budget. Spatial fit from metricsOf in the room (mic capture %, camera coverage %, sight-line score, speaker radius vs needed radius, DSP channels needed ×1.2); not in the archetype standard × 0.8. evidenceScore = clamp(round(96 − 90·perUnit − 60·notOnline/units − (units < 3 ? 12 : 0)), 20, 96), capped at 40 when every unit is in the room being judged; no installed units → 36 (pilot) / 12 (announced) / 22. Not selectable: state not selectable, condition not met, wrong size, or a PILOT in a mission-critical room. Rows sorted selectable first, then total.

**7 Complexity/performance.** One Lite layout + metrics evaluation per candidate (the dominant cost).

**8 Error handling.** Unknown category falls back to camera (59-derive-eng-cost.js:42); blocked candidates carry a reason string.

**9 Security requirements.** Cohorts filtered by canViewEntity for the role (v25-06-scouter.js:11); supplier data freshness: entries unverified for 365 days are not recommended (STALE_AT, 5967-derive-scout13.js:8).

**10 Test cases.** Demonstrator tests/eng-engine.test.mjs, v25-design.test.mjs (Scouter parts) — NOT_RUN in this pass. Starter: NONE.

**11 Limitations.** Catalogue and supplier records are synthetic; "days since verified" is derived from a hash of the candidate id within SCOUT_VERIFY_DAYS ranges (5967-derive-scout13.js:14-15); weights are hand-set, not fitted to outcomes.

**12 Version history.** Version 0.4 ranking (59-derive-eng-cost.js:1); version 1.3 data freshness and compatibility (5967-derive-scout13.js:1).

**13 Extension points.** SCOUT_WEIGHTS and SCOUT_DIMS; per-category spatial-fit functions; compatibility records.

**What a CTO should do first**

- Port scoutRank as a pure TypeScript module with the 15 weights as versioned data and golden cases from the demonstrator.
- Replace synthetic supplier freshness with real source records before any customer use.
- Keep "spatial fit" labelled MODELED.

### 8. Knowledge Fabric

**Status:** Keyword retrieval STARTER ONLY; knowledge graph, ledger and replay DEMONSTRATOR ONLY

**1 Design explanation.** Permission-aware access to documents and to the knowledge held in records: which records are knowledge (13 kinds), what relates to what, where sources contradict each other, and the evidence ledger behind a conclusion. Retrieval returns sources with citations; nothing is generated.

**2 Inputs.** Records and relationships (demonstrator); app.knowledge_document rows {title, source, version, body, allowed_roles} (starter); query text; caller role.

**3 Outputs.** Ranked documents {id, title, source, version, score, excerpt} and a note when some documents are hidden by permission (starter); related knowledge, contradictions, ledger entries (demonstrator).

**4 Types and schemas.** SQL app.knowledge_document (0004_platform.sql); GET /v1/knowledge in docs/api/openapi.json.

**5 Implementation location.** STARTER ONLY: services/enterprise-api/src/domain/platform.ts:68 (knowledge). DEMONSTRATOR ONLY: source-254/src/595-derive-v1.js:6-306, 39991-v14-geometry.js:81 (aiRetrieve).

**6 Algorithms and decision rules.** Starter: documents filtered to allowed_roles containing "*" or the caller's role; query split on non-word characters, words longer than 2 characters; score = occurrences in body + 3 × (title contains word); zero-score documents dropped when a query is given; top 20. Demonstrator aiRetrieve: any query word contained in title/text/room; tenant filter; personal documents excluded unless consented; lineage on every hit.

**7 Complexity/performance.** Starter loads all tenant documents and scores in memory (fine for 4 seeded documents; needs PostgreSQL full-text or an index at scale).

**8 Error handling.** No documents → empty list; permission-hidden documents reported only as a count-free note.

**9 Security requirements.** RLS on the table plus role filtering before scoring (a hidden document never contributes to a score); tested indirectly via the AI request path.

**10 Test cases.** Starter: no dedicated test of /v1/knowledge (NONE) — gap. Demonstrator tests/v1-engine.test.mjs, v14-geometry.test.mjs (retrieval cases) — NOT_RUN in this pass.

**11 Limitations.** No ingestion pipeline, chunking, metadata extraction, version history or vector index; documents are synthetic seed rows.

**12 Version history.** Demonstrator "Version 1.0" knowledge graph and ledger (595-derive-v1.js:1). Starter: 03d9410.

**13 Extension points.** Swap scoring for PostgreSQL full-text search (tsvector) keeping the role filter first; add document versions and chunk tables; vector index only if semantic search is shown to be needed.

**What a CTO should do first**

- Add an integration test for /v1/knowledge including a role-hidden document.
- Move scoring into SQL full-text search.
- Design ingestion (upload → versioned document → chunks) with provenance before any retrieval-augmented generation.

### 9. Governed AI Assistant

**Status:** NO GENERATIVE MODEL ANYWHERE. Demonstrator: rules-based Ask and consent-gated "AI engine" (rules); starter: governed request logging with generation NOT_CONFIGURED

**1 Design explanation.** The governance shell an assistant must live inside: who may ask what (task × role × consent), what sources are permitted, what an answer must cite, what any output must pass (schema and physical constraints), an evaluation set, logging, rollback and deletion. In both codebases the "intelligence" is deterministic: Ask Empathia states "There is no language model here and nothing is sent anywhere" (62-ask.js:1-2); the geometry "AI engine" reports its model as "rules-engine 0.8 (no learned model in the standalone file)" (39991-v14-geometry.js:74).

**2 Inputs.** Question text; role; tenant consent record; permitted documents; (starter) {purpose, prompt ≤ 4000 characters}.

**3 Outputs.** Demonstrator: templated answers {title, lines[{text, ids}], cites, claim, ev, follow}; hypotheses validated or refused; evaluation runs with pass rate and drift. Starter: HTTP 501 not_configured with the permitted sources as reasons; an app.ai_request row (prompt SHA-256, outcome NOT_CONFIGURED, sources) and an audit event.

**4 Types and schemas.** AI_ALLOWED_FOR_TASK and AI_VERSION (39991-v14-geometry.js:74-75); SQL app.ai_request (0004_platform.sql); POST /v1/ai/requests in docs/api/openapi.json.

**5 Implementation location.** DEMONSTRATOR ONLY: source-254/src/62-ask.js:6-17ff, 39991-v14-geometry.js:74-95, 99999-v14-optimize.js:160, v25-093-assure.js:91-93. STARTER: services/enterprise-api/src/domain/platform.ts:79 (aiRequest).

**6 Algorithms and decision rules.** Ask: 11 intent regular expressions (e.g. "what.*chang.*since.*(commission|handover|baseline)", "budget|next year|how much.*(cost|need|spend)|funding"), room resolution by name/number regex, answers assembled from records with up to 10 citations (62-ask.js). aiAllowed: role must be in the task's roles, consent GRANTED, required consent flags set, cross-tenant training refused. aiHypothesis: dimensions only from extracted evidence with units; scaled → objects on a 4-column grid scaled to the room, confidence 0.6; unscaled → asks for width, depth, ceiling, confidence 0.2; rejected if outside the schema or physically implausible (e.g. 12 seats in 2 m²). optAiRank: "rule-based ranking (no model inference)". Starter aiRequest: permission-aware retrieval of top 3 sources, log, refuse generation.

**7 Complexity/performance.** Trivial (regex and small lookups).

**8 Error handling.** Refusals carry reasons (NOT_AUTHORIZED, consent, tenant boundary); starter returns RFC 9457 problem details with code not_configured.

**9 Security requirements.** Consent-gated, tenant-scoped, role-gated; prompts stored as hashes in the starter; outputs never become measurements or approvals ("never an AI's thumbs-up", 999993-v14-ops.js:6).

**10 Test cases.** Starter: none dedicated to /v1/ai/requests (NONE) — gap. Demonstrator AI_EVAL set (39991-v14-geometry.js:92) and tests/v14-geometry.test.mjs — NOT_RUN in this pass.

**11 Limitations.** No language model, no external inference, no fine-tuning, no embeddings. Confidence numbers (0.6/0.2) are constants. No model has been trained (no dataset, no training code).

**12 Version history.** AI_VERSION {model "rules-engine 0.8 …", prompt geo-hypothesis-v3, evalSet ai-eval-2026-10} (39991-v14-geometry.js:74). Starter: 03d9410.

**13 Extension points.** A model provider behind aiRequest that must (a) use only the retrieved permitted sources, (b) return citations, (c) pass an output validator like aiValidateOutput, (d) be evaluated on a fixed set before rollout; action proposals routed through existing authority checks.

**What a CTO should do first**

- Write the evaluation set and output validator before choosing any model.
- Add tests for /v1/ai/requests (logging, role-filtered sources, 501).
- Keep every assistant action a proposal that a person with the authority approves through the normal API.

### 10. Lite Spatial Intelligence

**Status:** DEMONSTRATOR ONLY (geometry parsing and outline validation PORTED TO STARTER)

**1 Design explanation.** A spatial and engineering model of a room: layouts in four states, seat-by-seat coverage (microphones, loudspeakers, cameras, sight lines), acoustics, and the engineering calculations an AV designer checks. "Everything here is MODELED … for design comparison and for spotting rooms that need a measurement, never for sign-off" (543-derive-eng13.js:1-9). Optimize builds scenarios on top with "Show my math".

**2 Inputs.** Room geometry (w, d, h, outline), surfaces/materials, devices with categories and catalogue properties, seats, layout edits, season (temperature, humidity), occupancy, calibration factor.

**3 Outputs.** Layout {objs, seats, mics, spks, cams, displays, w, d, h}; metrics {capture, repro, video, sight, acoustic, scores}; engineering rows with formula, inputs, result; Optimize domains with value, unit, origin MODELED/MEASURED/NOT_MEASURED, uncertainty, inputs, math, assumptions.

**4 Types and schemas.** Untyped in the demonstrator; starter geometry types in packages/domain-types/src/room.ts and packages/commissioning-engine/src/geometry.ts.

**5 Implementation location.** DEMONSTRATOR ONLY: source-254/src/54-derive-lite.js:10-661, 543-derive-eng13.js:12-406, 545-derive-config.js, 546-derive-divisible.js, 547-derive-distaudio.js, 548-derive-camauto.js, 56-derive-lite-spaces.js, v25-07-lite.js:19-91, 99999-v14-optimize.js:38-206, v25-40-cs-engine.js:317-343. PORTED: packages/commissioning-engine/src/geometry.ts:19 (parseLength), :28 (area), :47 (inside), design.ts:16 (polygonCheck).

**6 Algorithms and decision rules.** rt60Of: Sabine T = 0.161·V/A, A = floor and ceiling absorption + walls (glass, treatment panel, plain wall shares) + 0.22 per seat + 0.42 per person (54-derive-lite.js:390-393). acousticsOf: octave-band Sabine and Eyring with ISO 9613-1 air absorption (543-derive-eng13.js:17-56). stiPath: modelled STI per talker→receiver path; talker Q 1.4, speech 58 dB, noise 35 dB defaults (:69-72). Camera auto-tracking rules hyst 0.6, dwell 2.0, lost 1.5, step 0.5 (548-derive-camauto.js:8). learnedRulesFor: approved designer edits for the same archetype are grouped and averaged into placement/model rules (543-derive-eng13.js:384-395) — aggregation, not machine learning. Optimize certainty: share of measured-or-approved inputs < 0.34 LOW, < 0.67 MEDIUM, else HIGH (99999-v14-optimize.js:63); optQuick proposes ≤ 3 candidate edits by threshold rules (uncovered seats → add ceiling mic; sight < 90 → larger display; RT60 > target + 0.1 → treatment; video < 85 → wide preset). optLearn: calibration factor measured ÷ predicted, only from an approved scenario with an instrument-measured result, same tenant (:200-205).

**7 Complexity/performance.** Per seat × per device (rays for sight lines); cached per room state in callers (ASSURE_CACHE). Not benchmarked.

**8 Error handling.** optEvaluate refuses invalid dimensions; layout errors returned as problems; a domain without input reports NOT_AVAILABLE / NOT_MEASURED rather than a score.

**9 Security requirements.** No device control ("no live DSP control", 99999-v14-optimize.js:5); learning consent-gated and tenant-bounded; projections never called improvements until measured.

**10 Test cases.** Demonstrator tests/lite-engine.test.mjs, v13-engineering.test.mjs (hand-worked values and independent re-implementations), v13-audio.test.mjs, v14-optimize.mjs — NOT_RUN in this pass. Starter: geometry/outline functions covered by the commissioning-engine suite (128/128).

**11 Limitations.** Statistical room acoustics ignore room shape, diffusion and absorber placement (543-derive-eng13.js:8); catalogue figures are synthetic; nothing is a measurement; no 3D engine contract implemented in the starter.

**12 Version history.** Lite version 0.4 (54-derive-lite.js header), engineering model version 1.3 (543-derive-eng13.js:1), OPT_VERSION 1.4.0-p12 (99999-v14-optimize.js:8).

**13 Extension points.** Materials and absorption tables; per-domain evaluators in optEvaluate; calibration ledger; a Python/NumPy service is justified here only if octave-band or ray-based acoustics grow beyond what TypeScript handles comfortably.

**What a CTO should do first**

- Port rt60Of/acousticsOf/stiPath with the demonstrator's hand-worked test values as golden cases.
- Keep MODELED labels end to end in the API.
- Specify the 2D editor and 3D scene contracts before porting layouts.

### 11. Analytics Engine

**Status:** PORTED IN PART: KPI summary STARTER ONLY (SQL); 27 KPI passports and health scoring DEMONSTRATOR ONLY

**1 Design explanation.** Numbers people act on, each with its definition, denominator, coverage and freshness, computed from the canonical records. A figure with no data is null ("—"), never 0; operational performance is NOT_MONITORED until a monitoring feed exists.

**2 Inputs.** Rooms, latest plans and current results, issues and issue events, work orders, planned assets, evidence objects (starter); records, decisions, deliveries, usage (demonstrator KPI passports); caller tenant and site scope.

**3 Outputs.** Starter /v1/reports/summary: rooms by lifecycle; applicable tests by label; coverage, verifiedShare, firstTimeFailRate (each {value, definition}); open and high/critical issues; deficiencies resolved and mean hours to resolve; work orders by state; assets planned / generic share; evidence objects and bytes; operationalPerformance NOT_MONITORED. Demonstrator: 27 KPI passports with numerator, denominator, coverage, freshness, exclusions, caveats, drill-down, confidence.

**4 Types and schemas.** Summary type packages/api-client/src/types.ts; GET /v1/reports/summary in docs/api/openapi.json; read model app.room_read_model (0004_platform.sql) with CHECK live_health = NOT_MONITORED.

**5 Implementation location.** STARTER ONLY: services/enterprise-api/src/domain/analytics.ts:12, worker/outbox.ts:15 (read model). DEMONSTRATOR ONLY: source-254/src/v25-094-exec.js:5-58, 50-derive.js:4-79, 52-derive-ops.js:7-203, 597-derive-p8.js, v25-092-service.js:53-79.

**6 Algorithms and decision rules.** Starter: coverage = tests with any recorded result ÷ applicable tests (latest plan per room); verifiedShare = PASS_VERIFIED ÷ (PASS_VERIFIED + PASS_UNVERIFIED); firstTimeFailRate = current FAIL ÷ recorded; ratios rounded to 3 decimals; null when the denominator is 0. Demonstrator room health: 100 − issue severity weights (Critical 32, High 16, Medium 7, Low 3) − 12 per offline and 6 per degraded device − min(6, 1.5 per off-baseline firmware) − 6 per drift and 14 per failed assurance check − deficiency weights (18/8/4/2) − 4 without a commissioning baseline; ≥ 88 Healthy, ≥ 65 Monitor, else Action required (50-derive.js:4-24). ServiceHands ranking: hard gates first, then additive explained score (based in building 25 / works there 12; experience depth ≤ 30; resolved issues in the room ≤ 15; capacity ≤ 15; backup 10; last QA pass 5) (v25-092-service.js:53-77).

**7 Complexity/performance.** Starter: seven aggregate SQL queries per call over the caller's scoped rooms; indexes exist on tenant/room keys. Not load-tested (NOT_RUN).

**8 Error handling.** Demonstrator v25Kpi catches a failing computation and returns value "unavailable" with the error as a caveat (v25-094-exec.js:46). Starter: database errors → 500 with correlation id.

**9 Security requirements.** RLS for tenant; site scope applied through the scoped room set; aggregate-only privacy for KPI passports with a minimum usage cohort of 5 (V25_USAGE_MIN_COHORT, v25-094-exec.js:4).

**10 Test cases.** tests/integration/api.test.mjs "reporting" (figures match the database; definitions present; NOT_MONITORED; site-scoped technician sees only the South campus) and api-client live-shape test — PASS (16/16, 3/3). Demonstrator tests/v25-exec.test.mjs — NOT_RUN in this pass.

**11 Limitations.** Synthetic seed data only; no time windows or trends in the starter yet; no customer-value measurement; health weights are hand-set.

**12 Version history.** V25_KPI_VERSION 2.5.0 (v25-094-exec.js:4). Starter analytics in 0a6750a.

**13 Extension points.** Each KPI as a passport object {definition, numerator, denominator, coverage, freshness}; port the 27 passports as SQL views with the same fields.

**What a CTO should do first**

- Port the KPI passport structure (window, coverage, freshness, exclusions) into the starter summary.
- Add time-windowed trends from issue_event and audit_event.
- Keep operational KPIs NOT_MONITORED until a VERIFIED monitoring integration exists.

## Test evidence used in this document

| Suite | Result | Run |
|---|---|---|
| packages/commissioning-engine (incl. 92 golden parity cases) | 128/128 PASS | 2026-10-26, this pass |
| packages/relationship-engine | 5/5 PASS | 2026-10-26, this pass |
| packages/event-contracts | 3/3 PASS | 2026-10-26, this pass |
| tests/integration/api.test.mjs | 16/16 PASS | 2026-10-26, program run (not re-run for this document) |
| tests/security/authz.test.mjs | 44/44 PASS | 2026-10-26, program run (not re-run for this document) |
| tests/integration/api-client.test.mjs | 3/3 PASS | 2026-10-26, program run |
| Demonstrator engine tests (source-254/tests/*.test.mjs) | NOT_RUN | not executed for this document; the 2.5.3 rc3 gate record reports 85 of 85 (commit cf86866), which is the release gate, not these engine suites individually |

_This is an engineering reference, not a statement of production readiness, certification or model performance. The demonstrator is a front-end demonstration of authorization, not production security. All data is synthetic._

## Addendum — changes after this inventory was first written (2026-10-26)

* **Assurance / APEX — core rules PORTED TO STARTER.** `packages/assurance-engine` ports the vocabulary (`28-static-assure.js`), `layoutDiff`
  and the assessment and remedy rules (`57-derive-assure.js` 17–136) as pure functions over plain facts; 13/13 unit tests; served by
  `GET /v1/rooms/:room/assurance`. Dimensions without evidence are `unknown`, never `match`. The starter has no monitoring feed, so an
  accepted room is assessed from records only (presence) and everything else is honestly NOT ASSESSED.
* **Harmony — STARTER implementation.** `integrations/contracts` (common adapter interface + `harmony.ts`: source authority, deny-by-default
  writes, dedupe, conflicts, serial/MAC-only canonical matching, full-jitter retries, token bucket, staleness, credential rotation; 7/7
  tests), `integrations/mocks` (three MOCK adapters with fault injection, signed webhooks and a conformance suite; 5/5 tests), and
  `services/enterprise-api/src/integrations/sync.ts` (`POST /v1/integrations/:key/sync`; observations stored as SYNTHETIC_MOCK, enforced by
  database trigger EM004). No VERIFIED adapter exists.
* **ML.** `ml/` holds one research prototype on synthetic data (see `ml/model-cards/first-attempt-fail-risk.md`). It is not used by any
  engine above. PyTorch remains BLOCKED.
