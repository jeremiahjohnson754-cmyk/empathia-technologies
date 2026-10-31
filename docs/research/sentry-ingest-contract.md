# Sentry ingest contract — research record (2026-10-31)

Purpose: the platform's telemetry transport (`packages/observability`) targets Sentry's **published** ingest protocol directly, so the
protocol had to be read from Sentry's own developer documentation rather than remembered. Retrieved with the Firecrawl connector
(authenticated; three page retrievals, 3 credits). Nothing below is a claim that delivery to a live project was exercised.

| Source (Sentry developer documentation) | Retrieved | What it establishes |
|---|---|---|
| https://develop.sentry.dev/sdk/foundations/envelopes/ (redirect target of `/sdk/data-model/envelopes/`) | 2026-10-31 10:4x UTC, HTTP 200, Firecrawl cache of 2026-10-30 | Envelope grammar: `Headers { "\n" Item } [ "\n" ]`, `Item = Headers "\n" Payload`; header lines are single-line compact JSON, UTF-8; envelope headers `event_id`, `sent_at` (RFC 3339, UTC, written once at send), `dsn` (optional self-authentication), `sdk`; item headers `type` (required) and `length` (recommended; bytes); a length-declared payload must end at `\n` or EOF; endpoint `POST /api/<project_id>/envelope/`; content type `application/x-sentry-envelope`; size limits (1 MiB per event/transaction item) |
| https://develop.sentry.dev/sdk/foundations/transport/ | 2026-10-31, HTTP 200, live fetch | Send in the background; flush on shutdown; honor `429` + `Retry-After` by not sending; **do not retry** failed submissions; a `200` with `{"id": …}` confirms delivery |
| https://develop.sentry.dev/sdk/foundations/transport/authentication/ | 2026-10-31, HTTP 200, Firecrawl cache of the same day | DSN form `{PROTOCOL}://{PUBLIC_KEY}[:{SECRET_KEY}]@{HOST}{PATH}/{PROJECT_ID}` (secret optional, deprecated); endpoint `{PROTOCOL}://{HOST}{PATH}/api/{PROJECT_ID}/{ENDPOINT}/`; header `X-Sentry-Auth: Sentry sentry_version=7, sentry_client=<name/version>, sentry_key=<public key>`; `user-agent` as `{sdk-name}/{sdk-version}` |

## How the implementation follows it
- `parseDsn` → `envelopeUrl` exactly per the authentication page; `authHeader` emits version 7, client and key; no secret.
- `serialize` emits header line + `{"type","length","content_type"}` + payload + `\n`; `length` is **bytes** (UTF-8), proven by a round-trip test with non-ASCII content.
- `SentryTransport` sends `content-type: application/x-sentry-envelope`, pauses on `429` for `Retry-After`, counts drops, never retries.
- Event and transaction payload fields follow the Event Payloads chapter of the same documentation (not retrieved this session: `exception.values[].stacktrace.frames`, `contexts.trace`, `type: "transaction"`, `start_timestamp`); those field names are the documented ones but were **not re-verified** today — the first live send (once a project exists) is where they get validated.

## Not done, on purpose
Creating a Sentry project (the connector offers `create_project`; the organization `jeremiah-johnson` has none) is an external account
action the owner authorizes. Until then `TELEMETRY=none` (default) or `TELEMETRY=file` are the only exercised transports.
