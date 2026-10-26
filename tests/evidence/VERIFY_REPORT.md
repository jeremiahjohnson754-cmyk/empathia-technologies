# Verification report

2026-10-26T13:45:01.766Z · commit `b41e3e6f0992` (uncommitted changes present) · Node v22.22.0

PASS 6 · FAIL 0 (secret scan re-run after review; first run FAIL recorded) · NOT_RUN 0

| Check | Result | Seconds | Evidence | Note |
|---|---|---|---|---|
| build (tsc, type-check, OpenAPI contract, web bundle) | PASS | 7.4 | .local/logs/BUILD_SUMMARY.json | PASS  type-check apps/founder-studio (existing generated data)  (2.2 s) /  / build PASS — log .local/logs/build-2026-10-26T13-34-58-331Z.log |
| test suites | PASS | 578.3 | tests/evidence/TEST_RESULTS.md | PASS     media: full decode of every curated film  36/36  (455.2 s) /  / PASS 18 · FAIL 0 · NOT_RUN 0 — tests/evidence/TEST_RESULTS.md |
| secret scan of tracked files | PASS (re-run) | 1.8 | tests/evidence/SECRET_SCAN.json | first run FAIL (5 lines: .env.example CHANGE_ME placeholders and the documented dev password in two scratch-database scripts); reviewed, allow-listed with reasons, re-run PASS: 573 files, 0 findings, 8 allow-listed |
| documentation links resolve | PASS | 0.1 | tests/evidence/LINK_CHECK.json | PASS: 118 relative links in 99 Markdown files; 0 broken; 1 external links NOT_RUN |
| frozen releases unchanged | PASS | 15.9 | tests/evidence/FROZEN_CHECK.json |   ] /  ] / } |
| working tree clean of untracked secrets (.local ignored) | PASS | 0 |  |  |

Local verification of a production starter on synthetic data. It is not a security assessment, a performance test or production acceptance.
