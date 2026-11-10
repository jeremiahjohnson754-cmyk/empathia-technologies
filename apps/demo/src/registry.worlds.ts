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
    id: 'optimizer', title: 'Space Optimizer', purpose: 'Three ways to equip a room, scored on nine dimensions by a stated planning model', product: 'pro',
    path: '/optimizer/:world', alias: ['/optimizer/:world/:room'], authority: OPEN,
    load: () => import('./optimizer/OptimizerPage.js'),
    search: { keywords: 'space optimizer sightlines coverage audio capture reproduction accessibility options study design room layout', aliases: ['optimizer', 'space optimizer'] },
  },
];
