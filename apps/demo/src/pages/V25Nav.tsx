/**
 * The V2.5 lifecycle pages as one row of chips (V2.5.3 showed this row on every V2.5 page). A chip appears only when the role may
 * open that exact address under the shell's policy (D44: absent, not disabled); the current page is marked.
 */
import { Chip, type IconName } from '@empathia/ui';
import { resolve } from '../registry.pages.js';
import { canOpen, isRole, DEFAULT_ROLE } from '../access/policy.js';

export const V25_PAGES: Array<{ href: string; label: string; icon: IconName }> = [
  { href: '#/v25', label: 'Overview', icon: 'pulse' }, { href: '#/v25/build', label: 'Build a Room', icon: 'layers' }, { href: '#/v25/decisions', label: 'Decision desk', icon: 'check' },
  { href: '#/v25/exec', label: 'Executive', icon: 'chart' }, { href: '#/commissioning', label: 'Commissioning', icon: 'shield' }, { href: '#/assurance', label: 'Assurance', icon: 'pulse' },
  { href: '#/servicehands', label: 'ServiceHands', icon: 'wrench' }, { href: '#/service', label: 'Dispatch', icon: 'route' }, { href: '#/v25/apex', label: 'APEX', icon: 'spark' },
  { href: '#/v25/fi', label: 'Field Intelligence', icon: 'device' }, { href: '#/replay', label: 'Replay', icon: 'play' }, { href: '#/v25/learn', label: 'Learn', icon: 'book' },
  { href: '#/v25/ledger', label: 'Ledger', icon: 'book' },
];
export function openable(role: string, href: string): boolean {
  const r = resolve(href); const k = isRole(role) ? role : DEFAULT_ROLE;
  return !!r && canOpen(k, r);
}
export function V25Nav({ role, current }: { role: string; current: string }) {
  const items = V25_PAGES.filter((p) => openable(role, p.href));
  if (items.length < 2) return null;
  return <nav className="wk-v25nav" aria-label="V2.5 lifecycle pages">{items.map((p) => <Chip key={p.href} href={p.href} icon={p.icon} small selected={p.href === current}>{p.label}</Chip>)}</nav>;
}
