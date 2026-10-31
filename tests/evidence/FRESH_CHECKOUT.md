# Fresh-checkout validation (P7)

Commit `892023dd61a9d42b220b8fb17ec30a384e1f4547`, cloned into an empty directory, toolchain linked by `scripts/bootstrap.mjs`, its own database cluster (port 55433), `node scripts/build.mjs`, `node scripts/test.mjs --browser --studio`. Run 2026-10-31T22:20:53.427Z, 569 s.

**Verdict: FAIL: 3 suite(s) failed in the fresh copy**

| Step | Exit | Seconds |
|---|---|---|
| clone | 0 | 9.9 |
| bootstrap | 0 | 0 |
| database | 0 | 1.2 |
| build | 0 | 41.9 |
| ml dataset | 0 | 0.8 |
| ml training | 0 | 3.4 |
| test | 1 | 509.9 |
| release gate (platform) | 1 | 0 |

Fresh copy: PASS 47 · FAIL 3 · NOT_RUN 1. Workspace (2026-10-31T21:34:34.429Z): PASS 50 · FAIL 0 · NOT_RUN 1.

| Suite | Fresh copy | Workspace |
|---|---|---|
| browser: enterprise web E2E | FAIL 87/88 | PASS 88/88 |
| browser: Founder Studio | FAIL 18/19 | PASS 19/19 |
| deploy: public sites audit (functional, a11y, responsive; no P0/P1) | FAIL / | PASS 152/152 |
