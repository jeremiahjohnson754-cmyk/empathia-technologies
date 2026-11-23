/**
 * Pages of the capabilities accepted by Enterprise 3.0 beside the nine products (founder decision E3-D1, 23 Nov 2026): FLOW and
 * MissionProof here; VOICE has its own file (registry.voice.ts). Each keeps one of the nine product keys as its menu (Pro), and its
 * family is named by packages/ui/src/families.ts. Contract: registry.types.ts and README-routes.md.
 */
import type { PageDef } from './registry.types.js';
import { WHY as MISSION_WHY } from './mission/model.js';
import { ROLE_KEYS } from './access/policy.js';

export const MODULE_PAGES: readonly PageDef[] = [
  {
    id: 'families', title: 'Platform families', purpose: 'The six families: the nine products and the eight further capabilities, with what can be opened here and what is not built yet', product: 'shell',
    path: '/families', authority: { roles: ROLE_KEYS, why: 'the platform map names what exists and what does not; it is shown to every role, and each link is checked against that role' },
    load: () => import('./mission/FamiliesPage.js'),
    search: { keywords: 'families platform map products capabilities voice flow forge prism sentinel accord missionproof omnipresence', aliases: ['platform families', 'all capabilities', 'platform map'] },
  },
  {
    id: 'flow', title: 'FLOW', purpose: 'The network a room’s streams and calls depend on, layer by layer, with what is declared, modelled, observed and unknown (read-only)', product: 'pro',
    path: '/flow', alias: ['/flow/link/:node'], authority: { entity: 'NetworkNode' },
    load: () => import('./flow/FlowPage.js'),
    search: { keywords: `flow network avoip switch uplink vlan qos multicast ptp dante aes67 nmos stream dependency layer`, aliases: ['flow', 'network dependencies', 'what depends on this switch'] },
  },
  {
    id: 'missionproof', title: 'MissionProof', purpose: 'Readiness for the company town hall, read from the records it depends on; rehearsal and contingency (simulation)', product: 'pro',
    path: '/missionproof', authority: { roles: ['architect', 'ops', 'exec', 'svcmgr', 'syseng', 'ucadmin', 'ipm', 'bpm', 'cxeng'], why: MISSION_WHY },
    actions: [{ id: 'mission.rehearse', label: 'Record a rehearsal', authority: { roles: ['ops', 'architect'], why: `${MISSION_WHY}` } }],
    load: () => import('./mission/MissionPage.js'),
    search: { keywords: 'missionproof mission readiness town hall event rehearsal contingency dependency', aliases: ['missionproof', 'town hall readiness', 'event readiness'] },
  },
];
