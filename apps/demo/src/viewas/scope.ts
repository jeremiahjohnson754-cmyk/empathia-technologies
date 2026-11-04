/** What a role actually reaches in this demonstration: the registered pages it can open at their own address (the menu shows exactly these,
 *  so View as's count equals what the role sees, BRIEF_ACCESS). */
import type { PageDef, RoleKey } from '../registry.types.js';
import { PAGES, resolve, hrefOf } from '../registry.pages.js';
import { canOpen, allows, known } from '../access/policy.js';

const listed = () => PAGES.filter((p) => !p.path.includes(':') && !p.path.includes('*'));
export function openPages(role: RoleKey): PageDef[] {
  return listed().filter((p) => { const r = resolve(hrefOf(p.id)); return !!r && r.page.id === p.id && canOpen(role, r); });
}
export const scope = (role: RoleKey) => ({ pages: openPages(role).length, of: listed().length });

/**
 * The records a role may see, from the estate's coverage by type and the V2.5.3 entity policy (AZ_ENTITY): a type the policy does not
 * name is open to every role (it carries no restriction), the Product Architect sees everything. Counted lazily once per role.
 */
let estateTypes: Record<string, number> | null = null;
const typeCounts = async () => { if (!estateTypes) { const { buildEstate } = await import('../search/estate.js'); estateTypes = buildEstate().coverage.types; } return estateTypes; };
export function recordsFor(role: RoleKey, types: Record<string, number>): { records: number; of: number } {
  const of = Object.values(types).reduce((a, b) => a + b, 0);
  const records = Object.entries(types).reduce((n, [t, c]) => n + (role === 'architect' || !known({ entity: t }) || allows({ entity: t }, role) ? c : 0), 0);
  return { records, of };
}
export { typeCounts };
