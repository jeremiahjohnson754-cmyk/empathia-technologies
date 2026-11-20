# Commissioning Phase 5: Documentation Tracking & Submission

Founder's directive, 11 November 2026, §12: "Phase 5 must be a first-class Documentation Tracking & Submission experience. It cannot be a
single file-upload field." §13: "Prevent acceptance when mandatory items are missing, unless a properly authorized documented waiver
exists."

Status in the directive's own words: **Specified** yes · **Implemented** in the demonstration, for one tracked room · **Tested** by the
suites listed below · **Lab-verified** no · **Customer-authorised** no · **Released** no. Everything is synthetic. No file is stored or
sent anywhere; no server is involved.

## Where it lives

| Part | File |
|---|---|
| The rules (pure, no UI) | `packages/proof-registry/src/documentation.ts` |
| The gate in Phase 6 | `packages/proof-registry/src/acceptance.ts` (`ExtraBlockers`) |
| Room profile, context, who may do what, the tracked room | `apps/demo/src/docs5/model.ts`, `roles.ts` |
| The record in the browser, captures | `apps/demo/src/docs5/store.ts`, `drafts.ts` |
| Pages | `apps/demo/src/docs5/DocsPage.tsx` (checklist, applicability), `DeliverablePage.tsx`, `CapturePage.tsx` |
| Registry and authorities | `apps/demo/src/registry.docs5.ts` |
| Hooks | the dossier (release controls, document blockers, "Its document"), the QR hub's passport ("Documents"), the Site Champion's page |

Addresses: `#/docs/SIM-REPORT-2026-11-08-001` (checklist), `…/<deliverable>` (one document), `…/capture` (field capture),
`#/docs/applies` (what applies to which room).

## How it works

Nothing is stored but a list of events (assign, submit, vendor submission, request correction, accept, acknowledge, withdraw). What is
required, who owns it, which revision is current, what is wrong with it and whether it is complete are derived by replaying that list over
the room's own record. A stored event is untrusted: the replay runs each one through the same check as a live step, with the authority of
the role the event names, and drops and counts what the rules refuse. Editing the browser's storage cannot accept a document by the role
that submitted it, acknowledge it as a role nobody asked, or skip a revision number.

A required document that is not complete stops the dossier's acceptance. It names no test, so it cannot be waived on the dossier: a
document is completed, not waived. Where the dossier already has a test for a document (signal flow T-SIM-025, configuration backup
T-SIM-026, asset list T-SIM-027, operator guide T-SIM-028, the commissioning packet through T-SIM-016), that test is the single gate, so
one missing thing is never counted twice; the tracker shows where the two records agree and where they do not. An acceptance covers the
record as it stood when it was given: a document changed after both approvals begins a new cycle and does not reopen the acceptance; one
changed between the two approvals withdraws the first.

## The directive, line by line

| §12 asks for | State |
|---|---|
| Determine required deliverables per room | Done: eighteen deliverables, each with an applicability rule over the room's profile and its reason either way. In the demonstration estate the shortest list is 9 of 18 and the longest 16 (no room is vendor-installed, so vendor sign-off never applies; the rule is unit-tested). |
| "…so a simple meeting room is not forced through irrelevant Townhall-level documentation" | Done: `#/docs/applies` shows any three of the 90 rooms side by side. |
| Generate a checklist | Done. |
| Assign owners; track due dates | Done: assignment by the Integration PM (or the Product Architect); overdue is computed against today. |
| Track revision numbers | Done: revisions are consecutive; a new revision supersedes the accepted one and is reviewed and acknowledged again. |
| Validate required fields | Done: a role's own submission is not made with an empty required field or a missing file; a vendor's is recorded as it arrived and the gaps are findings that stop acceptance of it. |
| Verify equipment references | Done: references are chosen from the room's own positions, never typed; an unknown or unlisted position is a finding. |
| Check drawing consistency | Partly: revision consistency between the as-built, the signal flow, the network diagram, the rack elevations, and the asset list against the bill of materials. **The drawings' contents are not read**: there is no file. |
| Verify test evidence | Done for references: evidence is chosen from the dossier's own records; the commissioning packet must contain every one. |
| Detect missing attachments, outdated documents, contradictory asset records | Done. |
| Track vendor submissions | Done as a kind of submission recorded by the Integration PM, naming the vendor. No vendor portal. |
| Request corrections; record review comments | Done; a reviewer can reopen an accepted document. |
| Track acknowledgements | Done: operator guide by the AV Operations Lead and the Site Champion; operational handoff by the Service Manager and the AV Operations Lead. |
| Capture submission dates; preserve approval history | Done: every event is dated and kept; the history is shown in order. |
| Mobile: photograph, attach to a test, annotate, framing guidance, notes, structured measurements, attach source files, report deficiencies, complete documentation tasks, offline draft, synchronise safely | Done in the browser: photograph taken or chosen, a framing guide per kind of photograph, arrow/box/label mark-up, note, measurements (never pre-filled), offline draft in IndexedDB, synchronisation exactly once. Reporting a deficiency stays on the dossier. **Not run on a physical phone.** |
| Harmony may identify missing documentation and suggest corrective actions; it must not fabricate | "What is missing" is the computed findings in words and nothing else (unit-tested line for line). **No model is involved**; Harmony is not wired to it. |

| §13 release control | Computed from |
|---|---|
| Test completion | the dossier's tests |
| Required evidence | passes with no evidence record |
| Open deficiencies | the dossier's deficiencies |
| Required documents | every applicable deliverable's requirement |
| Equipment identity | unknown or unlisted positions; asset list against the room record |
| Revision consistency | outdated and contradictory revisions |
| Sign-off permissions | whether a first and a second approver remain who did none of the work |
| Retest status | results awaiting independent verification; corrected deficiencies awaiting retest |
| Operational handoff | handoff, operator guide and support contacts, with their acknowledgements |
| Accepted baseline | configuration backup, as-built and asset list accepted against the room record as it is now |

## Who may do what (sixteen roles)

| | Roles | Source |
|---|---|---|
| Read | Executive, Service Engineer, Service Manager, Systems Engineer, AV Operations Lead, Product Architect, Commissioning Engineer, Installation Engineer, Integration PM, Document Reviewer, Designer; Site Champion (only what they acknowledge) | the dossier's readers, plus the owner of the drawings and the champion |
| Assign | Integration PM, Product Architect | §12 |
| Submit | Designer, Systems Engineer, Installation Engineer, Commissioning Engineer, Service Manager, Integration PM | default owners |
| Review | Document Reviewer, Service Manager, AV Operations Lead, Product Architect; never the role that submitted | the dossier's verifiers |
| Acknowledge | Service Manager, AV Operations Lead, Site Champion | §12; founder, 11 Nov |
| Record a vendor's submission | Integration PM | §12 |
| Field capture | Commissioning Engineer, Systems Engineer, Installation Engineer, Service Engineer, Product Architect | §12 "Mobile" |
| Record on the dossier | as the dossier: Commissioning Engineer, Systems Engineer, Product Architect | V2.5.3 `cx.tech` |

Visitor, Employee, Internal PM and Data Steward do not open it. These lists are assumptions made to keep building (founder, 11 Nov
02:25, decision 4); each is one line in `apps/demo/src/docs5/roles.ts`.

## Tests

- `packages/proof-registry/test/documentation.test.ts`: 9 tests (applicability over 1,536 profiles; agreement with the dossier; every
  finding kind; independence and order; forged storage; a property test over 60 random sequences; "what is missing"; the ten release
  controls; the Phase 6 gate).
- `tests/unit/demo-docs5.test.mjs`: 6 tests (profiles for all 90 rooms; the tracked room; the sixteen-role matrix; the engine through the
  store; the dossier's gate; captures committed once).
- `tests/browser/demo-docs5.test.mjs`: the journeys, light and dark (see the test evidence for the count of the last run).

## Not built, not run

- No file storage, no upload, no server, no malware scan. A submission carries the file's name, size and SHA-256 only.
- No reading of drawing, backup or report contents: consistency is of revisions and references, not of what a file says.
- Only the dossier's room has a tracker; the other 89 rooms have applicability only.
- No vendor portal, no e-signature, no notification to an owner that something is due.
- Harmony is not connected to the findings.
- Seeded history is synthetic and generated from the room's record; no file exists behind it, and its checksums are stand-ins.
- Physical-phone camera capture, screen readers and browsers other than Chromium: NOT RUN.
