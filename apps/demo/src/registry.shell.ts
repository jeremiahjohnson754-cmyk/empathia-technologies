/**
 * Pages of the shell slice (owner: rebuild/demo-shell): the investor start, Scouter (inside Lite, D41) and the policy page.
 * Contract: registry.types.ts and README-routes.md.
 */
import type { PageDef } from './registry.types.js';
import { ROLE_KEYS } from './access/policy.js';
declare const process: { env: Record<string, string | undefined> };   // replaced at build time (esbuild define)
import { createElement as h, type ComponentType } from 'react';
import { adapt } from './registry.adapt.js';
import type { PageProps } from './registry.types.js';

/** A shell page is its own build entry (apps/demo/build.mjs SHELL_PAGES), versioned by the build id; a retry adds &retry=n, a fresh fetch. */
const entry = (name: string) => (attempt = 0): Promise<{ default: ComponentType<PageProps> }> =>
  import(/* computed: a retry must not reuse the failed fetch */ new URL(`shell/${name}.js?v=${process.env.DEMO_BUILD_ID || 'dev'}${attempt ? `&retry=${attempt}` : ''}`, document.baseURI).href);

export const SHELL_PAGES: readonly PageDef[] = [
  {
    // the V2.5 Policy page as the demonstrator had it: what each native page checks and the role × area matrix, verbatim
    id: 'policy', title: 'Policy', purpose: 'Role access, licences, adapters — the demonstrator’s role × area matrix', product: 'shell',
    path: '/v25/policy', authority: { roles: ROLE_KEYS, why: 'the V2.5 Policy page: a demonstration of authorization, shown to every role' },
    load: adapt(() => import('./pages/Control.js'), (m, p) => h(m.LedgerPage, { perspective: p.role, policy: true })),
    search: { keywords: 'policy role area matrix licences adapters', aliases: ['role matrix'] },
  },
  {
    id: 'investor', title: 'Investor start', purpose: 'Three ways in: Build a Room, guided scenarios, the problems each workflow solves', product: 'shell',
    path: '/investor', alias: ['/tours/investor'], authority: { area: 'investor' },
    load: entry('landing'),
    search: { keywords: 'start investor scenarios tour guided', aliases: ['start', 'tour', 'guided scenarios'] },
  },
  {
    id: 'scouter', title: 'Scouter', purpose: 'Does this device suit this room? Each device class checked against the room’s own requirement, with the source of every figure', product: 'lite',
    // D41: Scouter is part of Lite and stays highly discoverable there; the V2.5.3 and V2.5 addresses open the same page
    path: '/campus/scouter', alias: ['/campus/scouter/:candidate', '/scouter', '/scouter/:candidate', '/v25/scouter', '/suite/scouter', '/lite/scouter'],
    authority: { area: 'scouter' },
    actions: [{ id: 'scout.pick', label: 'Propose for the design', authority: { action: 'scout.pick' } }],
    load: entry('scouter'),
    search: { keywords: 'scouter device evaluation compare candidates market watch standard profile shortlist', aliases: ['scouter', 'scout', 'evaluate a device', 'does this device suit', 'device evaluation', 'which camera', 'which display', 'which microphone'] },
  },
  {
    id: 'access', title: 'Access policy', purpose: 'Who may open, see and do what: the demonstration’s access policy, from V2.5.3', product: 'shell',
    path: '/access', authority: { roles: ROLE_KEYS, why: 'the V2.5 Policy page: a demonstration of authorization, shown to every role' },
    load: entry('policy'),
    search: { keywords: 'access roles permissions who can', aliases: ['access policy', 'permissions', 'roles'] },
  },
];
