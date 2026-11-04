/** What a role actually reaches in this demonstration: the registered pages it can open at their own address (the menu shows exactly these,
 *  so View as's count equals what the role sees, BRIEF_ACCESS). */
import type { PageDef, RoleKey } from '../registry.types.js';
import { PAGES, resolve, hrefOf } from '../registry.pages.js';
import { canOpen } from '../access/policy.js';

const listed = () => PAGES.filter((p) => !p.path.includes(':') && !p.path.includes('*'));
export function openPages(role: RoleKey): PageDef[] {
  return listed().filter((p) => { const r = resolve(hrefOf(p.id)); return !!r && r.page.id === p.id && canOpen(role, r); });
}
export const scope = (role: RoleKey) => ({ pages: openPages(role).length, of: listed().length });
