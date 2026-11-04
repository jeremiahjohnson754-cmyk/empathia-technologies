/**
 * Pages of the operations slice (owner: rebuild/demo-ops): Mission Control, Executive, Pro, ServiceHands and dispatch, commissioning and
 * assurance, APEX, Learn, the ledger. The shell slice created this file with the pages that already existed; from here on the ops slice
 * owns it. Contract: registry.types.ts and README-routes.md. Every entry names its V2.5.3 authority; the policy does the rest.
 */
import { createElement as h } from 'react';
import type { PageDef } from './registry.types.js';
import { adapt } from './registry.adapt.js';

export const OPS_PAGES: readonly PageDef[] = [
  {
    id: 'control', title: 'Mission Control', purpose: 'What changed, what matters, what needs action', product: 'mission-control', landing: true,
    path: '/v25', alias: ['/home'], authority: { area: 'home' },
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
    path: '/v25/learn', alias: ['/learn'], authority: { area: 'learn' },
    load: adapt(() => import('./pages/Learn.js'), (m, p) => h(m.LearnPage, { perspective: p.role, hash: p.hash })),
    search: { keywords: 'training cases signal lessons', aliases: ['signal', 'training'] },
  },
];
