# Fresh-checkout validation (P7)

Commit `78344e1805a3ffa6f3bea74d70543fcb3a97e452`, cloned into an empty directory, toolchain linked by `scripts/bootstrap.mjs`, its own database cluster (port 55433), `node scripts/build.mjs`, `node scripts/test.mjs --browser --studio`. Run 2026-10-31T17:04:48.566Z, 281 s.

**Verdict: PASS with differences (see the table)**

| Step | Exit | Seconds |
|---|---|---|
| clone | 0 | 0.7 |
| bootstrap | 0 | 0.1 |
| database | 0 | 1.2 |
| build | 0 | 42.7 |
| test | 0 | 234.4 |

Fresh copy: PASS 43 · FAIL 0 · NOT_RUN 5. Workspace (2026-10-31T16:58:16.733Z): PASS 47 · FAIL 0 · NOT_RUN 1.

| Suite | Fresh copy | Workspace |
|---|---|---|
| unit: ml research prototype (python) | NOT_RUN / | PASS 5/5 |
| browser: Founder Studio | NOT_RUN / | PASS 19/19 |
| e2e: founder town hall (Founder Edition) | NOT_RUN / | PASS 25/25 |
| e2e: founder decisions (hosted studio over the API) | NOT_RUN / | PASS 9/9 |
