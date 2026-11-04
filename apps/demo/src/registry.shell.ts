/**
 * Pages of the shell slice (owner: rebuild/demo-shell): the investor start, Scouter (inside Lite, D41) and the policy page.
 * Contract: registry.types.ts and README-routes.md.
 */
import { createElement as h } from 'react';
import type { PageDef } from './registry.types.js';
import { ROLE_KEYS } from './access/policy.js';
import { adapt } from './registry.adapt.js';

export const SHELL_PAGES: readonly PageDef[] = [
  {
    id: 'investor', title: 'Investor start', purpose: 'Three ways in: Build a Room, guided scenarios, the problems each workflow solves', product: 'shell',
    path: '/investor', alias: ['/tours/investor'], authority: { area: 'investor' },
    load: () => import('./shell/Landing.js'),
    search: { keywords: 'start investor scenarios tour guided', aliases: ['start', 'tour', 'guided scenarios'] },
  },
  {
    id: 'scouter', title: 'Scouter', purpose: 'Does this device suit this room? Each device class checked against the room’s own requirement, with the source of every figure', product: 'lite',
    // D41: Scouter is part of Lite and stays highly discoverable there; the V2.5.3 and V2.5 addresses open the same page
    path: '/campus/scouter', alias: ['/campus/scouter/:candidate', '/scouter', '/scouter/:candidate', '/v25/scouter', '/suite/scouter', '/lite/scouter'],
    authority: { area: 'scouter' },
    actions: [{ id: 'scout.pick', label: 'Propose for the design', authority: { action: 'scout.pick' } }],
    load: () => import('./scouter/ScouterPage.js'),
    search: { keywords: 'scouter device evaluation compare candidates market watch standard profile shortlist', aliases: ['scouter', 'scout', 'evaluate a device', 'does this device suit', 'device evaluation', 'which camera', 'which display', 'which microphone'] },
  },
  {
    id: 'policy', title: 'Policy', purpose: 'Who may open, see and do what: the demonstration’s access policy, from V2.5.3', product: 'shell',
    path: '/v25/policy', alias: ['/access'], authority: { roles: ROLE_KEYS, why: 'the V2.5 Policy page: a demonstration of authorization, shown to every role' },
    load: adapt(() => import('./access/PolicyPage.js'), (m, p) => h(m.PolicyPage, p)),
    search: { keywords: 'access roles permissions who can', aliases: ['access policy', 'permissions', 'roles'] },
  },
];
