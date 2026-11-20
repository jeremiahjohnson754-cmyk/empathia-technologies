# Commissioning × APEX: the reports

Status, 14 Nov 2026. This is a deliverable of the 40/10 directive. Commissioning → Assurance → APEX is the flagship enterprise journey (founder, 13 Nov 2026), and each step has its own report. All three are written by the same code the pages use and reopened by independent readers (`COMMISSIONING_EXPORT_VERIFICATION.md`).

| Report | Code | Where | What it carries |
|---|---|---|---|
| Commissioning completion package | `apps/demo/src/export/cx.ts` | each room's commissioning record | see the list below |
| Assurance report | `apps/demo/src/export/as.ts` | each room's assurance record | the baseline lineage, drift by dimension, and the replaced units that reopened tests |
| APEX case report | `apps/demo/src/export/apex.ts` | each APEX case | see the list below |

The commissioning completion package carries:

- the request, the projects and the decision memory;
- the lifecycle and the five phases with every check and its result label (never a bare PASS);
- the deficiencies;
- the room, device and retired registers;
- the before-and-after install photographs and the drawings;
- the analytics;
- links to every record.

The APEX case report carries:

- the seven layers and what each cites;
- the hypotheses, ranked, each saying why it is not proven;
- the action tiers A0–A5 and their bounds;
- every action attempted (a blocked outcome is a result);
- the review;
- the thread back to the service request and the room's commissioning and assurance state.

Other reports on the same journey:

- the ServiceHands queue;
- the service record, including the job phase by phase (`UNIVERSAL_PHASE_ENGINE.md`);
- commissioning analytics;
- the reverberation and STI reports.

## What the reports never do

- Present a hypothesis as a finding.
- Present an attempted action as one that reached equipment. Every adapter is `NOT_CONFIGURED` in this build, and a simulated run says SIMULATED.
- Present a reviewer's verdict as proof.
- Present a passing simulation as commissioning.
- Present a comparison with a project policy (reverberation, STI) as a commissioning result on its own.
- Put an evidence reference, a recorder or a verifier in the executive redaction of the dossier. This is checked in all six formats.

## Tests

- **Export check.** `scripts/verify/export-formats.mjs` covers the commissioning packages of five rooms (reference, blocked, accepted with an open deficiency, the earlier record, the largest room), the assurance reports, the seeded APEX cases plus one opened in the run, and the rest of the set. Each report gets 6 formats and about 30–40 checks. Last run: 915 passed, 0 failed.
- **Security.** `tests/security/apex.test.mjs` covers who may open and act on a case, over the API.
- **Browser.** `tests/browser/demo-workflows.test.mjs` and `demo-exports.test.mjs` cover the journey and its downloads.

## Not built

- One report that binds the three into a single document for a room. Each is separate today, and they link to each other.
- The zipped evidence package of the proof dossier. Its page says it is not built.
