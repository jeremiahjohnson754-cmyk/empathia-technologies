# Rebuild — common brief for every build agent (2026-11-03 evening)

The founder's work from 31 Oct – 3 Nov (Phase 2 investor demo + Phase 3 "Legendary Experience Initiative") was lost with its workspace.
We are rebuilding the two public sites — **the public website (`apps/website`) and the investor demonstration (`apps/demo`)** — to the
state the founder approved, by tomorrow morning. The founder has given full approval for everything; do not stop to ask.

## Read first (in your worktree; `git fetch origin && git merge origin/phase3/legendary-experience` often to get new recovery files)

- `docs/phase3/STANDING_RULES.md` — the rules. They are not optional.
- `docs/phase3/LEI_DECISIONS.md` — decisions D1–D44 (Inter, teal accent only, system/light/dark, the nine products in canonical order,
  the emblem roles, D44 access).
- `docs/recovery/turns-*/` — extracted from the conversation: `founder-messages.md` (every founder instruction, verbatim), `agents.md`
  (every brief given to the original build agents — these are your detailed specs), `files/` (exact files written then), `edits.jsonl`,
  `index.md` (what happened, with commit messages and test results). The extraction is still being written; re-read as it grows.
- Sources of truth for the product: `legacy/source/v253/` (V2.5.3 offline/live HTML — read statically with `python3 -I`/grep, never execute
  or open it in a browser), `docs/legacy-parity.{md,csv}`, `legacy/inventory/*.json`, the existing `apps/demo` and `apps/website` code.
- Brand: `packages/design-tokens/brand/` (emblem.svg = the flagship aspis, emblem-small.svg = small shield for favicons/headers,
  app-tile.svg = app icon only, owl.svg = not-found/no-access only, original-mark.svg = kept unchanged).

## How to work

- You are in a git worktree. Create branch `rebuild/<your-slice>` from `origin/phase3/legendary-experience`. Commit in small, complete,
  tested steps and **push after every commit**: `git push -u origin rebuild/<your-slice>`. Before pushing, `git fetch origin` and rebase on
  `origin/phase3/legendary-experience` if it moved. Never push to `main` or to `phase3/legendary-experience` (the lead merges).
- Stay inside the files your slice owns (named in your prompt). If you must touch a shared file (`apps/demo/src/App.tsx`, a registry, `scripts/test.mjs`,
  `scripts/build.mjs`), keep the change minimal and additive so merges stay clean.
- Toolchain is offline: `node scripts/bootstrap.mjs` (links node_modules from the machine), then `node scripts/build.mjs` from the repo root
  before any browser test. No npm registry. Inter is installed on the machine as OTF (`/usr/share/fonts/opentype/inter/`); convert with
  python fontTools if you need woff2 (check `python3 -c "import fontTools, brotli"`).
- Tests: add a browser suite for what you build (`tests/browser/<name>.test.mjs`, free port, registered in `scripts/test.mjs`), plus unit
  tests where logic lives. Run them in light and dark (`PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs <suite>` — if
  that helper doesn't exist yet the tokens slice adds it). Wrap every browser run in `flock /tmp/empathia-test.lock`. Never kill a process you
  did not start; no `pkill -f`.
- Quality bar: WCAG 2.2 AA, 44 px targets on phones, reduced motion respected, no console errors, CSP-clean (no inline scripts/styles that
  the existing CSP forbids), works at 390/768/1440. Synthetic data only. Never claim production-ready or 100%. NOT RUN is never PASS.
- Don't commit regenerated `tests/evidence/*`, `media/screenshots/*`, `ml/models/*`, `packages/ui/gallery/PALETTE_CHECK.json` unless that is
  the point of the commit.
- Commit attribution, every commit:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
  ```
- Report at the end (concise): branch, commits, what is rebuilt vs. what the recovered briefs specified and is still missing, test counts
  light/dark, anything not run and why.
