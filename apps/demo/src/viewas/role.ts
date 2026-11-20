/** The current View-as role: remembered per browser, mirrored on <html data-role> so the role colour applies from CSS (D1, D44). */
import { useEffect, useState } from 'react';
import type { RoleKey } from '../registry.types.js';
import { DEFAULT_ROLE, isRole } from '../access/policy.js';

export const ROLE_STORE = 'empathia.demo.perspective';
const read = (): RoleKey => { try { const r = localStorage.getItem(ROLE_STORE); return isRole(r) ? r : DEFAULT_ROLE; } catch { return DEFAULT_ROLE; } };

export function useRoleState(): [RoleKey, (r: RoleKey) => void] {
  const [role, setRole] = useState<RoleKey>(read);
  useEffect(() => {
    document.documentElement.setAttribute('data-role', role);
    try { localStorage.setItem(ROLE_STORE, role); } catch { /* storage unavailable: the choice lasts the page */ }
  }, [role]);
  // another tab changed the role: follow it, so two tabs never disagree about who is looking
  useEffect(() => { const h = (e: StorageEvent) => { if (e.key === ROLE_STORE && isRole(e.newValue)) setRole(e.newValue); }; addEventListener('storage', h); return () => removeEventListener('storage', h); }, []);
  return [role, (r) => { if (isRole(r)) setRole(r); }];
}
export const reducedMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
