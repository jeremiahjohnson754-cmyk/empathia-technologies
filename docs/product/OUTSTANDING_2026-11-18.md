# State and outstanding work (18 Nov 2026, 04:30 UTC)

This replaces `OUTSTANDING_2026-11-17.md` as the current list. Everything named here is committed on `v18/continuation`.

## What the public sites serve

- **Staging** (`empathia-demo-next`, `empathia-website-next`, branch `phase3/legendary-experience`) and the staged API
  (`staging/demo-api`): **`c3fc763`**, since 18 Nov 2026, 04:15 UTC. 38 migrations. It is the whole flagship journey as it stood
  at that commit: the lecture theatre with its nine template devices, one technician, the value recorded as the bench sent it.
- **Not staged**: `46dd956` (operational incidents), `f615a99` (the server recomputes the measured value), `6471efe` (the second
  technician), `66df289` (the theatre's physical model; the second room). Each passes its own suites. Their exact-commit regression
  (of `66df289`, which contains all four) is running; they go to staging if, and only if, its report says COMPLETE.
- **Production** (`main`): unchanged. It waits for the founder's word.

### How `c3fc763` was verified on staging (18 Nov 2026, 04:15 to 04:25 UTC)

| Check | Result |
|---|---|
| The platform's deploy list for the three services | each `live` on `c3fc763c28da…` (API 04:15:07, demo site 04:14:40, website 04:14:35) |
| `/health` on the staged API | ok; release `c3fc763`; 38 migrations applied; privileges ok |
| `demo-smoke` from the staged commit, with the site's origin | 12 passed, 0 failed (fifteen people, two rooms, as that commit has them) |
| `demo-edge` | 6 passed, 0 failed, 1 not run |
| `connected-browsers` on the deployed site (two browser processes) | 9 passed, 0 failed; the site's manifest names `c3fc763` |
| `#/flagship` on the deployed site, in a browser | a sandbox opened; the theatre read from the staged API: 12 positions, limit 1 s, no console error; 11.9 s from a cold page to the plan |

Not checked on staging: the whole flagship journey in a browser against the deployed site (it is checked against a local server by
`demo-flagship`, and was part of the regression). A person walking it on the staging address is the remaining check.

## Regressions

- **`a05fdcb`**: NOT COMPLETE, never staged. Build, studio provisioning, base suites (127/0) and 106/106 browser suites in light
  passed; in dark 105 of 106. `demo-room-jumps` (dark) failed, and alone it then passed once and failed once. Cause: the check
  clicked a 3D hit button by its coordinates while the shell's route focus (focus and scroll to the page heading) was still to come.
  Fixed in the check in `7cef8fd`: it waits for the route focus first. What it checks is unchanged.
- **`c3fc763`** (the whole flagship journey): **COMPLETE**. Build PASS; studio PROVISIONED; base PASS (132 / 0 / 113 not run);
  browser 107 of 107 in light and 107 of 107 in dark, 0 failed, 0 not run. Two things about how it ran, for the record:
  `demo-connected` (dark) first failed in five seconds with `EADDRINUSE 127.0.0.1:4187`: another test run on this machine (the
  base suites of a later commit, started by the same engineer) held the port. Run again alone it passed, and that is the result
  counted. `tokens` (dark) had not run when the container was restarted; it ran afterwards and passed. No suite was skipped and no
  check was changed for the regression. Staged on that report.
- **`66df289`**: running.

## Built since `e3c8e9f`, in order

| Commit | What |
|---|---|
| `1cba676` … `4121ace` | private assets provisioning and the regression runner; the recovery drill on the real platform export; fail-safe privilege gate and owner-only repair; private bucket and encrypted backup tooling; hosted drill runbook |
| `fc8fa30` … `62e89f4` | 50/10 assessment and ledger; the flagship room on the server (0036); its page; one answer to "where is this device" for Engineering, Lite and Assurance |
| `93e15c0` | the flagship page: drag a camera, submit the redline, decide it as someone else; three products compared |
| `b63d11d` | acceptance criteria; measurements judged by the database; a result rests on a measurement (0037, ADR-0014) |
| `7cef8fd` | the reverberation bench; bounded shutdown of the API; the room-jumps race fixed in its check |
| `dabf637` | the corrective action through ServiceHands and Search Party; a retest is a new measurement |
| `c3fc763` | to acceptance; the baseline keeps the design, the as-built place and the measured values (0038) |
| `620ae2a` | the four source workbooks reconciled against the schema (`SOURCE_RECONCILIATION.md`) |

## The flagship room: what is true of it now

Lecture Theatre SCI-110 (`#/flagship`, connected builds only). One browser suite, `demo-flagship` FL-01…33, walks the whole of
it and checks every step against the server. Open the room; drag the camera; submit;
refused to its recorder; approved by someone else; register; start commissioning; measure reverberation at the bench; PASS refused
on a value over the limit; FAIL and its deficiency; work order; Search Party; assignment; preflight; field evidence; verification;
closing; correction; a retest that is a new measurement; handover documents; the remaining checks; verification; the acceptance
lent and given; baseline 1 with the designed place, the as-built place and the measured value. A refresh and a second person's
browser are checked at four points.

What is thin or simulated there, each stated on the page or in ADR-0014:

- No room is measured. The bench analyses synthetic reference signals (or a response file loaded in the browser); the measurement
  is recorded as SIMULATED; outside a sandbox the server refuses a SIMULATED value as a pass.
- Reverberation: the server works the value out again from the evidence and records its own figure (ADR-0016, CR-13, FL-31). It
  checks arithmetic and provenance, not that a file was recorded in the room. The other four measured tests are still recorded as sent.
- A note stands in for each handover document; the 71 other checks are recorded on one synthetic observation note.
- The room's design is 36 device positions and 30 seating blocks that add up to its 180 seats (ADR-0018, FM-01…05), added by its
  designer through the API before approval. The rake is not modelled; heights and positions are a plausible synthetic design with no
  coverage or sightline calculation behind them beyond the server's design checks.
- The sandbox has two technicians (ADR-0017, ST-01…07, FL-32): the second is refused by the gates until the data steward verifies a
  credential the service manager recorded, and a job is refused to whichever of them it was not assigned to. Two is still a small
  pool: nobody is a vendor, on leave, out of capacity or without site access.
- Only reverberation has a bench. Four other measured tests have metrics defined and no criterion, no bench.
- The same workflow runs in another room, Harbor 201 of the convention centre (ADR-0019): end to end by the API (SR-01…07) and, on
  the page, chosen from a list and by its own address (FL-33). That room is its template as it comes: 36 seats drawn for 220.
- The corrective work for excess reverberation is recorded as a general field job (the server's "break fix"); the work-type list has
  no acoustic treatment.

## Waiting on the founder

1. **The private bucket** (task 195): a bucket with versioning, public access blocked and encryption; a key scoped to that bucket,
   placed as environment secrets; an RSA 4096 public key (`.pub.pem`) for the backup. Until then the Founder Studio page and films
   are one copy on this workstation, which was restarted once on 17 Nov (the store survived).
2. **The hosted recovery drill** (task 196): whether it may add a second small API service for about two hours (about $0.04 with the
   database), or should point the staging API at the restored database instead; and the word to go. `HOSTED_RECOVERY_DRILL.md`.
3. **Order of the reconciliation gaps** (`SOURCE_RECONCILIATION.md`): operational incidents; support paths and a contact directory;
   a documentation checklist with a two-signature sign-off; exceptions with the measured value. Each is a migration with its rules.
4. **Production**: nothing goes to `main` without the founder's word.

## Open, in the order they will be taken

1. Finish the regression of `66df289`; stage it if COMPLETE; verify both `-next` sites and the staged API (41 migrations, sixteen
   people, three rooms). Measure how long a sandbox takes to open there.
1a. A page for operational incidents (the server record exists, ADR-0015); the ServiceHands pages still keep theirs in the browser.
2. V3.9 rules not modelled (task 199): Pass with Exception and the exception record with its measured value; the Documentation and
   Submission gate; sequential phases; an API-bypass test per gate.
3. The flagship's thin places above: a bench and a criterion for a second measured test; Harbor 201 given the theatre's treatment;
   the rake. (Done since this list was first written: the second technician, the server's own figure, the theatre's physical
   model, the same workflow in a second room.)
4. A stadium room on the server, so that all three worlds have one.
5. Every world genuinely interactive (task 191); the corporate site's condition (task 192: shorter mobile pages, screenshots,
   narrated workflow videos, navigation); Campus Life, Expo, Stadium LIVE (tasks 181 to 186).
6. Search Party 2.0, integrations framework, Harmony governed actions (task 200); 50/10 deliverables as files (task 201).
7. Scheduled export and drill (task 174), which needs a platform API key as a secret.
