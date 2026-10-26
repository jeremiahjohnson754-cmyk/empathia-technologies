# Definition of done

## A change (pull request) is done when
1. It does what its issue says, and nothing claims more than it does (labels, docs, UI copy).
2. Server-side authority: every new write checks its authority in the API (`ctx.require`) and, where it protects data, in the database
   (RLS, constraint or trigger). The UI never decides a permission.
3. Tests: new behaviour has tests at the lowest useful level, **including a negative test** (who may not, what is refused). A bug fix
   has a test that fails without the fix. No test was weakened or its expected values changed to make it pass.
4. `node scripts/build.mjs` passes (TypeScript strict, type-checks, OpenAPI contract `--check`).
5. The affected suites pass (`node scripts/test.mjs`, plus `--browser` for UI changes); results attached.
6. Contracts: a new or changed endpoint is in the route table with its authority and regenerated into `docs/api/openapi.json` and the
   typed client; a new event type is in `packages/event-contracts` with its required payload fields.
7. Migrations are new files (never edit an applied one), reviewed by security when they touch RLS, grants or append-only triggers.
8. Rule changes (`packages/domain-data`, `packages/commissioning-engine`) are reviewed by the domain engineer and the golden cases are
   updated deliberately, with the reason recorded.
9. Documentation updated where behaviour changed; no secrets committed (`scripts/verify/scan-secrets.py` passes).
10. Reviewed and approved by someone other than the author.

## A release is done when
1. `node scripts/verify-all.mjs` passes on the release commit in CI; `tests/evidence/VERIFY_REPORT.md` is attached; every NOT_RUN item
   is listed with its reason.
2. Containers built from the release commit run the E2E suite.
3. Known defects and accepted risks are listed in the release notes with their owners.
4. For any release used with customer data: the external penetration test findings for the release scope are fixed or accepted in
   writing by the owner; backups and a restore drill are verified for the environment.
5. Package manifests record the exact source commit and file hashes; frozen releases are re-verified unchanged.
6. Distribution is authorized by the owner — never by the engineering team on its own.
