/**
 * Pages of the spaces slice (owner: rebuild/demo-spaces): campus, buildings, rooms, Lite spaces and scan, Build a Room, Search Party,
 * Field Intelligence. The shell slice created this file with the pages that already existed; from here on the spaces slice owns it.
 * Contract: registry.types.ts and README-routes.md. Every entry names its V2.5.3 authority; the policy does the rest.
 */
import { createElement as h } from 'react';
import type { PageDef } from './registry.types.js';
import { adapt } from './registry.adapt.js';

export const SPACES_PAGES: readonly PageDef[] = [
  // ---- the living campus and its thirty rooms (rebuild/demo-spaces)
  {
    id: 'campus', title: 'Campus', purpose: 'Buildings, floors and rooms with their status', product: 'lite', landing: true,
    path: '/campus', authority: { area: 'campus' },
    load: adapt(() => import('./campus/CampusPage.js'), (m, p) => h(m.CampusPage, { hash: p.hash })),
    search: { keywords: 'map buildings floors estate living campus', aliases: ['campus map', 'buildings'] },
  },
  {
    id: 'campus.building', title: 'Building', purpose: 'One building: its floors and rooms', product: 'lite',
    path: '/campus/:building', alias: ['/campus/:building/:floor'], authority: { area: 'campus' },
    load: adapt(() => import('./campus/CampusPage.js'), (m, p) => h(m.CampusPage, { hash: p.hash })),
  },
  {
    id: 'campus.room', title: 'Room', purpose: 'One room in 3D and plan: devices, connections, tests, history and coverage', product: 'lite',
    path: '/campus/:building/:floor/:room', authority: { area: 'room' },
    sections: [
      { id: 'room.devices', label: 'Devices', authority: { field: 'technical' } },
      { id: 'room.tests', label: 'Tests', authority: { field: 'commissioning.record' } },
      { id: 'room.history', label: 'History', authority: { field: 'history' } },
    ],
    load: adapt(() => import('./campus/CampusPage.js'), (m, p) => h(m.CampusPage, { hash: p.hash, sees: p.sees, role: p.role })),
    search: { keywords: 'room 3d plan devices reference room 4.218', aliases: ['meeting room', 'reference room'] },
  },
  {
    // V2.5.3's technical room page: #/room (the reference room, Atlas 4.218), #/room/<id>, #/room~<id> — the same room page as the campus address
    id: 'room', title: 'Room', purpose: 'The technical room page: status, health, the delivery spine, what moved, open issues, 3D and plan', product: 'lite',
    path: '/room', alias: ['/room/:room'], authority: { area: 'room' },
    sections: [
      { id: 'room.devices', label: 'Devices', authority: { field: 'technical' } },
      { id: 'room.tests', label: 'Tests', authority: { field: 'commissioning.record' } },
      { id: 'room.history', label: 'History', authority: { field: 'history' } },
    ],
    load: () => import('./rooms/RoomPage.js'),
    search: { keywords: 'room technical page atlas 4.218 delivery spine health devices issues lifecycle', aliases: ['technical room page', 'room page', 'atlas 4.218'] },
  },
  {
    id: 'rooms', title: 'Rooms', purpose: 'Every room of the campus in one list, with its lifecycle and coverage', product: 'lite',
    path: '/rooms', authority: { area: 'campus' },
    load: adapt(() => import('./campus/CampusPage.js'), (m, p) => h(m.RoomsIndex, { hash: p.hash })),
    search: { keywords: 'rooms list lifecycle', aliases: ['all rooms', 'room list'] },
  },
  {
    id: 'find', title: 'Search results', purpose: 'Rooms, devices, products and pages for what you typed (aliases included)', product: 'shell',
    path: '/find', authority: { area: 'search' },
    load: adapt(() => import('./search/SearchBar.js'), (m, p) => h(m.FindPage, { hash: p.hash })),
    search: { keywords: 'search find room device', aliases: ['find a room', 'find a device'] },
  },
  {
    id: 'search.scenarios', title: 'Search Party scenarios', purpose: 'Five questions answered from recorded relationships, list first', product: 'search-party',
    path: '/search/scenarios', alias: ['/search/scenarios/:id'], authority: { area: 'search.graph' },
    sections: [
      { id: 'sp.support', label: 'Support and dispatch (S2, S3)', authority: { field: 'support.chain' } },
      { id: 'sp.graph', label: 'Dependencies, repair and patterns (S1, S4, S5)', authority: { field: 'graph' } },
    ],
    load: adapt(() => import('./search/ScenarioPages.js'), (m, p) => h(m.ScenariosPage, { hash: p.hash, sees: p.sees })),
    search: { keywords: 'who supports this space dispatch expert switch fails pattern repair verify learn', aliases: ['who supports', 'what is affected', 'dispatch'] },
  },
  {
    id: 'tours', title: 'Guided tours', purpose: 'Tours A, B and C, or free exploration', product: 'shell',
    path: '/tours', alias: ['/tours/a', '/tours/b', '/tours/c'], authority: { area: 'tours' },
    load: adapt(() => import('./tour/Guided.js'), (m) => h(m.ToursPage)),
    search: { keywords: 'tour guided living campus engineering intelligence learn by doing', aliases: ['tour', 'guided tour', 'demo tour'] },
  },

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
