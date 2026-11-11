# Engineering checkpoint

One page. Updated at every verified checkpoint. Read this first when resuming; do not reconstruct the history.

**Mode (founder, 11 Nov 2026 13:21):** one engineer, sequential, no AI workers or subagents. Scripts and automated tests are tools, not
agents.

## Where the source is

| | |
|---|---|
| Repository | `/home/claude/empathia-technologies` (GitHub `jeremiahjohnson754-cmyk/empathia-technologies`) |
| Working branch | `v18/continuation` — pushed at every commit |
| Staging branch | `phase3/legendary-experience` — Render deploys it (demo `srv-dbl7hq0m7kps739gsgbg`, website `srv-dbl7hpm1egvs73e0uj0g`) |
| Production | `main` at `219d75f`, untouched; needs the founder's word |

## State (11 Nov 2026, afternoon)

| | Commit | Evidence |
|---|---|---|
| Staging carries | `bc5489a` | full browser matrix, light and dark, 44 suites exit 0 each; `founder-studio` NOT RUN |
| Working branch | `0c5c116` | type-check clean · build PASS · `node scripts/test.mjs` PASS 72 · FAIL 0 · NOT_RUN 55 · browser suites of the merge being run |

Merged since staging (all on `v18/continuation`, none yet on staging):

| Slice | Where | Verified |
|---|---|---|
| Connect: people directory, contact actions, Teams deep links, scheduling with confirmation, Graph adapter | `apps/demo/src/connect/**`, `docs/surpass/CONNECT.md`, `M365_DEPLOYMENT_AND_TEST_GUIDE.md` | unit 42/42; browser on merged tree: see below |
| Room guide ("How do I use this room?") for 90 rooms | `apps/demo/src/guides/**` | unit 6/6; **no browser suite yet** |
| Phase 5: documentation tracking, deliverables, field capture; Phase 6 reads it | `packages/proof-registry/src/documentation.ts`, `apps/demo/src/docs5/**`, `docs/surpass/PHASE5_DOCUMENTATION.md` | package 43/43; unit 6/6; browser 68/68 light and dark |
| Stadium: The Critical Signal | `apps/demo/src/gameday/signal/**` | worker's run: unit 22/22, browser 93/93 light and dark |
| Knowledge Ledger and governed ingestion (simulated source) | `apps/demo/src/knowledge/**`, `docs/surpass/KNOWLEDGE_FABRIC.md` | worker's run: unit 13/13, browser 104/104 light and dark. Integrator read the single redaction point (`ledger.ts › viewFor`); a separate adversarial review was started and did not finish |

## Not merged

| Branch | State | Next |
|---|---|---|
| `agent/website-collabora-founder` (`84fa75e`, worktree `.claude/worktrees/agent-afe2350ec7847f8ba`) | Stage 1 done per its commits; founder-page story and photograph reveal half-written (`founderStory.tsx`, `reveal.ts`, `founder.css`), untested | finish directly, verify website suites, merge |
| University `a0082db…`, Convention `a39a4d4…`, instruments, films 1–4 | early WIP on their branches | after the priorities below |
| Engineering manual | private scratch only: `…/scratchpad/manual-source/INVENTORY.md` | PRINCIPLES, OUTLINE, OPEN_QUESTIONS, then a DRAFT in the product; nothing from the archive enters the repository |

## Simulated, pending, blocked (say so everywhere)

- Room Control, the calendar, the document source for knowledge ingestion: **simulated**.
- Microsoft Graph adapter: **mock-tested only**. Real tenant validation, actual event creation, live Teams, SharePoint: **pending**; needs
  the tenant, accounts and devices listed in `M365_DEPLOYMENT_AND_TEST_GUIDE.md`.
- Physical phones, screen readers, browsers other than Chromium: **not run**.
- Films: nobody has watched or heard them end to end. ElevenLabs: blocked at the gateway (403); do not retry in this session.
- Knowledge zones 1 and 2 are `IN_REVIEW`: written by the engineer, not reviewed by a practising AV engineer, never shown as fact.

## Assumptions awaiting the founder (none blocks work)

1. Engineering review of a technical waiver comes from the Product Architect.
2. Phase 5 role lists (`apps/demo/src/docs5/roles.ts`): who assigns, submits, reviews, acknowledges.
3. Time zones per campus in Connect are modelling assumptions.
4. Empathia-authored knowledge needs his (CTS) review before it can be marked approved.

## Next, in order (founder's priorities of 11 Nov 13:21)

1. Browser suites on the merged tree → fix → full matrix light and dark → push to staging.
2. Website: finish the founder page (story verbatim from `apps/website/src/founder.ts`, photograph kept, 10-second reveal), merge.
3. Browser suite for the room guide.
4. Search Party and contextual actions: "who knows this room" across Search, Ask, room, ServiceHands (check what Connect already covers).
5. Site Champion: profile, onboarding and training, notes into the Knowledge Ledger queue (done in Knowledge; verify end to end).
6. Harmony tool registry over the existing actions (same authority checks, never self-granting).
7. Instant Room on a phone and guided commissioning; Drawing Intelligence; Lite.
8. Publications: IT Onboarding Success Guide (four editions), End User Success Guide chapters, the Engineering Standards Manual (DRAFT).
9. Townhall; University; Convention; SIGNAL; corporate polish and films.

## Commands

```bash
cd /home/claude/empathia-technologies
flock /tmp/empathia-test.lock node scripts/build.mjs --public        # build both public apps (scripts/test.mjs does NOT build)
node node_modules/typescript/bin/tsc -p apps/demo --noEmit           # type-check the demo
node node_modules/typescript/bin/tsc -b packages/proof-registry && node --test packages/proof-registry/dist/test/*.test.js
node --test tests/unit/<name>.test.mjs                               # unit suites bundle TypeScript themselves; no build needed
flock /tmp/empathia-test.lock node tests/browser/<name>.test.mjs     # one browser suite, light
PW_COLOR_SCHEME=dark flock /tmp/empathia-test.lock node --import ./tests/browser/color-scheme.mjs tests/browser/<name>.test.mjs
.local/run-matrix.sh .local/logs/<dir> light [suites…]               # full or partial matrix → SUMMARY-<scheme>.txt ending DONE
node scripts/test.mjs                                                # every non-browser suite, against the existing build
git checkout -- tests/evidence media/screenshots                     # after any run
git push origin <verified-commit>:refs/heads/phase3/legendary-experience   # staging, only after a full matrix
```

Rules that bite: never rebuild or edit `tests/browser` while a matrix runs; a changed test carries its reason; NOT RUN is never PASS;
commit attribution lines are required; no credentials in chat, logs or commits.
