/**
 * Pages of the operations slice (owner: rebuild/demo-ops): Mission Control, Executive, Pro, ServiceHands and dispatch, commissioning and
 * assurance, APEX, Learn, the ledger. The shell slice created this file with the pages that already existed; from here on the ops slice
 * owns it. Contract: registry.types.ts and README-routes.md. Every entry names its V2.5.3 authority; the policy does the rest.
 */
import { createElement as h } from 'react';
import type { PageDef } from './registry.types.js';
import { adapt } from './registry.adapt.js';
import { opsLoad } from './hardening/opsRoutes.js';
import { ROLE_KEYS } from './access/policy.js';

export const OPS_PAGES: readonly PageDef[] = [
  {
    id: 'control', title: 'Mission Control', purpose: 'What changed, what matters, what needs action', product: 'mission-control', landing: true,
    path: '/v25', authority: { area: 'home' },   // #/home is the Home page (registry.spaces.ts, uplift/core-screens); #/v25 keeps the lifecycle stations
    load: adapt(() => import('./pages/Control.js'), (m, p) => h(m.MissionControl, { perspective: p.role })),
    search: { keywords: 'dashboard overview today home', aliases: ['home', 'dashboard'] },
  },
  {
    id: 'control.exec', title: 'Executive', purpose: '27 KPI passports with numerator, denominator and coverage', product: 'pro', landing: true,
    path: '/v25/exec', alias: ['/pro/exec'], authority: { area: 'pro.exec' },
    load: adapt(() => import('./pages/Control.js'), (m, p) => h(m.ExecPage, { perspective: p.role })),
    search: { keywords: 'kpi executive portfolio passports', aliases: ['executive intelligence', 'kpis'] },
  },
  {
    id: 'ledger', title: 'Ledger', purpose: 'Every event, with its time, actor and provenance', product: 'mission-control',
    path: '/v25/ledger', authority: { area: 'ledger' },
    load: adapt(() => import('./pages/Control.js'), (m, p) => h(m.LedgerPage, { perspective: p.role, policy: false })),
    search: { keywords: 'events provenance audit', aliases: ['evidence ledger'] },
  },
  {
    id: 'servicehands', title: 'ServiceHands', purpose: 'Hard-gated eligibility, preflight, field execution', product: 'servicehands', landing: true,
    path: '/v25/service', authority: { area: 'servicehands' },
    actions: [
      { id: 'sh.triage', label: 'Triage and route', authority: { action: 'sh.triage' } },
      { id: 'sh.authorize', label: 'Authorize the work', authority: { action: 'sh.authorize' } },
      { id: 'sh.install', label: 'Record field execution', authority: { action: 'sh.install' } },
      { id: 'sh.close', label: 'Close the request', authority: { action: 'sh.close' } },
    ],
    load: adapt(() => import('./pages/Service.js'), (m, p) => h(m.ServicePage, { perspective: p.role, hash: p.hash })),
    search: { keywords: 'service request work order dispatch field', aliases: ['service hands', 'work order'] },
  },
  {
    id: 'apex', title: 'APEX', purpose: 'Diagnosis tiers A0–A5 with their evidence', product: 'apex', landing: true,
    path: '/v25/apex', authority: { area: 'assurance.analysis' },   // diagnosis is the engineering analysis: AZ_ENG and the commissioning engineer
    load: adapt(() => import('./pages/Apex.js'), (m, p) => h(m.ApexPage, { perspective: p.role, hash: p.hash })),
    search: { keywords: 'diagnosis root cause tiers', aliases: ['diagnose'] },
  },
  {
    id: 'learn', title: 'Learn', purpose: 'Evidence-backed cases and training', product: 'learn', landing: true,
    path: '/v25/learn', alias: ['/learn'], authority: { area: 'lessons' },   // V2.5 Learn is reviewed cases from what happened: V2.5.3 lessons (the steward approves them)
    load: adapt(() => import('./pages/Learn.js'), (m, p) => h(m.LearnPage, { perspective: p.role, hash: p.hash })),
    search: { keywords: 'training cases signal lessons', aliases: ['signal', 'training'] },
  },
  // ---- the operational workspaces (rebuild/demo-ops): each loads its own file (ws/<name>.js) only once the role is admitted
  {
    id: 'servicehands.dispatch', title: 'Dispatch board', purpose: 'Queue, board, explained matching, assignment, reassignment and coverage', product: 'servicehands',
    path: '/service', alias: ['/service/coverage', '/service/board', '/dispatch'], authority: { area: 'service' },
    actions: [{ id: 'sh.triage', label: 'Triage and assign', authority: { action: 'sh.triage' } }],
    load: opsLoad('dispatch'), search: { keywords: 'dispatch queue board assign technician coverage sla', aliases: ['service delivery command center', 'dispatch'] },
  },
  {
    id: 'servicehands.workspace', title: 'ServiceHands workspace', purpose: 'Request to closure: the technician workspace, evidence, verification and learning', product: 'servicehands',
    path: '/servicehands', alias: ['/servicehands/wo/:wo'], authority: { area: 'servicehands' },
    load: opsLoad('servicehands'), search: { keywords: 'work order technician evidence closure', aliases: ['work order', 'my jobs'] },
  },
  {
    id: 'servicehands.request', title: 'Report a problem', purpose: 'Structured intake: the room, the device, the category and quick checks', product: 'servicehands',
    path: '/servicehands/new', authority: { area: 'servicehands.new' },
    load: opsLoad('servicehands'), search: { keywords: 'report problem request change help broken', aliases: ['report a problem', 'ask for help'] },
  },
  {
    id: 'replay', title: 'Core Replay', purpose: 'A room’s whole life, played back read-only', product: 'mission-control',
    path: '/replay', alias: ['/replay/:room'], authority: { area: 'replay' },
    load: opsLoad('replay'), search: { keywords: 'replay history timeline room life baseline', aliases: ['room history'] },
  },
  {
    id: 'fi.scan', title: 'Field Intelligence scan', purpose: 'What a room scan observes, with provenance and policy limits', product: 'field',
    path: '/v25/fi/scan', alias: ['/v25/fi/scan/:room'], authority: { area: 'agent' },
    load: opsLoad('fiscan'), search: { keywords: 'scan replay findings provenance policy', aliases: ['room scan'] },
  },
  {
    id: 'decisions.desk', title: 'Decision desk', purpose: 'Approve, hold or reject against a scope revision; fund separately', product: 'pro',
    path: '/v25/decisions', authority: { area: 'decisions' },
    actions: [{ id: 'budget.decide', label: 'Decide', authority: { action: 'budget.decide' } }],
    load: opsLoad('decisions'), search: { keywords: 'approve hold reject fund governance', aliases: ['approvals', 'funding'] },
  },
  {
    id: 'decisions.memory', title: 'Decision Memory', purpose: 'Who decided what, the options weighed, why, and what happened after', product: 'pro',
    path: '/decisions', authority: { area: 'decisions' },
    actions: [{ id: 'decision.record', label: 'Record a decision', authority: { action: 'decision.record' } }],
    load: opsLoad('decisions'), search: { keywords: 'decision rationale memory why', aliases: ['why is it like this'] },
  },
  {
    id: 'learn.labs', title: 'Learn labs', purpose: 'Audio, Camera and Lighting labs and the SIGNAL fault labs', product: 'learn',
    path: '/learn/labs', alias: ['/learn/labs/:lab'], authority: { area: 'learn' },
    load: opsLoad('labs'), search: { keywords: 'lab simulator audio camera lighting signal flow practice', aliases: ['labs', 'audio lab'] },
  },
  {
    id: 'hardening', title: 'Resilience', purpose: 'How a part that fails to load or draw is handled, and every destructive-action safeguard', product: 'shell',
    path: '/hardening', authority: { roles: ROLE_KEYS, why: 'a demonstration of the safeguards themselves, shown to every role like the V2.5 Policy page' },
    load: opsLoad('resilience'), search: { keywords: 'resilience safeguards undo confirm failure', aliases: ['safeguards'] },
  },
];
