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
| 24 Nov 2026 13:49 | `1dae3703` | PASS 293 · FAIL 0 · NOT_RUN 2 (evidence in `ce773198`) | dep-dc2pb38m7kps73d58vog, replaced | dep-dc2pb38m7kps73d58vs0, replaced |
| 25 Nov 2026 00:30 | `87956a57` | PASS 296 · FAIL 0 · NOT_RUN 2 (evidence in `bf9adfa8`) | dep-dc32ni4s728c738h7l6g, replaced | dep-dc32ni4s728c738h7l30, replaced |
| 25 Nov 2026 03:14 | `037b9f76` | PASS 298 · FAIL 0 · NOT_RUN 2 (evidence in `54352acd`) | dep-dc354ass728c738juaeg, replaced | dep-dc354ass728c738juab0, replaced |
| 25 Nov 2026 06:28 | `8891a3fd` | PASS 299 · FAIL 0 · NOT_RUN 2 (evidence in `ddec71b7`) | dep-dc37v8gae00c738gh0sg, replaced | dep-dc37v8gae00c738gh0p0, replaced |
| 25 Nov 2026 20:04 | `642f6934` | PASS 304 · FAIL 0 · NOT_RUN 2 (evidence in `1a277e8e`) | dep-dc3jr0ojo6nc73ag1650, replaced | dep-dc3jr0ojo6nc73ag15vg, replaced |
| 26 Nov 2026 03:47 | `1fa2a07e` | PASS 304 · FAIL 0 · NOT_RUN 2 (evidence in `008083a2`) | dep-dc3qnaa9lscs73degqa0, replaced | dep-dc3qnaa9lscs73degqdg, replaced |
| 26 Nov 2026 10:29 | `6e0d7877` | PASS 305 · FAIL 0 · NOT_RUN 2 (evidence in `a173355b`) | dep-dc40jk59el5s73ark5qg, replaced | dep-dc40jk59el5s73ark5n0, replaced |
| 26 Nov 2026 16:20 | `68ea38ea` (served as `018302f7`) | PASS 305 · FAIL 0 · NOT_RUN 2 (evidence in `018302f7`) | dep-dc45nk8ae00c73d8moug, replaced by dep-dc45no1aekrs73chenj0, replaced | dep-dc45nk8ae00c73d8mor0, replaced by dep-dc45no28ghsc73fbcn20, replaced |
| 26 Nov 2026 21:37 | `4231f6a2` | PASS 319 · FAIL 0 · NOT_RUN 2 (evidence in `b915d54a`) | dep-dc4achrbc2fs739id8p0, replaced | dep-dc4achrbc2fs739id8lg, replaced |
| 27 Nov 2026 02:51 | `e2c9b213` | PASS 319 · FAIL 0 · NOT_RUN 2 (evidence in `fec0ac5e`) | dep-dc4evu3bc2fs739n32lg, live | dep-dc4evu3bc2fs739n32i0, live |

The two NOT_RUN suites are the machine-learning prototype (its dataset is not generated) and the film decode check (needs `--films`).
NOT RUN is not PASS.

## Live check of `e2c9b213`, 27 Nov 2026 02:53 UTC

Only the tested commit was pushed to the preview branch; its evidence commit `fec0ac5e` stays on `v18/continuation`. Both deploys
went live at 02:51:51 UTC and both served manifests named `e2c9b213…` from 02:52:14 UTC. None of the 1,597 files in the demo manifest
was served stale. The live check passed **43 of 43** on the two previews; the six founder portrait files served are byte for byte the
recorded renditions, and the spelling search still finds Highfield 1.110 for "lecture theatre" and "lecture theater".

New for this build, over `4231f6a2`: one rule for an open service request (`apps/demo/src/workspace/requests.ts`; checks MI-09 to
MI-12 in `tests/unit/metric-integrity.test.mjs` and MC-open-01/02 in `tests/browser/demo-core.test.mjs`). On the `4231f6a2` preview,
Mission Control said 2 open service requests while Pro's Issue Intelligence and ServiceHands said 3: they counted the seed's resolved
request as open. On this preview, read as the service manager, Mission Control, Pro Issue Intelligence, ServiceHands and the V2.5.3
control room all say **2**. A resolved request stays on the service board until it is closed, and counts of requests not yet closed
say so. Where a live request and a room record share an id, the live request wins: ISS-0417's passport (`#/list/Issue/ISS-0417`)
reads "OPEN in ServiceHands; the room record says RESOLVED". An independent review approved the commit before the regression ran.

Found during this check, for the next wording pass: the search result row says "modelled" (the derived spelling forms are on the
checkpoint's list of what the pass does not yet cover).

## Live check of `4231f6a2`, 26 Nov 2026 21:38 UTC

Only the tested commit was pushed to the preview branch; its evidence commit `b915d54a` stays on `v18/continuation`. Both deploys
went live at 21:37 UTC and both served manifests named `4231f6a2…` from 21:37:52 UTC. None of the 1,596 files in the demo manifest
was served stale. The live check passed **43 of 43** on the two previews, and the six founder portrait files served are byte for
byte the recorded renditions, as before.

New for this build, over `68ea38ea`: the wording pass (founder decisions CR-D2, CR-D3 and CR-D4 of 26 Nov 04:50 CT;
`docs/qa/WORDING_CHECKPOINT_2026-11-26.md`). The text people read in the demonstrator, the website and the shared interface package
is American English; fictional American places say Center and Theater; Collabora-SING is the one spelling shown; the two comparison
documents are in the private store and neither site names a competitor. Search finds either spelling: on the demo preview,
"lecture theatre" and "lecture theater" both return one result, Highfield 1.110, the first with the note that "theatre" was read as
"theater". The run counts 319 suites, not 305: it runs thirteen unit files written 12–13 Nov that no run of record had listed,
and the new spelling search check.
Not yet changed, and said so in the checkpoint: text from other packages and the API, labels made from enum values, and some
one-word labels.

## Live check of `68ea38ea` (served as `018302f7`), 26 Nov 2026 16:22 UTC

The tested commit `68ea38ea` was pushed to the preview branch first and went live at 16:19 UTC; its evidence commit `018302f7`
followed by mistake a minute later (the evidence was meant to stay off the preview branch, as before) and replaced it at 16:20 UTC.
The two differ only in `tests/` (the evidence and the ledger), which no build reads, so the served product is the tested one; the
preview branch was not moved back, since that would rewrite its history. Both served manifests named `018302f7…` from 16:21 UTC;
none of the 1,595 files in the demo manifest was served stale. The live check passed **43 of 43** on the two previews.

New for this build: the founder photograph supplied 25 Nov 2026, with the square crop he approved on 26 Nov (04:30 CT), colours
converted from its Display P3 profile to sRGB, nothing retouched (`docs/media/FOUNDER_PORTRAIT.json`). Checked on the website
preview's founder page: the page shows the portrait, and all six served renditions (320, 640 and 960 pixels, WebP and JPEG) are byte
for byte the recorded files. Also: Expo LIVE, Stadium LIVE and Campus Life report their level of detail in the frame it changes. The
regression before it, on `6be9fc5b`, failed in part 1 on that report and was stopped (`tests/evidence-failed/6be9fc5b-2026-11-26T11-28-failed/`).

## Live check of `6e0d7877`, 26 Nov 2026 10:36 UTC

Both served manifests named `6e0d7877…` from 10:30 UTC, about two minutes after the branch moved; none of the 1,593 files in the demo
manifest was served stale. The live check passed **43 of 43** on the two previews. This build carries the first slices of the 25 Nov
commercial-readiness directive (metric integrity, the demo home hierarchy, the website's Experiences page with nine worlds) and the
phone-shell test correction. The regression before it, on `60393384`, failed in part 1 on a timing race in that test and was stopped
(`tests/evidence-failed/60393384-2026-11-26T02-07-stopped/`); `6e0d7877` corrects the test and nothing in the product.

## Live check of `1fa2a07e`, 26 Nov 2026 03:50 UTC

Both served manifests named `1fa2a07e…` from 03:48 UTC, about a minute after the branch moved; none of the 1,593 files in the demo
manifest was served stale. The live check passed **38 of 38** on the two previews. New for this commit:

- **Expo LIVE** (`#/play/expo?detail=full`): the Full quality box is ticked by the address, the hall reads "held at full detail" and
  links "Measure this device" to the performance check.
- **Campus Life**: the pause sheet offers Full quality, and turning Sound on keeps the scene drawing. On `642f6934` turning Sound on
  stopped the scene (the renderer was rebuilt on a lost context); that was live on the previews until this deploy.

The preflight (build, every non-browser suite, the 82 browser suites the change reaches) passed before the regression; on the first try
it caught the Expo booth card covering Done on a phone, fixed in `1fa2a07e`.

## Live check of `642f6934`, 25 Nov 2026 20:06 UTC

Before the check both served manifests named `sourceCommit` `642f6934…` (from 20:04 UTC, about eight minutes after the branch moved),
and every one of the 1,593 files in the demo manifest was served with the hash the manifest gives. The live check
(the scratch script used for every staging, extended for this commit) passed **36 of 36** on the two previews. New for this commit:

- **Stadium with the diagnostic switch** (`#/play/stadium?detail=full&lod=simple`): the Full quality box is not ticked while the far crowd
  is drawn simply (48 sections), and the page links to the performance check (the finding of the previous live check, corrected in `5155da7b`).
- **Performance check** (`#/play/performance?short`): it opens with nothing measured and four sentences on what it is and is not; asked,
  it ran to the end: six sizes (13, 10.9, 7.1 and 4.7 frames a second; the two largest not run because the step before was below five),
  and the three scenes each with a pace at the size of their own page (campus 18.5 at 1120×702, stadium 5.1 at 768×684, expo 27.3 at
  748×666). Nothing was sent: every request was a GET of the preview's own files. These figures are of the cloud machine that ran the
  check, drawing WebGL in software without a GPU; they are not a measurement of any customer's device.
- **Return trail**: a room's replay opened for the first time is offered as "Back to Replay: Atlas 4.218 Boardroom", its own name (not
  the workspace's); an unknown room (`#/replay/R-NOPE`) says so and is not kept; the next room's replay says nothing of "Room not found".

The remaining 33 checks are those of the previous live checks (every product's main pages on both sites, the manifests, the security
headers, the offline copy, the export cards, the 3D scenes, the role refusals) and passed unchanged.

## How to measure a device with the performance check

On the desktop or phone to be measured, open https://empathia-demo-e3-preview.onrender.com/#/play/performance and press
**Run the check**. It takes about two minutes, sends nothing, and needs no sign-in. It draws a test scene at six sizes, then each of the
three 3D scenes at the size of its own page, and reports what the device held against the interactive target of 30 frames a second
(and 60 for a smooth one), with the browser's memory where it reports it. **Export** saves the result as a file; that file, with the
device's name, is what `docs/performance/DEVICE_RESULTS.md` records. No customer device has been measured yet.

## Live check of `8891a3fd`, 25 Nov 2026 06:30 UTC

Opened in a browser against the live addresses: 33 of 33 checks held. The 31 of the checks below held again, and two were added for
what this commit brings, the simpler drawing of distant spectators and the control that overrides it:

| Address | Result |
|---|---|
| demo `#/play/stadium?detail=full`, and the same with `&lod=simple` | full quality draws all 48 sections in view whole, 53,174 triangles a frame, and its "Full quality" box is ticked; the simple drawing draws all 48 simply, 34,394 triangles, the tallest simplified spectator 4.1 drawn pixels (the line is 6.9) |
| demo `#/play/stadium`, then its "Full quality" box ticked | as opened on the checking machine: 50% detail, the far crowd simple, and the page says so; ticked: every section whole, 100% detail, 53,174 triangles, and the note no longer says otherwise |

What the scene chose on its own is the checking machine's choice, not a visitor's: that machine has no graphics processor. On a
device that holds 24 frames a second the stadium draws every spectator whole at full detail without the box being ticked. No
visitor's device has been measured.

Before the check both served manifests named `sourceCommit` `8891a3fd…` (from 06:28 UTC, about half a minute after Render reported
the second deploy live) and every script, style and page in the demonstration's manifest matched its hash.

FOUND in this check, not yet corrected in the previews: opened with the diagnostic switch `&lod=simple` beside `?detail=full`, the
page draws the far crowd simply (as the switch asks) while its "Full quality" box shows ticked. A visitor does not meet that
address; the box should not claim what is not drawn. Corrected on `v18/continuation` after this commit.

## Live check of `037b9f76`, 25 Nov 2026 03:32 UTC

Opened in a browser against the live addresses: 31 of 31 checks held, the same 31 as the check below. This commit changes what a
frame costs and not what a page shows (the stadium sends about half the triangles for the same picture), so no check was added for
it; the regression on the commit holds each scene to its counted budget. Before the check both served manifests named
`sourceCommit` `037b9f76…` (from 03:29 UTC) and every script, style and page in the demonstration's manifest matched its hash.

## Live check of `87956a57`, 25 Nov 2026 00:33 UTC

Opened in a browser against the live addresses: 31 of 31 checks held. The 28 checks of the earlier live check (below) held again, and
three were added for what this commit brings, the drawing detail that follows the frame rate:

| Address | Result |
|---|---|
| demo `#/play/campus?detail=full`, then `#/play/campus` | full detail when asked (100%); left alone the scene settled at 50%; the canvas kept its size on the page and its backing size was the detail times the page size; no sideways scroll |
| demo `#/play/stadium`, the same two ways | 100% when asked; settled at 50% |
| demo `#/play/expo`, the same two ways | 100% when asked; settled at 64% |

The level each scene settled at is the checking machine's, not a visitor's: that machine has no graphics processor and draws WebGL in
software (it read 9, 4 and 16 frames a second at full detail and 20, 7 and 27 adapted). On a device that holds 24 frames a second the
scenes stay at full detail. No visitor's device has been measured.

Before the check, the served files were compared with the manifest, as the finding below requires: both previews' `BUILD_MANIFEST.json`
named `sourceCommit` `87956a57…` from 00:30:40 UTC (39 seconds after Render reported the second deploy live; the two readings before
that still named `1dae3703`), and at 00:32 every script, style and page the demonstration's manifest lists was fetched and its hash was
the manifest's (none stale).

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

Work after `1fa2a07e` is on `v18/continuation` and reaches the previews only after its own exact-commit regression. That now includes the first slices of the 25 Nov commercial-readiness directive (metric integrity, the layered
Mission Control, product subtitles, the website's proposition headline and nine worlds), waiting for their preflight. Of what was
directed on 24 and 25 Nov, the previews carry the design pass and four pieces of the rendering-performance work, the simpler
drawing of distant spectators among them; the rest is not built yet; the plan is `docs/operations/ENGINEERING_COMPLETION_ROADMAP.md`.
