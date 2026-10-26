/** Hash routing for the studio itself: #/<destination>[/<sub>][?k=v]. The embedded demonstrator keeps its own hash. */
import { useSyncExternalStore } from 'react';

export interface Route { path: string; sub: string; params: URLSearchParams }

function parse(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [p, q] = h.split('?');
  const [path, ...rest] = (p || 'mission-control').split('/');
  return { path: path || 'mission-control', sub: rest.join('/'), params: new URLSearchParams(q || '') };
}

let current = parse();
const subs = new Set<() => void>();
window.addEventListener('hashchange', () => { current = parse(); subs.forEach((f) => f()); });

export const useRoute = (): Route => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => current, () => current);
export const href = (path: string, sub?: string, params?: Record<string, string>) =>
  `#/${path}${sub ? `/${sub}` : ''}${params && Object.keys(params).length ? `?${new URLSearchParams(params)}` : ''}`;
export const go = (h: string) => { window.location.hash = h.replace(/^#/, ''); };
