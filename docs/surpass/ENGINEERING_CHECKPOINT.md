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

## State (11 Nov 2026, 15:30 CT)

| | Commit | Evidence |
|---|---|---|
| Staging carries | `bc5489a` | full browser matrix, light and dark, 44 suites exit 0 each; `founder-studio` NOT RUN |
| Candidate for staging | `62f3188` | type-check clean · build PASS · `node scripts/test.mjs` PASS 72 · FAIL 0 · NOT_RUN 56 · **full matrix running** (`.local/logs/matrix-62f/SUMMARY-{light,dark}.txt`); push to staging only if both end `DONE` with nothing failing but `founder-studio` |
| Working branch | `59ba297` | adds Harmony: unit 7/7, type-check clean, **not built, not browser-tested** |

On `v18/continuation`, not yet on staging:

| Slice | Where | Verified |
|---|---|---|
| Connect: people, contact actions, Teams deep links, scheduling with confirmation, Graph adapter (mock) | `apps/demo/src/connect/**`, `docs/surpass/CONNECT.md`, `M365_DEPLOYMENT_AND_TEST_GUIDE.md` | unit 42/42; browser 119/119 light on the merged tree |
| Room guide for 90 rooms | `apps/demo/src/guides/**` | unit 6/6; browser 17/17 light |
| Phase 5 documentation; Phase 6 reads it | `packages/proof-registry/src/documentation.ts`, `apps/demo/src/docs5/**`, `docs/surpass/PHASE5_DOCUMENTATION.md` | package 43/43; unit 6/6; browser 68/68 light and dark |
| Stadium: The Critical Signal | `apps/demo/src/gameday/signal/**` | unit 22/22; browser 93/93 light on the merged tree |
| Knowledge Ledger and governed ingestion (simulated source) | `apps/demo/src/knowledge/**`, `docs/surpass/KNOWLEDGE_FABRIC.md` | unit 13/13; browser 104/104 light on the merged tree. One redaction point (`ledger.ts › viewFor`) read by the integrator; no separate adversarial review was completed |
| Founder page: Search Party story verbatim, photograph kept, ten-second introduction; Collabora-SING section | `apps/website/src/founderStory.tsx`, `reveal.ts`, `docs/media/FOUNDER_REVEAL_QA.md` | website suite 246/246 light and dark |
| Harmony: tool registry and page | `apps/demo/src/harmony/**` | unit 7/7; browser suite drafted at `…/scratchpad/demo-harmony.test.mjs.draft` (copy into `tests/browser` only when no matrix is running) |

## Not merged

| Branch | State | Next |
|---|---|---|
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

1. When the matrix on `62f3188` is clean: push it to staging and confirm Render.
2. Harmony: build, copy the drafted browser suite in, run light and dark, look at the page at desktop and 390 px, fix, commit.
3. Site Champion: profile and onboarding; notes into the Knowledge Ledger queue end to end.
4. Search Party and contextual actions: "who knows this room" across Search, Ask, room, ServiceHands (check what Connect already covers).
5. Site Champion: profile, onboarding and training, notes into the Knowledge Ledger queue (done in Knowledge; verify end to end).
6. Harmony: more tools as products gain actions (same authority checks, never self-granting).
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
