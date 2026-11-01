# Fresh-checkout validation (P7)

Commit `9fa4a55f4fde68eba99b5e447b4ab121c5054b57`, cloned into an empty directory, toolchain linked by `scripts/bootstrap.mjs`, its own database cluster (port 55433), `node scripts/build.mjs`, `node scripts/test.mjs --browser --studio`. Run 2026-11-01T03:59:54.416Z, 687 s.

**Verdict: PASS: the fresh copy reproduces this workspace suite by suite**

| Step | Exit | Seconds |
|---|---|---|
| clone | 0 | 20.4 |
| bootstrap | 0 | 0.2 |
| database | 0 | 1.1 |
| build | 0 | 41 |
| ml dataset | 0 | 0.9 |
| ml training | 0 | 3 |
| test | 0 | 619.7 |
| release gate (platform) | 0 | 0.1 |

Fresh copy: PASS 57 · FAIL 0 · NOT_RUN 1. Workspace (2026-11-01T03:47:55.349Z): PASS 57 · FAIL 0 · NOT_RUN 1.

No suite differs between the fresh copy and this workspace.
