# Documentation index

The engineering blueprint, organized as directive section 13 (A–I), plus the design system, discovery, integrations and provenance.
Generated files say which script generates them; regenerate rather than edit. Classification: everything here is
CONFIDENTIAL_TECHNICAL unless marked otherwise (`provenance/CLASSIFICATION.md`); none of it belongs in an investor package.

## Start here
* [../README.md](../README.md) — what the repository is · [../GETTING_STARTED.md](../GETTING_STARTED.md) — run it
* [engineering-handoff/CTO_HANDOFF.md](engineering-handoff/CTO_HANDOFF.md) — for the next CTO
* [../EMPATHIA_MASTER_COMPLETION_REPORT.md](../EMPATHIA_MASTER_COMPLETION_REPORT.md) — what was done, verified, not run, blocked

## A · Product and business architecture
[product/PRODUCT_ARCHITECTURE.md](product/PRODUCT_ARCHITECTURE.md) · [product/DEMONSTRATOR_INDEX.md](product/DEMONSTRATOR_INDEX.md) · [product/EDITIONS_AND_PACKAGES.md](product/EDITIONS_AND_PACKAGES.md)

## B · System architecture
[architecture/SYSTEM_ARCHITECTURE.md](architecture/SYSTEM_ARCHITECTURE.md) · [architecture/STORAGE.md](architecture/STORAGE.md) · [architecture/DEPENDENCY_SWAPS.md](architecture/DEPENDENCY_SWAPS.md) · diagrams in `architecture/diagrams/` (Mermaid)

## C · Data architecture
[database/DATA_ARCHITECTURE.md](database/DATA_ARCHITECTURE.md) · [database/ENTITY_DICTIONARY.md](database/ENTITY_DICTIONARY.md) (generated) · [database/DATA_OWNERSHIP.md](database/DATA_OWNERSHIP.md) (generated) · SQL: `../database/migrations/`, reading copy `../database/schema/schema.sql` · JSON Schemas: `../packages/schemas/schemas/`

## D · API engineering and integrations
[api/API_GUIDE.md](api/API_GUIDE.md) · [api/ENDPOINTS.md](api/ENDPOINTS.md) (generated) · [api/RBAC_MATRIX.md](api/RBAC_MATRIX.md) (generated) · [api/EXAMPLES.md](api/EXAMPLES.md) (captured live) · [api/ERRORS.md](api/ERRORS.md) · [api/EVENT_VERSIONING.md](api/EVENT_VERSIONING.md) · `api/openapi.json` (generated) · [../integrations/README.md](../integrations/README.md)

## E · Algorithms and intelligent systems
[algorithms/ENGINE_INVENTORY.md](algorithms/ENGINE_INVENTORY.md) (11 engines × 13 items; 157 functions classified) · [../ml/README.md](../ml/README.md) · [../ml/model-cards/first-attempt-fail-risk.md](../ml/model-cards/first-attempt-fail-risk.md)

## F · Frontend, 3D and design system
[frontend/FRONTEND_ENGINEERING.md](frontend/FRONTEND_ENGINEERING.md) · [design-system/DESIGN_SYSTEM.md](design-system/DESIGN_SYSTEM.md) · [design-system/DESIGN_TO_CODE_MAP.md](design-system/DESIGN_TO_CODE_MAP.md) · [design-system/STATIC_REFERENCES.md](design-system/STATIC_REFERENCES.md) · [../spatial/README.md](../spatial/README.md) · component gallery: `node packages/ui/gallery/build.mjs`

## G · QA and security
[qa/TEST_STRATEGY.md](qa/TEST_STRATEGY.md) · [qa/RELEASE_ACCEPTANCE_CRITERIA.md](qa/RELEASE_ACCEPTANCE_CRITERIA.md) · [qa/KNOWN_DEFECTS.md](qa/KNOWN_DEFECTS.md) · [security/THREAT_MODEL.md](security/THREAT_MODEL.md) · [security/SECURE_DEVELOPMENT.md](security/SECURE_DEVELOPMENT.md) · [security/KNOWN_VULNERABILITIES_AND_REMEDIATION.md](security/KNOWN_VULNERABILITIES_AND_REMEDIATION.md) · [security/INDEPENDENT_REVIEW_STATUS.md](security/INDEPENDENT_REVIEW_STATUS.md) · [security/INCIDENT_HANDLING.md](security/INCIDENT_HANDLING.md) · results: `../tests/evidence/`

## H · Operations
[operations/LOCAL_DEVELOPMENT.md](operations/LOCAL_DEVELOPMENT.md) · [operations/CONTAINERIZED_DEVELOPMENT.md](operations/CONTAINERIZED_DEVELOPMENT.md) · [operations/DEPLOYMENT_GUIDE.md](operations/DEPLOYMENT_GUIDE.md) · [operations/MONITORING_LOGGING_ALERTING.md](operations/MONITORING_LOGGING_ALERTING.md) · [operations/BACKUP_AND_RESTORE.md](operations/BACKUP_AND_RESTORE.md) · [operations/CONFIGURATION_AND_SECRETS.md](operations/CONFIGURATION_AND_SECRETS.md) · [operations/ENVIRONMENT_SEPARATION.md](operations/ENVIRONMENT_SEPARATION.md) · [operations/SUPPORT_ESCALATION.md](operations/SUPPORT_ESCALATION.md) · [operations/DISASTER_RECOVERY.md](operations/DISASTER_RECOVERY.md) · [operations/CUSTOMER_ONBOARDING.md](operations/CUSTOMER_ONBOARDING.md) · [operations/PRODUCTION_READINESS_CHECKLIST.md](operations/PRODUCTION_READINESS_CHECKLIST.md)

## I · Engineering execution
[engineering-handoff/CTO_HANDOFF.md](engineering-handoff/CTO_HANDOFF.md) · [TEAM_AND_OWNERSHIP](engineering-handoff/TEAM_AND_OWNERSHIP.md) · [WORK_BREAKDOWN_AND_PLAN](engineering-handoff/WORK_BREAKDOWN_AND_PLAN.md) · [ESTIMATES](engineering-handoff/ESTIMATES.md) · [BUILD_VS_BUY](engineering-handoff/BUILD_VS_BUY.md) · [TECHNICAL_DEBT_REGISTER](engineering-handoff/TECHNICAL_DEBT_REGISTER.md) · [INTEGRATION_PRIORITIES](engineering-handoff/INTEGRATION_PRIORITIES.md) · [RISKS_AND_MITIGATIONS](engineering-handoff/RISKS_AND_MITIGATIONS.md) · [DEFINITION_OF_DONE](engineering-handoff/DEFINITION_OF_DONE.md) · [HOW_TO_ADD_A_FEATURE](engineering-handoff/HOW_TO_ADD_A_FEATURE.md) · [HOW_TO_ADD_A_DOMAIN](engineering-handoff/HOW_TO_ADD_A_DOMAIN.md)

## Media, discovery, provenance
* Media: `../media/manifests/` (2,230 assets probed), [../media/sets/README.md](../media/sets/README.md), [../media/storyboards/FILM_INVENTORY.md](../media/storyboards/FILM_INVENTORY.md)
* Stage 0 discovery: [discovery/REPOSITORY_DISCOVERY_REPORT.md](discovery/REPOSITORY_DISCOVERY_REPORT.md)
* IP and provenance vault (**RESTRICTED** — founder and counsel only): [../provenance/README.md](../provenance/README.md)
