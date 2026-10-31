# ADR-0009 — Competency records: the only credentials dispatch reads (P1 · Learn ↔ ServiceHands)

Status: implemented 2026-10-31 (Project Ascension directive, P1 "Empathia Learn") · migration `0023_competency.sql`

## Context

The directive asks Learn for "competency evidence. Skill records with provenance and expiry. ServiceHands skill-matching
interoperability. Governed competency verification." Before this change, ServiceHands' hard gates read certifications from
`app.staff_profile.certs`, a JSON column the seed wrote directly. Nobody recorded those certifications, nobody verified them, and
nothing could revoke one. Learn recorded training (quizzes, drills) but deliberately never turned training into authority.

## Decision

1. **One table, one source.** `app.competency_record` holds every credential: the competency id from the service engine's catalogue
   (`CERTS`), its source (external certificate, licence or assessment), the issuer and certificate/licence number, issue and expiry
   dates, an optional uploaded copy (`evidence_object`, same tenant), and optional training records cited as supporting evidence.
   ServiceHands' `pool()` reads certifications **only** through `verifiedCerts()`, which returns VERIFIED records. `staff_profile.certs`
   is no longer read and the seed leaves it empty. The old values were not migrated into competency records, because that would have
   invented a recorder and a verifier who never acted.
2. **Who does what, using existing authorities only.** No role or authority was added:
   - record: `service.assign` (the service manager, who already dispatches against these facts);
   - verify / reject: `provenance.review` (the data steward, who already reviews provenance);
   - revoke: either authority, with a reason.
3. **Independence.** The verifier is never the recorder and never the holder. The API refuses this with a 422, and the refusal is
   audited. The database enforces the same rule with a CHECK, so a direct write cannot get around it.
4. **What counts.** A credential counts for dispatch only when it is VERIFIED, unexpired and not revoked. An expired verified credential
   is still passed to the engine with its date, so the gate names it ("expired <date>") instead of hiding it. A pending, rejected or
   revoked credential counts for nothing. Revocation takes effect on the next gate evaluation, and assignment re-runs the gates.
5. **Training never grants.** An ASSESSMENT must cite evidence: an uploaded record, or training records that belong to the holder.
   Citing someone else's training is refused. The assessment still needs independent verification like any other credential.
6. **Privacy.** Credentials are personal records. People who hold the record or verify authority see all of them. Everyone else sees
   only their own. The person picker offers only the service pool (people who may accept work), which the service manager already sees
   when ranking candidates. `/v1/people` (security admin) was not widened.
7. **Visibility.** Mission Control lists a pending credential as a step for those who may verify it, never for its recorder or its
   holder. Learn › Competencies shows each record's provenance, decision, revocation and whether it counts for dispatch.

## Consequences

- API: `GET /v1/competencies`, `POST /v1/competencies`, `POST /v1/competencies/:id/verify|reject|revoke` (147 operations in total).
  Every write is audited (`competency.record|verify|reject|revoke`).
- Tests: `tests/security/competency.test.mjs` COMP-1..6 (provenance, privacy, validation, independence including the DB CHECK, gate
  effect of verification and revocation, Mission Control), browser W-79/W-80 (record as the manager, verify as the steward).
- Not done: credentials do not expire by a scheduled job, because expiry is evaluated at read time. Nothing notifies anyone of an
  upcoming expiry. There is no issuer-registry integration, so verification is a person's attestation recorded with a note, not an
  automated check against the issuer. Skill levels (`staff_profile.skills`) are still profile facts with no provenance.
