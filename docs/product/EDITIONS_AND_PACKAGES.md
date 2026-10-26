# Editions and packages: who receives what

*Stage 2 record. The source vault never enters an investor package, and no package here is authorized for external
distribution: that needs the external page-API security assessment, its remediation and retest, and the owner's written
approval.*

| package | for | contains | never contains | classification | produced by |
|---|---|---|---|---|---|
| **Founder Studio** (`EMPATHIA_FOUNDER_STUDIO`) | the founder, on the founder's own computer | the studio (React app), the local launcher, the **Founder Edition** demonstrator (2.5.4 development build, every persona, fault injection for the architect), the film manifest (the films themselves are copied in by the founder), rendered engineering documents, the provenance index | other people's credentials; anything that phones home | INTERNAL_ONLY | `apps/founder-studio/build.mjs` |
| **Investor Edition** (`EMPATHIA_INVESTOR_EXPERIENCE`) | investors, after approval | the frozen **2.5.3 rc3** investor package, byte for byte (offline and live editions, investor documentation, the 40 VERIFIED first-party UI captures) | source code, engineering evidence, internal paths, fault injection, the inspection panel, unverified media | INVESTOR_DISCLOSABLE — **distribution not authorized** | the frozen rc3 package (not rebuilt) |
| **Private Engineer Edition** (`EMPATHIA_PRIVATE_ENGINEER_EDITION`) | named technical reviewers under NDA | the frozen **2.5.3 rc3** engineer package byte for byte, plus the commissioning-engine source, the API contracts and the test evidence of this program | the full source vault, the IP records, investor-only material | CONFIDENTIAL_TECHNICAL | rc3 package + `scripts/package/` |
| **Production Engineering Workspace** (`EMPATHIA_PRODUCTION_SOURCE`) | a future CTO or engineering partner | this monorepo: editable frontend, CSS, backend, SQL migrations, engines, integration contracts and mocks, ML research prototype, tests, tooling, deployment instructions, git history | media whose rights are not established; secrets | RESTRICTED_IP | `git archive` of a tagged commit |

## Why the investor and engineer packages are not rebuilt here

The current candidate (2.5.3 rc3) is frozen, archived and marked immutable. The 2.5.4 branch carries the R3-2/R3-3 fixes but has
not been through the full gate, packaging, exact-byte verification and review that a candidate needs. Rebuilding an investor
package from 2.5.4 now would create an unreviewed candidate. So the investor and engineer deliverables reference the frozen rc3
bytes, and 2.5.4 appears only as the Founder Edition, labelled as a development build.

## What makes a demonstrator "Founder", "Investor" or "Engineer"

All three are built from the same source and use the same room-model contracts (`packages/domain-types`). The edition is a
build-time flag (`window.__EMPATHIA_EDITION__.kind`) that decides which capabilities the page offers:

| capability | Founder (development) | Investor | Private Engineer |
|---|---|---|---|
| every product surface and persona | yes | yes, with investor framing and the investor landing | yes |
| fault injection (`room.fault`) | Product Architect persona only | refused for every persona | engineering personas only (room.design, room.classify.approve or plan.compile) |
| Build a Room "Inspect" tab | Product Architect persona only | never shown | every persona in that edition |
| guided tour and investor landing | yes | yes | yes |

Source: `v25RbPrivate()` and `v25RoomFault()` in `src/v25-61-room-ui.js` / `src/v25-60-room.js` (2.5.4 branch). These are
front-end demonstrations of a policy, not security.

The production starter is a fourth thing entirely: it does not ship in any edition. Its authority lives on the server.
