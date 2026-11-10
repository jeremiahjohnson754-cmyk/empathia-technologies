# SIGNAL canon — the founder's authored story, as data

This folder holds *SIGNAL · An Empathia Learn Story* exactly as the founder's engineering build package (v1.0, 25 September 2026)
exports it: the 11-part Prologue and all 133 chapters of the twelve seasons as resolved item streams (`data/story/`), every panel as an
SVG (`data/art/`), the cast and locations, the season list, the review-flag register and the package's own counts (`data/stats.json`).

- **Nothing here is edited.** `MANIFEST.sha256` lists every file with its hash; `tests/unit/signal-canon.test.mjs` fails if one byte of
  the story or art changes, or if a count drifts from the package's own statistics.
- **Source.** `signal-build-package.zip`, SHA-256 `990cf805b927e5fb8b8cea416f87e70bc583e7e93ef94f078d074d0dbc1fabc8`, whose reference build is
  `signal-standalone.html` SHA-256 `80f8d992…8a466d`. The founder's later upload of the standalone file (SHA-256 `1448c338…c9c772`) differs in
  one remembered-choice flag on one decision; that flag is engine state and does not appear in these resolved streams.
- **Committed to this public repository on the founder's instruction of 9 November 2026.** It is the founder's own work; all rights are
  his. It is not offered under the repository's code terms.
- **It is a draft, and says so.** The package records 318 open review flags and no expert sign-off: technical figures are illustrative
  until their flags close. The product shows each flag where it applies; it does not hide flagged content ("keep all content; flag
  rather than block").
- Story content names no real brand, product or company.

The application never bundles this data: `apps/demo/build.mjs` copies it to `dist/signal/` and the story player fetches one chapter at a time.
