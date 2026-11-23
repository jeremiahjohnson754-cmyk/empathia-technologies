/**
 * Pages of the capabilities accepted by Enterprise 3.0 beside the nine products (founder decision E3-D1, 23 Nov 2026): FLOW,
 * MissionProof, PRISM, SENTINEL, ACCORD, FORGE and OMNIPRESENCE here; VOICE has its own file (registry.voice.ts). Each keeps one of
 * the nine product keys as its menu, and its family is named by packages/ui/src/families.ts. Who may open and act in the five built
 * on 23–24 Nov is in module-roles.ts (no imports, so this registry loads no module's code). Contract: registry.types.ts and
 * README-routes.md.
 */
import type { PageDef } from './registry.types.js';
import { WHY as MISSION_WHY } from './mission/model.js';
import { ROLE_KEYS } from './access/policy.js';
import * as M from './module-roles.js';

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
  {
    id: 'prism', title: 'PRISM', purpose: 'What each screen should show, what its player reports and whether there is proof of play (simulation; publishes nothing)', product: 'pro',
    path: '/prism', authority: { roles: M.PRISM_ROLES, why: M.PRISM_WHY },
    actions: [{ id: 'prism.raise', label: 'Raise a job for a screen', authority: { roles: M.PRISM_RAISE, why: M.PRISM_WHY } }],
    load: () => import('./prism/PrismPage.js'),
    search: { keywords: 'prism signage screen display led wall content schedule proof of play player offline', aliases: ['prism', 'signage', 'what the screens show'] },
  },
  {
    id: 'sentinel', title: 'SENTINEL', purpose: 'Whether an approved secondary notice reached its channels: requested, acknowledged, proven shown or failed (simulation; not a life-safety system)', product: 'pro',
    path: '/sentinel', authority: { roles: M.SENTINEL_ROLES, why: M.SENTINEL_WHY },
    actions: [{ id: 'sentinel.follow', label: 'Raise one job for the failed routes', authority: { roles: M.SENTINEL_FOLLOW, why: M.SENTINEL_WHY } }],
    load: () => import('./sentinel/SentinelPage.js'),
    search: { keywords: 'sentinel emergency communications secondary notice drill delivery acknowledged rendered failed route', aliases: ['sentinel', 'emergency communications', 'notice delivery'] },
  },
  {
    id: 'accord', title: 'ACCORD', purpose: 'One scoped, expiring evidence capsule between the customer and its service provider, with what is withheld, the changes and the download audit', product: 'search-party',
    path: '/accord', authority: { roles: M.ACCORD_ROLES, why: M.ACCORD_WHY },
    actions: [{ id: 'accord.withdraw', label: 'Withdraw the capsule', authority: { roles: M.ACCORD_WITHDRAW, why: M.ACCORD_WHY } }],
    load: () => import('./accord/AccordPage.js'),
    search: { keywords: 'accord capsule evidence sharing provider integrator redaction expiry withdraw download audit organisation', aliases: ['accord', 'evidence capsule', 'share evidence'] },
  },
  {
    id: 'forge', title: 'FORGE', purpose: 'A room’s design record compiled into reviewable engineering artefacts; configuration only with a vendor-verified capability pack', product: 'lite',
    path: '/forge', alias: ['/forge/room/:room'], authority: { roles: M.FORGE_ROLES, why: M.FORGE_WHY },
    actions: [{ id: 'forge.approve', label: 'Approve a revision', authority: { roles: M.FORGE_APPROVE, why: M.FORGE_WHY } }],
    load: () => import('./forge/ForgePage.js'),
    search: { keywords: 'forge room as code schema bill of materials bom signal paths installation acceptance as-built configuration capability pack approve revision', aliases: ['forge', 'room as code', 'engineering package'] },
  },
  {
    id: 'omnipresence', title: 'OMNIPRESENCE', purpose: 'What a building’s tag opens on a phone, and the separate proof that presence and control need (simulation)', product: 'lite',
    path: '/omnipresence', alias: ['/omnipresence/b/:building'], authority: { roles: ROLE_KEYS, why: M.OMNI_WHY },
    load: () => import('./omni/OmniPage.js'),
    search: { keywords: 'omnipresence qr nfc tag building scan phone presence proximity control receipt', aliases: ['omnipresence', 'building tag', 'scan a building'] },
  },
];
