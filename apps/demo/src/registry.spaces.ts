/**
 * Pages of the spaces slice (owner: rebuild/demo-spaces): campus, buildings, rooms, Lite spaces and scan, Build a Room, Search Party,
 * Field Intelligence. The shell slice created this file with the pages that already existed; from here on the spaces slice owns it.
 * Contract: registry.types.ts and README-routes.md. Every entry names its V2.5.3 authority; the policy does the rest.
 */
import { createElement as h } from 'react';
import type { PageDef } from './registry.types.js';
import { adapt } from './registry.adapt.js';

export const SPACES_PAGES: readonly PageDef[] = [
  {
    id: 'build', title: 'Build a Room', purpose: 'Design a room and watch it reach drawings, commissioning, Search Party and Pro', product: 'lite', landing: true,
    path: '/v25/build', authority: { area: 'v25.build' },
    actions: [{ id: 'build.design', label: 'Create or change the room design', authority: { action: 'build.design' } }],
    load: adapt(() => import('./build/BuildRoom.js'), (m, p) => h(m.BuildRoom, { perspective: p.role })),
    search: { keywords: 'room builder design lite launch', aliases: ['build a room', 'room builder', 'design a room'] },
  },
  {
    id: 'search', title: 'Search Party', purpose: 'Universal entity search and relationship intelligence', product: 'search-party', landing: true,
    path: '/search', alias: ['/search/*'], authority: { area: 'search' },
    authorityFor: (params) => { const sub = (params['*'] || '').split('/')[0]; return sub && ['quality', 'ownership', 'support', 'graph', 'people', 'projects', 'orgs', 'activity', 'vault'].includes(sub) ? { area: `search.${sub}` } : undefined; },
    load: adapt(() => import('./search/SearchParty.js'), (m, p) => h(m.SearchPartyDemo, { hash: p.hash })),
    search: { keywords: 'search find entity relationship', aliases: ['find', 'what is affected'] },
  },
  {
    id: 'fi', title: 'Field Intelligence', purpose: 'What the collector declares, observes and verifies', product: 'field', landing: true,
    path: '/v25/fi', alias: ['/v25/fi/*'], authority: { area: 'agent' },
    load: adapt(() => import('./pages/FieldIntelligence.js'), (m, p) => h(m.FieldIntelligencePage, { perspective: p.role, pv: false, hash: p.hash })),
    search: { keywords: 'collector monitoring declared observed verified', aliases: ['fi', 'field intel'] },
  },
  {
    id: 'fi.pv', title: 'Physical Validation', purpose: 'Field Intelligence v1.4: optional, licensed, hardware-governed', product: 'field',
    path: '/v25/fipv', authority: { area: 'agent' },
    load: adapt(() => import('./pages/FieldIntelligence.js'), (m, p) => h(m.FieldIntelligencePage, { perspective: p.role, pv: true, hash: p.hash })),
  },
];
