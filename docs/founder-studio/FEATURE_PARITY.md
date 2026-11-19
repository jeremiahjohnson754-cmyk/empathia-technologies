# Founder Studio: feature parity, 26 Oct (A) against today

Task #242, the third deliverable of the founder's 21:34 directive (18 Nov 2026), §2 and §16: "preserve the complete historical
functionality". This compares the Founder Studio as the founder gave it (Artifact A, built 26 Oct 2026 from commit `f51229b`) with
today's Studio, file by file and route by route.

## How it was compared

A ships `studio/studio.js.map` with the full text of its own sources: 52 of the map's 62 entries are its own files; the other 10 are
React. Each source was compared line by line with the same file in this repository, read-only with `python3 -I` on 19 Nov 2026. A was
extracted to a private folder that is not in the repository. Its source map is not published, and none of its text is copied here.

## Result: nothing of A is missing

| What | A (26 Oct) | Today | Lost |
|---|---:|---:|---:|
| Destinations in the rail | 27 | 28 (+ Founder Decisions) | 0 |
| Pages | 12 | 13 (+ `Decisions.tsx`) | 0 |
| Studio code (shell, router, store, data, pages, components) | 23 files | the same 23 files, plus the new page | 0 |
| Commissioning-engine code bundled in | 7 files | the same 7 files | 0 |
| Data files (9 generated from the records, 13 from the domain data) | 22 | regenerated at every build | — |
| Elements tests address (`data-testid`) | — | every one of A's present | 0 |

**Unchanged, line for line:** 24 of A's 30 code files, including
- the shell, router and store
- Mission Control, the Enterprise Platform, Product, Engine Lab, Build a Room and Scenarios pages
- the Architecture, Docs, Maturity, Vault and Settings pages
- the demonstrator frame
- four engine modules

**Changed, each change an addition:**

| File | Change |
|---|---|
| `nav.ts`, `main.tsx` | The 28th destination: Founder Decisions, kept on the platform behind the founder boundary (ADR-0001). |
| `pages/MediaLibrary.tsx` | Asks the launcher which films are on this computer, so a missing film is reported without requesting it (12 Nov). The two replaced lines are a wider import and a three-way display condition: "looking", "found" and "missing". |
| `commissioning-engine/catalog.ts`, `index.ts` | Additions for the enterprise catalogue. |
| `commissioning-engine/applicability.ts` | One function takes the test ID, so a catalogue can correct a test's device family. The demonstrator's catalogue has no corrections, so its behaviour is unchanged. |

## The launcher (`server/serve.mjs`)

| Change since A | Why |
|---|---|
| Source maps (`.map`) are no longer served | Security, directive §12: source maps are not published. |
| The API origin the Studio may reach is configurable (`--api`, `API_URL`), not fixed to `127.0.0.1:4100` | The hosted workspace. The content security policy still names exactly one API origin. |
| `GET /api/films` lists the curated films present on this computer | The Media Library's availability check, above. |

Nothing A's launcher served is refused today, apart from the source maps.

## The Founder Edition demonstrator

Today's Studio ships A's own Founder Edition, byte for byte (`ecdf64be…`, since `0e2609e`).
`VERSION_RECONCILIATION.md` sets that page against the November 2.5.4 source:
- all 661 actions, 78 destinations, 101 events, 32 record types, 86 areas, 19 pages and 22 personas are present
- its 230 modules match the November inventory, except where each build writes its stamps

## Still open for parity

- **Films.** A lists 36 and bundles none. Today 5 are linked from the private store. The media audit (directive §10) sets the 36
  against the masters held privately.
- **The two QA cycles** of the directive's final-QA deliverable: a person opens every destination of A and of today's Studio, in the
  launcher and in the hosted workspace, and records what each shows.
