/**
 * Drawing Intelligence (founder's directive of 11 Nov 2026, §10). Reading and reviewing a drawing is design work, V2.5.3's
 * `build.design`; deciding a finding and approving a review is `design.decide`. The page is opened by whoever may do either, and
 * by the commissioning and integration roles who read the result.
 */
import type { PageDef } from './registry.types.js';

const READERS = 'Founder, 11 November 2026, §10: every recommendation shows its evidence and assumptions; the commissioning engineer and the integration project manager read a review they will work from';
export const DRAWING_PAGES: readonly PageDef[] = [
  {
    id: 'drawings', title: 'Drawing Intelligence', purpose: 'Read a plan, a device schedule and a bill of materials, check them against each other and against a room type’s standard, and save the review for an engineer to decide and approve', product: 'commissioning',
    path: '/drawings', authority: { roles: ['syseng', 'designer', 'architect', 'cxeng', 'ipm'], why: READERS },
    actions: [
      { id: 'drawing.review', label: 'Read and review a drawing package', authority: { action: 'build.design' } },
      { id: 'drawing.decide', label: 'Decide a finding and approve a review', authority: { action: 'design.decide' } },
    ],
    load: () => import('./drawing/DrawingPage.js'),
    search: { keywords: 'drawing intelligence plan schedule bill of materials bom review standards scale calibrate overlap contradiction revision checklist approve engineer', aliases: ['drawing intelligence', 'drawing review', 'review a drawing'] },
  },
];
