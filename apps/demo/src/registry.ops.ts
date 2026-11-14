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
    id: 'learn', title: 'V2.5 Learn', purpose: 'Independently reviewed engineering cases, linked to lessons and labs', product: 'learn',
    path: '/v25/learn', authority: { area: 'lessons' },   // V2.5 Learn is reviewed cases from what happened: V2.5.3 lessons (the steward approves them)
    load: adapt(() => import('./pages/Learn.js'), (m, p) => h(m.LearnPage, { perspective: p.role, hash: p.hash })),
    search: { keywords: 'training cases signal lessons', aliases: ['signal', 'training'] },
  },
  // ---- Empathia Learn, every V2.5.3 area (uplift/workspaces): pages/LearnAreas.tsx, content from learn/model.ts
  ...([
    ['learn.home', 'Empathia Learn', 'Readiness, what you proved, what to do next, competencies, learn from a room', '/learn', 'LearnHome', 'learn', 'learn home readiness competencies'],
    ['learn.signal', 'SIGNAL', 'A story in twelve seasons: the cast, the authored episodes, competency signals', '/learn/signal', 'SignalPage', 'learn', 'signal story seasons episodes maya'],
    ['learn.episode', 'SIGNAL episode', 'One authored episode, scene by scene, with its decisions', '/learn/signal/:ep', 'EpisodePage', 'learn', 'episode sound check'],
    ['learn.story', 'Room story', 'A room’s history from its own records, with three decisions left to you', '/learn/story', 'StoryPage', 'learn', 'room story history decisions'],
    ['learn.story.room', 'Room story', 'Eight panels and three decisions for one room', '/learn/story/:room', 'StoryPage', 'learn', 'story room'],
    ['learn.practice', 'Practice', 'SIGNAL drills and drills made from each room’s records', '/learn/practice', 'PracticePage', 'learn', 'practice drills evidence signal check'],
    ['learn.service', 'Service Mode', 'A call, a clock and ten things you can do, on a room’s records; the SIGNAL incidents', '/learn/service', 'ServiceModePage', 'learn', 'service mode incidents clock ratings'],
    ['learn.service.run', 'Service Mode case', 'One case or SIGNAL incident on the clock, scored on six ratings', '/learn/service/:id', 'ServiceRunPage', 'learn', 'case run clock'],
    ['learn.cases', 'Case Files', 'How an incident becomes a lesson: room cases, generalized cases, SIGNAL case files', '/learn/cases', 'CaseFilesPage', 'learn', 'case files incidents lesson'],
    ['learn.case', 'Case file', 'Seven sources from Core, the work, and how it became a better operation', '/learn/cases/:id', 'CaseFilePage', 'learn', 'case file sources'],
    ['learn.design', 'Design clinic', 'Eight lessons with figures worked on rooms in Core; rooms the rules flag', '/learn/design', 'DesignClinicPage', 'learn', 'design clinic acoustics microphones sightlines loudspeakers'],
    ['learn.design.lesson', 'Design lesson', 'One design-clinic lesson and its figures', '/learn/design/:lesson', 'DesignLessonPage', 'learn', 'design lesson figures'],
    ['learn.fieldbook', 'Fieldbook', 'The glossary and the formulas, by domain', '/learn/fieldbook', 'FieldbookPage', 'learn', 'fieldbook glossary formulas terms'],
    ['learn.mission', 'Mission Control', 'SIGNAL: continue the story, your level, the evidence locker, crew trust, the systems map, ratings and settings', '/learn/mission', 'MissionPage', 'learn', 'mission control signal level evidence trust ratings systems map'],
    ['learn.challenges', 'Challenges', 'Thirteen SIGNAL challenges in five modes, four levels each, scored with your best', '/learn/challenges', 'ChallengesPage', 'learn', 'challenges hear see reach build record eq compressor moire lighting wireless loudness'],
    ['learn.library', 'Learn library', 'SIGNAL lessons, thirteen kinds of knowledge, signal flows by kind of room', '/learn/library', 'LibraryPage', 'learn', 'library lessons knowledge signal flows'],
    ['learn.ask', 'Ask Empathia', 'Fifteen questions answered from Core, each with its sources', '/learn/ask', 'AskPage', 'ask', 'ask question answer'],
    ['learn.explore', 'System explorer', 'The SIGNAL venues, layer by layer', '/learn/explore', 'ExplorePage', 'learn', 'explore sanctuary layers'],
    ['learn.explore.one', 'System explorer', 'One SIGNAL venue, layer by layer', '/learn/explore/:id', 'ExplorePage', 'learn', 'explore'],
    ['learn.academy', 'ServiceHands Academy', 'Fifteen jobs from intake to close, and the live requests waiting on each', '/learn/servicehands', 'AcademyPage', 'learn', 'academy servicehands jobs training'],
  ] as const).map(([id, title, purpose, path, exp, area, keywords]): PageDef => ({
    id, title, purpose, product: 'learn', path, authority: { area }, landing: id === 'learn.home' || undefined,
    load: adapt(() => import('./pages/LearnAreas.js'), (m, p) => h((m as unknown as Record<string, (x: { perspective: string; params: Record<string, string> }) => ReturnType<typeof h>>)[exp]!, { perspective: p.role, params: p.params })),
    search: { keywords, aliases: [title.toLowerCase()] },
  })),
  // ---- the estate's command centers (uplift/workspaces): computed from the thirty room records and the service workspace
  {
    id: 'pro.command', title: 'Pro command center', purpose: 'What is open, how it stands against its target, and where to look next', product: 'pro', landing: true,
    path: '/pro', authority: { area: 'pro' },
    load: adapt(() => import('./pages/Estate.js'), (m, p) => h(m.ProPage, { perspective: p.role, hash: p.hash })),
    search: { keywords: 'pro command center issues target buildings lifecycle', aliases: ['pro', 'command center', 'operations'] },
  },
  {
    id: 'pro.assets', title: 'Asset Intelligence', purpose: 'What the organization owns: positions, identities, installations', product: 'pro',
    path: '/pro/assets', authority: { area: 'pro.assets' },
    load: adapt(() => import('./pages/ProViews.js'), (m, p) => h(m.AssetsPage, { perspective: p.role })),
    search: { keywords: 'assets devices positions identity', aliases: ['asset intelligence'] },
  },
  {
    id: 'pro.issues', title: 'Issue Intelligence', purpose: 'How and where it fails: severity, source, building, recurrence', product: 'pro',
    path: '/pro/issues', authority: { area: 'pro.issues' },
    load: adapt(() => import('./pages/ProViews.js'), (m, p) => h(m.IssuesPage, { perspective: p.role })),
    search: { keywords: 'issues severity recurrence patterns', aliases: ['issue intelligence'] },
  },
  {
    id: 'pro.ops', title: 'Operations Hub', purpose: 'People, certifications, stock and work windows behind the work', product: 'pro',
    path: '/pro/ops', authority: { area: 'pro.ops' },
    load: adapt(() => import('./pages/ProViews.js'), (m, p) => h(m.OpsHubPage, { perspective: p.role })),
    search: { keywords: 'operations hub people certifications stock bookings', aliases: ['operations hub'] },
  },
  {
    id: 'pro.eng', title: 'Standards and Engineering', purpose: 'Archetypes, templates, applicable tests and conformance', product: 'pro',
    path: '/pro/eng', authority: { area: 'pro.eng' },
    load: adapt(() => import('./pages/ProViews.js'), (m, p) => h(m.StandardsPage, { perspective: p.role })),
    search: { keywords: 'standards engineering archetypes templates conformance', aliases: ['standards'] },
  },
  {
    id: 'commissioning', title: 'Commissioning', purpose: 'Accepted, accepted with conditions, blocked: every room and its deficiencies', product: 'commissioning', landing: true,
    path: '/commissioning', authority: { area: 'commissioning' },
    load: adapt(() => import('./pages/Estate.js'), (m, p) => h(m.CommissioningPage, { perspective: p.role, hash: p.hash })),
    search: { keywords: 'commissioning acceptance baseline deficiencies tests', aliases: ['commissioning command center', 'acceptance'] },
  },
  {
    id: 'assurance', title: 'Assurance', purpose: 'Is the estate still behaving the way it was commissioned to behave', product: 'commissioning',
    path: '/assurance', authority: { area: 'assurance' },
    authorityFor: (_p, q) => (q.get('view') === 'analysis' ? { area: 'assurance.analysis' } : undefined),   // V2.5.3: the engineering analysis has its own authority
    load: adapt(() => import('./pages/AssuranceViews.js'), (m, p) => (/[?&]view=analysis/.test(p.hash) ? h(m.AssuranceAnalysisPage, { perspective: p.role }) : h(m.AssurancePage, { perspective: p.role, hash: p.hash }))),
    search: { keywords: 'assurance drift baseline ready next session', aliases: ['assurance command center', 'drift'] },
  },
  {
    id: 'assurance.ready', title: 'Ready checks', purpose: 'Eleven checks before a high or mission-critical room is trusted with its next session', product: 'commissioning',
    path: '/assurance/ready', authority: { area: 'assurance.ready' },
    load: adapt(() => import('./pages/AssuranceViews.js'), (m, p) => h(m.ReadyPage, { perspective: p.role })),
    search: { keywords: 'ready checks next session', aliases: ['ready checks'] },
  },
  {
    id: 'assurance.change', title: 'Change impact', purpose: 'What a replacement or change reopens, and what waits for acceptance', product: 'commissioning',
    path: '/assurance/change', authority: { area: 'assurance.change' },
    load: adapt(() => import('./pages/AssuranceViews.js'), (m, p) => h(m.ChangePage, { perspective: p.role })),
    search: { keywords: 'change impact reopened tests replacement', aliases: ['change impact'] },
  },
  {
    id: 'assurance.signals', title: 'Signals', purpose: 'Maintenance and experience signals before a room fails', product: 'commissioning',
    path: '/assurance/signals', authority: { area: 'assurance.signals' },
    load: adapt(() => import('./pages/AssuranceViews.js'), (m, p) => h(m.SignalsPage, { perspective: p.role })),
    search: { keywords: 'signals maintenance recurrence', aliases: ['early signals'] },
  },
  {
    id: 'commissioning.deficiencies', title: 'Deficiencies', purpose: 'Every open commissioning deficiency, most serious first', product: 'commissioning',
    path: '/commissioning/deficiencies', authority: { area: 'commissioning' },
    load: adapt(() => import('./pages/AssuranceViews.js'), (m, p) => h(m.DeficienciesPage, { perspective: p.role })),
    search: { keywords: 'deficiencies punch list open', aliases: ['open deficiencies'] },
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
