/**
 * Harmony: one place to ask across the products (founder's directive of 11 Nov 2026). It is opened by whoever may open Ask Empathia
 * (V2.5.3 area `ask`): Harmony holds no authority of its own. Each of its tools stands on a product page and asks that page's
 * authority for the role asking (harmony/tools.ts), so there is nothing here to grant.
 */
import type { PageDef } from './registry.types.js';

export const HARMONY_PAGES: readonly PageDef[] = [
  {
    id: 'harmony', title: 'Harmony', purpose: 'Ask across the products in your own words: Harmony checks that your role may, answers from the record with its sources, or prepares the step for you to take. It changes nothing itself', product: 'mission-control',
    path: '/harmony', authority: { area: 'ask' }, load: () => import('./harmony/HarmonyPage.js'),
    search: { keywords: 'harmony assistant ask help do prepare book who contact report problem accept documentation', aliases: ['harmony', 'assistant', 'ask harmony'] },
  },
];
