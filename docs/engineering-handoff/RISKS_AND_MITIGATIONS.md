# Risks and mitigations

Likelihood (L) and impact (I): H / M / L, as judged from the repository today. Owners are roles from `TEAM_AND_OWNERSHIP.md`.

## Technical

| Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|
| Dependency swaps (pg, HTTP framework) change behaviour subtly (error mapping, idempotency, RLS context) | M | H | keep `tests/integration/api.test.mjs` and `tests/security/authz.test.mjs` as the contract; swap one layer at a time; `export-openapi.mjs --check` | tech lead |
| Demonstrator and starter rules diverge | M | M | 92 golden parity cases; decide the single source of truth for rule data (TD-11) | domain engineer |
| Containers fail on first run (never run here) | M | M | WP1 in the first two weeks | platform |
| Offline-built tool versions differ from registry versions | M | L | lockfile from the first connected install; rerun all suites | platform |
| Field client offline sync conflicts | M | H | server stays the authority; drafts are proposals until accepted; conflict tests | backend + QA |

## Security

| Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|
| Development identity provider or HS256 secret used beyond development | L | H | `config.ts` refuses `AUTH_MODE=dev` and missing secrets in production; OIDC in WP3 | security |
| Token theft from `sessionStorage` (XSS) | M | H | CSP already strict on the web server; move tokens out of page storage (TD-04) | frontend + security |
| RLS misconfiguration on a managed PostgreSQL service | L | H | the security suite's RLS tests run against every environment; runtime role NOBYPASSRLS | platform + security |
| Malicious evidence uploads | M | M | media-type allowlist exists; add malware scanning (TD-06) | security |
| No external security testing yet; the demonstrator's page-API assessment is outstanding | H (that it is missing) | H | external penetration test before any pilot (WP11); never claim an audit that did not happen | security |

## IP and provenance

| Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|
| Copyright protection and ownership of substantially AI-generated code and documents are uncertain | H | H | `provenance/AI_ASSISTANCE_RECORD.md` states the facts; obtain counsel's advice before relying on copyright; consider trade-secret handling and contracts | founder + counsel |
| Connection of any work to a former employer or client | unknown | H | `provenance/chain-of-title/CHAIN_OF_TITLE_CHECKLIST.md`; counsel review before fundraising or sale | founder + counsel |
| Third-party media rights (narration, generated footage, music) unverified; many media files not in the rights ledger | H | M | only VERIFIED, channel-authorized assets in external builds; complete the rights ledger | founder |
| Trademark not cleared for "Empathia" and product names | M | M | clearance search by counsel before public launch | founder + counsel |
| Open-source licence obligations | L | M | SBOM and licence texts in `provenance/sbom`, `provenance/licenses`; keep them generated in CI | tech lead |

## Data

| Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|
| Personal data in audit and evidence (names, e-mails, actor ids; hashed identifiers are not presumed anonymous) conflicts with erasure requests, because evidence and audit are append-only | M | M | data-protection review; pseudonymisation strategy for actors; retention schedule per table | security + counsel |
| Synthetic data mistaken for real performance | M | H | every surface labels synthetic data; KPIs state definitions; `NOT_MONITORED` until monitoring evidence exists | product |
| Models trained on biased or confounded field data later | L (no model yet) | M | model card preconditions in `ml/model-cards/`; temporal hold-out; never a decision gate | data/ML (later) |

## Delivery

| Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|
| Scope spread across eighteen products | H | H | commercialize the seven-product lifecycle in the order in `docs/product/PRODUCT_ARCHITECTURE.md` §4; expansion products need an approved acceptance matrix first | founder + CTO |
| Pilot site and instruments not available when the software is ready | M | H | line up the pilot early; the domain engineer owns site readiness | domain engineer |
| Knowledge concentrated in AI session history | M | M | this documentation set; decisions recorded in the repository from now on | tech lead |

## Market

| Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|
| Buyers expect integrations that are only catalogued | H | M | say CONTRACT_ONLY plainly; deliver read-only integrations in priority order | product |
| Evidence-gated commissioning seen as slower than checklist sign-off | M | M | show time saved by compiled plans and generated reports; pilot metrics measured, not modeled | product |
| Competing platforms in AV monitoring and service management | M | M | differentiate on evidence, verification separation and the cross-product lifecycle, not on monitoring alone | founder |
