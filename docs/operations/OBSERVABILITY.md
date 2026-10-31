# Observability — error reporting, request performance, release correlation

Status (2026-10-31): **implemented and tested locally; delivery to a live Sentry project NOT validated** (no project exists;
creating one is an external action awaiting owner authorization). Nothing here makes the platform "monitored in production".

## Architecture
```
request ──► http/server.ts ──┬── problem document (correlationId) ──► client
                             ├── structured log line (correlationId, route, status, ms)
                             └── Telemetry port (@empathia/observability)
                                   ├── captureException  (status 500 only: type, message, frames, correlation_id, route template, role, tenant_id, release)
                                   └── transaction       (every request, sampled; 5xx always; route template, status, duration; never the query string)
                                         └── Transport: none (default) │ file (NDJSON envelopes) │ sentry (POST /api/<project>/envelope/)
browser ──► telemetry.ts: window error / unhandledrejection / ErrorBoundary / API ≥500 (with the API's correlation id) ──► same port, platform "javascript"
```
- **One port, three transports.** The application never imports a vendor SDK. `TELEMETRY=none` is the default; `file` writes
  Sentry-format envelopes to `TELEMETRY_FILE`; `sentry` posts to the DSN's envelope endpoint (`SENTRY_DSN`, https required in production).
- **Correlation.** The same `correlationId` is in the HTTP response header, the problem document, the log line and the telemetry
  event (`tags.correlation_id`). The browser attaches the API's correlation id to an API ≥ 500 report, so both sides of one failure meet.
- **Release correlation.** `scripts/build.mjs` stamps the commit into `services/enterprise-api/dist/build-info.json` and the web bundle
  (`EMPATHIA_RELEASE_SHA`). Events carry `release = <service>@0.1.0+<sha12>` and `environment`; `/health` shows the release and the transport.
  `RELEASE_SHA` / `RELEASE_ENVIRONMENT` override the stamp for CI/CD. Source maps never ship; they are kept under `.local/sourcemaps/` for upload to the tracker.
- **Privacy by construction.** `scrub` redacts authorization/cookie/token/password/body/e-mail/person-id keys, masks e-mail addresses
  and bearer tokens inside strings, bounds depth and length. Request bodies and headers are never passed to the port at all.
- **Failure isolation.** The port never throws; a failing transport increments `dropped`; `429` pauses sending for `Retry-After`; no retries.
- **Process-level.** `uncaughtException` / `unhandledRejection` → one `fatal` event, flush, exit 1.

## Configuration
| Variable | Default | Meaning |
|---|---|---|
| `TELEMETRY` | `none` (`sentry` when `SENTRY_DSN` is set) | `none` · `file` · `sentry` |
| `SENTRY_DSN` | — | required for `sentry`; https in production |
| `TELEMETRY_FILE` | — | required for `file` (NDJSON envelopes, append) |
| `TELEMETRY_TRACES_SAMPLE_RATE` | `0.1` | share of requests recorded as transactions (0..1); 5xx are always recorded |
| `RELEASE_SHA`, `RELEASE_ENVIRONMENT` | build stamp, `NODE_ENV` | release identity |
| browser: `<meta name="empathia-sentry-dsn">`, `<meta name="empathia-environment">` | none | written by the serving process, like the API origin; no query-string override exists |

## Evidence
| Check | Where | Result |
|---|---|---|
| DSN parsing, auth header, envelope grammar round-trip (bytes), scrubbing, sampling, 429 handling, no-retry, file/null transports, env parsing, frames | `packages/observability/test` | 10/10 |
| Through the real API: /health, 500 → exception event with the problem's correlation id, transactions with route templates (no query string), status→trace status mapping, wire grammar of every envelope, configuration negatives | `tests/integration/observability.test.mjs` OBS-1..OBS-5 | 5/5 |
| Browser: release stamp, no transport unless configured, window error captured, bundle carries no DSN and no source map | `tests/browser/enterprise-web.test.mjs` W-49..W-51 | PASS |
| Live delivery to Sentry, release visibility in the Sentry UI, alerting | — | **NOT RUN** (no project; see runbook) |

## Runbook: enabling Sentry (needs owner authorization — external account action)
1. Create the project in organization `jeremiah-johnson` (the connector's `create_project`, platform `node` for the API and `javascript` for the web; one team is required first). This provisions a DSN.
2. Set `TELEMETRY=sentry`, `SENTRY_DSN=<dsn>` on the API; have the web server write `<meta name="empathia-sentry-dsn">` with the browser project's DSN.
3. Trigger one synthetic error through the API in a non-production environment and confirm it in Sentry under the release shown by `/health` — that is the first live validation and must be recorded in `docs/BUILD_STATUS.md`.
4. Upload `.local/sourcemaps/enterprise-web/*.map` for that release (sentry-cli or the Releases API) so browser frames resolve.
5. Alerts: an issue alert on `level:fatal` and a metric monitor on `count()` of `level:error` per 5 min are the two the connector can create; neither is created until step 3 succeeds.
