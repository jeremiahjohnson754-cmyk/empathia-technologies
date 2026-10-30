# ADR-0001 — Two applications in one ecosystem: Living Campus and Founder Studio

Status: accepted (owner requirement, 2026-10-30 11:24 CT) · Supersedes nothing · Phase: P0

## Context

The owner supplied two authoritative source canvases: the Living Campus V2.5.3 (live and offline investor editions, built from commit
cf86866 of the demonstrator source) and the Empathia Founder Studio f51229b (a React application over the 2.5.4 Founder Edition, the
film library, the engineering documents and the IP vault; classified INTERNAL_ONLY). The mandate (`legacy/mandate/MASTER_PROMPT.md`)
asks for a public website, an investor-safe demo, an authenticated multi-tenant application and an administration surface, with the
Founder Studio given the same treatment: a real web application, not a page inside another one.

## Decision

1. **Two applications, not one.** `apps/demo` + `apps/platform` (the Living Campus: investor demonstration and the authenticated
   enterprise application) and `apps/founder-studio` (the private founder application) are separate deployables with separate
   authorization policies, separate data boundaries and separate release gates. `apps/website` is the public site.
2. **Shared platform, by contract only.** They reuse: the identity service and session model (`services/enterprise-api` auth),
   the design tokens and UI components (`packages/design-tokens`, `packages/ui`), the API contracts (`docs/api/openapi.json`,
   `packages/api-client`), the event contracts and the audit service. Reuse is through published contracts and packages, never through
   one application importing another's pages or reading another's tables.
3. **Founder Studio boundary.** Founder data (films, vault, engineering records, founder notes, scenario state) lives in its own
   PostgreSQL schema/role (`founder.*`, migration planned in P4F) with row-level security that admits only members of the founder
   organization holding the `founder` role; its object storage bucket is private and separate; its routes are served only on the
   founder host/path, behind authentication, with `noindex`, and are never linked from `www` or `demo`. Its administrative capabilities
   (vault reads, exports, resets) are explicit, audited API operations with their own policy entries; there are no hidden UI-only admin
   actions. No job, view or search copies founder data into customer or investor environments; a cross-boundary read is a negative test.
4. **Investor and public surfaces carry synthetic data only** (`apps/demo`), built from the Living Campus allowlist lineage of 2.5.5
   (what may ship to an investor is already decided there), and they never embed founder material.
5. **Originals preserved.** `legacy/source/` holds both canvases unchanged (hashes in `legacy/source/SHA256SUMS.txt`); the frozen
   release packages under `Empathia_V25/` stay immutable. Each application keeps its own feature-parity ledger rows
   (`docs/legacy-parity.md`, column *App*) and its own regression suite, run after every phase.
6. **Incremental migration.** Routes move one area at a time from the original (served as a legacy demonstrator) to native pages;
   an embedded original is interim and is never recorded as a migration. A migrated route that loses behaviour is a REGRESSION and
   blocks the release.

## Consequences

* Two independent authorization policies to test (cross-application negative tests join the security suite in P4).
* The design system and contracts become the only coupling; changes to them run both applications' suites.
* Deployment carries three hosts or paths (`www`, `demo`, `app`) plus the private `founder` host; local development runs them on
  separate ports from one `pnpm dev`.
* Founder Studio keeps working offline-first for the founder (it already runs from a local server); the hosted form adds identity and
  private storage without removing the local launcher.
