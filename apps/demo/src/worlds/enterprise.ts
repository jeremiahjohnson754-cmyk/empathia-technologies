/**
 * Where an Enterprise journey leads. The Enterprise world is the existing demonstration, so a journey opens an existing page and the
 * access policy alone decides who may open it (a journey grants nothing):
 *   - the current View-as role opens the page            → a plain link;
 *   - it does not, and the journey's own role does       → the card says "Opens as <role>" and switches through View as, the
 *                                                          demonstration's one, announced way of changing role (D1, D44);
 *   - neither does                                        → the journey is not offered at all (a role never sees what it cannot use).
 */
import type { RoleKey } from '../registry.types.js';
import { resolve } from '../registry.pages.js';
import { canOpen } from '../access/policy.js';
import type { Journey } from './registry.js';

export const opens = (role: RoleKey, href: string): boolean => { const at = resolve(href); return !!at && canOpen(role, at); };
export interface EnterpriseTarget { href: string; as: RoleKey; switches: boolean }
export function enterpriseTarget(journey: Journey, role: RoleKey, can: (role: RoleKey, href: string) => boolean = opens): EnterpriseTarget | null {
  const t = journey.enterprise; if (!t) return null;
  if (can(role, t.href)) return { href: t.href, as: role, switches: false };
  if (can(t.roleKey, t.href)) return { href: t.href, as: t.roleKey, switches: true };
  return null;
}
