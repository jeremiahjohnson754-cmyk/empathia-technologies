/**
 * The routes of the spatial and guided experiences (campus, rooms, search results, Search Party scenarios, tours), resolved before the
 * legacy area registry. One function for the shell: `spacesPage(hash)` returns the page or null.
 */
import type { ReactNode } from 'react';
import { CampusPage, RoomsIndex } from '../campus/CampusPage.js';
import { FindPage } from '../search/SearchBar.js';
import { ScenariosPage } from '../search/ScenarioPages.js';
import { ToursPage } from '../tour/Guided.js';

const path = (hash: string) => hash.replace(/^#\/?/, '').split('?')[0]!;
export const SPACES_ROUTES = ['campus', 'rooms', 'find', 'search/scenarios', 'tours'] as const;
export function isSpacesRoute(hash: string): boolean {
  const p = path(hash);
  return p === 'campus' || p.startsWith('campus/') || p === 'rooms' || p === 'find' || p === 'search/scenarios' || p.startsWith('search/scenarios/') || p === 'tours' || /^tours\/[abc]$/.test(p);
}
export function spacesPage(hash: string): ReactNode | null {
  if (!isSpacesRoute(hash)) return null;
  const p = path(hash);
  if (p === 'campus' || p.startsWith('campus/')) return <CampusPage hash={hash} />;
  if (p === 'rooms') return <RoomsIndex hash={hash} />;
  if (p === 'find') return <FindPage hash={hash} />;
  if (p.startsWith('search/scenarios')) return <ScenariosPage hash={hash} />;
  return <ToursPage />;
}
