/** Hash routes: #/rooms, #/rooms/R-PLN-0001/commissioning, #/projects, #/reports, #/inbox, #/admin/outbox. */
import { useSyncExternalStore } from 'react';
const sub = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); };
export function useRoute(): string[] { const h = useSyncExternalStore(sub, () => location.hash); return h.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent); }
export const go = (...parts: string[]) => { location.hash = `#/${parts.map(encodeURIComponent).join('/')}`; };
export const href = (...parts: string[]) => `#/${parts.map(encodeURIComponent).join('/')}`;
