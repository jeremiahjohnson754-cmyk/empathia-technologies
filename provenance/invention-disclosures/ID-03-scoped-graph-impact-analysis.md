# ID-03 — Relationship-graph impact analysis with ownership-propagated, site-scoped visibility

**Attorney-review material. Not a patent application, not a patent grant, no novelty or patentability opinion.**

## Technical problem
Operators need "what does this device feed, and what breaks if it fails?" across rooms, buildings and sites. A shared graph leaks: hiding a room node from a site-scoped technician is not enough if the room's devices and issues are still reachable through other edges.

## Proposed solution
A typed relationship graph (130 relation types with forward/inverse labels; provenance per edge) with neighbourhood, downstream-impact and path queries that take a visibility predicate. Visibility is computed per caller from site scope, and is **propagated through ownership edges**: a planned asset or a room issue is invisible when the room that owns it (via PLANS_DEVICE / AFFECTS) is outside the caller's scope, even if the asset is reached by another path. A start node that is not visible returns "not found" (existence is not disclosed).

## Architecture
```mermaid
flowchart LR
  E[(relationship edges<br/>from, rel, to, provenance)] --> G[Graph]
  P[principal: tenant + site scope] --> V[visible rooms]
  E --> O[owner map<br/>asset→room, issue→room]
  V & O --> C[canSee(node)]
  G & C --> N[neighbourhood(depth)] & I[impact(FEEDS, CONNECTS_TO, …)] & PA[path]
```

## Implementation details
- Engine: `packages/relationship-engine/src/index.ts:37` (`neighbourhood`), `:58` (`impact`), `:71` (`path`), relation catalogue `:15` (`RELATIONS` from `RELS.json`).
- Visibility and ownership propagation: `services/enterprise-api/src/domain/read.ts:75–91` (`graph`).
- Tenant isolation below it: PostgreSQL row-level security (`database/migrations/0001_foundation.sql` `app.tenant_rls`).
- Demonstrator origin: edge-level authorization in the Relationship Explorer, `empathia-campus` commit `af815b4` (2026-10-14) "Relationship Explorer (#192) … edge-level authorization" (`src/12-authz.js`, `src/72-ui-graph.js`, `src/999999-v14-explorer.js`).

## Algorithms
Breadth-first traversal bounded by depth (1–4) with the predicate applied on expansion; impact = BFS along a configurable set of downstream relation types; path = BFS shortest path over visible nodes. O(V + E) per query.

## Distinguishing features (factual)
Visibility applied inside traversal (not post-filtered); ownership propagation for dependent nodes; not-found semantics for invisible starts; tenant isolation enforced separately by the database.

## Development timeline (git)
2026-10-14 `af815b4` (V1.4 explorer, edge-level authorization); 2026-10-22 `1b16e44` (carried into V2.5); 2026-10-26 monorepo package and API (`03d9410`), tests `tests/security/authz.test.mjs` (site-scoped graph 404, commit `ad4ed25`).

## Prior-art questions (open)
1. Graph databases with row/edge-level security (label-based access control in graph stores) — overlap?
2. CMDB impact analysis with scoped views (IT service management) — overlap?
3. Is ownership-propagated invisibility a standard technique in multi-tenant graph APIs?

## Potential applications
Facility and IT dependency mapping; incident impact; multi-site service providers with technicians scoped to sites.
