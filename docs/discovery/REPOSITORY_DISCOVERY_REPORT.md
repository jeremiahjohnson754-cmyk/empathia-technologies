# Repository discovery report (Stage 0)

*Founder Master Build program, Stage 0. Read-only discovery of the founder's workspace, 2026-10-26. Nothing outside
`empathia-technologies/` was modified. All Empathia data is synthetic.*

## 1. How the discovery was done

| step | tool (in this repository) | output |
|---|---|---|
| file-level inventory: every file hashed (SHA-256), typed and placed in an area | `scripts/discovery/inventory.py` | `FILE_INVENTORY.csv.gz` (36,385 files, 18.4 GB), `FILE_INVENTORY_SUMMARY.json` |
| source register: one row per source unit, with the fields directive section 4 asks for | `scripts/discovery/source-register.py` | `SOURCE_REGISTER.csv` (34 units covering 20,254 files) |
| frozen-release check: every listed file of every frozen package re-hashed, every archive re-hashed | `scripts/verify/verify-frozen.py` | `releases/immutable-references/FROZEN_CHECK_STAGE0.json` |
| secret-pattern scan over 29,624 text, source, log and caption files (names of patterns only, never values) | `scripts/discovery/secret-scan.py` | `SECRET_SCAN.json` |
| media probe: every video and audio file opened with ffprobe and joined to the media-rights ledger by hash | `scripts/media/build-media-manifest.py` | `media/manifests/MEDIA_MANIFEST.{json,csv}` (2,230 assets) |

**Excluded from the inventory:** dependency caches (`node_modules`, `.git` internals, `__pycache__`, tool caches) and the
machine's own top-level dot-folders (shell, SSH and tool configuration — environment, not founder material). The exclusion is
in the script, not done by hand.

**What the register's judgement columns are.** Path, file count, bytes, folder manifest hash, last commit and tags are computed.
Purpose, maturity, defects, distribution safety and next action are the builder's reading of the recorded evidence (release
reports, audits, the capability register), cited where they come from. They are not an independent assessment.

## 2. Baseline: the frozen releases are unchanged — PASS

`verify-frozen.py`, run at this checkpoint:

| package | files re-hashed | mismatches | immutable flag |
|---|---:|---:|---|
| Empathia_Investor_Release_2511 (2.5.1.1) | 495 | 0 | set |
| Empathia_Investor_Release_252 (2.5.2 rc1) | 519 | 0 | set |
| Empathia_Investor_Release_253 (2.5.3 rc1) | 563 | 0 | set |
| Empathia_Engineer_Edition_253 (rc1) | 65 | 0 | set |
| Empathia_Investor_Release_253_rc2 | 562 | 0 | set |
| Empathia_Engineer_Edition_253_rc2 | 65 | 0 | set |
| Empathia_Investor_Release_253_rc3 (current candidate) | 562 | 0 | set |
| Empathia_Engineer_Edition_253_rc3 | 65 | 0 | set |

All seven archives in `Empathia_V25/work/frozen/` match their `.sha256` files. The current candidate's edition hashes:
offline `ecbde0bb…78307756`, live `9d6e53ef…25a09f2f1`, Private Engineer Edition `604cc748…8aecb56f7`.

## 3. Source branches and tags

| repository | branch (HEAD) | tags | commits |
|---|---|---|---:|
| `Empathia_V25/work/source` (V2.5 master; the worktrees below share it) | master `63c21d4` | v2.5.2-rc1, v2.5.3-rc1, v2.5.3-rc2, v2.5.3-rc3 | 10 on master |
| worktree `source-251p` | patch/2.5.1.1 `4b30315` | (shared) | 36 |
| worktree `source-cs` | cstudio `09db550` (= v2.5.2-rc1) | (shared) | 48 |
| worktree `source-253` | feature/build-a-room `cf86866` (= v2.5.3-rc3) | (shared) | 69 |
| worktree `source-254` | **founder/2.5.4** `b8986d1` (new, from v2.5.3-rc3) | (shared) | 70 |
| `empathia-campus` (V0.1–V1.4.1) | feature/relationships-explorer `1ddbd74` | v1.4.0, v1.4.1 | 4 (earlier history was not kept in git) |
| `Empathia_V25/legal/media-rights` (private) | master `411bb5b` | — | 6 |
| `Empathia_Products/Onboard/repo` | master `2ef17e0` | — | 12 |
| `empathia-technologies` (this program) | main | — | new |

Every commit in these repositories is authored "Claude" (AI) or "Empathia build" (an earlier AI build identity), working under
the founder's direction. See `provenance/` for what that means for authorship.

## 4. What exists, category by category

| category asked for in section 4 | found | where | notes |
|---|---|---|---|
| frozen release packages | 8 packages + 7 archives | `Empathia_V25/Empathia_*`, `work/frozen` | verified above |
| build scripts | yes | `source-254/build.py`; `tools/` (39 scripts: packaging, verification, gates, workbooks, media gate) | Python 3 + Node 22 |
| React / TypeScript | **none before this program** | — | the demonstrator is plain JavaScript; the first TypeScript is in this monorepo |
| HTML / CSS / JavaScript | yes | `source-254/src`: 230 JS files (29,675 lines), 26 CSS files (4,243 lines), one shell | one strict IIFE, concatenated by `build.py` into a single offline HTML file |
| Python | 897 files | tools, film pipelines, FI tooling, the founder-supplied reference service | |
| existing backend code | **no production backend** | two prototypes: the SyncLab v0.2 signalling server (Node, `collabora-sing-synclab/server`); a founder-supplied deterministic Python reference engine over SQLite (`inputs/…V2_5_Production_Candidate/reference_service`) | the demonstrator's "API" is a sealed in-page facade, not a server |
| database definitions | **no SQL** (0 `.sql` files) | the reference engine creates SQLite tables in code; the demonstrator keeps state in browser storage | the first SQL migrations are in this monorepo |
| JSON fixtures and contracts | 2,202 JSON files; 281 JSON Schemas | event schemas (`…V2_3_Executable_Contracts…/schemas`, `…V2_5_Production_Candidate/contracts/schemas`), a founder-supplied OpenAPI candidate (233 lines, 11 paths) | inputs from the founder's design packages |
| configuration and secrets references | 0 secret-pattern hits in 29,624 files (positive control passed) | — | no `.env`, key or certificate files in founder material |
| technical diagrams | **no editable diagram sources** (0 Mermaid, PlantUML, SVG or draw.io files) | diagrams exist only as rendered PNGs in PDFs and screenshots | editable Mermaid sources start in this program |
| commissioning workbooks | 138 `.xlsx` | release workbooks (template library + three proof workbooks), gate outputs | |
| validation libraries | yes | `source-254/tests` (129 suites), `tools/verify_release.py` (52 checks), `tools/media_gate.py`, `scan14.py` | builder tests |
| product mockups and screenshots | 4,085 images | QA captures, film frames, campaign survey; 40 first-party UI captures VERIFIED for the investor channel | |
| Unreal Engine assets | **none** | — | UE5 has never been run here (`UE5_NOT_RUN.md`) |
| Blender or other 3D project files | **none** (0 glb, gltf, obj, fbx, blend) | browser 3D is generated in code | |
| design source files (Figma, Sketch, PSD, AI) | **none** | — | the design system's source of truth is the CSS (Aurora tokens) |
| video masters | 302 video files; 114 classed as masters | film folders (see the media manifest) | 4K masters (FL, FT) confirmed 3840×2160 by ffprobe; one render truncated (`empathia-campaign/render/F03-v1.mp4`, moov atom missing) |
| audio masters | 1,928 audio files | narration takes, stems, music and SFX | narration from a hosted voice service: rights UNVERIFIED |
| presentation files | 1 (`inputs/directive-1023/…Founder_Pitch_V5…22_Slides.pptx`, founder-supplied) | | |
| document templates | SyncLab pilot kit (.docx, .pdf), release document sets | top level, `collabora-sing-synclab/docs` | |
| existing test suites | demonstrator 129 suites; V1.4.1 gate suites; SyncLab tests; reference-engine tests | | builder tests, not independent assurance |
| licensing and rights records | media-rights ledger (310 assets: 40 VERIFIED for investor, 240 UNVERIFIED, 30 EXCLUDED); deny-list; 2 licence files (film fonts; a TTS model licence kept as evidence) | `legal/` | no SBOM before this program |
| release manifests | SHA256SUMS in every package; frozen-candidate JSON; release inventories | | |
| architecture documentation | `release/ARCHITECTURE_OVERVIEW.md`, ADRs, stage reports, founder design packages | | browser-demonstrator architecture; no server architecture exists in code |
| financial and staffing artifacts | **none found** apart from the founder-supplied pitch deck and staffing *prompts* | | the engineering-estimate and team documents are new in this program |

## 5. The source register (summary)

The full register, with every requested field for each unit, is `SOURCE_REGISTER.csv`. Its distribution column in short:

| distributable now? | units |
|---|---|
| **no — internal source or evidence** | all repositories and worktrees, `inputs/`, `legal/`, film production folders, kits, this monorepo |
| **packaged, but distribution NOT AUTHORIZED** | the investor packages (2.5.1.1, 2.5.2 rc1, 2.5.3 rc1–rc3): page-API security is NOT VERIFIED — EXTERNAL TEST REQUIRED, and the owner's written approval is required |
| **controlled technical review only** | the Private Engineer Editions (rc1–rc3) |

## 6. Findings that shape the rest of the program

1. **The product is a browser demonstrator.** Everything users can do today runs in one offline HTML file, on synthetic data, with
   authorization enforced in the page. There is no server, no database, no authentication service and no deployed system.
   The production starter in this monorepo is the first server-side code with real persistence and server-side authorization.
2. **The demonstrator's rules are real, deterministic code.** Classification, design checks, commissioning applicability (94
   definitions), result labels and lifecycle gates are rules, not machine learning. They have been ported to TypeScript
   (`packages/commissioning-engine`) and reproduce the demonstrator's output on 92 golden cases.
3. **No machine-learning model exists.** No dataset, training script, model file or ML library is present in founder material.
   PyTorch is not installed and cannot be installed here (no package-registry access). Any model work must start as a labelled
   synthetic prototype.
4. **No integration is connected.** The 83-entry integration registry is catalogue-only (`MOCKED_UI_ONLY`, `NOT_CONFIGURED`).
5. **Independent assurance is thinner than the word "independent" suggests.** The 2.5.x "independent audits" were performed by
   a separate AI reviewer that did not build the work, under read-only rules. That is a useful second opinion, but it is not a
   third-party audit by a human organization. This program reports it as *separate-AI review* and keeps
   INDEPENDENTLY_AUDITED unclaimed. The external page-API security assessment (2.5.2 and 2.5.3) is still outstanding.
6. **Media rights are mostly not established.** 270 of 310 ledgered assets are UNVERIFIED or EXCLUDED, and 1,893 probed media
   files are not in the ledger at all (`NOT_IN_LEDGER`, treated as not distributable). The films can be watched by the
   founder; none may be distributed until rights are VERIFIED for a channel.
7. **Chain of title needs counsel.** Founder-supplied inputs include a Field Intelligence v1.3 collector (PowerShell), an
   original commissioning workbook, design packages and prompt kits whose origin (personal work, workplace, or another tool)
   is not recorded. They are flagged for legal review, not asserted.
8. **Editable design sources do not exist outside code.** The design system's source of truth is the demonstrator CSS
   (Aurora). The token file in `packages/design-tokens` is extracted from it.

## 7. Recommended next engineering actions (in program order)

| stage | action |
|---|---|
| 1–2 | Founder Studio over the existing demonstrator (founder build from the 2.5.4 branch), the frozen editions, the films and the documents |
| 3 | source normalization: domain types, extracted rule data, ported engines with parity tests (started) |
| 4 | production starter: PostgreSQL schema and migrations, authenticated API, server-side authorization, the vertical slice, outbox |
| 5 | engine inventory; relationship and assurance engines; a labelled synthetic ML prototype only where justified |
| 6–7 | media manifest and rights classification; design system; blueprint documents; IP provenance vault |
| 8–10 | clean-environment QA, candidate packages and audit instructions, completion report |

Nothing in this report authorizes distribution.
