# Clean-environment run (verification item 20)

2026-10-26T13:24:33Z — a fresh `git clone` of commit `a74934dd7150` into an empty folder (no node_modules,
no .local, no build output), then exactly the documented commands:

```
node scripts/bootstrap.mjs                       # offline: links /opt/npm-tools/node_modules
node scripts/build.mjs                           # → BUILD_SUMMARY.json
EMPATHIA_PG_PORT=55433 node scripts/db.mjs up    # a second cluster beside the first
node ml/datasets/generate_synthetic.mjs && python3 -I ml/training/train.py
node scripts/test.mjs --browser                  # → TEST_RESULTS.md
```

Result: build PASS; **15 suites PASS, 0 FAIL, 3 NOT_RUN** (Founder Studio browser test and town-hall E2E need the Founder Edition and
the films, which are not in the repository; the full film decode is a separate, slow run — 36/36 PASS in tests/evidence/films/).

The clean run found two defects, both fixed in the main repository; the two fixed scripts were copied into the clone and the run repeated:
1. `scripts/build.mjs` type-checked the Founder Studio against data it only generates from the Founder Edition (gitignored) → the
   studio is now type-checked as part of `--studio`, and reported NOT_RUN otherwise.
2. `scripts/db.mjs` used the default port again on later calls, so a second checkout on another port failed its tests → the port
   recorded when the cluster was created now wins.

Not covered: a different operating system, a machine without the offline tool folder (`pnpm install` path), containers (NOT_RUN).
