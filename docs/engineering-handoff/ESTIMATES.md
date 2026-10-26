# Engineering estimates

**Planning estimates, not quotes.** They are ranges in engineer-weeks for the work packages in `WORK_BREAKDOWN_AND_PLAN.md`, made from
reading this repository, not from a team's own sizing. A team that takes the work over should re-estimate after Phase 0. Calendar time
depends on team size and parallelism; with the team in `TEAM_AND_OWNERSHIP.md` (about 5–7 people) several packages run in parallel.

## Assumptions
* Engineers experienced in TypeScript, PostgreSQL and React; one person with AV commissioning experience available.
* Package registry and cloud access available (unlike the build environment of this program).
* Managed services are bought, not built (`BUILD_VS_BUY.md`): identity provider, managed PostgreSQL, object storage, observability.
* The existing test suites are kept and extended; no rewrite of the engines.
* A pilot customer and site are available for Phase 2; their scheduling is outside these numbers.
* Estimates exclude the external penetration test fee, legal work (IP/provenance), and procurement of instruments.

## Estimates (engineer-weeks)

| WP | Work package | Low | High | Main uncertainty |
|---|---|---|---|---|
| WP1 | Reproducible build, CI, containers running | 2 | 4 | first `pnpm install` may surface version drift from the offline tool set |
| WP2 | Dependency swaps (pg, HTTP framework, @types/react, TanStack Query) | 3 | 6 | HTTP framework choice; error mapping and idempotency must be preserved exactly |
| WP3 | OIDC, MFA, token handling, service accounts | 3 | 6 | customer IdP variety |
| WP4 | Platform (managed PG, TLS, secrets, S3 + malware scan, observability, backups) | 4 | 8 | cloud choice; RLS behaviour on the managed service |
| WP5 | KD-01, drawing REVIEW_REQUIRED API test, full acceptance-path test | 1 | 2 | founder decision on KD-01 |
| WP6 | Field client (offline, photos, re-auth) | 6 | 12 | offline sync conflicts; device testing |
| WP7 | Workbook export in the starter | 1 | 3 | .xlsx library choice |
| WP8 | Tenant administration | 2 | 4 | delegated administration rules |
| WP9 | First VERIFIED read-only adapter (+ second) | 3 | 8 per adapter | vendor sandbox access and API terms |
| WP10 | Search Party UI, Pro on real data | 4 | 8 | graph visualisation scope |
| WP11 | Pen-test support and remediation | 2 | 6 | number of findings |
| WP12 | Pilot engineering support | 4 | 10 | site access, instrument availability, rework found in the field |
| WP13 | Intake requests and decisions | 4 | 8 | approval workflow variety |
| WP14 | Assurance on real data | 3 | 6 | availability of VERIFIED observation sources |

Phases 0–2 (WP1–WP7, WP11, WP12): roughly **26–57 engineer-weeks** (sum of the ranges above). With 4–5 engineers in parallel that is roughly 6–14 calendar weeks of pure effort; with the dependencies between packages
(WP3/WP4 before WP6, everything before WP12) and the pilot site's own schedule, plan on one to three calendar quarters — a planning range,
not a commitment.
