# ADR-0021 · Documentation & Submission: a mandatory gate before acceptance (migration 0043)

Status: accepted, 18 Nov 2026. Sources: 50/10 master directive §3.1 (V3.9: "Required documentation must be present"; "introduce
Documentation & Submission as an explicit mandatory gate between functional verification and final handoff, with its own
visibility, approval status and auditable submissions") and §9 ("a formal documentation completeness matrix", "evidence-linked
signoff"); `SOURCE_RECONCILIATION.md` item 3 (the workbooks' documentation tracker and sign-off packet; structure only).

## Reconciliation with the five V3.9 phases

The five canonical phases stay as they are (Pre-Commissioning Readiness, Physical Installation Verification, Network & Platform
Validation, Functional System Commissioning, Handoff & Operational Readiness). Documentation & Submission is a gate between
Functional System Commissioning and Handoff: in the room lifecycle, between COMMISSIONING and ACCEPTED. The five handover tests of
the plan (training, support path, spares, warranty and licence register, runbook) stay tests; the documents are records of their
own, because a document is reviewed and versioned, which a test result is not.

## Decision

- **The matrix** (`@empathia/commissioning-engine` documentation.ts, shared): fourteen document kinds. What a room requires follows
  from what it contains: always the as-builts, the firmware list, three sets of photographs and the commissioning report; a rack
  elevation and rack photograph with a rack; an IP schema with a network switch; a DSP file and screenshot with an audio processor;
  control code with a control processor; a camera screenshot with cameras; a UC screenshot with a room computer. The workbook's
  fifteenth item, the final sign-off PDF, is the two signatures themselves. The lecture theatre requires all fourteen.
- **Submission** (`app.room_document`): one stored evidence file per version, while the room is INSTALLED_UNVERIFIED or
  COMMISSIONING; a new version only once the last is decided. Submitters: `work.evidence`, `photo.submit`, `test.verify`,
  `tests.verify.all`. Immutable, never deleted.
- **Review**: `documents.approve` or `photos.approve`, once, never by the submitter (database constraint); a rejection says what to
  correct.
- **Signatures** (`app.documentation_signature`): VENDOR by `window.approve` (the integrator's operations lead), INTERNAL by
  `baseline.approve` (the owner's design authority). The database computes the packet hash from the latest version of every
  document, refuses while any is undecided or rejected, and refuses one person on both sides of one packet. A later version or
  review changes the packet: earlier signatures stay on the packet they signed and no longer count. Append-only.
- **The gate**: the engine's `lifecycleBlockers` takes a `documentation` fact on ACCEPTED, after open issues and before the test
  counts: "documentation and submission: N of M required documents approved (P%) — not submitted / awaiting review / rejected /
  signature outstanding". Readiness and the transition say the same.
- **Pages**: the flagship page's "To acceptance" card shows the matrix, submits and approves the documents and signs, as whoever is
  acting (FL-37); the connected journey has four steps for it (23 in all).

## Consequences

- Every test fixture that accepts a room completes the packet first (`documentRoom` in the integration harness), each marked with
  the reason.
- In a demonstration a written note stands in for each document, and says so in the file.

## Not done here

- Documents are not checked for content (a PDF parser, a photo's EXIF): what is checked is that a file was stored, by whom,
  reviewed by whom.
- No digital signature in the cryptographic sense: a signature is an authenticated person, a role, a time and the packet hash.
- The Digital Commissioning Passport (§9) and its exports are not built.
