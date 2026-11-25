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
    // task #181 (founder, 17 Nov 2026 10:20): Expo LIVE, the first slice of the convention experience
    id: 'play.expo', title: 'Expo LIVE', purpose: 'The Northlight Technology Expo in 3D with its plan: twenty exhibitors and the Empathia showcase, sessions with polls and moderated questions, an agenda, details left only with consent, and the organiser’s modeled footfall', product: 'shell',
    path: '/play/expo', alias: ['/expo/live', '/worlds/convention/live'], authority: OPEN,
    load: () => import('./play/ExpoLive.js'),
    search: { keywords: 'expo convention hall booth exhibitor session poll question agenda consent footfall organiser 3d', aliases: ['expo live', 'convention live', 'northlight expo'] },
  },
  {
    // task #182 (founder, 17 Nov 2026 10:20 and 13:40): Stadium LIVE, the bowl in 3D with the LIVE console
    id: 'play.stadium', title: 'Stadium LIVE', purpose: 'Harborlight Stadium in 3D with the LIVE console: atmospheres from pregame to concert, cameras, crowd cheers and waves, synthesised sound (opt-in), modeled crowd levels and PA coverage, boards and ribbon, AV devices and a replayable event timeline', product: 'shell',
    path: '/play/stadium', alias: ['/stadium/live', '/worlds/stadium/live'], authority: OPEN,
    load: () => import('./play/StadiumLive.js'),
    search: { keywords: 'stadium live 3d bowl crowd cheer wave atmosphere concert halftime scoreboard ribbon pa coverage dba heatmap audio mixer broadcast camera replay poll', aliases: ['stadium live', 'harborlight live', 'live console'] },
  },
  {
    // task #186 (founder, 17 Nov 2026 10:31 and 10:59): the first playable slice of Campus Life
    id: 'play.campus', title: 'Campus Life', purpose: 'Play a student at Kestrel Valley University: walk and run across the Quad, meet Professor Calder, open Science Hall, fix the circuit bench in SCI-110, find fact cards, earn experience; progress kept in this browser', product: 'shell',
    path: '/play/campus', alias: ['/play', '/campus-life', '/worlds/university/play'], authority: OPEN,
    load: () => import('./play/CampusLife.js'),
    search: { keywords: 'play game campus life university student quad science hall walk run quest xp level classroom circuit npc', aliases: ['campus life', 'play', 'university game', 'play the campus'] },
  },
  {
    // 25 Nov 2026 (founder, 24 and 25 Nov: benchmarks on customer hardware before more optimisation): a visitor measures their own device
    id: 'play.performance', title: 'Performance check', purpose: 'Measure this device: how large a 3D environment it draws smoothly and how the three live scenes run on it; starts only when asked, sends nothing anywhere, and the result can be kept as files', product: 'shell',
    path: '/play/performance', alias: ['/performance', '/benchmark'], authority: OPEN,
    load: () => import('./play/PerformanceCheck.js'),
    search: { keywords: 'performance benchmark frame rate fps speed device phone graphics smooth slow measure check triangles memory', aliases: ['performance check', 'benchmark', 'measure this device', 'frame rate'] },
  },
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
    // Founder directive 18 Nov 2026 11:59 (SIGNAL Story Director) and 16:41 ("actually done this time"): a chapter as an interactive
    // film — footage, voiced lines, decisions in the frame, playable scenes, credits — on the same story record as the written story.
    id: 'film', title: 'SIGNAL film', purpose: 'A SIGNAL chapter as an interactive film: footage, voices, choices inside the frame, playable investigation scenes and consequences', product: 'learn',
    path: '/film/:chapter', alias: ['/film'], authority: OPEN,
    load: () => import('./signal/film/FilmPage.js'),
    search: { keywords: 'signal film interactive cinematic story chapter ten seats maya ray decisions investigation measure seats comb filter', aliases: ['signal film', 'interactive film', 'cinematic story'] },
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
    // 19 Nov 2026 (founder directive "The definitive Intake experience" §03–§07): the front door, the steps, the requests and their pages
    id: 'intake.request', title: 'Intake', purpose: 'What can we help you create, improve or fix? Describe it, or choose one of four; follow what you asked for',
    product: 'pro', path: '/request',
    authority: { roles: ['employee', 'exec', 'bpm', 'ops', 'svcmgr', 'syseng', 'designer', 'architect'], why: 'Founder, 10 November 2026: the request portal is for requestors and employees. V2.5.3 admits the Executive, Systems Engineer, Operations Lead, Product Architect, Designer and Business PM to a new intake request; the Employee and the Service Manager are added here' },
    load: () => import('./intake/Pages.js'),
    search: { keywords: 'request ask new room equipment device add replace event intake need want order help create improve fix', aliases: ['ask for a room', 'new room', 'add a device', 'request', 'intake', 'more equipment'] },
  },
  {
    id: 'intake.new', title: 'New request', purpose: 'A request in at most five steps: what you need, where, what it should do, photos, review and send', product: 'pro',
    path: '/request/new', alias: ['/request/:kind'],
    authority: { roles: ['employee', 'exec', 'bpm', 'ops', 'svcmgr', 'syseng', 'designer', 'architect'], why: 'Founder, 10 November 2026: the request portal is for requestors and employees. V2.5.3 admits the Executive, Systems Engineer, Operations Lead, Product Architect, Designer and Business PM to a new intake request; the Employee and the Service Manager are added here' },
    load: () => import('./intake/Pages.js'),
    search: { keywords: 'new request wizard steps draft photos room device', aliases: ['new request', 'start a request'] },
  },
  {
    id: 'intake.mine', title: 'My requests', purpose: 'Drafts and sent requests, where each stands and who acts next', product: 'pro', path: '/requests',
    authority: { roles: ['employee', 'exec', 'bpm', 'ops', 'svcmgr', 'syseng', 'designer', 'architect'], why: 'Founder, 10 November 2026: the request portal is for requestors and employees. V2.5.3 admits the Executive, Systems Engineer, Operations Lead, Product Architect, Designer and Business PM to a new intake request; the Employee and the Service Manager are added here' },
    load: () => import('./intake/Pages.js'),
    search: { keywords: 'my requests drafts status follow track', aliases: ['my requests', 'track a request'] },
  },
  {
    id: 'intake.track', title: 'Request', purpose: 'One request: what is happening, who acts next, what is needed, what happens next, and its history', product: 'pro', path: '/requests/:id',
    authority: { roles: ['employee', 'exec', 'bpm', 'ops', 'svcmgr', 'syseng', 'designer', 'architect'], why: 'Founder, 10 November 2026: the request portal is for requestors and employees. V2.5.3 admits the Executive, Systems Engineer, Operations Lead, Product Architect, Designer and Business PM to a new intake request; the Employee and the Service Manager are added here' },
    load: () => import('./intake/Pages.js'),
  },
  {
    id: 'intake.queue', title: 'Requests to triage', purpose: 'Requests in the person’s own words to route or ask about, and new spaces whose location is to be confirmed', product: 'pro', path: '/request/queue',
    authority: { roles: ['ops', 'syseng', 'svcmgr', 'architect', 'sitechamp'], why: 'Founder directive 19 November 2026 §06: the AV Operations Lead triages (the Systems Engineer, the Service Manager and the platform architect share the work); the Site Champion confirms locations on their site' },
    load: () => import('./intake/Pages.js'),
    search: { keywords: 'triage queue route requests intake location verify provisional', aliases: ['intake queue', 'requests to triage'] },
  },
  {
    id: 'intake.spaces', title: 'My spaces', purpose: 'The rooms you asked about and the new spaces you asked for', product: 'pro', path: '/request/spaces',
    authority: { roles: ['employee', 'exec', 'bpm', 'ops', 'svcmgr', 'syseng', 'designer', 'architect'], why: 'Founder, 10 November 2026: the request portal is for requestors and employees. V2.5.3 admits the Executive, Systems Engineer, Operations Lead, Product Architect, Designer and Business PM to a new intake request; the Employee and the Service Manager are added here' },
    load: () => import('./intake/Pages.js'),
  },
  {
    id: 'intake.help', title: 'How requests work', purpose: 'What happens after you ask, who looks at it, and what asking never does', product: 'pro', path: '/request/help',
    authority: { roles: ['employee', 'exec', 'bpm', 'ops', 'svcmgr', 'syseng', 'designer', 'architect'], why: 'Founder, 10 November 2026: the request portal is for requestors and employees. V2.5.3 admits the Executive, Systems Engineer, Operations Lead, Product Architect, Designer and Business PM to a new intake request; the Employee and the Service Manager are added here' },
    load: () => import('./intake/Pages.js'),
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
