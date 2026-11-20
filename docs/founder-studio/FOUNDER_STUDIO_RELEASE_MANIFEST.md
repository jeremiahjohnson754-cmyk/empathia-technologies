# Founder Studio release manifest

Directive 18 Nov 2026 21:34, §16: "Exact commit, deployed route, build identifier, tests, unresolved blockers and rollback details."
As of 19 Nov 2026.

## What is released, and where

| Part | Where it runs | Exact commit | Build identifier |
|---|---|---|---|
| Founder Studio (private) | the founder's own computer only, through its launcher (`apps/founder-studio/server/serve.mjs`, 127.0.0.1, per-launch key); not deployed to any host | a19216e (the tested candidate) | built locally by `node scripts/build.mjs`; its private assets are provisioned from the private store by `scripts/private/founder-studio-assets.mjs provision` and checked against `apps/founder-studio/PRIVATE_ASSETS.json` |
| Public founder page | `https://empathia-website-next.onrender.com/founder` (staging) | a19216e | website `BUILD_MANIFEST.json`: sourceCommit a19216e04fbb9edeb2c34a81bf980373484e7b33, built 2026-11-19T14:24:37Z; `founder/index.html` SHA-256 starts 87a7cdc44b403135 |
| Living Campus demonstration | `https://empathia-demo-next.onrender.com` (staging) | a19216e | demo `BUILD_MANIFEST.json`: sourceCommit a19216e, built 2026-11-19T14:24:27Z |
| Demonstration API | `https://empathia-demo-api-l04n.onrender.com` (staging) | a19216e | Render deploy dep-dbvgconf3r2c73fuifmg; /health: 48 migrations applied, privileges ok |
| Production (`empathia-website`, `empathia-demo`, branch `main`) | unchanged, 31 Oct 2026 build | — | the founder chose staging only for sharing (19 Nov) |

## Tests

- Exact-commit regression of a19216e: PASS 277 · FAIL 4 · NOT_RUN 2; the Founder Studio suite 19/19; each failure rerun alone
  (details in `docs/releases/STAGING_2026-11-19.md`).
- Live checks on staging: pages 11/11, API smoke 12/12, API edge 6 + 1 not run, two connected browsers 9/9, public exposure 22/22 paths on
  each site.
- QA status: `FOUNDER_STUDIO_FINAL_QA.md` (Cycle One passed; Cycle Two not run).

## Unresolved blockers

1. Cycle Two of the QA (eight adversarial walkthroughs) has not been run; the studio's phone and full accessibility reviews are not run.
2. 31 of the 36 film masters are not on this computer (`FOUNDER_STUDIO_MEDIA_AUDIT.md`); only the founder can supply them.
3. The founder's decisions on the Founder Edition's name and the family legacy section are open (`VERSION_RECONCILIATION.md`,
   directive §8).
4. D18-25: the Campus Life frame-rate floor (CL-13) fails on this machine at 6–7 fps; it is a measurement-stability issue under #245,
   not a Founder Studio defect.

## Rollback

- Staging sites: push the previous staged commit to `phase3/legendary-experience` (`git push origin 10cdb9d:refs/heads/phase3/legendary-experience`
  needs a force, since it moves the branch back) or use Render's "Rollback" on the previous deploy of each static site
  (website `dep-dbve0fui0phs73ck96kg`, demo `dep-dbve0fui0phs73ck96gg`, both 10cdb9d).
- Staging API: not by Render's "Rollback" alone. The database now has migration 0048, and the API checks at start that the database's
  privileges match its own release (#193); 3143112's list does not include 0048's functions, so 3143112 would start unhealthy and
  refuse requests, by design. A rollback goes forward: a new commit that reverts the change and adds a migration dropping 0048's floor
  function, trigger and constraint (0048 changes no data), run through the exact-commit regression and staged as usual.
- Founder Studio: the founder's computer keeps whatever it last built; check out the previous commit and rebuild. The private store is
  never changed by a build.
