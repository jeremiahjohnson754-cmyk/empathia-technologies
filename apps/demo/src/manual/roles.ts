/**
 * Who may open the manual and who holds the standard. Kept apart from the manual's text and record so that a page which only links
 * to the manual (Lite, Pro, Learn) does not load either.
 *
 * ASSUMPTION awaiting the founder (docs/surpass/ENGINEERING_CHECKPOINT.md): the Product Architect holds the standard.
 */
import type { RoleKey } from '../registry.types.js';
import { ROLE_KEYS, rolesFor } from '../access/policy.js';

const uniq = (r: readonly RoleKey[]) => ROLE_KEYS.filter((k) => r.includes(k));
export const MAN_ROLES = {
  /** may open the manual: the technical staff V2.5.3 admits to Learn, and the project manager who holds suppliers to it */
  read: uniq([...rolesFor({ area: 'learn' }), 'ipm']),
  /** holds the standard: settles values, adds for a building, adopts a revision */
  owner: ['architect'] as RoleKey[],
} as const;
export const isOwner = (r: RoleKey) => MAN_ROLES.owner.includes(r);
export const readsManual = (r: RoleKey) => MAN_ROLES.read.includes(r);
