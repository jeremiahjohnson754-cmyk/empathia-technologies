# Four worlds on one shared core: what is verified (70/10 task 70-1)

**12 November 2026.** Read from the code and its tests; nothing changed to write it. "Verified" means a named automated test holds it.

| Claim | Where | Held by |
|---|---|---|
| Four worlds (Enterprise, Stadium, University, Convention), each with its journeys in order | `apps/demo/src/worlds/registry.ts` | `demo-worlds` unit: four worlds, four to six journeys each |
| One shared core: the worlds are a presentation layer over the same pages, policy and records | `registry.worlds.ts` (OPEN authority, "choosing a world grants nothing") | `demo-worlds`: selection is not authority — a world, journey or role configuration cannot open a page the policy denies |
| Three seeded estates on one model, with the Enterprise estate kept as it is | `apps/demo/src/estate/**` | `demo-estates` ES-01 (every estate passes the model's validation), ES-12 (the registry serves the three seeded worlds and does not pretend an Enterprise adapter exists) |
| Isolation between contexts | `worlds/scope.ts` | `demo-worlds`: scoped state is reset before the new context renders; late work from the old one is dropped |
| Readers see only what their level allows; search never leaks | `estate/**` reader levels | ES-07, ES-16, ES-18, ES-19, ES-21 |
| Identity: one record per place across browse and search, ids unique and prefixed by world | estates | ES-02, ES-08, ES-17 |
| Fiction: no real venue, institution, team, league or show | registry and estates | `demo-worlds` (venues fictional), ES-09, ES-10 |
| Scale: University 38 classrooms in five schools, four dormitories, three campuses; Stadium 60,000–65,000 seats; Convention thirteen halls, 225 rooms, over a thousand booths | estates | ES-03 to ES-06, ES-13 to ES-15 |
| Browser: the worlds open, switch and keep context in both themes | `#/worlds`, `#/world/<w>` | `demo-worlds` browser suite (67 checks in the last matrix) |

## What "tenant isolation" means here, and what it does not

- In the Living Campus the four worlds are synthetic presentation contexts of **one** demonstration, not tenants. Their isolation is
  context isolation (above) and reader levels; there is no tenant boundary to cross because there is one tenant.
- Tenant isolation proper — one customer never reading another's records — is held where tenants exist: the Knowledge Ledger's
  contract (zone, owning customer, the source's access list; `demo-knowledge-contract` unit) and the enterprise API's policy
  (`services/enterprise-api`). A negative case per world for tenant isolation is therefore **not applicable** to the worlds as built;
  it would become applicable if a world were ever served to a separate customer.
- NOT RUN: a world served from its own tenant in the enterprise API (no such deployment exists).
