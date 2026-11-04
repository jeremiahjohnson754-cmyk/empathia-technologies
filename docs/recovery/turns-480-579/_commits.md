
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
