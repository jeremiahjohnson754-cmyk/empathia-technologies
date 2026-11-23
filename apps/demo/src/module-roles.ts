/**
 * Who may open and act in the five capabilities built on 23–24 Nov 2026 (PRISM, SENTINEL, ACCORD, FORGE, OMNIPRESENCE). V2.5.3 has no
 * table for them, so each is an explicit list with its reason (registry.types.ts: `{ roles, why }`). Kept apart from the models so
 * that the page registry reads the lists without loading any module's code. No imports.
 */
// The Site Champion is not in PRISM or SENTINEL: both read screens across every site, and the champion's authority is their own site
// only (tests/unit/demo-champion.test.mjs CH-03). A site-scoped view for the champion is specified, not built.
export const PRISM_ROLES = ['architect', 'ops', 'svcmgr', 'service', 'syseng', 'exec'] as const;
export const PRISM_RAISE = ['ops', 'svcmgr', 'architect'] as const;
export const PRISM_WHY = 'Enterprise 3.0 directive 1 (PRISM): what a screen shows is read by those who run, support and answer for the spaces; a job is raised by operations or service management';
export const SENTINEL_ROLES = ['architect', 'ops', 'svcmgr', 'syseng', 'exec'] as const;
export const SENTINEL_FOLLOW = ['ops', 'svcmgr', 'architect'] as const;
export const SENTINEL_WHY = 'Enterprise 3.0 directive 1 (SENTINEL): delivery of an approved secondary notice is read by those who run and answer for the estate; failed routes are followed up by operations or service management';
export const ACCORD_ROLES = ['architect', 'ops', 'svcmgr', 'service', 'steward', 'exec', 'ipm'] as const;
export const ACCORD_WITHDRAW = ['ops', 'steward', 'architect'] as const;
export const ACCORD_WHY = 'Enterprise 3.0 directive 1 (ACCORD): evidence shared with another organisation is read by those who share it, govern it and work under it; only operations, the data steward or the architect withdraws it';
export const FORGE_ROLES = ['architect', 'designer', 'cxeng', 'installer', 'syseng', 'ipm', 'ops'] as const;
export const FORGE_APPROVE = ['cxeng', 'architect'] as const;
export const FORGE_WHY = 'Enterprise 3.0 directive 1 (FORGE): a room’s engineering package is read by those who design, build, commission and run it; it is approved by the Commissioning Engineer or the Product Architect, never by its author';
export const OMNI_WHY = 'Enterprise 3.0 directive 1 (OMNIPRESENCE): a building’s tag can be scanned by anyone; what opens from it is decided for each role, link by link';
