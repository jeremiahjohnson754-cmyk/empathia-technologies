# Empathia v1.7 — Architecture Decisions, Trade-offs and Verification Gates

| ADR | Decision | Why | Major counter-risk / guardrail | Proof |
|---|---|---|---|---|
| ADR-001 | Modular monolith + bounded modules first | Faster delivery/reliability than premature distributed services | Encapsulate schema ownership; explicit typed APIs; can extract independent service later | Package import graph and deploy/rollback test |
| ADR-002 | Tenant Control/Data/Experience planes | Authorization and billing separated from mutable customer telemetry | Never trust client chosen tenant/role; compare active context to token grants | Cross-plane security suites |
| ADR-003 | Postgres authoritative system of record | Transactional consistency for assets/approvals | RLS bypass roles and pooled session leakage; db migrations | DB regression and pool stress |
| ADR-004 | Search Party graph as read projection | Relationships searchable without fractured authority | Stale index, RAG leaks, false confidence | Token-scope and staleness tests |
| ADR-005 | Shared workflow engine | Reuse gated approval model across products | Must preserve per-domain validations; no universal magic status | 6 golden paths + negative tests |
| ADR-006 | Shared evidence ledger | One report source and legal chain of custody | Hashes alone don't prove measurement quality | Reproducible source-to-report audit |
| ADR-007 | Outbox + durable workers | Eliminate lost updates in asynchronous flows | Duplicate/reordered events; idempotency/ordering | Fault injection/replay |
| ADR-008 | Connector capability contract | Avoid vendor API overclaims and duplication | Different API entitlements and terms per vendor | Per-adapter contract fixture |
| ADR-009 | Outbound-only edge gateway | Support equipment without public inbound reach | On-prem permits, security review, revocation, TLS | No unapproved ports; enrollment tests |
| ADR-010 | Separate demo/live paths | Proof honesty and customer data protection | Accidentally invoking live through synthetic event | Isolation and actuation proof |
| ADR-011 | QR opaque resolver | Secure access without embedded credentials | Token leakage and unauthorized enumeration | Negative URL tests |
| ADR-012 | Immutable dossier snapshot | Consistent executive artifacts | Export job concurrency; long-form media | PDF/DOCX/XLSX/JSON count comparison |
| ADR-013 | 2D-first Lite with optional 3D | Mobile usability and accessibility | Need accurate geometry and modeling confidence | Timed low-end phone benchmark |
| ADR-014 | Shared Experiences primitives | Reuse across Stadium/University/Convention | Each world still has distinct auth and privacy | Role-specific E2E tests |
| ADR-015 | SIGNAL source-canon content pipeline | Preserve loved story while producing film | AI face/voice drift; new canon hallucinations | Original hash and chapter choice diff |
| ADR-016 | First 3–5 cinematic episodes then scale | Quality before volume | Incomplete rest-of-series media is transparently marked | Human production QC |
| ADR-017 | Hosted Stripe-class provider payment | PCI/payment compliance footprint reduction | No raw banking in app, settlement latency | Webhook/entitlement test |
| ADR-018 | Founder Platform Owner without omnipotent backdoor | Founder business control plus customer trust | Recovery and accountability | MFA break-glass test and audit |
| ADR-019 | Contextual roles ≠ grants | UX and security separation | Default-deny enforcement | 52 contexts negative tests |
| ADR-020 | Failure-first release engineering | Prevent beautiful-but-broken SaaS | Automated tests are not real security certification | Signed evidence and rollback exercise |

**ADR lifecycle**: PROPOSED → RESEARCHED → APPROVED (founder + relevant safety/security owner) → IMPLEMENTED → VERIFIED → SUPERSEDED (with migration) or REJECTED. Claude can recommend but not silently approve material legal/commercial/security exceptions.
