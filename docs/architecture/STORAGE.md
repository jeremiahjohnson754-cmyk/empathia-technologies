# Storage architecture — evidence and generated files

## Design

Evidence (photos, PDFs, CSV/JSON readings, text observations) is stored as immutable, **content-addressed** objects; its metadata lives
in PostgreSQL. The bytes and the record are linked by the SHA-256, which is checked again on every read.

```mermaid
sequenceDiagram
  participant C as Client
  participant A as API (domain/commissioning.ts)
  participant S as ObjectStore
  participant D as PostgreSQL (app.evidence_object)
  C->>A: POST /v1/evidence (raw body, content-type, x-file-name)
  A->>A: authority (EVIDENCE_AUTHORITIES), media-type allow-list, non-empty, sanitize file name
  A->>S: put(bytes) → key sha256/ab/abcd…, sha256, bytes
  A->>D: INSERT evidence_object (sha256, bytes, media_type, file_name, storage_key, uploaded_by, retention_until = today + 7 years)
  A->>D: audit evidence.upload
  C->>A: GET /v1/evidence/:id/content
  A->>D: SELECT row (RLS: own tenant only)
  A->>S: get(key); verify(key, sha256)
  A-->>C: bytes as attachment (or 500 "no longer matches its recorded hash")
```

## Implementation

| Part | Where | Behaviour |
|---|---|---|
| `ObjectStore` interface | `services/enterprise-api/src/storage/objectStore.ts:10-16` | `put(data)`, `get(key)`, `verify(key, sha256)`; `kind` = `local` or `s3` |
| `LocalObjectStore` | `objectStore.ts:18-34` | key `sha256/<2 hex>/<64 hex>`, validated by regex before any file access (`:22`, no path traversal); directories 0700, files 0600; atomic write (temp file + rename, `:28`); identical bytes stored once; `verify` re-hashes |
| `S3ObjectStore` | `objectStore.ts:36-44` | **CONTRACT_ONLY**: every method throws `NOT_CONFIGURED`; needs `@aws-sdk/client-s3`, not installable offline |
| Upload rules | `domain/commissioning.ts:27-41` | authority (`work.evidence`, `field.scan`, `test.verify`, `tests.verify.all`, `test.verify.audio/video/control`); media types `image/jpeg`, `image/png`, `application/pdf`, `text/csv`, `application/json`, `text/plain`; empty files refused; name sanitized to `[\w.\- ]`, 200 chars; body limit `MAX_BODY_BYTES` |
| Metadata | `database/migrations/0003_commissioning_evidence.sql` (`app.evidence_object`) | tenant, sha256, bytes, media type, file name, storage key, uploader, uploaded_at, `retention_until`; **append-only** (`evidence_append_only` trigger, `:88`); RLS FORCED |
| Read rule | `domain/commissioning.ts:44-53` | row visible only in the caller's tenant; hash re-verified; read audited (`evidence.read`); served with `Content-Disposition: attachment` |
| Use | `app.test_result.evidence_id` | a result must reference an existing evidence object of the same tenant |

Retention: 7 years from upload is written to every row (`retention_until`). Nothing deletes evidence today (append-only); a retention
job and a legal-hold flag are future work, to be designed with counsel because the rows may contain personal data.

Backup: database first, then objects; drill PASS on 2026-10-26 (`docs/operations/BACKUP_AND_RESTORE.md`).

## Production target (S3-compatible, MinIO locally)

1. Implement `S3ObjectStore` with the same key scheme; `put` uses `If-None-Match: *` so an existing object is never overwritten.
2. Bucket versioning + object lock in compliance mode with retention ≥ `retention_until`; server-side encryption; no public access.
3. Upload path: quarantine prefix → malware scan → promote to `sha256/` key (KV-07). Large files: pre-signed upload URLs to quarantine,
   then the API verifies the hash before creating the row.
4. Downloads: keep streaming through the API (authorization and audit stay server-side), or short-lived pre-signed URLs issued only after
   the same checks.
5. Guarding tests to keep: `tests/integration/api.test.mjs` slice 5 (store, hash, retention, re-verify, append-only) and the security
   tests on cross-tenant evidence.
