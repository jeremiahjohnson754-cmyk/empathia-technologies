/**
 * Pages of the worlds slice (owner: v18/worlds): the world-first entry of handoff v1.8 §3 (ADR-022) — "Choose a world", a world's
 * journeys, and a journey's screen. Contract: registry.types.ts and README-routes.md.
 *
 * These pages are open to every View-as role: they are a public, synthetic presentation layer. A world, a journey or a role
 * configuration grants nothing; which journey a configuration is presented is decided inside the page (worlds/registry.ts › presents),
 * and every existing page keeps its own authority.
 */
import type { PageDef } from './registry.types.js';
import { ROLE_KEYS } from './access/policy.js';
import { signalAuthority } from './gameday/signal/access.js';

const OPEN = { roles: ROLE_KEYS, why: 'the world-first entry (v1.8 ADR-022): a public, synthetic presentation layer, shown to every role; choosing a world or a role configuration grants nothing' } as const;

export const WORLD_PAGES: readonly PageDef[] = [
  {
    id: 'worlds', title: 'Choose a world', purpose: 'Four worlds — Enterprise, Stadium, University, Convention — each with a handful of everyday journeys', product: 'shell',
    path: '/worlds', authority: OPEN,
    load: () => import('./worlds/WorldsPage.js'),
    search: { keywords: 'worlds world stadium university convention enterprise journeys choose', aliases: ['worlds', 'choose a world', 'stadium', 'university', 'convention'] },
  },
  {
    id: 'world', title: 'World', purpose: 'A world’s journeys, its role configurations by purpose, and what can be done there', product: 'shell',
    path: '/world/:world', authority: OPEN,
    load: () => import('./worlds/WorldPage.js'),
  },
  {
    id: 'world.journey', title: 'World journey', purpose: 'One journey of a world, on synthetic data, presented to the role configurations whose work it is', product: 'shell',
    path: '/world/:world/:journey', authority: OPEN,
    load: () => import('./worlds/JourneyPage.js'),
  },
  {
    id: 'estate', title: 'Estate', purpose: 'Every place of a world as one record: what it is, what it offers, how to reach it, and Search Party within it', product: 'lite',
    path: '/estate/:world', alias: ['/estate/:world/:node'], authority: OPEN,
    load: () => import('./estate/EstatePage.js'),
    search: { keywords: 'estate places rooms classrooms dormitories suites booths sections map plan campus stadium university convention', aliases: ['estate', 'places'] },
  },
  {
    id: 'story', title: 'SIGNAL story', purpose: 'The complete SIGNAL graphic novel: the Prologue and 133 chapters across twelve seasons, with decisions that gate the story and can fail', product: 'learn',
    path: '/story', alias: ['/story/:chapter'], authority: OPEN,
    load: () => import('./signal/StoryPage.js'),
    search: { keywords: 'signal story graphic novel maya ray seasons chapters episodes decisions quests sanctuary load-in workplace on air campus drawing set estate topping out breach take mission room principal', aliases: ['signal', 'story'] },
  },
  {
    id: 'labs.mix', title: 'Mix the Stream', purpose: 'SIGNAL’s flagship lab boss: mix a church’s room and live stream on a 32-channel console in five rooms, from a basement to a mega church', product: 'learn',
    path: '/labs/mix', alias: ['/labs/mix/:room'], authority: OPEN,
    load: () => import('./mixlab/MixLab.js'),
    search: { keywords: 'mix stream church sound console 32 channel mixer faders eq compressor reverb delay feedback ring out wedges subs line array delay towers lufs boss lab basement mega church', aliases: ['mix the stream', 'mixing lab', 'sound lab'] },
  },
  {
    id: 'labs.light', title: 'Light the Stage', purpose: 'SIGNAL’s lighting flagship lab: hang, patch (DMX), aim, zoom, colour and level fixtures for a sermon and a worship set', product: 'learn',
    path: '/labs/light', authority: OPEN, load: () => import('./mixlab/LightLab.js'),
    search: { keywords: 'lighting lab dmx patch address universe fixture profile fresnel par moving head batten beam angle lux key fill back light colour temperature kelvin spill screen', aliases: ['light the stage', 'lighting lab'] },
  },
  {
    id: 'labs.video', title: 'Shoot the Service', purpose: 'SIGNAL’s video flagship lab: two cameras, an LED wall, a switcher and lip-sync for the stream', product: 'learn',
    path: '/labs/video', authority: OPEN, load: () => import('./mixlab/VideoLab.js'),
    search: { keywords: 'video lab camera shutter frame rate banding flicker led wall refresh iris iso nd white balance switcher program preview cut mix key lyrics lip sync stream', aliases: ['shoot the service', 'video lab'] },
  },
  {
    id: 'play', title: 'SIGNAL played', purpose: 'A SIGNAL chapter performed as scenes: camera, timed lines, choices inside the frame and things to find', product: 'learn',
    path: '/play/:chapter', authority: OPEN,
    load: () => import('./signal/PlayPage.js'),
  },
  {
    id: 'gameday', title: 'Game day', purpose: 'The stadium event clock: move through the day, inject a fault, work it and see what guests are told', product: 'pro',
    path: '/gameday', authority: OPEN,
    load: () => import('./gameday/GameDayPage.js'),
    search: { keywords: 'game day stadium event clock kick-off gates halftime broadcast fault incident readiness simulation', aliases: ['gameday', 'game day'] },
  },
  {
    // Founder, 10 Nov 2026 ("The Critical Signal"): a lost camera feed worked on one page, on the game-day record. Like every world page it
    // is open to each View-as role; which stadium role configuration may open it is asked of the address (?as=), and a configuration that
    // may not, a fan above all, is refused here, before the page's code is fetched (gameday/signal/access.ts).
    id: 'gameday.signal', title: 'Game-day incident', purpose: 'A lost camera feed, from the alert to an independent check. It opens for the stadium’s broadcast, engineering, production and operations role configurations; a guest or public configuration is shown gates, queues and advice only', product: 'pro',
    path: '/gameday/incident/:fault', authority: OPEN, authorityFor: (_p, q) => signalAuthority(q.get('as')),
    load: () => import('./gameday/signal/SignalPage.js'),
  },
  {
    id: 'offline', title: 'Offline and this device', purpose: 'Whether the app is saved on this device, what works without a connection, and the packs you can keep', product: 'shell',
    path: '/offline', authority: OPEN,
    load: () => import('./offline/OfflinePage.js'),
    search: { keywords: 'offline device save install connection no signal download keep packs storage phone field', aliases: ['offline', 'offline use', 'this device'] },
  },
  {
    id: 'intake.request', title: 'Ask for a room or equipment', purpose: 'A request anyone can finish: a few plain answers, a picture of what is asked for, and where it goes next', product: 'pro',
    path: '/request', alias: ['/request/:kind', '/requests'],
    authority: { roles: ['employee', 'exec', 'bpm', 'ops', 'svcmgr', 'syseng', 'designer', 'architect'], why: 'Founder, 10 November 2026: the request portal is for requestors and employees. V2.5.3 admits the Executive, Systems Engineer, Operations Lead, Product Architect, Designer and Business PM to a new intake request; the Employee and the Service Manager are added here' },
    load: () => import('./intake/RequestPage.js'),
    search: { keywords: 'request ask new room equipment device add replace event intake need want order', aliases: ['ask for a room', 'new room', 'add a device', 'request', 'new request', 'more equipment'] },
  },
  {
    // Founder, 10 Nov 2026 (the signature demonstration): walk into a room you do not know, and one page carries you from what is in it
    // to a written outcome. Who may open it is V2.5.3's Lite table; history, codes and reporting each keep their own V2.5.3 rule.
    id: 'here', title: 'In this room', purpose: 'Walk into a room you do not know: what is in it, what has happened there, what to try when something is wrong, and a record of how it ended', product: 'lite',
    path: '/here', alias: ['/here/:room'], authority: { area: 'lite' },
    sections: [
      { id: 'here.devices', label: 'Position and asset codes', authority: { field: 'technical' } },
      { id: 'here.history', label: 'What has happened in the room', authority: { field: 'history' } },
      { id: 'here.known', label: 'Problems already reported in the room', authority: { action: 'issue.report' } },
    ],
    actions: [{ id: 'here.report', label: 'Report the problem', authority: { action: 'issue.report' } }],
    load: () => import('./here/HerePage.js'),
    search: { keywords: 'in this room walk in unfamiliar room equipment what is here help something not working problem fix guide troubleshoot report door label', aliases: ['in this room', 'room help', 'help in a room', 'something is not working', 'i am in a room', 'walk in'] },
  },
  {
    id: 'optimizer', title: 'Space Optimizer', purpose: 'Three ways to equip a room, scored on nine dimensions by a stated planning model', product: 'pro',
    path: '/optimizer/:world', alias: ['/optimizer/:world/:room'], authority: OPEN,
    load: () => import('./optimizer/OptimizerPage.js'),
    search: { keywords: 'space optimizer sightlines coverage audio capture reproduction accessibility options study design room layout', aliases: ['optimizer', 'space optimizer'] },
  },
];
