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
| 24 Nov 2026 02:09 | `8597d2ea` | PASS 291 · FAIL 0 · NOT_RUN 2 (evidence in `6f97ce6d`) | dep-dc2f35vlk1mc739pn81g, live | dep-dc2f36lg1s2s73b4o4h0, live |

The two NOT_RUN suites are the machine-learning prototype (its dataset is not generated) and the film decode check (needs `--films`).
NOT RUN is not PASS.

## Live check, 24 Nov 2026 02:40 UTC

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

Work after `8597d2ea` (the job row across products, calling read by Assurance and APEX, the platform map and the "works with" row,
the six family pages on the website, the journey walks and the links they repaired) is on `v18/continuation` and reaches the previews
only after its own exact-commit regression.
