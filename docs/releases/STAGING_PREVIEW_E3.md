# Enterprise 3.0 staging previews

Founder decision E3-D4 (23 Nov 2026): "You may create and update isolated staging previews following successful exact-commit
regression. Do not update the canonical Next websites without my approval."

These two sites are previews. They are not the production sites and not the canonical Next sites, and neither of those was touched.

| | Preview | Render service | Follows |
|---|---|---|---|
| Corporate website | https://empathia-website-e3-preview.onrender.com | `empathia-website-e3-preview` (srv-dc2f35nlk1mc739pn79g, static site) | branch `preview/enterprise-3` |
| Demonstration | https://empathia-demo-e3-preview.onrender.com | `empathia-demo-e3-preview` (srv-dc2f36dg1s2s73b4o43g, static site) | branch `preview/enterprise-3` |

Both are static sites on the free plan in the existing workspace; no paid resource was created. The website preview's build writes
a `robots.txt` that disallows everything, so the previews are not indexed. Every record in the demonstration is synthetic.

`preview/enterprise-3` is moved only to a commit whose exact-commit regression has passed and whose evidence is committed.

## What is deployed

| Date (UTC) | Commit | Regression on that commit | Website deploy | Demo deploy |
|---|---|---|---|---|
| 24 Nov 2026 02:09 | `8597d2ea` | PASS 291 · FAIL 0 · NOT_RUN 2 (evidence in `6f97ce6d`) | dep-dc2f35vlk1mc739pn81g, replaced | dep-dc2f36lg1s2s73b4o4h0, replaced |
| 24 Nov 2026 07:48 | `9bc47b27` | PASS 293 · FAIL 0 · NOT_RUN 2 (evidence in `85264964`) | dep-dc2k1rdbedkc73b3jsfg, replaced | dep-dc2k1rdbedkc73b3jsc0, replaced |
| 24 Nov 2026 10:26 | `26c81f0d` | PASS 293 · FAIL 0 · NOT_RUN 2 (evidence in `bd457a4d`) | dep-dc2mbte7bikc73fsvoi0, replaced | dep-dc2mbte7bikc73fsvoe0, replaced |
| 24 Nov 2026 13:49 | `1dae3703` | PASS 293 · FAIL 0 · NOT_RUN 2 (evidence in `ce773198`) | dep-dc2pb38m7kps73d58vog, live | dep-dc2pb38m7kps73d58vs0, live |

The two NOT_RUN suites are the machine-learning prototype (its dataset is not generated) and the film decode check (needs `--films`).
NOT RUN is not PASS.

## Live check of `1dae3703`, 24 Nov 2026 13:57 UTC

Opened in a browser against the live addresses: 28 of 28 checks held. The 26 checks of the earlier live check (below) held again; the
APEX check now also requires the hypothesis's three citations as a list and no stretched layer; two were added for the design pass:

| Address | As | Result |
|---|---|---|
| demo `#/room` | Service Manager | all eleven device names in the 3D view are inside the drawing and none lies on another; the delivery spine's stage names sit on one line |
| demo `#/v25/service?id=ISS-0417`, then its work order | Service Manager | the job's work order number is a link and opens that work order; the work order says where the job stands; its row of other products is not cut off |

Both previews publish `BUILD_MANIFEST.json`; each named `sourceCommit` `1dae3703…` at the time of the check.

**Finding: for several minutes after a deploy the previews can still serve the previous build.** The same check run at 13:52 and
13:55 UTC, three and six minutes after Render reported both deploys live (13:49), held only 25 of 28: the three checks that depend
on the new build failed, on old files. The static sites answer with `cache-control: public, max-age=0, s-maxage=300` and the
entry files (`index.html`, `demo.js`, `demo.css`) keep the same names between builds, so the content network may hold each for
up to five minutes, each on its own clock. By 13:57 all were fresh. Consequences, recorded for the release procedure
(`docs/operations/ENGINEERING_COMPLETION_ROADMAP.md`, A18): a live check is not started until the served manifest names the expected
commit and the served entry files match the manifest's hashes; "deploy live" alone is not proof of what visitors receive. Not
changed here: the cache rule is Render's default for static sites and the previews use no custom headers.

## Live check of `26c81f0d`, 24 Nov 2026 10:42 UTC

Opened in a browser against the live addresses (not the local build): 26 of 26 checks held. The 22 checks of the earlier live check
(below) held again, and four were added for what this commit brings:

| Address | As | Result |
|---|---|---|
| demo `#/assurance/room/R-ATL-4-218` | AV Operations Lead | calling reads outside its targets, from VOICE; no run is offered; no drift record yet |
| the same | Commissioning Engineer | pressing the run writes drift record DR-0001, read from VOICE and labelled simulated; the record is read whole (not clipped) |
| demo `#/v25/apex?case=APX-001` | Service Engineer | VOICE's reading is shown beside the layers; recording it on the case is not offered |
| the same | Service Manager | recording VH-0001 puts it on the case once, with where it came from and "not a root cause" |

The two presses write to the visiting browser's own storage; the previews are static sites and nothing is sent anywhere.

Not checked live: the offline worker, exports, the repair journey end to end and the other journeys (covered by the regression on
the same commit, on the local build).

## Live check of `9bc47b27`, 24 Nov 2026 08:20 UTC

Opened in a browser against the live addresses (not the local build): 22 of 22 checks held.

| Address | As | Result |
|---|---|---|
| website `/` | visitor | 200; the platform in one figure, six families on "Shared engineering intelligence"; demo links point at the demo preview only |
| website `/platform` | visitor | 200; the figure states 6 families and 17 capabilities, 9 of them the original products; six questions; the issue thread of ten steps |
| website `/platform/operations`, `/design`, `/field`, `/infrastructure`, `/experience`, `/collaboration` | visitor | 200 each; the family is marked in its place in the figure |
| website `/platform` at 390 px | visitor | no sideways scroll; no link in the figure under 24 px tall |
| website `/voice`, `/robots.txt` | visitor | 200; `Disallow: /` |
| demo `#/families` | Executive, Product Architect, AV Operations Lead at 390 px | the platform map; some capabilities closed to the Executive, none to the Architect; no sideways scroll on a phone |
| demo `#/servicehands?id=ISS-0417` | Service Engineer | the incident carries its job row |
| demo `#/here/R-ATL-4-218` | Employee | not sent to a refused page |
| demo `#/campus/BCN/3/R-BCN-3-225?tab=tests` | Installation Engineer | links the role may not open are text, not links |
| demo `#/control`, `#/request` | Executive | open |
| demo `#/voice` | UC / Voice Administrator; Employee | opens; refused |
| demo `#/commissioning/room/R-ATL-4-218` | Commissioning Engineer | opens |

Not checked live: the offline worker, exports, and the twelve journeys end to end (covered by the regression on the same commit, on
the local build).

## Live check of `8597d2ea`, 24 Nov 2026 02:40 UTC

Opened in a browser against the live addresses (not the local build).

| Address | As | Result |
|---|---|---|
| website `/` | visitor | 200, home page; its demo links point at the demo preview, not at production |
| website `/voice` | visitor | 200, "Calling you can explain" |
| website `/products` | visitor | 200 |
| website `/robots.txt` | — | 200, `Disallow: /` |
| demo `#/voice` | UC / Voice Administrator | VOICE opens |
| demo `#/voice` | Employee | the access page ("VOICE is not open to the Employee") |
| demo `#/voice/callpath/R-ATL-4-218` | UC / Voice Administrator | CallPath of the boardroom |
| demo `#/flow`, `#/missionproof` | Systems Engineer, AV Operations Lead | open |
| demo `#/prism`, `#/sentinel`, `#/accord` | AV Operations Lead | open |
| demo `#/forge` | Designer | opens |
| demo `#/omnipresence` | Employee | opens |
| demo `#/families` | Executive | opens (at this commit titled "Six families, one record") |
| demo `#/v25` | Product Architect | Mission Control opens |

Not checked live: the offline worker, exports, and the phone layout (these are covered by the regression on the same commit, on the
local build). The website has no `/flow` page at this commit; that address returns the site's own 404 page.

## What is not in the previews yet

Work after `1dae3703` is on `v18/continuation` and reaches the previews only after its own exact-commit regression. Nothing
directed on 24 Nov beyond the design pass is built yet; the plan is `docs/operations/ENGINEERING_COMPLETION_ROADMAP.md`.
