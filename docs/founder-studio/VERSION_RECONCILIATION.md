# Founder Edition: version reconciliation

Task #242, the second deliverable of the founder's 21:34 directive (18 Nov 2026), and the founder's 19 Nov 03:36 instruction:
"restore the newer approved November edition rather than treating the October edition as final. I don't have the 2.5.4 file just
the ones I gave you."

The question is what the November edition contained, and whether any file in hand carries it. This document compares, feature by
feature, the four sources that bear on it. As in the source inventory, names, sizes, counts and hashes are recorded here and contents
are not. Every comparison was made read-only with `python3 -I` on 19 Nov 2026.

## The sources

| Source | Built | Bytes | SHA-256 | What it is |
|---|---|---:|---|---|
| Living Campus 2.5.3, Private Engineer Edition | 25 Oct 2026, 14:42 CT | 6,957,389 | `604cc748…6f7` | Minified release build. Kept aside in the private store since D18-24. |
| **B**: Founder Edition, Living Campus 2.5.4 development build | 26 Oct 2026 (Founder Studio `f51229b`) | 8,371,566 | `ecdf64be…1ee` | The founder's Artifact B. It is unminified, so each of its 230 source modules is marked by name. It sets no edition, so it runs as `development`. |
| Living Campus 2.5.5, Private Engineer Edition | 27 Oct 2026, 04:43 CT | 6,979,048 | `6d637630…649b` | Minified release build, found in this tree. |
| **The November inventory** (`v254-founder-inventory.json`) | Taken 3 Nov 2026 from `source-254/src` | 112,082 | `bd10fe78…7fe` | A structural inventory of the 2.5.4 founder source: 230 modules with their sizes, 14 roles, 86 areas, 661 actions, 78 search destinations, 101 events, 32 record types, 19 V2.5 pages, 22 personas, 6 state machines, 6 tours and 126 test files. The same inventory of 2.5.3 is beside it (`70603cbc…b6b`). |

The November no-media build itself (`Empathia-Living-Campus-v2.5.4-no-media.html`) is not in this environment, and the founder
confirms he does not have it. The 2.5.5 file's timestamp in this tree (16 Nov) is when it was copied here. Its own build record
says 27 Oct.

## Findings

**1. Between 2.5.3 and the November source, four modules changed.** Both inventories list the same 230 modules, the same roles,
areas, actions, destinations, events, types, pages, personas, state machines, tours and tests. Only the sizes of four modules differ:

- `v25-01-core.js`: +15 bytes
- `v25-60-room.js`: +270 bytes. This is the "Build a Room with Empathia Lite" engine.
- `v25-61-room-ui.js`: +11 bytes
- `v25-62-xlsx.js`: −11 bytes. This is the workbook export.

In total, the November source is 285 bytes longer than 2.5.3. As inventoried, the November edition was a small revision of the room
builder, not a new release.

**2. B's code is the November source.** B was split at its module markers and each module measured against the November inventory:

| Group | Modules | Result |
|---|---:|---|
| Same size, within two bytes | 224 of 230 | This includes the four modules above: B carries their November sizes, not their 2.5.3 sizes. |
| Differ by 5 to 33 bytes | 6 of 230 | `82-ui-suite.js`, `90-boot.js`, `994-v14-deploy.js`, `995-v14-core.js`, `v25-01-core.js`, `v25-995-seal.js`. These are the modules into which the build writes its stamps: the deploy mode, the build ID (`9695e33e8f739b72`) and the page seal. They differ the same way from the 2.5.3 inventory. |
| Missing from B | 0 | — |

**3. Every inventoried feature is present in B, and in 2.5.3 and 2.5.5.** Each feature was checked by searching each build for it:

| Inventoried feature | Count | In B | In 2.5.3 | In 2.5.5 |
|---|---:|---:|---:|---:|
| Actions | 661 | 661 | 661 | 661 |
| Search destinations | 78 | 78 | 78 | 78 |
| Events | 101 | 101 | 101 | 101 |
| Record types | 32 | 32 | 32 | 32 |
| Areas | 86 | 86 | 86 | 86 |
| V2.5 pages | 19 | 19 | 19 | 19 |
| Personas | 22 | 22 | 22 | 22 |

**4. 2.5.5 adds engineer-edition material, not founder functionality.** Its page text was compared with B's and 2.5.3's. 2.5.5 adds
four things:

- an engineer start page: the problems the product addresses, "three engineering demonstrations first", and the commissioning
  library and its gates
- descriptions of the room record's Inspect tab and revision compare
- the correlated-issue rule (one issue per underlying cause)
- a new validation record (gate commit `93479a3a2c83`, generated 27 Oct)

The functions those texts describe are already in B and 2.5.3. Each appears once more in 2.5.5, where the start page lists it. The
page says itself that it "belongs to the Private Engineer Edition".

**5. B's validation record is 2.5.3's.** B carries the validation block generated on 25 Oct with gate commit `31d4d17abb14`, the
same as 2.5.3's. The 2.5.4 room changes were never recorded as validated in the page. Its "Validation and limitations" view must
say so, and must not present the 2.5.3 results as 2.5.4's.

**6. No build embeds film.** None of the three pages carries a `data:video` or `data:audio` URI. B is larger only because it is
unminified. "No-media" therefore cannot be told apart from B by its media.

## What this establishes, and what it does not

**Established.** The November edition, as inventoried on 3 Nov, is the same code as the founder's 26 Oct file B, module for module.
The only differences are the stamps every build writes. Nothing in the November inventory is missing from B.

**Not established**, and not to be claimed:
- That the November no-media file was byte for byte B's code. A change after 3 Nov would not be in the inventory.
- What edition label the November build carried.
- That the 2.5.4 room changes passed a validation run.

The Founder Studio will therefore present the Founder Edition with exactly these words:

> Living Campus 2.5.4. Built 26 Oct 2026; its code matches the November 2.5.4 founder source as inventoried on 3 Nov 2026, module
> for module. The November no-media file itself is not available.

That is not a relabelling. B keeps its own build ID, date and development edition, and the sentence states the evidence and its
limit.

## Proposed for the founder's decision

1. **Founder Edition = B**, presented with the sentence above. This is what the Studio runs today.
2. **Keep all historical functionality** by keeping each earlier build as its own entry in the private Studio, never merged into
   another and never public:
   - 2.5.3 Private Engineer Edition
   - 2.5.4 (B)
   - 2.5.5 Private Engineer Edition, which carries the engineer start page and its newer validation record
3. **Validation.** Before the Studio claims any validation for 2.5.4, run the original gates against B, or say they were not run.

## Next

- The feature-parity matrix: every route and view of the 26 Oct Studio (A) and of B against today's Studio build, using this
  document's inventory counts as the baseline.
- The media audit: the 36 films that A lists against the masters held privately.
