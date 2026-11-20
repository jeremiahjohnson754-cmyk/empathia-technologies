# Brief: ServiceHands next generation (addendum 4c) — FINAL EXECUTION MODE, approved scope only

Read /tmp/p2chk/BRIEF_COMMON.md (incl. UPDATE), /tmp/p2chk/ADDENDUM_SP_SH.txt §3–§7 and §9, docs/phase2/SEARCH_PARTY_SERVICEHANDS_TRACEABILITY.md
(rows SH-*, FI-*, CA-*, LN-*, HX-*; owner decisions at the end), docs/phase2/SEARCH_PARTY_COMPLETE.md (the dispatch engine and its seams:
use them, don't duplicate them), apps/demo/src/pages/Service.tsx and packages/service-engine (use as-is; backend rules out of scope).
The owner said: "final execution mode… No additional feature expansion… report unfinished functionality honestly." Build the approved
addendum §3–§7 in the demo as working, tested vertical slices; where something can't be done honestly, say so in the doc rather than fake it.

Deliver (demo app; canonical additions only in a separate file such as packages/campus/src/service.ts):
1. ServiceHands workflow on canonical incidents: Request → Intake (employee, site champion, technician entry points; structured
   categories; asset/room association; guided troubleshooting intake; attachments shown as synthetic placeholders only) → Classification
   → Prioritization (severity + SLA from the synthetic contracts) → Triage → Resource matching (call the 4b dispatch engine + reasoning
   panel) → Approval/Assignment (explicit labelled demo-workspace action; no auto-assign) → Dispatch → Work execution (technician
   mobile-first workspace: instructions, safety notes, escalation, parts, field notes, status, blockers) → Evidence → Validation →
   Resolution (codes, root cause) → Closure (approval; auditable history) → Operational learning. Queues for dispatcher and service manager,
   a dispatch board with list/table alternative (no drag-only interaction), reassignment with reason, reopen + repeat-incident intelligence,
   metrics computed from records.
2. ServiceHands × Field Intelligence: from the work order, open the room's FI scan; attach FI findings as provenance-labelled evidence
   (SIMULATED/INFERRED/KNOWN; never "measured" without an instrument).
3. ServiceHands × Commissioning + Assurance: a closed ticket is NOT recommissioning — say it on the closure screen; when the repair is a
   unit replacement the shared engine (reopenedBySubstitution / planReplacement) decides reopened tests and independent verification, as
   Core Replay does; broader changes route to "pending change management (task #338, not authorized)" — never silently.
4. ServiceHands × SIGNAL Learn: a resolved incident can generate/link a sanitized synthetic Learn case; recommend an L1–L5 band from the
   technical subject (state the band source honestly); lab completion = competency EVIDENCE, never certification/authorization.
5. Hero experiences A (Who supports this space), B (Dispatch the right expert), C (Repair, verify, learn) — on the same canonical entities;
   each reachable from the room and Search Party; consistent across ServiceHands, Search Party, Room Story, ledger (SCENARIO-marked), KPIs.
6. Tests per addendum §9 (unit + tests/browser/demo-servicehands.test.mjs at 360/768/1440, reduced motion, keyboard), all existing suites
   still green; docs/phase2/SERVICEHANDS_NEXT.md with an honest DONE / PARTIAL / NOT DONE table.
