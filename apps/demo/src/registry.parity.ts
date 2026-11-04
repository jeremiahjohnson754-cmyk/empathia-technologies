/**
 * Pages of the parity slice (owner: uplift/parity-areas): the fifteen V2.5.3 areas the rebuild lacked — #/agent, #/v14/*, #/ask,
 * #/compare, #/control (+ the Control Tower), #/exports, #/fabric, #/gate, #/investigate, #/ledger, #/list, #/scheduler, #/set, #/studio —
 * plus #/parity, the overview of every V2.5.3 address. Every entry names its V2.5.3 authority; the policy does the rest (D44). Each page
 * is its own chunk, loaded only when the role may open the address.
 */
import type { PageDef } from './registry.types.js';
import { setAuthority } from './parity/sets.js';

const V14_VIEWS: Record<string, string> = { signage: 'signage', itsm: 'itsm', schedule: 'schedule', geometry: 'geometry', diagnostics: 'diagnostics', robot: 'robot', camera: 'camera', optimize: 'optimize', operations: 'operations' };
export const PARITY_PAGES: readonly PageDef[] = [
  {
    id: 'agent', title: 'Room Health Check', purpose: 'A scheduled script on each room computer, tuned against Core; the first part of a discovery agent', product: 'field',
    path: '/agent', alias: ['/agent/architecture'], authority: { area: 'agent' },
    load: () => import('./parity/Agent.js'),
    search: { keywords: 'agent health check reachability discovery architecture', aliases: ['room health check', 'discovery agent'] },
  },
  {
    id: 'agent.arch', title: 'Agent architecture', purpose: 'From a health check to a discovery agent: eight parts and how far each is built', product: 'field',
    path: '/agent/architecture', authority: { area: 'agent.arch' }, load: () => import('./parity/Agent.js'),
    search: { keywords: 'agent architecture parts room model spatial engine', aliases: ['the agent architecture'] },
  },
  {
    id: 'v14', title: 'V1.4 foundation', purpose: 'One canonical graph, typed contracts and an honest evidence vocabulary; fourteen phases, every V1.4 record a fixture', product: 'field',
    path: '/v14', alias: ['/v14/:view', '/v14/:view/:sub'], authority: { area: 'v14' },
    authorityFor: (p) => (p['view'] && V14_VIEWS[p['view']] ? { area: V14_VIEWS[p['view']]! } : undefined),
    load: () => import('./parity/V14.js'),
    search: { keywords: 'v14 foundation telemetry instant connect itsm schedules geometry diagnostics robotic camera optimize operations ready signage contracts capabilities phase plan hub identity', aliases: ['v1.4', 'foundation', 'instant connect', 'operations ready', 'telemetry'] },
  },
  {
    id: 'ask', title: 'Ask Empathia', purpose: 'A question, an answer built from Core, and the records it stands on; no language model', product: 'search-party',
    path: '/ask', alias: ['/learn/ask'], authority: { area: 'ask' }, load: () => import('./parity/Ask.js'),
    search: { keywords: 'ask question answer why', aliases: ['ask empathia', 'why is'] },
  },
  {
    id: 'compare', title: 'Core Compare', purpose: 'Two things side by side on the same measures, every value read from Core', product: 'pro',
    path: '/compare', alias: ['/compare/:kind'], authority: { area: 'compare' },
    authorityFor: (p) => (p['kind'] ? { compare: p['kind'] } : undefined), load: () => import('./parity/Compare.js'),
    search: { keywords: 'compare side by side budget baseline commissioned proposed', aliases: ['core compare', 'estimate vs actual'] },
  },
  {
    id: 'control.tower', title: 'Control Tower', purpose: 'The operations-centre room: site status, incident queue, escalation timeline and relationship map — non-operational', product: 'mission-control',
    path: '/control/tower', authority: { area: 'pro.ops' }, load: () => import('./parity/Tower.js'),
    search: { keywords: 'control tower operations centre incident queue escalation site status', aliases: ['control tower', 'operations control tower', 'ops room'] },
  },
  {
    id: 'control.rooms', title: 'Empathia Control', purpose: 'One room-control language: one sentence, one room, one dock, five modes', product: 'lite',
    path: '/control', alias: ['/control/:room'], authority: { area: 'control' },
    authorityFor: (_p, q) => (q.get('mode') === 'engineer' ? { field: 'control.engineer' } : undefined),
    actions: [{ id: 'control.use', label: 'Operate the room', authority: { action: 'control.use' } }],
    load: () => import('./parity/Control.js'),
    search: { keywords: 'control panel room dock modes meet present', aliases: ['room control', 'empathia control'] },
  },
  {
    id: 'scheduler', title: 'Room scheduler', purpose: 'The panel at the door of each room: free or busy, what comes next, the way into its guide', product: 'lite',
    path: '/scheduler', alias: ['/scheduler/:room'], authority: { area: 'scheduler' }, load: () => import('./parity/Control.js'),
    search: { keywords: 'scheduler booking free busy door panel available', aliases: ['room scheduler', 'rooms free now', 'book a room'] },
  },
  {
    id: 'exports', title: 'Reports and exports', purpose: 'What the numbers are made of, as files: CSV and JSON with a provenance header', product: 'pro',
    path: '/exports', alias: ['/exports/:family'], authority: { area: 'exports' }, load: () => import('./parity/Exports.js'),
    search: { keywords: 'export csv json report download', aliases: ['exports', 'reports', 'download the records'] },
  },
  {
    id: 'fabric', title: 'Integration Fabric', purpose: 'How the systems an estate already has would meet Core; the event fabric shows one event ripple', product: 'mission-control',
    path: '/fabric', alias: ['/fabric/c', '/fabric/c/:id', '/fabric/events', '/suite/integrations'], authority: { area: 'fabric' },
    actions: [{ id: 'fabric.fire', label: 'Let an event into Core', authority: { action: 'fabric.fire' } }],
    load: () => import('./parity/Fabric.js'),
    search: { keywords: 'integration fabric connectors event ripple', aliases: ['integration fabric', 'event fabric', 'connectors'] },
  },
  {
    id: 'gate', title: 'Welcome', purpose: 'Who you are today, the search bar and the way into your work', product: 'lite',
    path: '/gate', authority: { area: 'gate' }, load: () => import('./parity/Gate.js'),
    search: { keywords: 'welcome gate who are you', aliases: ['welcome page'] },
  },
  {
    id: 'investigate', title: 'Investigate', purpose: 'One case at a time: symptom, systems, hypotheses, tests, cause, fix, proof', product: 'search-party',
    path: '/investigate', alias: ['/investigate/:issue'], authority: { area: 'investigate' }, load: () => import('./parity/Investigate.js'),
    search: { keywords: 'investigate case issue hypothesis root cause', aliases: ['investigate', 'one case at a time'] },
  },
  {
    id: 'ledger.evidence', title: 'Evidence ledger', purpose: 'Every major conclusion the platform draws, and what it stands on', product: 'mission-control',
    path: '/ledger', alias: ['/ledger/rec/:id', '/ledger/agent', '/ledger/agent/:room'], authority: { area: 'ledger' }, load: () => import('./parity/Ledger.js'),
    search: { keywords: 'evidence ledger conclusions contradiction why this', aliases: ['evidence ledger', 'why this'] },
  },
  {
    id: 'list', title: 'Core model', purpose: 'Every record of the Core model by type; each record opens its passport', product: 'search-party',
    path: '/list', alias: ['/list/:type', '/list/:type/:id', '/suite/core', '/core'], authority: { area: 'list' },
    authorityFor: (p) => (p['type'] ? { entity: p['type'] } : undefined), load: () => import('./parity/Records.js'),
    search: { keywords: 'records list core model types passport', aliases: ['core model', 'all rooms', 'all devices', 'records'] },
  },
  {
    id: 'set', title: 'The records behind a number', purpose: 'Every number on a page opens the records it counted', product: 'search-party',
    path: '/set', alias: ['/set/:key'], authority: { area: 'set.rooms' },
    authorityFor: (p) => (p['key'] ? setAuthority(p['key']) : undefined), load: () => import('./parity/Records.js'),
    search: { keywords: 'set records behind a number', aliases: ['records behind the number'] },
  },
  {
    id: 'studio', title: 'Design a Space', purpose: 'Start from a template or a real room and get a furnished baseline judged by the planning rules', product: 'lite',
    path: '/studio', alias: ['/studio/new', '/studio/new/:template', '/studio/room', '/studio/room/:room'], authority: { area: 'studio' }, load: () => import('./parity/Studio.js'),
    search: { keywords: 'studio design a space concept template plan', aliases: ['design a space', 'studio'] },
  },
  {
    id: 'parity', title: 'Every V2.5.3 address', purpose: 'Where each address of the original demonstration lands in this one', product: 'shell',
    path: '/parity', authority: { area: 'investor' }, load: () => import('./parity/Overview.js'),
    search: { keywords: 'parity addresses v2.5.3 areas inventory', aliases: ['every address', 'parity'] },
  },
];
