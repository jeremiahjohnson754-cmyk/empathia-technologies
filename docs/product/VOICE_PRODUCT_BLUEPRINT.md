# Empathia VOICE — product and QA blueprint (first issue, 23 Nov 2026)

Governing text: Enterprise 3.0 directive 1A and the VOICE addendum (founder scope confirmation, 23 Nov 2026).
VOICE is telephony and unified-communications intelligence. It is not narration, a voice assistant or call recording.
Status words: IMPLEMENTED (code in the repository), TESTED (a suite checks it), SIMULATED (synthetic data), SPECIFIED (written, not built).

## What is in the repository today

| Surface | Address / file | Status |
|---|---|---|
| Corporate product page | website `/voice` (`apps/website/src/voice.tsx`); section on `/products#voice` | IMPLEMENTED, TESTED (website suite) |
| Website → demonstrator launch | `MODULE_LAUNCHES.voice` in `packages/ui/src/launches.ts`: opens the CallPath as the AV Operations Lead, with the way back to `/voice` | IMPLEMENTED, TESTED (launch-intents, demo-voice VC-15) |
| VOICE overview | demo `#/voice` (`apps/demo/src/voice/VoicePage.tsx`): scenario, perspectives, adapter register, limits | IMPLEMENTED, TESTED, SIMULATED |
| CallPath Digital Twin | demo `#/voice/callpath/R-ATL-4-218` (`CallPathPage.tsx`): six hops, configured vs observed vs unknown, samples, method, shared uplink, hypothesis | IMPLEMENTED, TESTED, SIMULATED |
| Cases | `?case=missing` (provider telemetry not configured), `?case=stale` | IMPLEMENTED, TESTED |
| Report a calling problem | demo `#/voice/report/<room>` (`ReportPage.tsx`): raises a real ServiceHands incident through `workspace/store.raiseIncident` | IMPLEMENTED, TESTED |
| Fixture, method, view model | `apps/demo/src/voice/model.ts` | IMPLEMENTED, TESTED (`tests/unit/voice.test.mjs`, 9 tests) |

## J6B-VOICE, step by step

| Step | What the directive asks | Status |
|---|---|---|
| 1 | A user reports degraded audio from the room | IMPLEMENTED: report page → ServiceHands incident, receipt, own reports only |
| 2 | Operator opens the CallPath at the same room id; configured path; missing observation UNKNOWN | IMPLEMENTED |
| 3 | Synthetic loss/jitter with timestamp, source, units, label; transparent method | IMPLEMENTED (QM-G107-S1, below) |
| 4 | Shared upstream link; explainable hypothesis, not a root cause; open the graph and return with scope kept | PARTLY: the uplink and hypothesis are shown and Search Party opens and returns with the case kept. FLOW has no workspace yet, and the hypothesis is not yet written into the APEX case record |
| 5 | ServiceHands assigns a site-authorised technician; Search Party role and contact; technician action, labelled evidence, receipt; denial and missing-telemetry scenarios | PARTLY: the incident exists in ServiceHands and its own engine handles triage, assignment and evidence; the VOICE-specific action and evidence step is SPECIFIED. Denial (caller refused the CallPath) and missing telemetry are IMPLEMENTED |
| 6 | Independent review; Assurance state; MissionProof readiness; return links | SPECIFIED. MissionProof does not exist yet |

## The fixture (deterministic, on the estate's own ids)

Room `R-ATL-4-218`; endpoint = planned asset `A-0102`; access switch `SW-ATL-4A`; core `SW-ATL-CORE`; shared-uplink rooms
`R-ATL-4-218`, `R-ATL-4-220`, `R-ATL-4-231` (recomputed from the estate's FEEDS and PLANS_DEVICE edges by the unit suite).
VOICE-owned records: call flow `CFR-ATL-4-218-r3`, `SBC-NORTH-1`, provider connection `UCP-A` (fictional), calling policy
`CP-NORTH-VOICE`, session token `CS-7f3a…e21`, six ten-second samples, hypothesis `VH-0001`. Fixture clock 2026-11-23 15:20 UTC.

## Quality method QM-G107-S1 (status: SPECIFIED for engineering review)

ITU-T G.107 E-model, reduced form: R = 93.2 − Id − Ie,eff; Id = 0.024·d + 0.11·(d − 177.3)·H(d − 177.3) (Cole and Rosenbluth's
reduced delay term); Ie,eff = Ie + (95 − Ie)·Ppl/(Ppl/BurstR + Bpl), BurstR = 1; MOS = 1 + 0.035R + R(R − 60)(100 − R)·7·10⁻⁶,
clamped to 1.0–4.5. Constants in the table: G.711 (Ie 0, Bpl 4.3), G.711 with PLC (Ie 0, Bpl 25.1). Assumed: 40 ms jitter buffer,
20 ms packetisation. The method **refuses** on a missing input, an out-of-range value, a codec not in the table, a stale sample or a
state that is not an observation. An estimate keeps the evidence state of its inputs. **Before any use outside the demonstration an
engineer must check the constants and the delay term against the current ITU-T G.107 and G.113 texts** (open decision E3-D3).
Targets (loss ≤ 1 %, jitter ≤ 30 ms, one-way delay ≤ 150 ms) are the synthetic tenant's declared calling policy, not Empathia's.

## Perspectives (demonstration only; grants nothing real)

| View | Demonstration roles | Reads |
|---|---|---|
| Administration | Product Architect, AV Operations Lead, Systems Engineer (standing in for voice administrator and IT/UC manager: E3-D2) | Path, samples, session token, signalling-side detail |
| Technician | Service Technician, Service Manager | Path and samples; no session token, directory assignment or trunk id |
| Summary | Executive | Overview and a non-identifying summary; cannot open a CallPath |
| None | Everyone else | May report (V2.5.3 `issue.report`) and see their own reports; the CallPath shows the access page and its code is not downloaded |

Not yet enforced: site scope for the technician (every demonstration room is on one site). SPECIFIED for Day 2.

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
| Positive voice admin view | demo-voice VC-01..03 | PASS |
| Denied access (caller) | demo-voice VC-10; voice.test "access" | PASS |
| Denied cross-site access | — | NOT WRITTEN (no second site in the fixture) |
| Redacted search autocomplete and exports | — | NOT WRITTEN |
| Missing upstream data | VC-05; voice.test "missing…" | PASS |
| Stale sample | VC-07; voice.test | PASS |
| Impossible MOS | voice.test "quality method" | PASS |
| Out-of-order events, double service closure | — | NOT WRITTEN |
| Ticket closure does not certify commissioning | existing service/commissioning suites; not yet a VOICE path | PARTLY |
| No real emergency dialing | voice.test "privacy" (no emergency number in the fixture; VOICE places no call at all) | PASS |
| Correctly scoped ACCORD export | — | NOT WRITTEN (ACCORD not built) |

Run: `node --test tests/unit/voice.test.mjs` and, after `node scripts/build.mjs`, `node tests/browser/demo-voice.test.mjs`.
