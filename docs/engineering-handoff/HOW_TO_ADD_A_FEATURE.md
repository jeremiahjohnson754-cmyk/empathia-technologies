# How to add a feature

A concrete path through this repository, using a worked example: **"a QA reviewer can attach a review note to a verified result."**
Follow the same order for any feature that persists data. Paths are relative to the repository root.

## 0. Before code
* Write the acceptance criteria, including **who may not** do it (negative cases) and what the database must refuse on its own.
* Find the authority it needs in `packages/domain-data/data/V25_PERSONAS.json`. Reuse an existing one (here `document.review`, held by
  `qa_reviewer`). Do not invent roles or authorities to make a feature fit; if a genuinely new authority is needed, it is a product
  decision recorded with the founder, added to the persona table and reviewed by security.

## 1. Migration — `database/migrations/0008_result_review_note.sql`
* New file only; never edit an applied migration (they are sha256-guarded by `services/enterprise-api/src/db/migrate.ts`).
* Every business table has `tenant_id`, a composite foreign key `(tenant_id, …)` to its parent, and `SELECT app.tenant_rls('app.<table>')`
  (RLS FORCE). If the record is evidence-like, add the append-only trigger `app.refuse_change()`.
* Grant the runtime role only what it needs (`GRANT SELECT, INSERT ON … TO empathia_app`).
* Put rules the database can enforce in the database (CHECK constraints, triggers with an `EM00x` error code mapped in
  `src/http/server.ts`).

## 2. Domain module — `services/enterprise-api/src/domain/commissioning.ts` (or a new module)
* Start with `await ctx.require('document.review', 'add a review note', { type: 'Room', id })` — deny by default; refusals are audited.
* Do all reads and writes inside `ctx.tx(async (q) => …)` so `app.tenant_id` is set and RLS applies.
* Resolve rooms with `findRoom(ctx, q, ref)` so site scope applies (out of scope → 404, never 403).
* Pure rules belong in an engine package (`packages/commissioning-engine/src/…`) with unit tests; the domain module calls them.
* `await ctx.audit(q, 'result.review_note', 'ALLOWED', …)` and, if other parts of the system react, `await ctx.emit(q, '<event>', …)`.

## 3. Event contract (only if you emit a new event type)
* Event types and their required payload fields live in `packages/domain-data/data/V25_EVENTS.json` (extracted from the demonstrator);
  `ctx.emit` validates every event against `packages/event-contracts` and aborts the transaction if it does not match.
* Adding a type or an optional field is a MINOR change; removing/renaming a required field is MAJOR (`docs/api/EVENT_VERSIONING.md`).
  Until the founder decides whether the monorepo or the demonstrator is the source of truth for rule data (TD-11), record new types in
  the domain-data table with a comment in the commit and keep `tests/integration/api.test.mjs` green.

## 4. Route — `services/enterprise-api/src/modules/routes.ts`
* Add one entry with `method`, `path`, `tag`, `summary`, `auth: true`, `authority` (documentation of the check), a body schema
  (`obj`, `str`, `int` … from `src/http/schema.ts`; unknown query parameters are refused automatically), `idempotent: true` for
  creating POSTs, and `responses`.
* The route table is the single source of the OpenAPI document.

## 5. Contract and client
```bash
node node_modules/typescript/bin/tsc -b services/enterprise-api
node scripts/api/export-openapi.mjs          # rewrites docs/api/openapi.json and packages/api-client/src/generated.ts
node scripts/api/export-openapi.mjs --check  # CI runs this: fails if they are stale
```
* Add the response type to `packages/api-client/src/types.ts` (`ResponseTypes['postV1…']`) and update the operation count in
  `packages/api-client/test/client.test.ts`.

## 6. UI — `apps/enterprise-web`
* Call it with `api.call('postV1…', { params, body, idempotencyKey: newKey() })` through `useMutation(…, ['room:<code>'])` so the
  affected queries reload.
* Show the button only when `can('document.review')` — a convenience; the server decides. Show the server's refusal verbatim with
  `ErrorState`.
* Use `@empathia/ui` components; every status needs a glyph and a label, never colour alone.

## 7. Tests (all required)
* Engine unit tests for any pure rule (`packages/<engine>/test/*.test.ts`).
* `tests/integration/api.test.mjs`: the happy path over HTTP and the database state it leaves.
* `tests/security/authz.test.mjs`: a role without the authority gets 403; another tenant gets 404; out-of-scope site gets 404; the
  database refuses the forbidden write directly (if you added a constraint or trigger).
* `tests/browser/enterprise-web.test.mjs` if the UI changed.
* Run `node scripts/build.mjs && node scripts/test.mjs --browser`.

## 8. Docs and done
* Update `docs/api/` (regenerated), the relevant product or architecture doc, and `docs/qa/KNOWN_DEFECTS.md` if you found a defect.
* Check `DEFINITION_OF_DONE.md`.
