
## Commit messages (verbatim)

### Turn 499 — commit `457361d` on restoration/sprint-0-1 (hash from the assistant's SendUserMessage; preceded by `git restore --staged --worktree ml/models/first_attempt_logreg_v1.json media/screenshots/enterprise-web/`)

```
Checkpoint: room recommissioning through the API, shared reverification rule, Room Story and Impact in the demo

API (enterprise-api)
- An accepted room under recommissioning accepts a model substitution only; it emits commission.asset_replaced through the outbox and an audit record.
- POST /v1/rooms/:room/revisions/:rev/approve: change-order design approval (room.design.approve, never the revision's author).
- Re-acceptance cannot bind results recorded before a substitution; readiness counts them as revalidation, not verified.
- Devices return modelHistory; assurance compares models, not only ids (model-substitution drift).
- Re-acceptance publishes baseline v3 and keeps v2 SUPERSEDED (BL-5).
- New e2e: tests/e2e/checkpoint-room-lifecycle.e2e.mjs (Lite design -> approve -> commission -> accept v1 -> swap camera -> reopened tests -> re-approval -> Room Story -> Pro), evidence in tests/evidence/checkpoint/.

Shared engine
- packages/commissioning-engine/src/substitution.ts: reopenedBySubstitution, the one rule both the API and the demo call. The API's 12 reopened tests and their reasons are unchanged (step-15 evidence byte-identical after normalising timestamps and ids).

Demo
- Room Story (#/story/<room>), reachable from Build a Room, Search Party, Control ledger, ServiceHands, the registry and the tour.
- Impact panel: before/after of a device swap; reopened tests listed with reasons; re-acceptance refused until re-run and independently verified; baseline v1 kept, v2 published, v1 SUPERSEDED.
- Truth fixes: project status only from records (no FUNDED without a funding record); project history reads the lifecycle events; Atlas 4.218 baseline from the KPI records (APEX reads the same source).

Tests
- api-client: the operation table now has 151 operations (the revision approve operation is asserted by name).
- Matrix on this tree (node scripts/test.mjs --browser --studio): 51 PASS, 1 FAIL (api-client count, fixed above and re-run: 5/5), 1 NOT_RUN (film decode, needs the masters). The full matrix will be rerun after the installation-records work.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```

### Turn 504 — commit `ff0a6ad` on branch `restoration/outbox-on-457361d` (worktree .claude/worktrees/agent-a098690563b8344ea)

Branch created from 457361d; `git cherry-pick 53c6324 4d1629b` produced d557bda and 3e9c0ac (the outbox agent's two commits). Then `git commit -qam`:

```
Regenerate the API inventory after rebasing the outbox work onto the checkpoint (151 operations)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```
(Docs regenerated via `node scripts/docs/api-inventory.mjs`.)

### Turn 507 — commit `56124a4` on branch `restoration/enquiry-tally` (in worktree .claude/worktrees/agent-a098690563b8344ea; branch created from 457361d). Preceded by `git checkout -- tests/evidence/demo/demo.json tests/evidence/website-lead/website-lead.json && git add -A`

```
Enquiries through the owner's hosted Tally form on both sites (opened externally, not embedded)

Owner-approved 2026-10-31 20:18 CT: https://tally.so/r/VpG0Vy. The form was verified first, read-only: its fields, its consent text
naming Tally as the form provider, and its thank-you page. No test entry was submitted.

Website
- Request a demonstration, Pilots, a new Partnerships section, Contact, Founder and a new About > Investor conversations section each
  open the hosted form in a new tab (target=_blank, rel=noopener noreferrer). The accessible name says so, an external-link mark shows
  it, and the disclosure beside every button names tally.so, who receives the enquiry, where Tally stores it and the "Area of Interest"
  to choose (the form has no pre-fill).
- Privacy notice: a new Enquiries section covers Tally as processor and Empathia as controller, the fields collected, EU storage as
  Tally states it, Tally's US email sub-processor for notifications, and retention. The claim that enquiries go to Empathia's own service
  is removed from builds without an API.
- The site's own lead form is kept and rendered only when a build is given an API (--api), so the enterprise API lead route and its
  e2e (6/6) stay intact. CSP is unchanged: nothing from tally.so loads on the site.
- When a form is unconfigured, its notice no longer points to contact details that are not published.

Demo
- "Work with Empathia" on the investor start: pilot, partnership, investor conversation and guided demonstration entry points, with the
  disclosure. A footer contact link and a founder link on every page. Footer links are 24 px, or 44 px on phones.

Tests
- website.test.mjs 77/77. The disabled-form check is replaced by stronger enquiry checks at 1440/390: URL, new tab, rel, wording,
  disclosure, no site form and no success wording, a stubbed click opening a popup, the privacy content, and website/demo URL parity.
- New demo-enquiry.test.mjs 14/14; demo.test.mjs 138/138; website-lead e2e 6/6.
- Site audit --strict: P0 0, P1 0; P2 92 -> 71, P3 556 -> 538.

Docs: docs/operations/LEAD_CAPTURE_TALLY.md lists the verification and the owner's remaining privacy and configuration decisions.
Not merged, not deployed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```

### Turn 515 — commit `76c48f0` on restoration/sprint-0-1 (installation records; hash from the assistant's summary)

```
Positions, physical assets and installation records (ADR-0012); recommissioning negative paths

Owner requirements 18:51/18:53 and the checkpoint's requirement 4: a stable room position (planned_asset, PA-xxxx) is distinct from the
physical unit installed there (physical_asset, AS-xxxx), linked by effective-dated installation records.

Database (0026_device_installations.sql)
- physical_asset: maker nullable, model/category/code immutable, serial nullable and final once recorded; identity UNKNOWN -> DECLARED
  -> OBSERVED/VERIFIED only forward. CHECKs: UNKNOWN <=> no serial; OBSERVED/VERIFIED need evidence. Serial unique per tenant + maker + model.
- asset_installation: one open row per position and per asset (partial unique indexes), no overlapping periods (EXCLUDE USING gist,
  btree_gist), append-only (trigger EM009: no delete, a row is closed once and never rewritten), effective_basis RECORDED or
  KNOWN_AS_OF_MIGRATION. RLS forced; the app role inserts and closes, never deletes; the worker gets nothing.
- Migration: one UNKNOWN unit per installed position, with no serial, no maker, no identity claim and no fabricated install date.
  It is idempotent (a second run finds nothing).

Shared engine (commissioning-engine)
- installations.ts plans and validates a replacement: like-for-like unit or model substitution; refuses an asset installed elsewhere,
  a stale expected installation, or an identity downgrade.
- The reopened-tests rule covers any change of unit and words a replacement and a substitution differently. The checkpoint's 12
  reopened tests and their reasons are byte-identical (normalised diff, additions only).
- lifecycle.ts: the general acceptance count excludes superseded results, so stale PASS_VERIFIED never counts. The re-run-but-
  unverified sentence comes from the engine, so the API and the demo say the same.
- Assurance distinguishes an installation change (another unit) from a model drift.

API
- POST /v1/rooms/:room/positions/:position/installation and .../replace (one transaction: lock, close, open, outbox event, audit,
  reopened tests derived from the records); GET position history and asset history (follows the unit across positions);
  POST /v1/assets/:asset/identity. The existing model-substitution PATCH goes through the same transaction.
- Existing authorities only (work.evidence, room.design, field.scan, the verification authorities); existing event types only.
- Failpoints for the rollback tests fire only with NODE_ENV=test, EMPATHIA_FAILPOINTS and a test database (empathia_test_*).

Demo: positions, units and installations in the store with the same engine functions; "Replace the unit" and "Substitute the model";
position history and unit history in the register and the Room Story.

Tests (final run by the implementing agent: 54 suites PASS, 0 FAIL, 1 NOT_RUN film decode)
- New: security/recommissioning-negative RN-01..14 (stale evidence, old-camera reuse, unauthorized approvals, duplicates, conflicting
  revisions, concurrent replacements, interrupted transactions at two failpoints and a client disconnect, double and overlapping
  installation via constraint proof, baseline mutation, tenant boundary, site scope); integration/installation-migration MIG-1..6;
  engine +7 (141); assurance-engine +4 (18); demo unit +8 including the API/demo parity test (29); demo browser C-26..C-36 (149);
  checkpoint e2e C-89..C-97 (97/97, C-01..C-88 unchanged).
- governance BL-5: its re-run now uploads evidence after the substitution and first asserts that the pre-substitution evidence is
  refused (422); no assertion removed.
- Refusals of a double approval, a double acceptance and a stale revision approval stay 422, as C-65 and BL-5 pin; 409 is used for
  the new conflicts (stale expected installation, concurrent replacement, unit installed elsewhere, duplicate serial, overlap).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```

### Turn 515 — cherry-picks onto restoration/sprint-0-1: d557bda (conflicts resolved: scripts/test.mjs merged both integration suites; INDEX.json --ours), 3e9c0ac, ff0a6ad, 1e7abc4, 56124a4 (tests/evidence/website/website.json --theirs). New hashes not shown in transcript.

### Turn 515 — commit (hash not shown) on restoration/sprint-0-1

```
Regenerate the API inventory and schema index after merging the installation and outbox work (156 operations)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```

### Turn 519 — commit `84eb9c3` on restoration/sprint-0-1 (hash from the assistant's SendUserMessage and the next Agent prompt)

```
Migration test: the runner applies every pending migration from 0026 on (0027 follows after the merge); defect register D-19..D-37; evidence from the merged-branch matrix (56 PASS, 1 FAIL fixed here, 1 NOT_RUN)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```
Branch composition reported in turn 519: installation records `76c48f0`; outbox cherry-picks `2493126`, `7698fa4`, `bfa9883`, `674f2c7`; Tally integration `28963af`; tip `84eb9c3`.

### Turn 540 — commit `a4957d5` on restoration/sprint-0-1 (preceded by `git restore ml/models/first_attempt_logreg_v1.json`)

```
Shared design-binding rule and blocker order (D-38); atomic Idempotency-Key (D-35); deterministic Search Party order (D-36); outbox probes on commit order (D-37); tablet enquiry checks; Tally attribution plan

D-38 (P1): the rule that re-acceptance binds an approved revision that describes the room lived only in the API. It is now in the
shared engine (binding.ts; lifecycleBlockers takes the binding as a gate fact; revisionApprovalBlockers). The API uses it unchanged
byte for byte. The demo saves a snapshot per revision and gains "Approve revision N" (not by its author, room.design.approve), so a
model substitution or a category swap during recommissioning needs re-approval, and baseline v2 binds the newly approved revision.
A like-for-like unit replacement needs none, in the API and in the demo.

Blocker order: ACCEPTANCE_BLOCKER_ORDER in lifecycle.ts, documented in ADR-0012 §5a-5b: design binding, open issues, reopened tests
(with the count when they are the only gap), the general acceptance count. Asserted in checkpoint e2e C-98/C-99 and demo B-15h,
C-19f/g. The 12 reopened-test entries are byte-identical; only the sentence order changed.

D-35 (P3): the Idempotency-Key is reserved as the first statement of the handler's transaction. A concurrent duplicate waits and
replays the stored response, or gets 409 while the key is in use; never two executions (RN-15, which failed before: 5 !== 4).
D-36 (P3): the Search Party catalogue queries have a stable ORDER BY ... COLLATE "C"; the checkpoint evidence is the same across runs
apart from ledger hash values (e2e C-100).
D-37 (P3): the outbox ordering probes compare aggregate_seq, with the aggregate_rev checks kept beside them.

Tests: matrix 56 PASS, 0 FAIL, 1 NOT_RUN (film decode); engine 144, demo unit 30, demo browser 159, website 114 (tablet width added
for the enquiry checks), demo enquiry 21, negative paths 15, checkpoint e2e 100, outbox 21 + 1 NOT RUN (live Teams/Outlook).
No route changed; 156 operations.

Docs: ADR-0012, API_GUIDE, ERRORS, DEFECT_REGISTER (D-38 added; D-35..D-38 fixed with tests). LEAD_CAPTURE_TALLY gains the owner's
pre-rollout checklist and the hidden `source` field plan (owner's choice; not applied to the live form; task #337).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```

### Turn 554 — commit `30f1b45` on restoration/sprint-0-1 (hash from the release report and later turns; preceded by `git restore ml/models/first_attempt_logreg_v1.json`)

```
D-39: one design-edit rule for the API and the demo (shared engine), identical refusal and 403 wording; journey screenshot script

The engine's designEditRefusal (edits.ts) decides which design edits a room accepts in each lifecycle state, and the API (every device,
connection and room-detail edit) and the demo (add, remove, swap, "Substitute the model") both run it. The API's wording is kept byte
for byte:
- PLANNED: every edit; a model change changes the planned model.
- Any later state: "the design is <state>: changes need a change order".
- Recommissioned: only a model substitution; a move gets the API's "only a model substitution is accepted" sentence.
- Like-for-like unit replacement: field work from INSTALLED_UNVERIFIED through COMMISSIONING (planReplacement).

The demo disables refused controls and shows the sentence; refused edits are in its ledger as DENIED and in the Room Story. The
revision-approval 403 now reads the same in the API and the demo ("<role> may not approve a design revision (needs
room.design.approve)") through an optional route `action`. OpenAPI unchanged, 156 operations.

Tests: the scenarios that relied on the demo's looser rule now run where the rule allows them. The camera swap and the microphone
addition happen while PLANNED; recommissioning uses a model substitution. Each now-refused edit has an explicit refusal check (engine
"D-39 …", demo unit "D-39 …" plus the PARITY test over five states, story PLANNED-swap test, API RN-16, demo browser B-06b, B-15d,
B-15l, C-37, C-10f). Every changed assertion is listed in the agent report kept with the checkpoint docs.
Matrix 56 PASS, 0 FAIL, 1 NOT_RUN (film decode): unit 269, integration 67/68 (1 NOT RUN live Teams/Outlook), security 169, e2e 228,
browser 317, deploy 204.

scripts/evidence/journey-screens.mjs captures the Living Room journey at 1440 and 390 (output kept out of git, in the handoff).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```

### Turn 554 — commit `b5d152f` on restoration/sprint-0-1 (hash from the release report; preceded by `git restore ml/models/first_attempt_logreg_v1.json`)

```
Release-candidate UX fixes from the final review of the investor demo at 360/768/1440 (no redesign)

Found by a sweep of both sites. The website had no findings in 48 page×width checks: no overflow, broken image, failed request,
console error, clipped text, off-screen control or text under 12 px. The demo fixes:
- Search Party: a result's name wrapped one letter per line on phones (and to 3 lines on desktop), because the type label and subtitle
  columns took its width. The type label is now its own row, the name and id share a row, and the subtitle has a full row.
  The search box and the type filter wrap.
- APEX: "Incidents without a case" rows wrap their action below the card instead of squeezing it.
- Product rail: "Investor start" leads (it was scrolled out of view on phones and tablets). "Pro" opens the native Pro page (KPI
  passports, #/v25/exec) instead of a not-migrated page.
- Boundary pages: sentence-case heading. The Commissioning and Assurance boundaries still say plainly that the area is not migrated as
  its own page, and link to the native pages that run the same engine (Build a Room's plan; a Room Story; APEX).
- Status tags, tab counters and tour dots: 11 px -> 12 px.
- Build a Room: "Approve revision N" is no longer offered once revision N is the approved one.

Regression: tests/browser/demo-ux.test.mjs UX-01..UX-07 at 360/768/1440 (24 checks). Run against the pre-fix build (30f1b45), 14 of
them fail, including UX-01 at desktop; after the fix 24/24. demo.test 163/163, demo unit 32/32; site audit --strict P0 0, P1 0,
P2 75, P3 526 (committed baseline 92/556).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```

### Turn 555 — commit `9fa4a55` on restoration/sprint-0-1 (preceded by `git restore ml/models/first_attempt_logreg_v1.json`)

```
Evidence from the final matrix on b5d152f (57 suites PASS, 0 FAIL, 1 NOT_RUN film decode; RELEASABLE platform) and the release-candidate report draft

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```

### Turn 556 — commit `ebcecb0` on restoration/sprint-0-1 (top of the release candidate; hash from the assistant's summary)

```
Release-candidate report completed: clean-copy CI rehearsal PASS on 9fa4a55 (57/0/1, no suite differs); journey and site screenshots recaptured on the final build; build status pointer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```
Handoff: `git bundle create /tmp/handoff/empathia-restoration-sprint-0-1.bundle ea84222..restoration/sprint-0-1` + `.sha256` (checksum value not in transcript); rehearsed fetch into a clone reset to ea84222: fast-forward from main.

### Turn 569 — commit (hash not shown) on phase2/living-universe

```
Media rights: ElevenLabs Starter plan evidence (non-personal facts only)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```
(The Slice 0 agent's commit `23f03e9` with docs/phase2/* is referenced in the turn-569 agent prompt as the base of the reference-room work; its message is not in the transcript.)

### Turn 570–571 — cherry-picks onto phase2/living-universe: website wave 1 `2edff2d`, `911261e`; labs `afe3ba8` (agent commits; their messages and the new hashes are not in the transcript).

### Turn 575 — commit (hash not shown) on phase2/living-universe (`git add -A apps/website tests/browser/website.test.mjs`)

```
Founder page: the founder's own professional overview beneath his name (credentials kept separate) and his founding story, closing on 'My Cinderella shoe.' as its own line

Text supplied by Jeremiah Johnson on 2026-11-01 (05:42 and 05:46 CT), used verbatim (apps/website/src/founder.ts). Tests: W-*-founder-bio and
W-*-founding-story at every width; website 197/197.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```

### Turn 576 — cherry-pick of reference-room agent commit `b68a2d1` onto phase2/living-universe (new hash not shown); worktree agent-a039e2512b9307d34 removed afterwards.

### Turn 576 — commit (hash not shown; tool #5, Reference-room Learn links) on phase2/living-universe

```
Reference room: Learn links go to the real labs (camera → Camera Lab, microphones/DSP/loudspeakers → Audio Lab); the network lab is stated as planned, never linked

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```

### Turn 576 — commit (hash not shown; tool #33, Campus floor-plan labels) on phase2/living-universe

```
Campus floor plan: room labels fit their footprints (number alone when the name would spill); a schematic building core gives the plate its bearings

Measured check CN-*-03b on every floor holding a room, at 360/768/1440.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```

### Turn 576 — commit (hash not shown; tool #70, Parity ledger + audit record) on phase2/living-universe

```
Parity ledger: campus and Learn rows describe the reference room and the three new labs; reference-room doc records the strict site audit (P0 0, P1 0)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```

### Turn 576 — commit (hash not shown; tool #74, ElevenLabs download blocker) on phase2/living-universe

```
ElevenLabs evidence: generated audio cannot reach the workspace (allowlist), so no credits spent; two ways forward recorded

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
```
