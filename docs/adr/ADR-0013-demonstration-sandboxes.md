# ADR-0013: Demonstration sandboxes and sessions (connecting the public demo to the server)

Status: implemented 2026-11-17 · migration `0033_demo_sandbox.sql` · `services/enterprise-api/src/domain/demo.ts` · the demo's
connected page `apps/demo/src/pages/Connected.tsx` (only in a build given `DEMO_API_URL`) · tests `tests/security/demo-sandbox.test.mjs`
(DS-01..16), `tests/unit/connected-client.test.mjs` (CC-01..06), `tests/browser/demo-connected.test.mjs` (CN-01..10).
Not deployed: hosting an API and a database for the public demonstration is a paid service and waits for the founder's word. The
public sites are built without a server address and carry no connected page.

## Context

There are two implementations. The public demo is a static site whose workflow records live in the visitor's browser. The enterprise API
keeps durable records in PostgreSQL with row-level security, an audit chain and independently tested workflows. The founder (17 Nov 2026):

> Connect the actual interactive demo to the server-backed workflows, using safe synthetic tenants, authenticated demo sessions, scoped
> permissions, and a resettable demonstration dataset. […] someone could inspect a device, update its field record, complete a
> commissioning workflow, switch roles, and observe the same durable history through ServiceHands, Assurance, and APEX — even in a
> fresh browser session.

And earlier (12 Nov): the security review must include negative authorization tests, "especially ensuring that training simulations
can't modify real ServiceHands incidents or tenant data".

The API had nothing a public visitor could use: the development sign-in is refused in production, and OIDC needs real identities.

## Decision

1. **A sandbox is a tenant.** Opening one creates an ordinary tenant (`sbx-<16 hex>`) with one synthetic person per role (15 roles; no
   password, no provider subject), one site, one building. It is isolated by the same row-level security as every tenant. No new
   authorization model, no "demo mode" inside the domain code: a sandbox session calls the same routes, under the same authorities, the
   same separation-of-duties rules and the same database guards, and writes the same audit rows.
2. **One sandbox per visitor**, not a shared one. Visitors cannot see or disturb each other; isolation between two sandboxes is the same
   property as isolation between two customers, so the demonstration shows it instead of asserting it.
3. **The key is the credential.** Opening returns a random 256-bit key once; the database stores its SHA-256. `POST /v1/demo/sessions`
   with the sandbox id, the key and a role returns a short-lived token as that sandbox's person for that role. That one call is how a
   visitor comes back (another tab, another browser, another day) and how they change role. The role decides what the session may do.
4. **Demonstration tokens are their own kind.** Own secret, issuer and audience. The HTTP layer accepts one only if the tenant it names
   is a sandbox that is open and unexpired at that moment — asked of the database on every request. No other token (development,
   OIDC) reaches a sandbox tenant. The boundary is checked in both directions.
5. **Off by default, twice.** The routes answer 404 unless the process has `DEMO_SESSIONS=on` (or `AUTH_MODE=demo`), and the database
   refuses to open a sandbox unless its owner enabled it (`node dist/src/db/demo.js enable`). The runtime role has no privilege on
   `app.demo_config` or `app.demo_sandbox`; it works through SECURITY DEFINER functions that can create a tenant only as a sandbox.
6. **The product or the demonstration, never both.** `DEMO_SESSIONS=on` is refused with `AUTH_MODE=oidc`. The public demonstration is
   its own deployment on its own database: `AUTH_MODE=demo` accepts demonstration sessions only, refuses the development sign-in and
   every other unauthenticated route (public leads, proof registry, invitation acceptance), and is the one mode besides OIDC that
   production admits. It requires `DEMO_SESSION_SECRET` in production, different from `JWT_SECRET`.
7. **The scenario is made through the route table.** A new sandbox holds one huddle room at INSTALLED_UNVERIFIED, created, approved and
   moved by the sandbox's own designer, systems engineer, operations lead and installer; and a service technician whose three
   credentials were recorded by the service manager and verified by the data steward. Each step passes the route's authority check
   and body contract before its handler, so the history a visitor finds is the history the product would have written.
8. **Resettable without deleting.** Audit rows, results, evidence and baselines are append-only, in a sandbox as anywhere. A reset
   closes the sandbox and opens a new one in one database transaction (a refused opening closes nothing); the closed sandbox's
   sessions stop at once and its rows stay, unreachable. Sandboxes expire (72 hours by default). Storage is bounded by the operator
   recreating the demonstration database, which holds nothing else.
9. **Bounded.** A cap on live sandboxes (200), a cap on openings per address per hour (12; a salted hash of the address is stored,
   never the address), the existing per-caller request budget, 64 KiB JSON bodies, and uploads limited to `text/plain` or `text/csv`
   of at most 16 KiB — a sandbox is not a file store. And storage is bounded by construction (`0035_demo_sandbox_limits.sql`): a
   sandbox stops recording at 4,000 audit rows (every write is one, so this bounds every table) and stops answering a quarter above
   that (refused requests are audit rows too); it holds at most 60 evidence notes; and a database opens at most 5,000 sandboxes in
   all, after which no new one opens until the operator recreates it. The limits are the schema owner's (`demo.js enable --max-…`).
10. **Guards in the database.** A sandbox takes no person from outside (membership trigger on the email domain), never the architect,
    founder or security-administrator role, and no invitation; a sandbox person joins no other tenant.

## What a sandbox session is not

- Not evidence of production security. It demonstrates the product's authorization on synthetic data.
- Not an identity. One visitor holds every role of their sandbox by turns; separation of duties is enforced between the sandbox's
  *people* (the technician cannot verify their own work; the retester cannot close the deficiency), and the visitor sees each refusal
  by trying it. Nothing stops one human from then switching role — that is what a demonstration is, and the page must say so.
- Not a place for real data. The notice returned with every sandbox says so; free-text fields are the visitor's responsibility.

## Consequences

- `GET /v1/rooms/{room}/thread` in a sandbox returns the same durable thread as in any tenant; `DS-07` drives the whole path —
  register, commissioning, a failed test, handoff, work order, retest, acceptance, baseline, APEX — with demonstration sessions only,
  then reads the identical thread from a session made later from the key.
- Operating the demonstration needs a web service and a PostgreSQL database (cost: founder's decision), `CORS_ORIGINS` set to the demo
  site's origin, `TRUSTED_PROXY=on` behind the platform proxy, and a schedule for recreating the database.
- Phase 1 field records are on the server too (`0034_field_record.sql`, `FRS-01..09`): mounting, hook-ups and field moves are part of
  the same durable thread, and `DS-07` records them in a sandbox before commissioning starts.
- The demo's connected page (`#/connected`) takes a sandbox's room through nineteen steps, each as its own person, and reads the
  thread and the audit history back from the server; a step tried as someone else shows the server's refusal. See
  `docs/product/CONNECTED_DEMO.md`.
- A request refused by the central authority check is recorded on the record its path names (`http/server.ts` `aimedAt`), so a
  room's thread shows who tried what, not only what was allowed.
- Next: the demo's other pages (Build a Room, the field record page, ServiceHands, Assurance, APEX) reading the server in a
  connected build; a deployment, when the founder decides.

## Alternatives considered

- **A shared demonstration tenant, reset nightly.** Simpler, but every visitor sees every other visitor's edits, a single visitor can
  spoil it, and it demonstrates nothing about isolation.
- **Anonymous access to the seeded tenant under the development sign-in.** Refused in production by design, and it would put a
  password-based identity provider on the public internet.
- **Deleting a sandbox on reset.** Would need a path around the append-only triggers and the audit chain; the product should not
  contain one.
