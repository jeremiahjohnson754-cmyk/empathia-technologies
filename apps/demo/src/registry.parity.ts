/**
 * Pages of the parity slice (owner: uplift/parity-areas): the fifteen V2.5.3 areas the rebuild lacked — #/agent, #/v14/*, #/ask,
 * #/compare, #/control (+ the Control Tower), #/exports, #/fabric, #/gate, #/investigate, #/ledger, #/list, #/scheduler, #/set, #/studio —
 * plus #/parity, the overview of every V2.5.3 address. Every entry names its V2.5.3 authority; the policy does the rest (D44). Each page
 * is its own chunk, loaded only when the role may open the address.
 */
import type { PageDef, PageProps } from './registry.types.js';
import { createElement as h } from 'react';
import { adapt } from './registry.adapt.js';
import { opsLoad } from './hardening/opsRoutes.js';
import { setAuthority } from './parity/sets.js';

const V14_VIEWS: Record<string, string> = { signage: 'signage', itsm: 'itsm', schedule: 'schedule', geometry: 'geometry', diagnostics: 'diagnostics', robot: 'robot', camera: 'camera', optimize: 'optimize', operations: 'operations' };
/** Requests and projects are the Decision desk's lists (pending, awaiting funding, field readiness) at every address that opens them —
 * not Decision Memory, which the Decisions workspace shows at any address outside #/v25. */
const DESK = () => opsLoad('decisions')().then((m) => ({ default: (p: PageProps) => h(m.default, { role: p.role, hash: '#/v25/decisions' }) }));
/** The room page's own sections (registry.spaces.ts 'room'), so the room opened at a V2.5.3 assurance or commissioning address shows the same tabs to the same roles. */
const ROOM_SECTIONS = [
  { id: 'room.devices', label: 'Devices', authority: { field: 'technical' } },
  { id: 'room.tests', label: 'Tests', authority: { field: 'commissioning.record' } },
  { id: 'room.history', label: 'History', authority: { field: 'history' } },
] as const;
export const PARITY_PAGES: readonly PageDef[] = [
  {
    id: 'agent', title: 'Room Health Check', purpose: 'A scheduled script on each room computer, tuned against Core; the first part of a discovery agent', product: 'field',
    path: '/agent', alias: ['/agent/architecture'], authority: { area: 'agent' },
    load: () => import('./parity/Agent.js'),
    search: { keywords: 'agent health check reachability discovery architecture', aliases: ['room health check', 'discovery agent'] },
  },
  {
    id: 'agent.arch', title: 'Agent architecture', purpose: 'From a health check to a discovery agent: eight parts and how far each is built', product: 'field',
    path: '/agent/architecture', alias: ['/agent/arch'], authority: { area: 'agent.arch' }, load: () => import('./parity/Agent.js'),
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
    // V2.5.3 decided a set by its family alone (#/set/dev… is set.devices, #/set/iss… set.issues): the index needs set.rooms, a set needs
    // only its own family's authority — so the Installation Engineer opens the device sets V2.5.3 gave that role (2026-11-09).
    path: '/set', alias: ['/set/:key'], authority: { area: 'home' },
    authorityFor: (p) => (p['key'] ? setAuthority(p['key']) : { area: 'set.rooms' }), load: () => import('./parity/Records.js'),
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
  // ---- the remaining V2.5.3 addresses, each landing on the finished screen that serves its content, under its own V2.5.3 authority.
  // (uplift/lite is merged: #/lite, #/lite/services, #/lite/guides and #/lite/qr are Lite's own pages in registry.spaces.ts. What is
  // left here are V2.5.3's other addresses for them — #/v25/lite, #/suite/lite and #/qr — opened on Lite itself.)
  { id: 'parity.lite', legacy: true, title: 'Lite studio', purpose: 'Conceptual room models: geometry with its uncertainty, placements, zones, test points and predicted coverage (V2.5.3 #/v25/lite, restored 12 Nov 2026)', product: 'lite', path: '/v25/lite', alias: ['/suite/lite'], authority: { area: 'lite' }, load: () => import('./lite/LiteStudio.js') },
  { id: 'parity.qr', legacy: true, title: 'QR launch center', purpose: 'The kinds of QR code on campus, where each is placed and what it opens', product: 'lite', path: '/qr', authority: { all: [{ area: 'qr' }, { area: 'lite' }] }, load: adapt(() => import('./lite/LiteApp.js'), (m, p) => h(m.default, { ...p, params: { '*': 'qr' } })) },
  { id: 'parity.intake', legacy: true, title: 'Intake', purpose: 'Room requests behind projects, and a new request', product: 'pro', path: '/intake', alias: ['/v25/intake', '/suite/intake'], authority: { area: 'intake' }, load: DESK },
  { id: 'parity.intake.new', legacy: true, title: 'New request', purpose: 'Raise a request for a room or a change', product: 'pro', path: '/intake/new', authority: { area: 'intake.new' }, load: () => import('./intake/RequestPage.js') },   // V2.5.3's address for a new request opens the request portal (10 Nov); it used to open the problem report
  { id: 'parity.builder', legacy: true, title: 'Room Builder', purpose: 'Design a room with the full engine', product: 'lite', path: '/builder', alias: ['/builder/:view', '/v25/design'], authority: { area: 'builder' }, load: adapt(() => import('./build/BuildRoom.js'), (m, p) => h(m.BuildRoom, { perspective: p.role })) },
  { id: 'parity.budget', legacy: true, title: 'Budgeting', purpose: 'Every figure a project has had, estimate against actual', product: 'pro', path: '/budget', alias: ['/suite/budget'], authority: { area: 'budget' }, load: () => import('./parity/Compare.js') },
  { id: 'parity.assurance.room', legacy: true, title: 'Room assurance', purpose: 'One room against its commissioned baseline', product: 'commissioning', path: '/assurance/room/:room', alias: ['/assurance/room/:room/:view', '/assurance/room', '/v25/assurance'], authority: { area: 'assurance.room' }, authorityFor: (p) => (p['view'] === 'recommission' ? { area: 'assurance.recommission' } : p['view'] === 'history' ? { area: 'assurance.history' } : p['view'] === 'ready' ? { area: 'assurance.ready' } : undefined), sections: ROOM_SECTIONS, load: () => import('./pages/RoomRecordsRoutes.js').then((m) => ({ default: m.AssuranceRoute })) },
  { id: 'parity.commissioning.room', legacy: true, title: 'Commissioning record', purpose: 'The commissioning record of one room', product: 'commissioning', path: '/commissioning/room/:room', alias: ['/commissioning/room/:room/:view', '/commissioning/room', '/v25/commissioning', '/v25/tracker', '/suite/commission'], authority: { area: 'commissioning.room' }, sections: ROOM_SECTIONS, load: () => import('./pages/RoomRecordsRoutes.js').then((m) => ({ default: m.CommissioningRoute })) },
  { id: 'parity.service.fixes', legacy: true, title: 'Known Fix library', purpose: 'What fixed it last time, by issue and room', product: 'servicehands', path: '/service/fixes', alias: ['/v25/coverage'], authority: { area: 'service.fixes' }, load: opsLoad('dispatch') },
  { id: 'parity.projects', legacy: true, title: 'Project portfolio', purpose: 'Every project with its governance state and funding', product: 'pro', path: '/projects', alias: ['/projects/:id', '/v25/project', '/v25/vendor'], authority: { area: 'projects' }, load: DESK },
  { id: 'parity.install', legacy: true, title: 'Installation', purpose: 'Field execution: work orders, evidence and verification', product: 'servicehands', path: '/install', alias: ['/install/:id'], authority: { area: 'install' }, load: opsLoad('servicehands') },
  { id: 'parity.handoff', legacy: true, title: 'Handoff chain', purpose: 'Who handed what to whom: request to closure', product: 'servicehands', path: '/handoff', alias: ['/handoff/:id'], authority: { area: 'handoff' }, load: opsLoad('servicehands') },
  { id: 'parity.lessons', legacy: true, title: 'Lessons learned', purpose: 'Reviewed cases and the lessons the steward approved', product: 'learn', path: '/lessons', alias: ['/lessons/:id'], authority: { area: 'lessons' }, load: adapt(() => import('./pages/Learn.js'), (m, p) => h(m.LearnPage, { perspective: p.role, hash: p.hash })) },
  { id: 'parity.registry', legacy: true, title: 'The registers', purpose: 'Every device and room as a register', product: 'pro', path: '/pro/registry', alias: ['/v14/registry', '/registry'], authority: { area: 'registry' }, load: () => import('./parity/Records.js') },
  { id: 'parity.walkthrough', legacy: true, title: 'Walkthrough', purpose: 'The guided investor walkthrough', product: 'shell', path: '/v25/walkthrough', authority: { area: 'investor' }, load: adapt(() => import('./tour/Guided.js'), (m) => h(m.ToursPage)) },
  // ---- V2.5.3's short addresses (2026-11-09). Its router read the first segment: #/signage … #/operations are the V1.4 views at the top
  // level, and any #/assurance/<view> it did not know opened the Assurance command center. Each opens the same finished screen here.
  ...Object.keys(V14_VIEWS).map((v): PageDef => ({ id: `parity.v14.${v}`, legacy: true, title: 'V1.4 foundation', purpose: `The V1.4 ${v} view at its V2.5.3 address`, product: 'field', path: `/${v}`, alias: [`/${v}/:sub`], authority: { all: [{ area: 'v14' }, { area: V14_VIEWS[v]! }] }, load: adapt(() => import('./parity/V14.js'), (m, p) => h(m.default, { ...p, params: { ...p.params, view: v } })) })),
  { id: 'parity.assurance.analysis', legacy: true, title: 'Assurance analysis', purpose: 'The engineering analysis of drift', product: 'commissioning', path: '/assurance/analysis', authority: { all: [{ area: 'assurance' }, { area: 'assurance.analysis' }] }, load: adapt(() => import('./pages/AssuranceViews.js'), (m, p) => h(m.AssuranceAnalysisPage, { perspective: p.role })) },
  { id: 'parity.assurance.any', legacy: true, title: 'Assurance', purpose: 'Is the estate still behaving the way it was commissioned to behave', product: 'commissioning', path: '/assurance/:view', authority: { area: 'assurance' }, load: adapt(() => import('./pages/AssuranceViews.js'), (m, p) => h(m.AssurancePage, { perspective: p.role })) },
];
