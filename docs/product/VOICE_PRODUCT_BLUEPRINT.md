# Empathia VOICE — product and QA blueprint (second issue, 23 Nov 2026)

Governing text: Enterprise 3.0 directive 1A and the VOICE addendum (founder scope confirmation, 23 Nov 2026).
VOICE is telephony and unified-communications intelligence. It is not narration, a voice assistant or call recording.
Status words: IMPLEMENTED (code in the repository), TESTED (a suite checks it), SIMULATED (synthetic data), SPECIFIED (written, not built).

## What is in the repository today

| Surface | Address / file | Status |
|---|---|---|
| Corporate product page | website `/voice` (`apps/website/src/voice.tsx`); section on `/products#voice`; families on `/products#families` | IMPLEMENTED, TESTED (website suite) |
| Website → demonstrator launch | `MODULE_LAUNCHES.voice` in `packages/ui/src/launches.ts`: opens the CallPath as the UC / Voice Administrator, with the way back to `/voice` | IMPLEMENTED, TESTED (launch-intents, demo-voice VC-15) |
| VOICE overview | demo `#/voice` (`voice/VoicePage.tsx`): scenario, perspectives, adapter register, limits, the other-site room | IMPLEMENTED, TESTED, SIMULATED |
| CallPath Digital Twin | demo `#/voice/callpath/<room>` (`CallPathPage.tsx`): six hops, configured vs observed vs unknown, measurements, experimental estimate, shared uplink, hypothesis, the job | IMPLEMENTED, TESTED, SIMULATED |
| Cases | `?case=missing`, `?case=stale`, `?case=retest`; a room with a configured path and no observation at all (`R-MER-1-140`) | IMPLEMENTED, TESTED |
| Report a calling problem | demo `#/voice/report/<room>` (`ReportPage.tsx`): raises a real ServiceHands incident | IMPLEMENTED, TESTED |
| The job (J6B 5–6) | `voice/job.ts`: reads the ServiceHands incident and work order for the room | IMPLEMENTED, TESTED |
| FLOW | demo `#/flow`, `#/flow/link/<node>` (`flow/model.ts`, `FlowPage.tsx`): claims by layer from the estate's own edges, UNKNOWN where nothing is recorded, dependents by the impact traversal | IMPLEMENTED, TESTED, SIMULATED |
| MissionProof | demo `#/missionproof` (`mission/model.ts`, `MissionPage.tsx`): readiness per dependency read from records, rehearsal log | IMPLEMENTED, TESTED, SIMULATED |
| Platform families | demo `#/families`; `packages/ui/src/families.ts` | IMPLEMENTED, TESTED |
| Room page | "Calling" in the shared room row (`rooms/RoomJumps.tsx`), only for a role that may open the CallPath; the CallPath carries the same row back to the room's other places | IMPLEMENTED, TESTED |
| Device passport | The asset page of the calling endpoint (`#/v25/asset?a=AS-0108`) links to the room's CallPath (`ENDPOINTS`, `callingRoomOf`) | IMPLEMENTED, TESTED |
| Fixture, method, view model | `apps/demo/src/voice/model.ts` | IMPLEMENTED, TESTED (`tests/unit/voice.test.mjs`, 16 tests) |

## J6B-VOICE, step by step

| Step | What the directive asks | Status |
|---|---|---|
| 1 | A user reports degraded audio from the room | IMPLEMENTED: report page → ServiceHands incident, receipt, own reports only |
| 2 | Operator opens the CallPath at the same room id; configured path; missing observation UNKNOWN | IMPLEMENTED |
| 3 | Synthetic loss/jitter with timestamp, source, units, label; transparent method | IMPLEMENTED. Measurements lead; the estimate (QM-G107-S1) is marked experimental |
| 4 | Shared upstream link; explainable hypothesis, not a root cause; open the graph and return with scope kept | IMPLEMENTED: the CallPath opens FLOW at `#/flow/link/SW-ATL-4A` with the room and the case kept, FLOW shows what is configured, observed and unknown on the link by layer and returns to the same CallPath; Search Party opens from both. APEX records the hypothesis on the case (24 Nov): a case opened for the calling problem carries `VH-0001` with VOICE’s statement, citations and unknowns, at the lowest confidence that has evidence, with a read-only action only, and says it is not a root cause; the CallPath names the case (`workspace/store.ts apexRecordHypothesis`; voice.test; VC-26; JW-J6BR) |
| 5 | ServiceHands assigns a site-authorised technician; technician action, labelled evidence, receipt; denial and missing-telemetry scenarios | IMPLEMENTED on the real ServiceHands engine (`workspace/store.ts`): raise → triage → assign → accept → preflight → start → evidence → submit. The CallPath's "The job" panel reads that record (`voice/job.ts`); it stores nothing of its own. Denial: a caller, and a site-scoped role outside its sites, get the access page. Missing telemetry: configured-only path, UNKNOWN, no estimate |
| 6 | Independent review; Assurance state; MissionProof readiness; return links | IMPLEMENTED: the technician cannot verify their own work (engine rule, tested); verification by a second person, then close; the "After the repair" case shows a retest within policy; MissionProof (`#/missionproof`) derives the calling dependency from the job and the retest and moves from AT RISK only after independent verification. An Assurance run writes an operational drift record when calling reads outside the targets, and a later run that reads it within them clears it; an unknown reading and a closed job clear nothing, and the accepted baseline is not changed (24 Nov: `workspace/store.ts assuranceRun`; voice.test; VC-25; JW-J6BR) |

## The fixture (deterministic, on the estate's own ids)

Room `R-ATL-4-218`; endpoint = planned position `A-0102`, asset `AS-0108`; access switch `SW-ATL-4A`; core `SW-ATL-CORE`; shared-uplink rooms
`R-ATL-4-218`, `R-ATL-4-220`, `R-ATL-4-231` (recomputed from the estate's FEEDS and PLANS_DEVICE edges by the unit suite).
VOICE-owned records: call flow `CFR-ATL-4-218-r3`, `SBC-NORTH-1`, provider connection `UCP-A` (fictional), calling policy
`CP-NORTH-VOICE`, session token `CS-7f3a…e21`, six ten-second samples, hypothesis `VH-0001`. Fixture clock 2026-11-23 15:20 UTC.
Second site for refusal tests: room `R-MER-1-140` (position `PA-0012`, asset `AS-1608`), outside the voice site scope `ATL`, `NST`.
Cases: `degraded`, `healthy`, `missing`, `stale`, and `retest` ("After the repair", within policy). MissionProof fixture: mission
`MP-TOWNHALL-01`, host room `R-NST-2-101`.

## Quality method QM-G107-S1 (status: EXPERIMENTAL, engineering review; founder decision E3-D3)

ITU-T G.107 E-model, reduced form: R = 93.2 − Id − Ie,eff; Id = 0.024·d + 0.11·(d − 177.3)·H(d − 177.3) (Cole and Rosenbluth's
reduced delay term); Ie,eff = Ie + (95 − Ie)·Ppl/(Ppl/BurstR + Bpl), BurstR = 1; MOS = 1 + 0.035R + R(R − 60)(100 − R)·7·10⁻⁶,
clamped to 1.0–4.5. Constants in the table: G.711 (Ie 0, Bpl 4.3), G.711 with PLC (Ie 0, Bpl 25.1). Assumed: 40 ms jitter buffer,
20 ms packetisation. The method **refuses** on a missing input, an out-of-range value, a codec not in the table, a stale sample or a
state that is not an observation. An estimate keeps the evidence state of its inputs. **Before any use outside the demonstration an
engineer must check the constants and the delay term against the current ITU-T G.107 and G.113 texts.** Until then the estimate is
shown as experimental, after the measurements, and is never described as validated (E3-D3).
Targets (loss ≤ 1 %, jitter ≤ 30 ms, one-way delay ≤ 150 ms) are the synthetic tenant's declared calling policy, not Empathia's.

## Perspectives (demonstration only; grants nothing real)

| View | Demonstration roles | Reads |
|---|---|---|
| Administration | Product Architect, **UC / Voice Administrator** (E3-D2) | Path, measurements, session token, signalling-side detail (directory assignment, trunk) |
| Operations | AV Operations Lead, Systems Engineer, Service Technician, Service Manager | Path and measurements; no session token, directory assignment or trunk id |
| Summary | Executive | Overview and a non-identifying summary; cannot open a CallPath |
| None | Everyone else | May report (V2.5.3 `issue.report`) and see their own reports; the CallPath shows the access page and its code is not downloaded |

UC / Voice Administrator is least-privilege: its home, VOICE, FLOW, MissionProof, Campus, the room page and Search (granted
areas: home, search, graph, campus, room; no commissioning, control or scheduling area). Site scope: UC / Voice Administrator, Service Technician and Service
Manager are refused a CallPath for a room outside sites `ATL` and `NST` (`#/voice/callpath/R-MER-1-140` shows the access page);
the refusal is decided in the page registry (`authorityFor`), before the page's code is loaded.

## Data model, API and adapters

Owned records to specify (none duplicated from Core): CallIdentity, TelephonyEndpoint, DirectoryNumberAssignment, CallingPolicy,
CallFlowRevision, Trunk, SBC, UCProviderConnection, CallSessionObservation, MediaQualitySample, QualityMethod, VoiceIncident,
SyntheticCallTestAuthorization, E911ConfigurationAuditFinding. The fixture already uses the shapes of CallFlowRevision, SBC,
UCProviderConnection, CallSessionObservation, MediaQualitySample, QualityMethod and CallingPolicy.
`docs/api/VOICE_API_AND_SDK_CONTRACTS.md` and the `/v1/voice/*` OpenAPI paths: NOT WRITTEN YET (Day 5).
Adapter register (in the product, `ADAPTERS`): one MOCK; Teams Phone, Zoom Phone, Cisco, RingCentral, SBCs and QoS sources are
CONTRACT_ONLY. Nothing is connected and no partnership is claimed.

## Acceptance tests and where they stand

| Addendum proof requirement | Test | Status |
|---|---|---|
| Positive voice admin view | demo-voice VC-01..03; voice.test "least privilege" | PASS |
| Denied access (caller) | demo-voice VC-10, VC-11; voice.test "access" | PASS |
| Denied cross-site access | demo-voice VC-17 (three site-scoped roles), VC-18 (tenant-wide role sees configured only); voice.test "site scope" | PASS |
| General AV / Systems Engineer / technician do not read signalling detail | demo-voice VC-09 per role; voice.test "access" | PASS |
| Missing upstream data | VC-05; voice.test "missing…" | PASS |
| Stale sample | VC-07; voice.test | PASS |
| Impossible MOS | voice.test "quality method" | PASS |
| Experimental labelling of the estimate; measurements lead | VC-02; voice.test "after the repair" | PASS |
| Report becomes a real job; its four steps read from ServiceHands | VC-11, VC-12 | PASS |
| Technician cannot verify own work; closure only after verification | voice.test "J6B steps 5 and 6" (real service engine) | PASS |
| MissionProof readiness follows the record, not a click | voice.test "J6B steps 5 and 6"; demo-voice VC-19, VC-20 | PASS |
| MissionProof reads the evidence on record, not the address: opened without a case it reads the session Assurance and APEX read; the "after the repair" case in the address makes neither calling nor the uplink ready where no verified repair is on record (the uplink used to read READY) | voice.test "readiness follows the records"; demo-voice VC-19 (expectation changed, reason in the file), VC-28 | PASS; the new unit test fails on the rules before 24 Nov |
| A verified repair is not readiness: calling stays unknown while an Assurance drift record is open, and is ready only after the retest that clears it; a retest that still finds it outside keeps the record; a reopened job or a new report returns the record to the degraded call and a new run writes a new drift record, keeping the cleared one | voice.test "readiness follows the records", "a new calling report after a verified repair is the record"; demo-journeys JW-J6BR (29 hops) | PASS |
| FLOW keeps the VOICE case and returns | demo-voice VC-16; voice.test "FLOW (J6A)" | PASS |
| VOICE on the shared room page | demo-voice VC-21 | PASS |
| Phone layout (390 px) without sideways scrolling | demo-voice VC-04, and every check repeated on a phone | PASS |
| Redacted search autocomplete and exports | — | NOT WRITTEN |
| Out-of-order events, double service closure | — | NOT WRITTEN |
| No real emergency dialing | voice.test "privacy" (no emergency number in the fixture; VOICE places no call at all) | PASS |
| Correctly scoped ACCORD export | — | NOT WRITTEN (ACCORD not built) |

Run: `node --test tests/unit/voice.test.mjs` and, after `node scripts/build.mjs`, `node tests/browser/demo-voice.test.mjs`.
Day 2: voice 15/15; demo-voice 50/50 (desktop and phone). The exact-commit regression result is in
`docs/operations/CLAUDE_FABLE_7_DAY_EXECUTION_BOARD.md`.
