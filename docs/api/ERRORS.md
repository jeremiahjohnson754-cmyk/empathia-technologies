# Error taxonomy

Every error response is an RFC 9457 problem document (`content-type: application/problem+json`), built by `ApiError.problem()` in
`services/enterprise-api/src/http/errors.ts`:

```json
{ "type": "https://errors.empathia.invalid/<code>", "title": "<stable title>", "status": 422, "detail": "<what happened>",
  "code": "<code>", "reasons": ["<every reason, when there are several>"], "correlationId": "<uuid>" }
```

`reasons` appears only when there is at least one; `correlationId` is also sent as the `x-correlation-id` header (a caller may supply its
own, 8–80 characters of letters, digits and `._-`). Error bodies never contain stack traces; a 500 is logged server-side under its
correlation id. Real captured examples: [EXAMPLES.md](EXAMPLES.md).

## Codes

| `code` | HTTP | `title` | When |
|---|---|---|---|
| `unauthenticated` | 401 | Sign-in required | no `Authorization: Bearer`; malformed, tampered, expired (±30 s), wrong issuer/audience or non-HS256 token; the membership in the token no longer exists or the person is disabled; wrong email or password at sign-in (same message whether or not the account exists) |
| `forbidden` | 403 | Not allowed for your role | the role lacks the endpoint's authority (audited as DENIED); recording a result as a role that is not responsible for the test; sign-in naming a membership the person does not have |
| `not_found` | 404 | Not found | no such endpoint; a record outside the caller's tenant **or site scope** (existence is not disclosed) |
| `validation` | 400 | The request is not valid | body or query fails the route schema; unknown query parameter; body is not JSON; bad Idempotency-Key format; bad path id |
| `validation` | **405** | The request is not valid | the path exists but not with this method (`allow` header lists the methods) |
| `conflict` | 409 | The record changed or already exists | unique violation (PostgreSQL 23505), e.g. an existing project code; several memberships match at sign-in (with the choices in `reasons`); an Idempotency-Key still held by a concurrent request (or one that ended without recording its response): the request is not run twice |
| `rule_refused` | 422 | Refused by a business rule | a domain rule refuses: lifecycle gates, results before COMMISSIONING, self-verification, unchanged revision, work order on a design deficiency, …; also every database rule below |
| `idempotency_mismatch` | 422 | Idempotency key reused with a different request | same Idempotency-Key, different method/path/body |
| `payload_too_large` | 413 | Request too large | body over `MAX_BODY_BYTES` (default 25 MiB) |
| `unsupported_media_type` | 415 | Unsupported media type | JSON endpoint without `content-type: application/json`; evidence of a type outside jpeg/png/pdf/csv/json/text |
| `rate_limited` | 429 | Too many requests | the caller's per-minute budget is spent (see API guide) |
| `not_configured` | 501 | Not configured | AI generation (no model in the starter); probing or syncing an integration that is not a runnable MOCK |
| `internal` | 500 | Internal error | anything unexpected, including a stored evidence object whose hash no longer matches; details only in the server log |

## Database rules surfaced through the API

The API checks rules first; the database refuses again if anything reaches it. `http/server.ts` maps:

| SQLSTATE | Raised by | Becomes |
|---|---|---|
| `EM001` | `app.refuse_change()` — UPDATE/DELETE on an append-only table (audit_event, evidence_object, test_result, verification, room_revision, issue_event) | 422 `rule_refused` |
| `EM002` | `app.result_only_in_commissioning()` — a result for a room not in COMMISSIONING | 422 `rule_refused` |
| `EM003` | `app.verify_only_pass()` — verifying a non-PASS, or `recorded_by` not matching the result | 422 `rule_refused` |
| `EM004` | `app.mock_evidence_only()` — non-`SYNTHETIC_MOCK` evidence from a non-VERIFIED integration | 422 `rule_refused` |
| `23514` | CHECK violation, e.g. `verification_is_independent`, `room_read_model.live_health = 'NOT_MONITORED'` | 422 `rule_refused` (constraint name in `detail`) |
| `23505` | unique violation | 409 `conflict` |
| `42501` and others | e.g. a row-level-security violation | 500 `internal` (should be unreachable: the application filters first) |

Adding a code: extend `ErrorCode`, `STATUS` and `TITLE` in `errors.ts`, document it here, and regenerate the OpenAPI document
(`node scripts/api/export-openapi.mjs`). Never reuse a code with a different meaning.
