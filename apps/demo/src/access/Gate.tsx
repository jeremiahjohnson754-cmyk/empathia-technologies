/**
 * The policy at render time. The shell provides the current role and the resolved address; pages wrap role-dependent markup in
 * <Section id> and <Action id> (or call can/sees). What a role may not use is not rendered at all (D44): no disabled button, no
 * placeholder, no refusal message.
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { RoleKey } from '../registry.types.js';
import { canDo, canSee, type Resolved } from './policy.js';

interface Ctx { role: RoleKey; at: Resolved | null }
const AccessContext = createContext<Ctx | null>(null);

export function AccessProvider({ role, at, children }: { role: RoleKey; at: Resolved | null; children: ReactNode }) {
  return <AccessContext.Provider value={{ role, at }}>{children}</AccessContext.Provider>;
}
/** The current role and the policy questions for the current address. Outside a page (no provider) everything is refused. */
export function useAccess() {
  const c = useContext(AccessContext);
  return {
    role: c?.role ?? null,
    can: (actionId: string) => !!c && canDo(c.role, c.at, actionId),
    sees: (sectionId: string) => !!c && !!c.at && canSee(c.role, c.at, sectionId),
  };
}
/** Renders its children only when the current role may see the section `id` of the current page. */
export function Section({ id, children }: { id: string; children: ReactNode }) {
  return useAccess().sees(id) ? <>{children}</> : null;
}
/** Renders its children only when the current role may use the action `id` (a page action or any V2.5.3 AZ_ACTION key). */
export function Action({ id, children }: { id: string; children: ReactNode }) {
  return useAccess().can(id) ? <>{children}</> : null;
}
