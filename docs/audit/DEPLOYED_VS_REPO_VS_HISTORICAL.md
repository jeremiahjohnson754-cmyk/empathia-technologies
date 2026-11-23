# Deployed vs repository vs historical — 23 Nov 2026

| Layer | Commit | What it is | How confirmed |
|---|---|---|---|
| Production (`main`): empathia-website / empathia-demo.onrender.com | 27c74695 | fe30ba9d merged, released 20 Nov on the founder's approval | Render deploy list, PRODUCTION_2026-11-20.md |
| Canonical Next sites (`phase3/legendary-experience`): empathia-website-next / empathia-demo-next | fe30ba9d | The 20 Nov build | Render deploy list (23 Nov) |
| Working branch `v18/continuation` | see BUILD_STATUS / git log | fe30ba9d + release records + Enterprise 3.0 days 1–2 | `git log` |
| `restoration/sprint-0-1` (31 Oct release candidate) | 27e3733f | Fully contained in `v18/continuation` (ancestor, 802 commits behind) | `git merge-base --is-ancestor` |
| Historical single-file editions (V2.5.3 live/offline, Founder Edition, signal-standalone) | — | Not in the public tree; their inventories and baselines are under `legacy/` and the parity ledger is generated into the demo | `legacy/inventory`, `apps/demo/src/generated/parity.json` |

Differences between the deployed Next sites and the working branch (what a visitor does not yet see): VOICE (overview, CallPath,
report), FLOW, MissionProof, the platform families page, the UC / Voice Administrator role, the website's `/voice` page and the
families section on `/products`. Nothing else differs in application source.

API: `docs/api/openapi.json` at HEAD is OpenAPI 3.1.0 with 221 operations. The 31 Oct report's 156 is historical. No `/v1/voice`,
`/v1/flow` or `/v1/missions` path exists yet (SPECIFIED: Day 5).
