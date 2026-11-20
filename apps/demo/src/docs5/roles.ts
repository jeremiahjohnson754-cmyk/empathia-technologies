/** Who may do what in the Phase 5 tracker. No imports: the registry and the engine's policy both read this one definition. */
import type { RoleKey } from '../registry.types.js';

export const DOC_ROLES = {
  /** the commissioning-record audiences of the dossier, the Designer who owns the drawings, and the Site Champion who acknowledges the operator guide */
  read: ['exec', 'service', 'svcmgr', 'syseng', 'ops', 'architect', 'cxeng', 'installer', 'ipm', 'qa', 'designer', 'sitechamp'],
  /** everything but the champion's narrow view */
  engineering: ['exec', 'service', 'svcmgr', 'syseng', 'ops', 'architect', 'cxeng', 'installer', 'ipm', 'qa', 'designer'],
  assign: ['ipm', 'architect'],
  submit: ['designer', 'syseng', 'installer', 'cxeng', 'svcmgr', 'ipm'],
  review: ['qa', 'svcmgr', 'ops', 'architect'],
  acknowledge: ['svcmgr', 'ops', 'sitechamp'],
  vendor: ['ipm'],
  capture: ['cxeng', 'syseng', 'installer', 'service', 'architect'],
} as const satisfies Record<string, readonly RoleKey[]>;
