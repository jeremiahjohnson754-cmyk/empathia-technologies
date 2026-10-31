# Release profiles and the release-control gate

The gate (`scripts/verify/no-unexpected-skips.mjs`) runs after the full test matrix in CI. It writes
`tests/evidence/RELEASE_GATE.json` and fails the job when any suite FAILed, or was NOT_RUN without being named by the release
profile. Each named skip carries its reason.

| Profile | When | Skips allowed |
|---|---|---|
| `platform` (default) | Releases of the website, the investor demo, the Founder Studio, the API or the enterprise web app that ship or change no film | One: **media: full decode of every curated film**. It needs the founder's film masters, which are not in the repository, and about 47 minutes of decoding. |
| `media` | Any release that ships or changes a film (website films, Studio films, investor films) | **None.** The full decode must run on a machine holding the film masters: `EMPATHIA_WORKSPACE=<film folder root> node scripts/test.mjs --browser --studio --films`, then `node scripts/verify/no-unexpected-skips.mjs --profile=media` |

To choose a profile in CI, open GitHub → Actions → ci → **Run workflow** → profile. Pushes and pull requests use `platform`.

## Everything CI builds before testing

| Application or input | How CI obtains it |
|---|---|
| Packages, API, enterprise web, website, investor demo | `node scripts/build.mjs --studio` |
| Founder Studio | The same build. Its inputs are committed in `apps/founder-studio/inputs`: the Founder Edition 2.5.4 HTML and three original V2.5.4 source files. The build checks them against `INPUTS.json` before using them. |
| Architecture diagrams | Committed renders in `docs/architecture/diagrams/rendered/`, named by the SHA-256 of their source. An edited diagram is re-rendered, or shown as NOT_RENDERED, never stale. |
| ML research prototype | `node ml/datasets/generate_synthetic.mjs`, then `python3 -I ml/training/train.py`. The dataset is synthetic and deterministic; the model is labelled a research prototype, not a product claim. |
| Python packages | `requirements-ci.txt`, pinned to the versions the suites were verified with |
| Test database | `node scripts/db.mjs up`: a private PostgreSQL 16 cluster with the migrations, roles and row-level security |
| Film masters | **Not in CI.** The Studio film tests run the same launcher, byte-range and player path on synthetic test-pattern files, and record that they did (S-00). The decode of the real films belongs to the `media` profile. |

## Evidence retention

- **CI:** each run keeps all `tests/evidence` JSON, Markdown and screenshots, the build and test logs, and the build manifests, for
  90 days, as the artifact `test-evidence-<commit>`.
- **Locally:** `node scripts/release/verify-fresh.mjs --ci` reproduces the CI job in a fresh clone that reads nothing from outside the
  clone, and writes `tests/evidence/FRESH_CHECKOUT.{json,md}`.
