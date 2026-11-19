# Founder Studio: source inventory

Task #242, from the founder's 21:34 directive (18 Nov 2026), §16. It lists every artifact the Founder Studio and the Founder Edition
are rebuilt from, with its size, its hash, its version and where it came from.

This repository is public, so names, sizes and hashes are recorded here and contents are not. The founder's uploads are kept
unmodified outside the repository, in `.local/reference/2026-11-18-founder-studio/` (git-ignored, mode 600). The Studio's private
files live in the private store named by `apps/founder-studio/PRIVATE_ASSETS.json`.

## The founder's three artifacts (18 Nov 2026, 21:34 CT)

| Artifact | File | Bytes | SHA-256 | What it is |
|---|---|---:|---|---|
| A | `EMPATHIA_FOUNDER_STUDIO_f51229b83e5a.zip` | 3,646,289 | `39f57fa8…5929f` | The Founder Studio application. Its BUILD_MANIFEST gives source commit `f51229b`, a clean tree, built `2026-10-26T13:46:03Z`, INTERNAL_ONLY. It has 16 files. |
| B | `Empathia-Founder-Edition.html` | 8,371,566 | `ecdf64be4de7cda5096c8dd7902814e26a7b1fe5d693799f9d489fbbddcbe1ee` | The Founder Edition demonstrator, Living Campus 2.5.4 development build. It is byte for byte the page inside A (`demonstrators/founder/`). It sets no `__EMPATHIA_EDITION__`, so it runs as `development`. |
| C | `EMPATHIA_ORIGINS_FOUNDER_VISION_AND_RECEIPTS_v4_PRIVATE_COMPLETE.zip` | 229,802,088 | `4957e89c…e47a` | The private origins, vision and receipts archive. It is confidential diligence material, kept unmodified and **not opened**. None of it goes into any public route, bundle, source map, endpoint or connector. |
| — | Three launchers (`Start Founder Studio.command`, `Start-Founder-Studio.bat`, `start-founder-studio.sh`) | 494 / 417 / 407 | `18631837…`, `60bfe47f…`, `770a7d25…` | Identical to the launchers in A and in today's studio build. |

## Founder Edition pages seen in this tree

| Page | Bytes | SHA-256 | Edition reported by the page | Where it was used |
|---|---:|---|---|---|
| 2.5.3 Private Engineer Edition | 6,957,389 | `604cc7486e4a63a214c6ea471d8dc41fb826060483f24ee8dbd88df8aecb56f7` | `engineer-private` | Served under the Founder Edition's name by every studio build in this tree from 12 Nov, and carried into the private store on 17 Nov. This was the defect D18-24. The page is now kept aside in the store, unchanged. |
| 2.5.4 development build (26 Oct) | 8,371,566 | `ecdf64be…` | `development` | The Founder Studio `f51229b` (26 Oct). Since 18 Nov (`0e2609e`) it is in the private store and every studio build in this tree, in place of the 2.5.3 page. |
| 2.5.4 no-media build (November) | — | — | — | `Empathia_V25/work/source-254/dist/Empathia-Living-Campus-v2.5.4-no-media.html`, the studio build's default source. **It is not available in this environment.** Nothing here claims it. |

## The 26 Oct studio (A) against today's studio build, file by file

| File | 26 Oct (A) | Today | Note |
|---|---:|---:|---|
| `demonstrators/founder/Empathia-Founder-Edition.html` | 8,371,566 | 8,371,566 | The same bytes, since 18 Nov. |
| `index.html`, the three launchers, `media/films/README.txt`, `server/film-index.json`, `studio/films.json`, `studio/studio.js.LEGAL.txt` | — | — | The same bytes. |
| `server/serve.mjs` | 9,377 | 10,172 | Changed since: the launcher was extended. Each change is to be listed in the feature-parity matrix. |
| `studio/meta.json` | 30,110 | 33,724 | Regenerated from today's records. |
| `studio/studio.css` | 19,193 | 24,051 | Grown. |
| `studio/studio.js` | 2,209,154 | 5,560,936 | Grown, mostly from the generated engineering data. |
| `studio/studio.css.map`, `studio/studio.js.map` | 41,022, 3,509,112 | — | **Not shipped today.** Source maps are not published (security §12). |
| `BUILD_MANIFEST.json` | 2,423 | 2,136 | Each build writes its own. |
| `media/films/*.mp4` | none bundled | 5 of 36 linked from the private store | A lists 36 films and bundles none (directive §10). |

## Still to be inventoried (task #242)

- What Artifact A's `studio/films.json` lists (36 entries) against the masters that are available: the media audit, §10.
- Every route and feature of the 26 Oct studio and of B against today's build: the feature-parity matrix, §2 and §16.
- The November no-media build, if the founder can supply it.
