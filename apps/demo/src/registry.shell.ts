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
    id: 'scouter', title: 'Scouter', purpose: 'Device evaluation: every candidate scored against the room’s requirements, with the evidence behind each score', product: 'lite',
    // D41: Scouter is part of Lite and stays highly discoverable there; the V2.5.3 and V2.5 addresses open the same page
    path: '/campus/scouter', alias: ['/campus/scouter/:candidate', '/scouter', '/scouter/:candidate', '/v25/scouter', '/suite/scouter', '/lite/scouter'],
    authority: { area: 'scouter' },
    sections: [
      { id: 'scouter.cost', label: 'Cost of ownership', authority: { field: 'cost' } },
      { id: 'scouter.evidence', label: 'Operational evidence from this estate', authority: { field: 'technical' } },
    ],
    actions: [
      { id: 'scout.pick', label: 'Choose for the design', authority: { action: 'scout.pick' } },
      { id: 'scout.verify', label: 'Verify a score', authority: { action: 'scout.verify' } },
    ],
    load: () => import('./scouter/ScouterPage.js'),
    search: { keywords: 'scouter device evaluation compare candidates market watch standard profile shortlist', aliases: ['scouter', 'scout', 'device evaluation', 'compare devices', 'which camera', 'which display', 'equipment shortlist', 'market watch', 'standard profiles'] },
  },
  {
    id: 'policy', title: 'Policy', purpose: 'Who may open, see and do what: the demonstration’s access policy, from V2.5.3', product: 'shell',
    path: '/v25/policy', alias: ['/access'], authority: { roles: ROLE_KEYS, why: 'the V2.5 Policy page: a demonstration of authorization, shown to every role' },
    load: adapt(() => import('./access/PolicyPage.js'), (m, p) => h(m.PolicyPage, p)),
    search: { keywords: 'access roles permissions who can', aliases: ['access policy', 'permissions', 'roles'] },
  },
];
