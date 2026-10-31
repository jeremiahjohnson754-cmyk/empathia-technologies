# Fresh-checkout validation (P7)

Commit `c06a240106244b6af5cebbc63c05b66b2717f194`, cloned into an empty directory, toolchain linked by `scripts/bootstrap.mjs`, its own database cluster (port 55433), `node scripts/build.mjs`, `node scripts/test.mjs --browser --studio`. Run 2026-10-31T17:14:35.798Z, 553 s.

**Verdict: PASS: the fresh copy reproduces this workspace suite by suite**

| Step | Exit | Seconds |
|---|---|---|
| clone | 0 | 0.3 |
| bootstrap | 0 | 0 |
| database | 0 | 1 |
| build | 0 | 209.4 |
| ml dataset | 0 | 0.9 |
| ml training | 0 | 3.1 |
| test | 0 | 336.6 |

Fresh copy: PASS 47 · FAIL 0 · NOT_RUN 1. Workspace (2026-10-31T16:58:16.733Z): PASS 47 · FAIL 0 · NOT_RUN 1.

No suite differs between the fresh copy and this workspace.
