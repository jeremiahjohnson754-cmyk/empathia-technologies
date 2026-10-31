# Fresh-checkout validation (P7)

Commit `3e7a0a9bb0c1f5c8cc6fc12f8674d53efd2dd2a7`, cloned into an empty directory, toolchain linked by `scripts/bootstrap.mjs`, its own database cluster (port 55433), `node scripts/build.mjs`, `node scripts/test.mjs --browser --studio`. Run 2026-10-31T22:35:36.160Z, 572 s.

**Verdict: PASS: the fresh copy reproduces this workspace suite by suite**

| Step | Exit | Seconds |
|---|---|---|
| clone | 0 | 0.9 |
| bootstrap | 0 | 0.1 |
| database | 0 | 1.2 |
| build | 0 | 41.6 |
| ml dataset | 0 | 0.9 |
| ml training | 0 | 3.1 |
| test | 0 | 522.7 |
| release gate (platform) | 0 | 0 |

Fresh copy: PASS 50 · FAIL 0 · NOT_RUN 1. Workspace (2026-10-31T21:34:34.429Z): PASS 50 · FAIL 0 · NOT_RUN 1.

No suite differs between the fresh copy and this workspace.
