# State and outstanding work (18 Nov 2026, 01:00 UTC)

This replaces `OUTSTANDING_2026-11-17.md` as the current list. Everything named here is committed on `v18/continuation`.

## What the public sites serve

- **Staging** (`empathia-demo-next`, `empathia-website-next`, branch `phase3/legendary-experience`): still **`e3c8e9f`**.
  The staged API (`staging/demo-api`): still **`688cf9f`**, 35 migrations.
- **Nothing built on 17 or 18 Nov after `e3c8e9f` is staged.** That includes the whole flagship room. It is on `v18/continuation`
  and passes its own suites; it has not passed an exact-commit regression, so it is not on staging.
- **Production** (`main`): unchanged. It waits for the founder's word.

## Regressions

- **`a05fdcb`**: NOT COMPLETE, never staged. Build, studio provisioning, base suites (127/0) and 106/106 browser suites in light
  passed; in dark 105 of 106. `demo-room-jumps` (dark) failed, and alone it then passed once and failed once. Cause: the check
  clicked a 3D hit button by its coordinates while the shell's route focus (focus and scroll to the page heading) was still to come.
  Fixed in the check in `7cef8fd`: it waits for the route focus first. What it checks is unchanged.
- **`c3fc763`** (the whole flagship journey): the regression is running. It is the commit to stage if, and only if, its report says
  COMPLETE. `620ae2a` after it is documentation only.

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

Lecture Theatre SCI-110 (`#/flagship`, connected builds only). One browser suite, `demo-flagship` FL-01…30, walks the whole of
it and checks every step against the server: 30 passed, 0 failed in light and in dark. Open the room; drag the camera; submit;
refused to its recorder; approved by someone else; register; start commissioning; measure reverberation at the bench; PASS refused
on a value over the limit; FAIL and its deficiency; work order; Search Party; assignment; preflight; field evidence; verification;
closing; correction; a retest that is a new measurement; handover documents; the remaining checks; verification; the acceptance
lent and given; baseline 1 with the designed place, the as-built place and the measured value. A refresh and a second person's
browser are checked at four points.

What is thin or simulated there, each stated on the page or in ADR-0014:

- No room is measured. The bench analyses synthetic reference signals (or a response file loaded in the browser); the measurement
  is recorded as SIMULATED; outside a sandbox the server refuses a SIMULATED value as a pass.
- The server records the value the bench sends with its evidence file. It does not recompute the value from the file.
- A note stands in for each handover document; the 71 other checks are recorded on one synthetic observation note.
- The room's design is nine device positions for 180 seats (the auditorium template).
- The sandbox has one technician: Search Party's answer is one person who passes; nobody is shown failing a gate.
- Only reverberation has a bench. Four other measured tests have metrics defined and no criterion, no bench.
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

1. Finish the regression of `c3fc763`; stage it if COMPLETE; verify both `-next` sites and the staged API (38 migrations, two rooms).
2. V3.9 rules not modelled (task 199): Pass with Exception and the exception record with its measured value; the Documentation and
   Submission gate; sequential phases; an API-bypass test per gate.
3. The flagship's thin places above, the second technician first.
4. The same engine on a second room, to show it is an engine (founder, 14:40: enterprise rooms, suites, convention spaces).
5. Every world genuinely interactive (task 191); the corporate site's condition (task 192: shorter mobile pages, screenshots,
   narrated workflow videos, navigation); Campus Life, Expo, Stadium LIVE (tasks 181 to 186).
6. Search Party 2.0, integrations framework, Harmony governed actions (task 200); 50/10 deliverables as files (task 201).
7. Scheduled export and drill (task 174), which needs a platform API key as a secret.
