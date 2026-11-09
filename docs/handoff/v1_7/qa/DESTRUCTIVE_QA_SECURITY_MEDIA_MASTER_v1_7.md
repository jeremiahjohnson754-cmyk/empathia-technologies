# Empathia v1.7 — Destructive QA, Ethical Security and Cinematic Human-Fidelity Assurance

**Rule:** The team tries to break Empathia—only in approved isolated environments—before customers discover what fails. This is a testing plan, not evidence that the software has passed. Formal independent penetration tests, security attestation or certification require the corresponding authorized qualified humans.

## Method and ethics

Scope and authorization first: staging hostnames, explicit time windows, permitted datasets, permitted test traffic and outbound destinations, owner of every target and rollback plan. No probing a real corporate, university or stadium network without written authorization. CEH is an ethical hacking professional certification; CISSP is a security governance/architecture certification. Claude can reason using their topic domains and document controls but **may not represent itself as a credential-holder, qualified independent tester or certifying body**.

Test types: static analysis, SCA/SBOM, typed API contract tests, black-box E2E, state-machine/property testing, fuzzing, controlled fault injection, accessibility automation plus human observation, real AV engineering review and media QC. Security baseline: OWASP ASVS v5 stable, OWASP WSTG stable, NIST SSDF/SP 800-115, threat-model evidence and customer-specific requirements; never claim formal OWASP-certified compliance.

## Eighteen formal reviewer perspectives

1. Software principal: architecture correctness, data ownership, contract diff, flaky concurrency.
2. Independent QA lead: requirement coverage, regressions, negative paths and release gate.
3. CEH-style tester: authorized threat model and application/API adversarial tests.
4. CISSP-style architect: governance, owner privilege, encryption, segregation, incident response, BCP and risk acceptance.
5. Privacy/legal: consent, client and student data, media rights, customer agreements and payment.
6. SRE/DevSecOps: deployment, secrets, rollback, restore, metrics and incident handling.
7. AV system designer: DSP, audio, video, sightlines, signal routes, camera placement and assumptions.
8. Commissioning lead: test applicability, evidence, measurement calibration, source-referenced acceptance and signoff.
9. AV service technician: realistic workbench speed, barcode/QR, dirty labels, offline, gloves, safe escalation.
10. Network/UC engineer: Entra, VLAN, PTP, Teams/Graph supported APIs, DNS, QoS and rate limits.
11. Broadcast/video engineer: output chains, frames, captions, audio sync and show-control realism.
12. UX researcher: novice comprehension, complete task completion, error recovery and accessibility.
13. UI designer: component quality, layouts, responsive design, type hierarchy, contrast, microinteractions.
14. Accessibility specialist: WCAG 2.2, screen readers, captioning, image descriptions, 2D fallback.
15. Narrative editor: Maya/Ray continuity, dialogue, comedy, stakes, natural emotional arcs.
16. Technical learning editor: evidence-backed correct training decisions and actual transferable skill.
17. Animation producer/artist: character identity, anatomy, physics, facial acting, scene/prop continuity.
18. Audio post engineer: casting continuity, effects, intelligibility, loudness, mono, dynamic range and QC.

Cross-review signoffs needed for incident-heavy SIGNAL episodes by 7+10+11+15+16+17+18. Aversion to AI uncanny behavior is a *release criterion* and not a statement that unreviewed AI animation is intrinsically safe. A beautiful video can still fail if engineering is false.

## Red-team failure categories (staging only)

Tenant switching, object-level authorization, signed URLs, RAG vector leakage, event-tenant context, Power BI RLS token scope, SharePoint permission inheritance, cross-event exhibitor information, founder impersonation, role toggle privilege, QR resolver token reuse, cache swaps, missing site permissions, invoices and direct-object enumeration, malicious uploaded HTML/PDF/CSV, prompt injection, rate exhaustion, async webhook races, OAuth rotation, edge certificate revocation. Each adversarial test must preserve evidence, expected denial, no data loss and an explicit fix route. If a scenario could affect real devices or a real tenant, use synthetic sandbox only until explicit approval and safety plan.

## Failure injection schedule

API throttling and request replay; connector 401/403/429; schema drift; expired OAuth mid-job; repeated event; delayed event; reordered event; outbox write failure; process crash during report; corrupt image; malicious document; offline field scan/reconnect; 3 concurrent engineers on same deficiency; payment success webhook delayed/replayed; failed bank onboarding; DB failover; backup restore; CDN unavailable; screen reader navigation; deliberately mislabeled telemetry; 2D→3D fallback; quote price expiration. Run all with bounded fixture budgets and clear cleanup.

## Stop-ship matrix

| Level | Examples | Rule |
|---|---|---|
| P0 | Cross-tenant disclosure, unauthorized physical actuation, financial corruption, false safety/commissioning acceptance, privileged founder backdoor, lost baseline | Do not release any affected profile |
| P1 | Core checkout, pilot, QR or report broken; broken video decision; flagship film major identity drift; significant inaccessible critical action | Fix and independently retest before affected release |
| P2 | Non-blocking workflow friction, cross-browser mild rendering, moderate caption timing, poorly explained source | Triage with owner+date and explicit founder disposition |
| P3 | Decorative inconsistencies, optional transitions | Prioritize within design system, document |

## Original video / AI-generated content “inhuman behavior” defect board

For every clip log: `clip_id`, `season`, `chapter_id`, `scene_id`, `character_id`, `renderer/model/software`, `asset_version`, `frame/timecode`, `defect_code`, `severity`, `narrative_or_engineering_impact`, `screenshot_or_sample`, `assigned_owner`, `fix_source_asset`, `new_render_version`, `human_reviewer`, `qa_status`. Include all generated reels and website films.

Examples worth actively injecting/reviewing: Ray suddenly has a different face; Maya's shirt changes mid-conversation without a scene cut; hand slides through a mixer; crowd randomly cheering in a quiet room; speaker emits sine tone without an active signal path; software renders a rack with nonsensical port labels; LED wall changes aspect ratio; narrator says “eight kilohertz” while text shows “eight hundred”; SFX gain clips; actor lips lag narration; animation suggests a technician reboots a live network without approval; half-second frozen frames; audio mono fold-down nulls dialogue; captions cover a safety diagram; lighting makes eyes look lifeless. Every issue must be fixed at appropriate asset/staging layer and retested.

## Acceptance evidence organization

`qa/runs/<date>/<release-profile>/<test_id>/` includes environment+commit, fixture ID, logs/redacted trace, screenshot/short capture, actual result, expected result, issue ID, fix commit, reviewer and retest. `P0/P1 NOT_RUN` cannot equal PASS. Required release profiles: `PUBLIC_SITE`, `INVESTOR_SYNTHETIC`, `SIGNAL_FREE`, `SIGNAL_PAID`, `ENTERPRISE_LIVE_READONLY`, `ENTERPRISE_CONTROL_ENABLED`, `MSP_DELEGATED`, `CONVENTION_EVENT`, `UNIVERSITY_STUDENT`, `VIDEO_FILM_MASTER`.

## Seven go/no-go proof gates

G1 evidence that no old v1.2 paths regressed; G2 security and permissions; G3 one live tenant approved pilot; G4 cross-format exact report counts; G5 licensed/on-screen/captioned video with character fidelity; G6 paid subscriptions and role entitlements; G7 deployment rollback + actual backup restore. Founder sees open defects and signs the applicable release decision. A prompt asking Claude to assert everything 'passed' is explicitly rejected by this directive.

## Quality target examples rather than unearned certificates

- Security: no P0/P1 and independently scoped assessment when required; OWASP ASVS mapping complete for the selected assurance level, with exceptions reported.
- Commissioning: exactly agreed source-based test thresholds, documented calibration and signature, all applicable critical requirements verified, no 'green' with unresolved severe deficiency.
- UX: 5 real role-specific customer tasks completed at observed target rates; product claims visible and tested; mobile/keyboard/assistive users able to reach core functions.
- SIGNAL: full cinematic test episode approved by founder, narrative editor, technical engineer and animation/audio reviewers with zero open P0/P1 anomalies; source original still available.
- Performance: budget, realistic device class, network class, percentile, concurrency and trace evidence written before claiming improvement.
