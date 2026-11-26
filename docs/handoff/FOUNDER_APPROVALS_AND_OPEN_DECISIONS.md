# Founder approvals and open decisions — Enterprise 3.0 sprint

Decisions the evidence could not settle, and what the founder decided. Decided items record what was built on them.

| Id | Question | Founder's decision (23 Nov 2026, 15:37) | What was done on it | Status |
|---|---|---|---|---|
| E3-D1 | Product taxonomy: are VOICE, FLOW, FORGE, PRISM, SENTINEL, ACCORD, MissionProof and OMNIPRESENCE products beside the nine, or modules under them? | First-class, interconnected capabilities, organised into product families for navigation. Keep the original nine products and their identifiers. Correct copy that implies nine is the whole ecosystem | `packages/ui/src/families.ts` (six families, seventeen capabilities, each marked built or not built); demonstrator `#/families`; website `/products#families`; "nine products" became "nine core products" where it described the whole | DECIDED, IMPLEMENTED |
| E3-D2 | Voice administrator persona | A distinct UC / Voice Administrator profile with least privilege; general AV and Systems Engineer roles do not receive telephony-sensitive capabilities | Seventeenth role `ucadmin`; signalling detail (session token, directory assignment, trunk) is read by Product Architect and UC / Voice Administrator only; AV Operations Lead and Systems Engineer read the path and measurements; ten unit suites and one browser suite that counted sixteen roles were updated, each with the reason | DECIDED, IMPLEMENTED |
| E3-D3 | Quality method QM-G107-S1 | Keep the reduced E-model as an experimental engineering-review implementation. Lead with packet loss, jitter and delay. Do not present derived MOS as independently validated | Loss, jitter and delay lead the table, judged against the tenant's policy; the estimate sits in a column headed "Estimate, experimental" with a note; the method status reads EXPERIMENTAL on the page, the website and in the unit test | DECIDED, IMPLEMENTED |
| E3-D4 | Staging | Isolated staging previews may be created and updated after a successful exact-commit regression. The canonical Next sites are not updated without approval. Keep pushing commits and PRs | See BUILD_STATUS / the execution board for the day's regression and preview state | DECIDED |
| E3-D5 | GitHub CI on `main` | Prepare the repair on a controlled branch, keep Founder Studio private, do not merge to `main` without approval | See the execution board | DECIDED, IN PROGRESS |

## Decided 26 Nov 2026 (founder, 04:30 and 04:50 CT)

| Id | Question | Founder's decision | What is done on it | Status |
|---|---|---|---|---|
| CR-D1 | The founder photograph supplied 25 Nov: crop | Approved (04:30) | Renditions from the supplied file, the approved square crop, colours converted from its Display P3 profile to sRGB, nothing retouched; both originals kept (`docs/media/FOUNDER_PORTRAIT.json`) | DECIDED; regression and staging pending |
| CR-D2 | Centre or Center, Theatre or Theater in the names of fictional places | "Use Center for fictional American locations"; "Use Theater for fictional American locations" | With the American English sweep, as one checkpoint; stable identifiers unchanged | DECIDED, PLANNED |
| CR-D3 | Collabora-SING or Collaboro-Sing | "Collabora-SING — more distinctive branding" | One spelling in every text people read; addresses kept, or redirected if one is shown to people | DECIDED, PLANNED |
| CR-D4 | Naming competitors | Not on the homepage; "Maintain separate buyer-facing comparison materials" | Nothing in the public sites or this public repository names a competitor; comparison material for buyers is kept privately, from dated public sources | DECIDED |
| CR-D5 | Domain | "Establish a professional branded domain" | A plan only (names, DNS and hosting steps, cost, rollback). Nothing is bought and no DNS is changed without the founder's own action or his approval of the item and the total | DECIDED, PLAN PENDING |
| CR-D6 | Website headline | Keep the outcome headline with the brand line directly under it | Already so since `d8a9f175`: "From infrastructure request to verified operational readiness." with "Technology. Space. Intelligence. Experience. Connected." under it; unchanged | DECIDED, DONE |

## Still open

| Id | Decision | Why it is yours | Default the sprint uses |
|---|---|---|---|
| E3-D6 | **Repository visibility.** The repository is public. A private report (not committed, so that it is not itself an index) lists what a reader can see: invention disclosures, engine source, founder directives, recovered working sessions, the Founder Studio application source, and the lists of names that must never be named | Changing visibility, removing paths or rewriting history is destructive or irreversible, and the patent question needs counsel | Nothing changed |
| E3-D7 | **Site scope beyond VOICE.** VOICE refuses a site-scoped role (UC / Voice Administrator, Service Technician, Service Manager) a room outside its sites. The rest of the demonstrator, taken from V2.5.3, has no site scope | Extending it changes the V2.5.3 policy tables for every surface | VOICE and FLOW-from-VOICE only |
