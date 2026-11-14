# Commissioning source parity matrix

The founder's commissioning workbooks were read on 14 Nov 2026 (`python3 -I`, read-only), structure only:
- *AV Commissioning Framework v1.3*;
- *AV Commissioning & Asset Vault v1.3*;
- *AV Commissioning Asset Vault*, with its control rules.

The workbooks contain real organisations' rooms, people, addresses and serials. None of that data is copied here or anywhere in the
repository: this matrix names sheets, fields and rules only. "Where" is the application's home for each capability, and "State" is
**Built**, **Partial** (built in part, with what is missing said), or **Not built**. The 40/10 directive's phase vocabulary is mapped to
the application's six phases (five V3.9 phases plus the final sign-off as phase 6, kept as the founder asked on 14 Nov).

## Control rules ("Start here")

| Rule in the workbook | Where | State |
|---|---|---|
| Missing project setup fields = project setup incomplete | decision desk project (`decisions/store.ts`); API project lifecycle | Partial: the desk holds name, room, governance, scope and funding; no "commissioning project setup incomplete" gate |
| Every phase is keyed by Room ID; rooms without required metadata are blocked in sign-off | room register (`campus/registers.ts`), commissioning rows keyed by room | Partial: the room register is read from the record (complete by construction); there is no sign-off block for missing room metadata |
| Networked devices require IP address and hostname | device register (`campus/registers.ts` `missingOf`), "Phase 1 is not ready to start" notice | Built (demo); Not built server-side |
| Complete phases 1–5 in order; later phases flagged until prior complete | `campus/cxRecord.ts` phase verdicts; API commissioning plan tiers | Partial: verdicts per phase are shown; sequential gating is not enforced in the demo campus records |
| Fail or exception requires a deficiency ID | API: a recorded FAIL opens one deficiency per test, and only a verified retest resolves it (`domain/commissioning.ts`); proof dossier: "fails with no deficiency raised" blocks acceptance | Built (API and dossier); a Pass with Exception state is not modelled |
| STI ≤ 0.40 or Fail/Marginal routes to intelligibility exceptions | campus room R-BCN-3-225 scenario and `r.exception`; measurement import | Partial: there is no dedicated intelligibility-exception record with the workbook's fields (40/10 §16) |
| Sign-off is the final gate; accepted for use only when all gates are clean | phase 6 final sign-off, with two approvals (`proof/Dossier.tsx`, proof-registry `acceptance.ts`); campus `blockers()` | Built |

## Sheets and fields

| Sheet | Fields (abridged) | Where | State |
|---|---|---|---|
| Project Setup | project ID, name, type, deployment type, region, UC/control/DSP platform | decision desk projects; commissioning room record (template, archetype) | Partial: no UC/control/DSP platform fields |
| Room Register | room ID, name, city, site, building, floor, room type, capacity, profile, primary use, UC mode, control mode, display/camera count, mic type, DSP required, divisible/executive/training/high-criticality flags, ready for commissioning | `roomRegister()` on `#/commissioning/room/:id` and in the package | Partial: UC mode, control mode, mic type and the executive/training flags are not modelled as fields |
| Device Register | device ID, room ID, category, type, manufacturer, model, serial, asset tag, hostname, IP, MAC, firmware, approved firmware, firmware compliance, install status, role, mounting/rack location, switch port, PoE required/available, warranty start/end, managed by | `deviceRegister()` (device ID = position, asset ID = unit; serial, hostname, IP, firmware, location by the installation team); API `physical_asset` (category, model, serial, identity) | Partial: MAC, approved firmware/compliance, switch port, PoE, warranty and "managed by" not yet captured; manufacturer/model held as device class in the demo (synthetic) |
| Asset Vault | asset ID, device ID, room, lifecycle status, asset owner, linked commissioning status, linked issue count, health prompt | API `physical_asset` + installations + disposition (0030); demo retired register; service jobs carry asset IDs | Partial: no asset-owner or "linked issue count" view per asset yet |
| Phase 1 – Readiness | record ID, readiness category, check, expected, actual, status, tested by/date, dependency owner, deficiency ID | commissioning plan phase 1 rows; registers; phase-1 install photographs | Partial: "dependency owner" not a field |
| Phase 2 – Physical QA | device ID, verification category, check, actual, status, photo captured/link, deficiency ID | phase 2 rows; documentation tracker captures with photographs | Built (demo and API evidence) |
| Phase 3 – Network/Platform | validation domain, check, expected, actual, status, deficiency ID | phase 3 rows | Built |
| Phase 4 – Functional | test domain/category/step, severity if failed, STI score, RT60 estimate, witnessed by, retest required/date | phase 4 rows; measurement import (API 0025) | Partial: "witnessed by" and the retest date are not fields; RT60 is shown only as a labelled model estimate (Lite), never as a measurement |
| Phase 5 – Handoff | handoff category, check, expected/actual deliverable, owner, verified by/date, evidence link | phase 5 rows; documentation tracker (docs5) | Built |
| Deficiency Log | deficiency ID, phase, category, description, root cause, severity, identified by/date, owner, target date, resolution status/summary/date, verified by/date, open/closed, age | campus issues; proof dossier deficiencies (raise, correct, retest, verify); API deficiencies | Partial: no root-cause list, target date or age column in the demo log; the state machine has fewer states than 40/10 §15 |
| Intelligibility Exceptions | exception ID, room, mic, DSP, scenario, result, issue, root cause, severity, RT60, noise, coverage/DSP/room limitation, temporary fix, long-term recommendation, linked deficiency, logged by/date, status | — | Not built as its own record (40/10 §16) |
| Documentation Tracker | document ID, type, required?, owner, status, evidence link, submitted, verified by/date, gap notes | docs5 (`#/docs/:report`), required-for rules from the record; phase-1 install photographs | Built |
| Signoff | per-phase complete, open/critical deficiencies, intelligibility exceptions, documentation gaps, accepted for use, accepted with exceptions, gate result, integrator/consultant/internal/support sign-offs | phase 6 (two approvals in order), waivers with engineering review, dossier exports | Partial: four named sign-off parties collapse to two approvals plus attestations |
| Dashboard / Summary | totals, rooms ready/blocked, lifecycle, firmware compliance, deficiency severity | commissioning estate (`#/commissioning`) with drill-down; register stats; service analytics | Partial: there is no firmware-compliance metric |
| Vendor Scorecard | rooms assigned/complete, completion %, documentation %, open high deficiencies, devices missing IPs | ServiceHands vendor scorecard (service SLAs) | Partial: the commissioning-side vendor scorecard (rooms complete, documentation %, missing IPs by integrator) is not built |
| Audio / Video / Network / Control validation (Framework v1.3) | per-domain checks, evidence links, pass/fail, owner | commissioning plan rows by domain (audio, video, network, control) with evidence | Built |
| Dropdowns | categories, severities, root causes, validation types, user impact, tracking modes | engine catalogues (`V25_CX_CATALOGUE`, test definitions) | Partial: root-cause and user-impact lists are not used by the deficiency log yet |

## What this matrix asks for next

These items are now part of tasks #151 and #157:
- the intelligibility exception record;
- the Device Register's missing fields: MAC, approved firmware, switch port, PoE and warranty;
- the deficiency fields: root cause, target date, age, and the 40/10 state machine;
- the commissioning vendor scorecard;
- the server-side device-register endpoint, with its gate in phase 1.
