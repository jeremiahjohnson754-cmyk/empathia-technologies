# 50/10 Master Engineering Directive: first execution

Founder, 17 Nov 2026, 14:40 (directive §25): "Begin by inspecting the present repository and source materials. Then immediately
deliver" A to G. And the refinement sent with it: "I would have Claude make one University lecture hall the flagship engineering
demonstration before expanding all the tools across the estate… Once that works end to end, the same engine can power your
enterprise rooms, stadium executive suites, and convention center spaces without creating separate engineering systems for each
world."

This is an assessment of what exists, read from the repository on 17 Nov 2026 at commit `4121ace`. A feature is called built only
where code and a test exist; "in the browser" and "on the server" are said separately, because they are separate today. Nothing
here is a claim about production.

## What was inspected, and what was not

| | |
|---|---|
| Repository | `v18/continuation` at `4121ace`. Staging sites on `e3c8e9f`; staging API on `688cf9f`; production (`main`) untouched |
| API | 182 routes declared across 27 areas (`services/enterprise-api/src/modules/routes.ts`), 30 domain modules, 35 migrations, 182 operations in the published contract |
| Demo | `apps/demo/src`: 58 feature folders; one page (`#/connected`) reads the server |
| Founder's sources on this workstation | all six named in §1 are present as attachments: the V3.9 document, *AV Commissioning Framework v1.3*, *AV Commissioning & Asset Vault v1.3*, *AV Commissioning Asset Vault*, *AV Operational Issue Intelligence Framework v1.3*, the Search Party PowerApps data model v2. V2.5.3, V2.5.5 and SIGNAL sources are in `legacy/source/` |
| Read today | the code and documents cited below. **Not re-read today:** the six founder documents. The three commissioning workbooks and the V3.9 rules were read for structure on 14 Nov (`docs/product/COMMISSIONING_SOURCE_PARITY_MATRIX.md`); this assessment relies on that matrix for them. The Operational Issue Intelligence workbook and the PowerApps data model have **not** been reconciled field by field against the current schema; that is listed as work, not assumed |
| A Blender connection | **not present** in this session's tools (searched). A SketchUp connector is present and unprobed. Geometry stays web-native until a Blender connection actually appears |

## A. The ten most consequential gaps

Ranked by what they cost the product's central claim (one underlying reality, many perspectives).

| # | Gap | Evidence | Consequence |
|---|---|---|---|
| 1 | **Two implementations of the lifecycle.** The server enforces results, independent verification, deficiencies, work orders, baselines, assurance, measurements with provenance, competencies and search over real records. The demo's ordinary pages do the same things again in the browser, on browser-held records | `services/enterprise-api/src/domain/*` against `apps/demo/src/campus/*`, `install/fieldRecord.ts`, `service/*`; only `pages/Connected.tsx` calls the API | A room is a different object in the demo and on the server. Every other gap is harder while this stands |
| 2 | **The instruments do not write to the record.** The reverberation and STI benches compute and export; the result does not become a measurement on a test | `docs/product/ENGINEERING_INSTRUMENT_BENCH.md`: "That link (instrument → test → evidence) is **not built**" | An engineer's analysis and the commissioning record are joined by a downloaded file |
| 3 | **No audio analysis beyond decay and STI entry.** No spectrum, transfer function, SPL or background-noise workspace in Commissioning. The FFT code that exists belongs to MixLab, Game Day and Learn | `apps/demo/src/bench/` holds `reverb.ts` and `sti.ts` only | §4.1 is mostly unbuilt |
| 4 | **Video and network benches do not exist as benches.** Lite predicts camera, microphone and loudspeaker coverage from a plan and lets devices be arranged, labelled as prediction. There is no preset verification, no sightline workbench as an instrument, no network diagnostics workbench, no UC or control lab | `apps/demo/src/lite/studio.ts`, `Arrange.tsx`; no topology page | §5 and §6 are unbuilt as engineering tools |
| 5 | **Redlines are records, not yet a drawing workstation.** Field moves, mounting, hookups and markups are modelled, decided by someone other than their author, and stored on the server. Drawings are SVG only: no PDF, DXF or IFC, no calibration or measurement tools, no revision overlay | `domain/fieldRecord.ts`, migration `0034`; `apps/demo/src/drawing/` handles `svg` only | §7.1 is partly built; §7.2 (2D redline moves the 3D model and recomputes coverage) is not |
| 6 | **V3.9 states that are not modelled.** There is no Pass with Exception result and no dedicated intelligibility-exception record; sequential phase gating is shown, not enforced, in the browser records; there is no Documentation and Submission gate on the server | no `PASS_WITH_EXCEPTION` or intelligibility-exception anywhere in `packages/commissioning-engine`, `database/migrations` or the API (searched); parity matrix, "Control rules" | Two of the founder's non-negotiable rules cannot be exercised |
| 7 | **Search Party's people side is thin on the server.** Search, facets, neighbourhood, impact and path run over the visible records with provenance on every edge, and verified competencies exist. There is no department, manager or reporting relationship in the schema, and people appear only where a visible record already names them | `domain/search.ts` header; no `manager`, `department` or `reports_to` column in any migration | "Who knows X and supports site Y" cannot be answered from durable records yet |
| 8 | **No verified integration.** The adapter contract, a catalogue of 83 target platforms, three local mock adapters with a conformance suite and the rules (matching by serial or MAC only, one authority per record kind, mock observations never feed Assurance) are built. `integrations/verified-adapters/` is empty. Microsoft Graph appears only in browser mock files | `integrations/README.md`; `apps/demo/src/connect/graph.mock.ts` | Every connector is Not Connected or Mock Verified. None is Live Verified |
| 9 | **Harmony has no model behind it.** The server answers an AI request with `not_configured` and lists the sources an answer would have to cite; the rule engine in `integrations/contracts/src/harmony.ts` is deterministic | `domain/platform.ts` | Harmony today is governed rules and labelled samples, which is honest, and is not reasoning |
| 10 | **The worlds are not yet interactive products.** Campus Life has no playable slice; Stadium and Expo have no controls that change the model; Experiences features (polls, questions) exist in the convention world in the browser only, with no server record | tasks 181 to 186; `apps/demo/src/worlds/` | §14 and §15.2 are ahead of us |

Not in the ten, and still real: nothing has been exercised on a second browser engine; recovery on the platform is unproven; the
private assets have no durable copy yet (each is tracked separately).

## B. Commissioning today against V3.9 and Workstation 2.0

| Requirement | On the server | In the demo | State |
|---|---|---|---|
| Five phases, sequential | a commissioning plan per room, with tiers | six phases shown (the five, plus final sign-off, as agreed on 14 Nov), verdict per phase | **Partial**: order is displayed, not enforced, in the browser records |
| Documentation and Submission as a gate | none | a documentation completeness model in `packages/proof-registry` used by the dossier | **Partial**: the directive's reconciliation (a mandatory gate between functional verification and handoff) is not built on the server |
| Required fields complete; no evidence, no completion | a result needs the room in COMMISSIONING, an applicable test, the responsible role, an accepted evidence kind and a stored evidence object (`domain/commissioning.ts`, with database constraints) | mirrored | **Built on the server**, tested |
| A failed test raises a deficiency | one deficiency per failed test; only a verified retest resolves it | mirrored | **Built on the server** |
| Pass with Exception requires a deficiency | not modelled | not modelled | **Not built** |
| Intelligibility failures need their own exception record | not modelled | one scenario room carries an exception note | **Not built** as a record |
| Open critical deficiencies block acceptance | acceptance needs two approvals; fails with no deficiency block it (`proof-registry`) | mirrored | **Built** |
| Independent verification | a PASS is unverified until someone else verifies it; verifier is never the recorder (also a database check) | mirrored | **Built on the server** |
| Acceptance cannot be bypassed through the API | authority and state checked on the server; refusals are tested in `tests/security/*` | n/a | **Built**; a bypass test per V3.9 gate, named as such, does not exist yet |
| Adaptive plan from the room's design and devices | the plan is derived from template, devices and connections by `packages/commissioning-engine` (deterministic, versioned catalogue) | mirrored | **Built**; "why this test exists" and "which requirement triggered it" are partly shown; a diff of tests when the design changes is not |
| Measurements with provenance | DESIGN_SPECIFIED / SIMULATED / INFERRED / OBSERVED / FIELD_MEASURED, instrument, calibration, uncertainty, verify by another person; CSV import, all or nothing | the benches, separately | **Built on the server; not joined to the benches** |
| Dockable multi-panel workspace, saved layouts | n/a | none | **Not built** |
| Spectrum, transfer function, SPL, signal flow, coverage, camera, display, network, UC, control labs | n/a | reverberation and STI only | **Mostly not built** |

The largest single finding in B: the server is ahead of the browser on enforcement, and the browser is ahead of the server on
instruments. Neither is the whole workstation.

## C. Redesign recommendations

**One room, one engine.** Build the workstation once, against the server's room record, in the flagship lecture hall. Every bench
reads the same room (geometry, devices, connections, plan) and writes the same three things: a measurement (with its provenance
class), an evidence object (the file, hashed), and a result on a test. No bench keeps a record of its own.

| Bench | Recommendation | What keeps it honest |
|---|---|---|
| Acoustics | Keep the decay analysis as it is (it refuses rather than guesses). Add a spectrum and band view of an **imported** recording or impulse response first; live microphone input second, always labelled uncalibrated. SPL and background noise as calibrated import or manual entry with the instrument named. STI stays import and entry from an approved meter. Every analysis has a "record against test" action that creates the measurement and the evidence on the server | provenance class on every trace; a phone microphone never yields FIELD_MEASURED; a result is still recorded by one person and verified by another |
| Signal flow | Draw the room's stored connections as a graph the engineer can follow from any input; compare an attached configuration export with the approved one; a failed check raises the deficiency in place | read-only; no device is addressed |
| Camera and display | Promote Lite's prediction into a studio on the room plan: drag a camera or a display in a **proposed** layer, see coverage and sightlines recompute, and save the change as a redline that asks for approval. Presets are records with intended framing and attached evidence | every figure labelled modelled; unknown lens data means a declared assumption or manual input, never a silent default |
| Network, UC, control | A topology view of the room's own connections and addresses with a checklist whose every result names its method: demonstration, manual, imported evidence, or vendor API. Nothing in the browser claims to have probed a network | the method is a required field of the result |
| Redline | Start from what exists (moves, mounting, hookups, markups, a second person's decision). Add drawing calibration and distance on the SVG plan, a before and after overlay of two revisions, and the link that makes a redline on the plan move the proposed 3D placement. PDF underlay next; DXF and IFC only through a real converter, and named as such | Designed, Approved, Installed, Verified, Current and Proposed are separate layers; none overwrites another |
| Change impact | When a device moves or is substituted, list the tests whose basis changed and require them again. The server already re-opens verification on some changes (`domain/reverification.ts`); extend it and show it | a rule table with versions, not a model's opinion |

## D. Search Party today

| Capability | State |
|---|---|
| Search, facets, type filters, neighbourhood, impact, shortest path, intents | **Built on the server** over the records the caller may see; an unauthorized caller cannot infer a record from a count or a neighbour (`domain/search.ts`, `tests/security/search-party.test.mjs`) |
| Relationships with provenance | **Built**: stored relationships plus edges derived from foreign keys, each marked as declared or derived |
| Verified, self-declared and inferred expertise kept apart | **Partly built**: competency records are recorded by one person and verified by another, expire and can be revoked, and only verified ones count for dispatch (`domain/competency.ts`). Experience from worked jobs is shown beside, never inside, the ranking (`docs/product/PEOPLE_INTELLIGENCE.md`). Self-declared skills are not modelled |
| Departments, managers, reporting lines, teams | **Not built** in the schema |
| "Who knows X and supports site Y", with the reason for each match | **Not built** as a query over durable records; the browser demo answers such questions over its own estate data |
| Contact and collaboration actions | deep links exist in the browser demo; none is a tested integration |
| Relationship Intent (approve, escalate, assign) resolving the actual approver | intents exist as a ranking aid; resolving the governing approval workflow is **not built** |
| The PowerApps data model v2 reconciled with the schema | **Not done** |

## E. Integration audit

| Provider family | State | Basis |
|---|---|---|
| Microsoft 365 (Graph, Entra, Teams, calendars, SharePoint, Intune) | **Not Connected.** Sign-in through an OIDC provider is implemented and tested against a local issuer (`tests/security/oidc.test.mjs`), never against Entra. Graph is browser mock only | `apps/demo/src/connect/` |
| Teams Rooms management | **Not Connected.** Which management functions are reachable through public Graph endpoints has not been verified against Microsoft's current documentation; no claim is made | to verify before design |
| Utelogy, Xyte, Crestron XiO Cloud, Q-SYS, Biamp, Shure, Sennheiser, Cisco, Logitech, Poly, Neat, Zoom Rooms, BrightSign and the rest | **Not Connected.** Catalogue entries, contract only | `integrations/contracts/INTEGRATION_REGISTRY.csv` (83 entries) |
| Device inventory, DSP readback, service desk with signed webhooks | **Mock Verified**: three local adapters that pass the conformance suite, with fault injection | `integrations/mocks/` |
| ServiceNow, Jira, CMMS, CAD metadata | **Not Connected** | |
| Anything **Live Verified** | **none** | `integrations/verified-adapters/` is empty |

What exists is the right skeleton: one adapter interface, capability flags, source authority per record kind, identity matching
by serial or MAC only, a database rule that refuses VERIFIED without evidence, and mock observations fenced off from Assurance.
What a first live adapter needs is an authorized vendor sandbox and its credentials, which are the founder's to obtain. Without
them the truthful next step is contract fixtures recorded from each vendor's published API description, labelled as fixtures.

## F. Architecture: canonical data, durable records, evidence, synchronization

1. **PostgreSQL is the authority; the browser holds nothing that matters.** A page that moves to the server stops writing its
   browser record in the same change. `docs/product/MIGRATION_LEDGER.md` states, per feature, browser or server, and is checked.
2. **The canonical identifier travels with the record.** The estate's identifiers (`UNI-SCI-110`) are kept exactly; the server
   stores them beside its own key. Nothing is renumbered.
3. **Relationships are rows with provenance,** in PostgreSQL, as now (ADR-0004), extended with effective dates and visibility.
   No second graph store: nothing measured yet justifies one.
4. **Evidence is an object with a hash,** referenced by measurements, results, redlines and sign-offs; acceptance takes an
   immutable snapshot.
5. **Writes are idempotent and versioned;** conflicts are detected, not merged. Events leave through the existing outbox.
6. **Rules are versioned tables** (the commissioning catalogue, the change-impact rules). Harmony may propose; it does not govern.
7. **Privileges and isolation are verified, not assumed** (row-level security forced; the privilege list checked at start).
8. **Every result names how it was obtained:** modelled, simulated, imported, manually entered, measured with a calibrated
   instrument, or reported by a verified adapter. The classes are never merged in a display.

The ADR for this (deliverable 3) is to be written when the flagship's first slice has tested these on real records.

## G. The first engineering slice

**The flagship room exists once, on the server, and one page shows it.**

- The room: **`UNI-SCI-110`, Lecture Theatre SCI-110, Kestrel Valley University** (fictional): a raked theatre, 180 seats with six
  wheelchair positions, 20 × 16 × 6.5 m. It is already in the university's canonical estate (`apps/demo/src/estate/university.ts`)
  and keeps its identifier.
- The server gains the canonical reference on a room, and a demonstration sandbox opens with this room (template `auditorium`,
  the canon's dimensions and seats, its devices generated by the same engine as every other room) beside the existing one.
- A page in the connected build, the flagship workstation's first panel set: the room's plan, its devices, its commissioning plan
  and its thread, **all read from the server**, as the person the visitor chose.

Acceptance, as tests:

| | |
|---|---|
| F-01 | a new sandbox holds a room whose canonical reference is `UNI-SCI-110`, with the canon's name, seats and dimensions, in its own tenant |
| F-02 | the reference is unique in a tenant and unchangeable once set; another tenant cannot read the room by it |
| F-03 | the room's plan, devices and commissioning plan come back from `GET /v1/rooms/:room`, and the page shows exactly what the server returned (no browser record is read: the estate's browser copy can be absent and the page is unchanged) |
| F-04 | two browsers on the same sandbox see the same room, and reading as another person asks the server again as that person. (Every person of a sandbox may read a room; the first refusals arrive with the first write, in slice 2) |
| F-05 | the migration ledger names this page as server, and a check fails if it reads a browser record |
| F-06 | the privilege list is regenerated for the new migration and the service starts healthy |

After it, in order, each as its own slice on the same room: the field record and a redline that moves a device; one bench
(reverberation) recording a measurement and evidence against a test; a failed result, its deficiency and its work order; Search
Party proposing who may take it, with the reason; independent retest and closure; documentation gate and sign-off; the baseline
and one drift.

**Sequence, stated plainly:** the full regression of `a05fdcb` is running and gates staging. This slice is developed on the
working branch meanwhile and is not staged until its own full regression has passed.

## Found on 17 Nov while starting slice 2: where the products do not yet agree about a position

Founder, 17 Nov 2026, 15:31: "The critical requirement is one shared source of truth. If someone moves a camera in Engineering, its
coordinates should update in Lite, its relevant commissioning checks should be reassessed, and Assurance should preserve the
revision history. Not three different products pretending to agree."

The camera of UNI-SCI-110 was moved through the server's own routes in a sandbox (a field move of 1.58 m for a sprinkler head,
proposed by the installer, refused when the installer tried to approve it, approved by the systems engineer). What each view then
returned:

| View | What it returned for the camera | Agrees? |
|---|---|---|
| The field record (what Lite's plan reads) | designed (8, 19.4); as-built (9.5, 18.9) by move FM-0001 | yes: both, labelled |
| The checks | six camera checks listed for the commissioning engineer to look at again | yes |
| A design edit of an installed room | refused: "changes need a change order" | yes: the design is not silently edited |
| The room as Engineering reads it (`GET /v1/rooms/:room`) | (8, 19.4), with no as-built position and no label saying which it is | **no**: it shows the designed position as if it were the position |
| The baseline Assurance would take at acceptance | each device's id, category and label; **no position at all** | **no**: Assurance could not say where the camera was when the room was accepted, nor that it had moved |

So the record is one (the move is stored once, with its history), and two readers do not read it. Slice 2 is therefore, on the
server: one function that answers "where is this device" (designed, as-built, which is current, and the history of both), used by
the room, the field record, the thread and the baseline; the baseline keeps each device's position at acceptance; and a test that
moves the camera and asks all of them. Then the page: the move made on the plan in a proposed layer, decided by another person,
and the three views shown side by side from the server.
